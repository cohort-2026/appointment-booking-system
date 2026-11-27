import { parseBookingDate, bookingWeekday } from "../lib/time.js";
export type AvailabilityWindow = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
};

export type BookedRange = {
  start: Date;
  durationMinutes: number;
  bufferAfterMinutes?: number;
};

export type AppointmentSlot = {
  startsAt: Date;
  status: "AVAILABLE" | "BOOKED";
  recoveryUntil?: Date;
};

export function timeRangesOverlap(
  firstStart: Date,
  firstDurationMinutes: number,
  secondStart: Date,
  secondDurationMinutes: number,
): boolean {
  const firstEnd = firstStart.getTime() + firstDurationMinutes * 60_000;
  const secondEnd = secondStart.getTime() + secondDurationMinutes * 60_000;
  return firstStart.getTime() < secondEnd && firstEnd > secondStart.getTime();
}

export const parseLocalDate = parseBookingDate;

function parseMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function intersectAvailabilityWindows(
  businessWindows: AvailabilityWindow[],
  staffWindows: AvailabilityWindow[],
  dayOfWeek: number,
): AvailabilityWindow[] {
  const businessDay = businessWindows.filter((window) => window.active && window.dayOfWeek === dayOfWeek);
  const staffDay = staffWindows.filter((window) => window.active && window.dayOfWeek === dayOfWeek);

  if (staffWindows.length === 0) {
    return businessDay;
  }

  return businessDay.flatMap((business) => staffDay.flatMap((staff) => {
    const businessStart = parseMinutes(business.startTime);
    const businessEnd = parseMinutes(business.endTime);
    const staffStart = parseMinutes(staff.startTime);
    const staffEnd = parseMinutes(staff.endTime);
    if (businessStart === null || businessEnd === null || staffStart === null || staffEnd === null) return [];

    const start = Math.max(businessStart, staffStart);
    const end = Math.min(businessEnd, staffEnd);
    if (start >= end) return [];

    return [{
      dayOfWeek,
      startTime: `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`,
      endTime: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
      active: true,
    }];
  }));
}

export function generateAppointmentSlots(input: {
  date: string;
  durationMinutes: number;
  bufferAfterMinutes?: number;
  availability: AvailabilityWindow[];
  bookedRanges: BookedRange[];
  now?: Date;
}): AppointmentSlot[] {
  const date = parseBookingDate(input.date);
  const buffer = input.bufferAfterMinutes ?? 0;
  if (!date || !Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0 ||
      !Number.isInteger(buffer) || buffer < 0) return [];
  const duration = input.durationMinutes + buffer;
  const now = input.now ?? new Date();
  const dayOfWeek = bookingWeekday(date);
  // Merge overlapping/adjacent working intervals, preserving actual breaks.
  const intervals = input.availability.filter(w => w.active && w.dayOfWeek === dayOfWeek)
    .map(w => [parseMinutes(w.startTime), parseMinutes(w.endTime)])
    .filter((p): p is [number, number] => p[0] !== null && p[1] !== null && p[0]! < p[1]!)
    .sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [start, end] of intervals) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  const occupied = input.bookedRanges.map(booking => {
    const start = booking.start.getTime();
    const serviceEnd = start + booking.durationMinutes * 60_000;
    const occupiedMinutes = booking.durationMinutes + (booking.bufferAfterMinutes ?? 0);
    return { start: booking.start, serviceEnd, occupiedMinutes, end: start + occupiedMinutes * 60_000 };
  });
  const slots: AppointmentSlot[] = [];
  for (const [index, [start, end]] of merged.entries()) {
    for (let minute = start; minute < end; minute += duration) {
      const startsAt = new Date(date.getTime() + minute * 60_000);
      if (startsAt <= now) continue;
      const instant = startsAt.getTime();
      const duringAppointment = occupied.some(range => instant >= range.start.getTime() && instant < range.serviceEnd);
      const recoveryEnd = duringAppointment ? 0 : occupied.reduce((latest, range) =>
        instant >= range.serviceEnd && instant < range.end ? Math.max(latest, range.end) : latest, 0);
      // Include disabled recovery blocks even when a full service would not fit near closing.
      if (recoveryEnd) {
        slots.push({ startsAt, status: "BOOKED", recoveryUntil: new Date(recoveryEnd) });
        continue;
      }
      const requiredMinutes = index === merged.length - 1 ? input.durationMinutes : duration;
      if (minute + requiredMinutes > end) continue;
      const isBooked = occupied.some(booking =>
        timeRangesOverlap(startsAt, duration, booking.start, booking.occupiedMinutes));
      slots.push({ startsAt, status: isBooked ? "BOOKED" : "AVAILABLE" });
    }
  }
  return slots;
}
