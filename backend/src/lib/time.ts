/** Sprint 1 operates exclusively in Johannesburg (UTC+02, no daylight saving). */
export const BOOKING_TIME_ZONE = "Africa/Johannesburg";
const OFFSET_MS = 2 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;
export function parseBookingDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const utc = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(utc.getTime()) || utc.toISOString().slice(0, 10) !== value) return null;
  return new Date(utc.getTime() - OFFSET_MS);
}
export function bookingDate(instant: Date): string {
  return new Date(instant.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}
export function bookingWeekday(instant: Date): number {
  return new Date(instant.getTime() + OFFSET_MS).getUTCDay();
}
export function bookingMinute(instant: Date): number {
  const shifted = new Date(instant.getTime() + OFFSET_MS);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}
export function bookingTimeLabel(instant: Date): string {
  return new Intl.DateTimeFormat("en-ZA", { timeZone: BOOKING_TIME_ZONE,
    hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(instant) + " SAST";
}

/** Johannesburg business reporting uses the same calendar at both month boundaries. */
export function bookingMonthBounds(instant: Date) {
  const monthKey = bookingDate(instant).slice(0, 7);
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5));
  const start = parseBookingDate(monthKey + "-01")!;
  const nextMonth = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  return { start, end: parseBookingDate(nextMonth)! };
}
