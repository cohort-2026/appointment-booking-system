import { bookedDurationMinutes, createBookingSnapshot } from "../lib/booking-snapshot.js";
import { MIN_RECOVERY_MINUTES } from "../lib/booking-buffer.js";
import prisma from "../lib/prisma.js";
import type { AppointmentStatus, Prisma } from "../generated/prisma/client.js";
import { BOOKING_TIME_ZONE, DAY_MS, bookingDate, bookingWeekday, bookingTimeLabel, parseBookingDate } from "../lib/time.js";
import { generateAppointmentSlots, intersectAvailabilityWindows, timeRangesOverlap } from "./availability.service.js";

export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ["CONFIRMED", "RESCHEDULED"];

export class BookingError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = "BookingError"; }
}
type DatabaseClient = Prisma.TransactionClient;
export type BookingAvailabilityInput = {
  providerKind: "sole" | "business"; providerId: string; serviceId: string; date: string; staffId?: string;
  /** Internal S2 only: caller must authorize ownership and keep the same resource/service. Never accept this from public query params. */
  excludeAppointmentId?: string;
  snapshot?: { durationMinutes: number; bufferAfterMinutes: number };
  now?: Date;
};
export type BookingAvailability = {
  timeZone: string; cancellationCutoffHours: number;
  service: { id: string; name: string; durationMinutes: number; bufferAfterMinutes: number; expectedPrice: Prisma.Decimal | null };
  staff: Array<{ id: string; name: string }>;
  selectedStaffId: string | null;
  slots: Array<{ startsAt: string; endsAt: string; label: string; status: "AVAILABLE" | "BOOKED"; recoveryUntil?: string }>;
};
const serviceSelect = { id: true, name: true, durationMinutes: true, bufferAfterMinutes: true, expectedPrice: true } as const;
const hoursSelect = { dayOfWeek: true, startTime: true, endTime: true, active: true } as const;

export async function resolveBookingAvailability(db: DatabaseClient, input: BookingAvailabilityInput): Promise<BookingAvailability> {
  const now = input.now ?? new Date();
  const date = parseBookingDate(input.date);
  const today = parseBookingDate(bookingDate(now))!;
  if (!date) throw new BookingError("Choose a valid appointment date", 400);
  if (date < today) throw new BookingError("Past dates are not available", 400);
  if (date.getTime() > today.getTime() + 90 * DAY_MS) throw new BookingError("Appointments can only be booked up to 90 days ahead", 400);
  if (input.providerKind === "sole" && input.staffId) throw new BookingError("Sole providers do not accept a staff selection", 400);
  const whereService = { id: input.serviceId, active: true };
  const provider = input.providerKind === "sole"
    ? await db.soleProvider.findFirst({ where: { id: input.providerId, user: { isVerified: true } },
        select: { id: true, timeZone: true, cancellationCutoffHours: true, availability: { select: hoursSelect },
          services: { where: whereService, select: serviceSelect } } })
    : await db.business.findFirst({ where: { id: input.providerId, owner: { isVerified: true } },
        select: { id: true, timeZone: true, cancellationCutoffHours: true, availability: { select: hoursSelect },
          services: { where: whereService, select: serviceSelect } } });
  const currentService = provider?.services[0];
  if (!provider || !currentService) throw new BookingError("This provider or service is not available", 404);
  if (provider.timeZone !== BOOKING_TIME_ZONE) throw new BookingError("This provider's booking timezone is not supported yet", 422);
  const service = { ...currentService, ...(input.snapshot ?? {}) };
  if (!Number.isInteger(service.durationMinutes) || service.durationMinutes <= 0 ||
      !Number.isInteger(service.bufferAfterMinutes) || service.bufferAfterMinutes < 0) {
    throw new BookingError("This service needs a valid duration and cleanup time", 422);
  }
  service.bufferAfterMinutes = Math.max(service.bufferAfterMinutes, MIN_RECOVERY_MINUTES);
  let windows = provider.availability;
  let staff: BookingAvailability["staff"] = [];
  if (input.providerKind === "business") {
    const assignments = await db.staffService.findMany({ where: { serviceId: service.id,
      staff: { businessId: provider.id, user: { isVerified: true } } },
      select: { staffId: true, staff: { select: { availability: { select: hoursSelect },
        user: { select: { firstName: true, lastName: true } } } } } });
    staff = assignments.map(a => ({ id: a.staffId, name: `${a.staff.user.firstName} ${a.staff.user.lastName ?? ""}`.trim() }));
    if (!input.staffId) return { timeZone: provider.timeZone, cancellationCutoffHours: provider.cancellationCutoffHours,
      service, staff, selectedStaffId: null, slots: [] };
    const member = assignments.find(a => a.staffId === input.staffId);
    if (!member) throw new BookingError("Choose a staff member assigned to this service", 400);
    windows = intersectAvailabilityWindows(windows, member.staff.availability, bookingWeekday(date));
  }
  // No arbitrary look-back: a booking begun on an earlier day can still occupy this day.
  // Cleanup can cross midnight, so filter by occupied end in memory after selecting prior starts.
  const appointments = await db.appointment.findMany({ where: {
    ...(input.providerKind === "sole" ? { soleProviderId: provider.id } : { staffId: input.staffId! }),
    ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {}),
    status: { in: ACTIVE_APPOINTMENT_STATUSES }, scheduledStart: { lt: new Date(date.getTime() + DAY_MS) },
  }, include: { service: { select: { durationMinutes: true } } } });
  const bookedRanges = appointments.map(a => ({ start: a.scheduledStart,
    durationMinutes: bookedDurationMinutes(a),
    bufferAfterMinutes: Math.max(a.bufferAfterMinutesAtBooking, MIN_RECOVERY_MINUTES) }))
    .filter(a => a.start.getTime() + (a.durationMinutes + a.bufferAfterMinutes) * 60_000 > date.getTime());
  const slots = generateAppointmentSlots({ date: input.date, durationMinutes: service.durationMinutes,
    bufferAfterMinutes: service.bufferAfterMinutes, availability: windows, bookedRanges, now });
  return { timeZone: provider.timeZone, cancellationCutoffHours: provider.cancellationCutoffHours, service, staff,
    selectedStaffId: input.providerKind === "business" ? input.staffId! : null,
    slots: slots.map(s => ({ startsAt: s.startsAt.toISOString(), endsAt: new Date(s.startsAt.getTime() + service.durationMinutes * 60_000).toISOString(),
      label: bookingTimeLabel(s.startsAt), status: s.status,
      ...(s.recoveryUntil ? { recoveryUntil: s.recoveryUntil.toISOString() } : {}) })) };
}

export async function requireCustomerTimeAvailable(
  db: DatabaseClient, customerId: string, startsAt: Date, durationMinutes: number, excludeAppointmentId?: string,
) {
  const scheduledEnd = new Date(startsAt.getTime() + durationMinutes * 60_000);
  const bookings = await db.appointment.findMany({
    where: {
      customerId, ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      status: { in: ACTIVE_APPOINTMENT_STATUSES }, scheduledStart: { lt: scheduledEnd },
    },
    include: { service: { select: { durationMinutes: true } } },
  });
  if (bookings.some(booking => timeRangesOverlap(
    startsAt, durationMinutes, booking.scheduledStart, bookedDurationMinutes(booking),
  ))) throw new BookingError("You already have a booking during this time.", 409);
}

export type CreateBookingInput = {
  customerId: string; providerKind: "sole" | "business"; providerId: string;
  serviceId: string; startsAt: Date; staffId?: string; customerNotes?: string | null;
};
/** Shared by both entry points. The SERIALIZABLE transaction protects resource and customer overlap predicates. */
export async function createBooking(input: CreateBookingInput, db: Pick<typeof prisma, "$transaction"> = prisma) {
  try {
  return await db.$transaction(async tx => {
    const customer = await tx.user.findFirst({ where: { id: input.customerId, role: "CUSTOMER", isVerified: true }, select: { id: true } });
    if (!customer) throw new BookingError("A verified customer account is required", 403);
    const availability = await resolveBookingAvailability(tx, { ...input, date: bookingDate(input.startsAt) });
    const slot = availability.slots.find(s => s.startsAt === input.startsAt.toISOString());
    if (!slot || slot.status !== "AVAILABLE") throw new BookingError("That time is no longer available. Choose another slot.", 409);
    const snapshot = createBookingSnapshot(input.startsAt, availability.service);
    await requireCustomerTimeAvailable(tx, input.customerId, input.startsAt, availability.service.durationMinutes);
    return tx.appointment.create({ data: { customerId: input.customerId, serviceId: input.serviceId,
      scheduledStart: input.startsAt, ...snapshot, customerNotes: input.customerNotes ?? null,
      ...(input.providerKind === "sole" ? { soleProviderId: input.providerId } : { businessId: input.providerId, staffId: input.staffId! }),
      events: { create: { type: "CREATED", actor: "CUSTOMER", actorUserId: input.customerId, newStatus: "CONFIRMED",
        newScheduledStart: input.startsAt, newScheduledEnd: snapshot.scheduledEnd } } },
      include: { service: { select: { name: true, durationMinutes: true } }, customer: { select: { firstName: true, email: true } },
        staff: { select: { user: { select: { firstName: true, lastName: true } } } },
        soleProvider: { select: { displayName: true } }, business: { select: { name: true } } } });
  }, { isolationLevel: "Serializable", maxWait: 15_000, timeout: 20_000 });
  } catch (error) {
    if (isBookingWriteConflict(error)) throw new BookingError("That time was just booked. Please choose another slot.", 409);
    throw error;
  }
}

/** Prisma's pg adapter may surface commit-time SQLSTATE directly rather than P2034. */
export function isBookingWriteConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; cause?: { originalCode?: unknown; kind?: unknown } };
  return value.code === "P2034" || value.code === "40001" || value.code === "40P01" ||
    value.cause?.originalCode === "40001" || value.cause?.originalCode === "40P01" ||
    value.cause?.kind === "TransactionWriteConflict";
}
