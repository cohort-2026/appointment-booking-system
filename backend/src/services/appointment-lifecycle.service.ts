import { ACTIVE_APPOINTMENT_STATUSES } from "../lib/appointment-status.js";
import { randomUUID } from "node:crypto";
import type { AppointmentActor, AppointmentStatus, Prisma } from "../generated/prisma/client.js";
import { bookedDurationMinutes, bookedPrice } from "../lib/booking-snapshot.js";
import { BookingError } from "./booking.service.js";

export const customerAppointmentInclude = {
  customer: { select: { firstName: true, email: true } },
  service: { select: { name: true, durationMinutes: true, expectedPrice: true } },
  business: { select: { name: true, address: true, phone: true, cancellationCutoffHours: true, owner: { select: { email: true } } } },
  soleProvider: { select: {
    displayName: true, city: true, cancellationCutoffHours: true, user: { select: { phone: true, email: true } },
  } },
  staff: { select: { user: { select: { firstName: true, lastName: true, email: true } } } },
  events: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true, type: true, actor: true, actorUser: { select: { firstName: true, lastName: true } }, createdAt: true, oldStatus: true, newStatus: true,
      oldScheduledStart: true, newScheduledStart: true, oldScheduledEnd: true, newScheduledEnd: true, reason: true,
    },
  },
} satisfies Prisma.AppointmentInclude;

export type CustomerAppointment = Prisma.AppointmentGetPayload<{ include: typeof customerAppointmentInclude }>;

type CustomerChangeAppointment = Pick<
  CustomerAppointment, "scheduledStart" | "status" | "soleProviderId" | "businessId" | "staffId"
> & {
  business: { cancellationCutoffHours: number } | null;
  soleProvider: { cancellationCutoffHours: number } | null;
};

export function customerChangePolicy(appointment: CustomerChangeAppointment, now = new Date()) {
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

export type StaffStatus = "CANCELLED" | "COMPLETED" | "NO_SHOW";
type Transition = { type: StaffStatus; reason: string | null } |
  { type: "RESCHEDULED"; startsAt: Date; endsAt: Date };

export function allowedStaffStatuses(
  appointment: { status: AppointmentStatus; scheduledStart: Date },
  actor: AppointmentActor,
  now = new Date(),
): StaffStatus[] {
  if (!ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)) return [];
  if (appointment.scheduledStart <= now) return ["COMPLETED", "NO_SHOW"];
  return actor === "STAFF" ? [] : ["CANCELLED"];
}

export async function saveAppointmentTransition(
  tx: Prisma.TransactionClient,
  appointment: CustomerAppointment,
  change: Transition,
  now: Date,
  actor: { role: AppointmentActor; userId: string | null },
) {
  if (!ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)) {
    throw new BookingError("This appointment is closed.", 422);
  }
  if (actor.role !== "CUSTOMER" && change.type !== "RESCHEDULED" &&
      !allowedStaffStatuses(appointment, actor.role, now).includes(change.type)) {
    throw new BookingError("This action is unavailable at the current appointment time.", 422);
  }

  const moved = change.type === "RESCHEDULED";
  const reason = moved ? null : change.reason;
  const scheduledStart = moved ? change.startsAt : appointment.scheduledStart;
  const scheduledEnd = moved ? change.endsAt : appointment.scheduledEnd;
  const fields = change.type === "CANCELLED"
    ? { cancelledAt: now, cancelledBy: actor.role, cancellationReason: reason }
    : moved ? {
      scheduledStart, scheduledEnd, rescheduleCount: { increment: 1 }, reminderSentAt: null,
      priceAtBooking: bookedPrice(appointment),
    } : {};
  const eventId = randomUUID();
  const saved = await tx.appointment.update({
    where: { id: appointment.id },
    data: {
      ...fields, status: change.type, noShow: change.type === "NO_SHOW",
      events: { create: {
        id: eventId, type: change.type, actor: actor.role, actorUserId: actor.userId, reason,
        oldStatus: appointment.status, newStatus: change.type,
        oldScheduledStart: appointment.scheduledStart, oldScheduledEnd: appointment.scheduledEnd,
        newScheduledStart: scheduledStart, newScheduledEnd: scheduledEnd,
      } },
    },
    include: customerAppointmentInclude,
  });
  return { appointment: saved, eventId };
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
