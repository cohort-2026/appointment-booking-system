import type { Prisma } from "../generated/prisma/client.js";
import { bookedDurationMinutes, bookedPrice } from "../lib/booking-snapshot.js";
import prisma from "../lib/prisma.js";
import { BOOKING_TIME_ZONE, bookingDate } from "../lib/time.js";
import {
  appointmentAvailabilitySnapshot, customerAppointmentInclude, customerChangePolicy,
  requireCustomerChange, saveAppointmentTransition, type CustomerAppointment,
} from "./appointment-lifecycle.service.js";
import {
  BookingError, isBookingWriteConflict, requireCustomerTimeAvailable, resolveBookingAvailability,
} from "./booking.service.js";

type Owner = { id: string; customerId: string };

export async function findCustomerAppointment(owner: Owner, db: Prisma.TransactionClient = prisma) {
  const appointment = await db.appointment.findFirst({ where: owner, include: customerAppointmentInclude });
  if (!appointment) throw new BookingError("Appointment not found", 404);
  return appointment;
}

export function customerAppointmentDetails(appointment: CustomerAppointment) {
  const { soleProvider, business, staff } = appointment;
  return {
    id: appointment.id, time: appointment.scheduledStart, endsAt: appointment.scheduledEnd,
    service: appointment.service.name, durationMinutes: bookedDurationMinutes(appointment),
    price: bookedPrice(appointment)?.toString() ?? null, status: appointment.status,
    timeZone: BOOKING_TIME_ZONE, customerNotes: appointment.customerNotes,
    providerName: business?.name ?? soleProvider?.displayName ?? "Provider",
    providerId: business ? `business:${appointment.businessId}` : soleProvider ? `sole:${appointment.soleProviderId}` : null,
    staffName: staff ? `${staff.user.firstName} ${staff.user.lastName ?? ""}`.trim() : null,
    address: business?.address ?? soleProvider?.city ?? null,
    phone: business?.phone ?? soleProvider?.user.phone ?? null,
    ...customerChangePolicy(appointment),
    events: appointment.events,
  };
}

async function replacementAvailability(db: Prisma.TransactionClient, appointment: CustomerAppointment, date: string, now: Date) {
  const resource = appointment.soleProviderId
    ? { providerKind: "sole" as const, providerId: appointment.soleProviderId }
    : { providerKind: "business" as const, providerId: appointment.businessId!, staffId: appointment.staffId! };
  try {
    return await resolveBookingAvailability(db, {
      ...resource, serviceId: appointment.serviceId, date, now,
      excludeAppointmentId: appointment.id,
      snapshot: appointmentAvailabilitySnapshot(appointment),
    });
  } catch (error) {
    if (error instanceof BookingError && (error.status === 404 ||
        (error.status === 400 && error.message === "Choose a staff member assigned to this service"))) {
      throw new BookingError("This service or staff assignment is no longer available. Contact your provider.", 422);
    }
    throw error;
  }
}

export async function getReplacementOptions(owner: Owner, date: string) {
  const appointment = await findCustomerAppointment(owner);
  const now = new Date();
  requireCustomerChange(appointment, "reschedule", now);
  const { timeZone, slots } = await replacementAvailability(prisma, appointment, date, now);
  const current = appointment.scheduledStart.toISOString();
  return { timeZone, slots: slots.filter(slot => slot.startsAt !== current) };
}

type Change = { action: "cancel"; reason: string | null } | { action: "reschedule"; startsAt: Date };

export async function changeCustomerAppointment(owner: Owner, change: Change) {
  try {
    return await prisma.$transaction(async tx => {
      const appointment = await findCustomerAppointment(owner, tx);
      const now = new Date();
      const actor = { role: "CUSTOMER" as const, userId: owner.customerId };
      requireCustomerChange(appointment, change.action, now);
      if (change.action === "cancel") {
        const saved = await saveAppointmentTransition(tx, appointment, { type: "CANCELLED", reason: change.reason }, now, actor);
        return { ...saved, previousStart: appointment.scheduledStart };
      }
      if (+change.startsAt === +appointment.scheduledStart) {
        throw new BookingError("Choose a different time to reschedule.", 422);
      }
      const { slots, service } = await replacementAvailability(tx, appointment, bookingDate(change.startsAt), now);
      const slot = slots.find(option => option.startsAt === change.startsAt.toISOString());
      if (slot?.status !== "AVAILABLE") {
        throw new BookingError("That time is no longer available. Choose another slot.", 409);
      }
      await requireCustomerTimeAvailable(tx, appointment.customerId, change.startsAt, service.durationMinutes, appointment.id);
      const saved = await saveAppointmentTransition(tx, appointment, {
        type: "RESCHEDULED", startsAt: change.startsAt, endsAt: new Date(slot.endsAt),
      }, now, actor);
      return { ...saved, previousStart: appointment.scheduledStart };
    }, { isolationLevel: "Serializable", maxWait: 15_000, timeout: 20_000 });
  } catch (error) {
    if (isBookingWriteConflict(error)) {
      throw new BookingError("The appointment or slot changed while saving. Refresh and try again.", 409);
    }
    throw error;
  }
}
