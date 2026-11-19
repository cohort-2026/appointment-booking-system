/** Booking-time values: never recalculate these from a subsequently edited service. */
export function createBookingSnapshot<Price>(startsAt: Date, service: {
  durationMinutes: number;
  expectedPrice: Price;
  bufferAfterMinutes: number;
}) {
  if (!Number.isFinite(startsAt.getTime()) ||
      !Number.isInteger(service.durationMinutes) || service.durationMinutes <= 0 ||
      !Number.isInteger(service.bufferAfterMinutes) || service.bufferAfterMinutes < 0) {
    throw new RangeError("Invalid booking interval");
  }
  const scheduledEnd = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
  if (!Number.isFinite(scheduledEnd.getTime())) throw new RangeError("Invalid booking end");
  return {
    scheduledEnd,
    priceAtBooking: service.expectedPrice,
    bufferAfterMinutesAtBooking: service.bufferAfterMinutes,
  };
}

/** Temporary fallback for records written by an old instance during rollout. */
export function bookedDurationMinutes(appointment: {
  scheduledStart: Date;
  scheduledEnd: Date | null;
  service: { durationMinutes: number };
}): number {
  return appointment.scheduledEnd
    ? (appointment.scheduledEnd.getTime() - appointment.scheduledStart.getTime()) / 60_000
    : appointment.service.durationMinutes;
}

/** A saved null price is meaningful; only a missing snapshot allows live-price fallback. */
export function bookedPrice<Price>(appointment: {
  scheduledEnd: Date | null;
  priceAtBooking: Price;
  service: { expectedPrice: Price };
}): Price {
  return appointment.scheduledEnd ? appointment.priceAtBooking : appointment.service.expectedPrice;
}
