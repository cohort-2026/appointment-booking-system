import type { Prisma } from "../generated/prisma/client.js";
import { bookedDurationMinutes, bookedPrice } from "../lib/booking-snapshot.js";
import { ACTIVE_APPOINTMENT_STATUSES, BookingError } from "./booking.service.js";

export const customerAppointmentInclude = {
  customer: { select: { firstName: true, email: true } },
  service: { select: { name: true, durationMinutes: true, expectedPrice: true } },
  business: { select: { name: true, address: true, phone: true, cancellationCutoffHours: true } },
  soleProvider: { select: {
    displayName: true, city: true, cancellationCutoffHours: true, user: { select: { phone: true } },
  } },
  staff: { select: { user: { select: { firstName: true, lastName: true } } } },
  events: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true, type: true, actor: true, createdAt: true, oldStatus: true, newStatus: true,
      oldScheduledStart: true, newScheduledStart: true, reason: true,
    },
  },
} satisfies Prisma.AppointmentInclude;

export type CustomerAppointment = Prisma.AppointmentGetPayload<{ include: typeof customerAppointmentInclude }>;

export function customerChangePolicy(appointment: CustomerAppointment, now = new Date()) {
  const cutoff = (appointment.business ?? appointment.soleProvider)?.cancellationCutoffHours ?? 24;
  const changeDeadline = new Date(appointment.scheduledStart.getTime() - cutoff * 3_600_000);
  const active = ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status);
  let changeBlockReason: string | null = null;
  if (!active) changeBlockReason = "This appointment is closed.";
  else if (now >= appointment.scheduledStart) changeBlockReason = "This appointment has already started.";
  else if (now > changeDeadline) changeBlockReason = "The deadline for online changes has passed.";
  return {
    cancellationCutoffHours: cutoff, changeDeadline, changeBlockReason,
    canCancel: changeBlockReason === null,
    canReschedule: changeBlockReason === null && Boolean(
      appointment.soleProviderId || (appointment.businessId && appointment.staffId),
    ),
  };
}

type CustomerChange = { type: "CANCELLED"; reason: string | null } |
  { type: "RESCHEDULED"; startsAt: Date; endsAt: Date };

export function saveCustomerTransition(
  tx: Prisma.TransactionClient, appointment: CustomerAppointment, change: CustomerChange, now: Date,
) {
  const reason = change.type === "CANCELLED" ? change.reason : null;
  const scheduledStart = change.type === "RESCHEDULED" ? change.startsAt : appointment.scheduledStart;
  const scheduledEnd = change.type === "RESCHEDULED" ? change.endsAt : appointment.scheduledEnd;
  const fields = change.type === "CANCELLED"
    ? { cancelledAt: now, cancelledBy: "CUSTOMER" as const, cancellationReason: reason }
    : {
      scheduledStart, scheduledEnd, rescheduleCount: { increment: 1 }, reminderSentAt: null,
      priceAtBooking: bookedPrice(appointment),
    };
  return tx.appointment.update({
    where: { id: appointment.id },
    data: {
      ...fields, status: change.type,
      events: { create: {
        type: change.type, actor: "CUSTOMER", actorUserId: appointment.customerId, reason,
        oldStatus: appointment.status, newStatus: change.type,
        oldScheduledStart: appointment.scheduledStart, oldScheduledEnd: appointment.scheduledEnd,
        newScheduledStart: scheduledStart, newScheduledEnd: scheduledEnd,
      } },
    },
    include: customerAppointmentInclude,
  });
}

export function requireCustomerChange(appointment: CustomerAppointment, action: "cancel" | "reschedule", now: Date) {
  const policy = customerChangePolicy(appointment, now);
  if (policy.changeBlockReason) throw new BookingError(policy.changeBlockReason, 422);
  if (action === "reschedule" && !policy.canReschedule) {
    throw new BookingError("Online rescheduling is unavailable for this appointment. Contact your provider.", 422);
  }
}

export function appointmentAvailabilitySnapshot(appointment: CustomerAppointment) {
  return {
    durationMinutes: bookedDurationMinutes(appointment),
    bufferAfterMinutes: appointment.bufferAfterMinutesAtBooking,
  };
}
