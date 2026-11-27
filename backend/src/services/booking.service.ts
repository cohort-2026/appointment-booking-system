import { ACTIVE_APPOINTMENT_STATUSES } from "../lib/appointment-status.js";
import { bookedDurationMinutes, createBookingSnapshot } from "../lib/booking-snapshot.js";
import { MIN_RECOVERY_MINUTES } from "../lib/booking-buffer.js";
import prisma from "../lib/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import { BOOKING_TIME_ZONE, DAY_MS, bookingDate, bookingWeekday, bookingTimeLabel, parseBookingDate } from "../lib/time.js";
import { generateAppointmentSlots, intersectAvailabilityWindows, timeRangesOverlap } from "./availability.service.js";

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
export type CreateMultipleBookingsInput = Omit<CreateBookingInput, "startsAt"> & {
  startsAt: Date[]; mode: "separate" | "combined";
};
export const MAX_BOOKING_SLOTS = 12;
export const MAX_DAILY_CUSTOMER_APPOINTMENTS = 3;

export async function requireCustomerDailyCapacity(db: DatabaseClient, customerId: string, startsAt: Date, count: number, excludeAppointmentId?: string) {
  const date = bookingDate(startsAt);
  const day = parseBookingDate(date)!;
  const existing = await db.appointment.count({ where: {
    customerId, status: { in: ACTIVE_APPOINTMENT_STATUSES },
    scheduledStart: { gte: day, lt: new Date(day.getTime() + DAY_MS) },
    ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
  } });
  if (existing + count > MAX_DAILY_CUSTOMER_APPOINTMENTS) {
    throw new BookingError(`You can have at most 3 active appointments on ${date}.`, 409);
  }
}

export async function createMultipleBookings(input: CreateMultipleBookingsInput, db: Pick<typeof prisma, "$transaction"> = prisma) {
  if (!Array.isArray(input.startsAt) || input.startsAt.length < 1 || input.startsAt.length > MAX_BOOKING_SLOTS ||
      (input.mode !== "separate" && input.mode !== "combined") ||
      input.startsAt.some(start => !(start instanceof Date) || !Number.isFinite(start.getTime()))) {
    throw new BookingError("Choose between 1 and 12 valid appointment times", 400);
  }
  const starts = [...input.startsAt].sort((first, second) => first.getTime() - second.getTime());
  const date = bookingDate(starts[0]!);
  if (new Set(starts.map(start => start.getTime())).size !== starts.length) {
    throw new BookingError("Appointment times must be unique", 400);
  }
  if (input.mode === "combined" && starts.some(start => bookingDate(start) !== date)) {
    throw new BookingError("Combined appointment times must be on the same date", 400);
  }
  try {
  return await db.$transaction(async tx => {
    const customer = await tx.user.findFirst({ where: { id: input.customerId, role: "CUSTOMER", isVerified: true }, select: { id: true } });
    if (!customer) throw new BookingError("A verified customer account is required", 403);
    const dates = [...new Set(starts.map(start => bookingDate(start)))];
    const availabilityByDate = new Map<string, BookingAvailability>();
    for (const selectedDate of dates) {
      const availability = await resolveBookingAvailability(tx, { ...input, date: selectedDate });
      availabilityByDate.set(selectedDate, availability);
      const dayStarts = starts.filter(start => bookingDate(start) === selectedDate);
      if (dayStarts.some(start => !availability.slots.some(slot => slot.startsAt === start.toISOString() && slot.status === "AVAILABLE"))) {
        throw new BookingError("That time is no longer available. Choose another slot.", 409);
      }
      await requireCustomerDailyCapacity(tx, input.customerId, dayStarts[0]!, input.mode === "combined" ? 1 : dayStarts.length);
    }
    const { service } = availabilityByDate.get(date)!;
    const interval = (service.durationMinutes + service.bufferAfterMinutes) * 60_000;
    if (input.mode === "separate" && starts.some((start, index) => index > 0 &&
        start.getTime() - starts[index - 1]!.getTime() < interval)) {
      throw new BookingError("Selected appointment times overlap or do not allow recovery time.", 409);
    }
    if (input.mode === "combined" && starts.some((start, index) => index > 0 &&
        start.getTime() - starts[index - 1]!.getTime() !== interval)) {
      throw new BookingError("Combined appointment times must be consecutive", 400);
    }
    const duration = input.mode === "combined"
      ? (starts.at(-1)!.getTime() - starts[0]!.getTime()) / 60_000 + service.durationMinutes
      : service.durationMinutes;
    const price = input.mode === "combined" ? service.expectedPrice?.mul(starts.length) ?? null : service.expectedPrice;
    if (price?.abs().greaterThan("99999999.99")) {
      throw new BookingError("The total price is too large to book", 422);
    }
    const appointmentStarts = input.mode === "combined" ? [starts[0]!] : starts;
    for (const start of appointmentStarts) {
      await requireCustomerTimeAvailable(tx, input.customerId, start, duration);
    }
    const appointments = [];
    for (const start of appointmentStarts) {
      const snapshot = createBookingSnapshot(start, { ...service, durationMinutes: duration, expectedPrice: price });
      appointments.push(await tx.appointment.create({ data: { customerId: input.customerId, serviceId: input.serviceId,
      scheduledStart: start, ...snapshot, customerNotes: input.customerNotes ?? null,
      ...(input.providerKind === "sole" ? { soleProviderId: input.providerId } : { businessId: input.providerId, staffId: input.staffId! }),
      events: { create: { type: "CREATED", actor: "CUSTOMER", actorUserId: input.customerId, newStatus: "CONFIRMED",
        newScheduledStart: start, newScheduledEnd: snapshot.scheduledEnd } } },
      include: { service: { select: { name: true, durationMinutes: true } }, customer: { select: { firstName: true, email: true } },
        staff: { select: { user: { select: { firstName: true, lastName: true, email: true } } } },
        soleProvider: { select: { displayName: true, user: { select: { email: true } } } },
        business: { select: { name: true, owner: { select: { email: true } } } } } }));
    }
    return appointments;
  }, { isolationLevel: "Serializable", maxWait: 15_000, timeout: 20_000 });
  } catch (error) {
    if (isBookingWriteConflict(error)) throw new BookingError("That time was just booked. Please choose another slot.", 409);
    throw error;
  }
}

export async function createBooking(input: CreateBookingInput, db: Pick<typeof prisma, "$transaction"> = prisma) {
  const appointments = await createMultipleBookings({ ...input, startsAt: [input.startsAt], mode: "separate" }, db);
  return appointments[0]!;
}

/** Prisma's pg adapter may surface commit-time SQLSTATE directly rather than P2034. */
export function isBookingWriteConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; cause?: { originalCode?: unknown; kind?: unknown } };
  return value.code === "P2034" || value.code === "40001" || value.code === "40P01" ||
    value.cause?.originalCode === "40001" || value.cause?.originalCode === "40P01" ||
    value.cause?.kind === "TransactionWriteConflict";
}
