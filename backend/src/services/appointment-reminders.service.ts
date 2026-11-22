import { ACTIVE_APPOINTMENT_STATUSES } from "../lib/appointment-status.js";
import prisma from "../lib/prisma.js";
import { bookingDate, DAY_MS, parseBookingDate } from "../lib/time.js";
import { emailFrontendOrigin, savedAppointmentUrl } from "./appointment-notification.service.js";
import { sendAppointmentReminderEmail } from "./email.service.js";

/** Return the start/end instants of tomorrow in Johannesburg (not server-local time). */
export function reminderWindow(now: Date) {
  const today = parseBookingDate(bookingDate(now))!;
  const start = new Date(today.getTime() + DAY_MS);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/**
 * One daily, best-effort pass. Never changes booking status or history.
 * reminderSentAt is claimed *before* sending to avoid duplicate simultaneous runs.
 * A process crash after the claim may lose that reminder; this is a documented
 * Sprint 1 trade-off, not a guaranteed email delivery queue.
 */
export async function sendTomorrowReminders(
  now = new Date(),
  send = sendAppointmentReminderEmail,
  db: Pick<typeof prisma, "appointment"> = prisma,
): Promise<{ attempted: number; accepted: number; failed: number }> {
  const { start, end } = reminderWindow(now);
  const appointments = await db.appointment.findMany({
    where: {
      scheduledStart: { gte: start, lt: end },
      status: { in: ACTIVE_APPOINTMENT_STATUSES },
      reminderSentAt: null,
    },
    orderBy: [{ scheduledStart: "asc" }, { id: "asc" }],
    take: 20, // Small daily batch: no long-running email worker.
    select: {
      id: true, status: true, scheduledStart: true,
      customer: { select: { firstName: true, email: true } },
      service: { select: { name: true } },
      business: { select: { name: true } },
      soleProvider: { select: { displayName: true } },
    },
  });
  let attempted = 0, accepted = 0, failed = 0;
  for (const appointment of appointments) {
    // Atomic claim: a concurrent job can only send if it claims the same schedule first.
    const claim = await db.appointment.updateMany({
      where: {
        id: appointment.id,
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
        scheduledStart: appointment.scheduledStart,
        reminderSentAt: null,
      },
      data: { reminderSentAt: now },
    });
    if (claim.count !== 1) continue;
    attempted++;
    try {
      // A cancellation/reschedule may have happened after the initial query.
      const latest = await db.appointment.findUnique({
        where: { id: appointment.id },
        select: { status: true, scheduledStart: true },
      });
      if (!latest || !ACTIVE_APPOINTMENT_STATUSES.includes(latest.status) ||
          latest.scheduledStart.getTime() !== appointment.scheduledStart.getTime()) continue;
      await send({
        to: appointment.customer.email,
        firstName: appointment.customer.firstName,
        serviceName: appointment.service.name,
        providerName: appointment.business?.name ?? appointment.soleProvider?.displayName ?? "Provider",
        startsAt: appointment.scheduledStart,
        appointmentUrl: savedAppointmentUrl(appointment.id, emailFrontendOrigin()),
      });
      accepted++;
    } catch {
      failed++;
      // Allow the next manual/daily run to retry, but only if the schedule is unchanged.
      await db.appointment.updateMany({
        where: { id: appointment.id, scheduledStart: appointment.scheduledStart, reminderSentAt: now },
        data: { reminderSentAt: null },
      });
      console.error("Appointment reminder email failed", { appointmentId: appointment.id });
    }
  }
  return { attempted, accepted, failed };
}
