export const BOOKING_TIME_ZONE = "Africa/Johannesburg";
export function sastDate(now = new Date()): string {
  return new Date(now.getTime() + 2 * 3_600_000).toISOString().slice(0, 10);
}
export function sastDateLimit(days: number): string {
  return sastDate(new Date(Date.now() + days * 86_400_000));
}
export function formatSast(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", { timeZone: BOOKING_TIME_ZONE, weekday: "short",
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(new Date(value)) + " SAST";
}
