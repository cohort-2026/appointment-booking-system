// Times are stored as milliseconds since 1970 (UTC). The timezone only matters
// when we display or group by date, which comes in a later step.
export interface Interval {
  start: number; // inclusive
  end: number;   // exclusive: the booking is over at this moment
}

const MS_PER_MINUTE = 60_000;

// Statuses that do NOT block availability. Kept in one place so it's easy to change.
export const NON_OCCUPYING_STATUSES = ["CANCELLED"];

export function occupiesAvailability(status: string): boolean {
  return !NON_OCCUPYING_STATUSES.includes(status.toUpperCase());
}

export function getInterval(time: string, durationMinutes: number): Interval {
  const start = new Date(time).getTime();
  return { start, end: start + durationMinutes * MS_PER_MINUTE };
}

export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}
// The agreed props contract. The component will re-export these.
export interface CalendarAppointment {
  id: string;
  staffId: string;
  time: string; // start timestamp, ISO string
  durationMinutes: number;
  status: string;
  serviceLabel: string;
  customerLabel: string;
}

// Returns the calendar date (YYYY-MM-DD) of a moment, as seen in the given timezone.
export function getDateKey(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ms);
}

// Keeps appointments for this staff ID that occupy time on any date in the range.
export function filterForStaffAndRange(
  appointments: CalendarAppointment[],
  selectedStaffId: string,
  rangeStart: string, // YYYY-MM-DD
  rangeEnd: string | undefined,
  timeZone: string,
): CalendarAppointment[] {
  const last = rangeEnd ?? rangeStart;
  return appointments.filter((a) => {
    if (a.staffId !== selectedStaffId) return false;
    if (!occupiesAvailability(a.status)) return false;
    const { start, end } = getInterval(a.time, a.durationMinutes);
    const startDay = getDateKey(start, timeZone);
    const endDay = getDateKey(end - 1, timeZone); // last moment actually occupied
    return startDay <= last && endDay >= rangeStart;
  });
}
// How far a timezone is ahead of UTC at a given moment (read from the timezone itself, no hardcoded offset).
function getOffsetMs(ms: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(ms);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(ms / 1000) * 1000;
}

// The moment when the clock in `timeZone` shows this date and minutes-from-midnight.
export function zonedToMs(dateKey: string, minutesFromMidnight: number, timeZone: string): number {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  const guess = Date.UTC(y, m - 1, d, 0, minutesFromMidnight);
  const first = guess - getOffsetMs(guess, timeZone);
  return guess - getOffsetMs(first, timeZone);
}

// The part of one appointment that falls inside one day's visible window.
export interface DaySegment {
  appointmentId: string;
  startOffset: number; // minutes from the top of the visible window
  endOffset: number;   // minutes from the top of the visible window
  clippedStart: boolean; // booking began before the visible window
  clippedEnd: boolean;   // booking continues after the visible window
}

export function getDaySegment(
  a: CalendarAppointment,
  dateKey: string,
  timeZone: string,
  dayStartHour: number,
  dayEndHour: number,
): DaySegment | null {
  const winStart = zonedToMs(dateKey, dayStartHour * 60, timeZone);
  const winEnd = zonedToMs(dateKey, dayEndHour * 60, timeZone);
  const { start, end } = getInterval(a.time, a.durationMinutes);
  const s = Math.max(start, winStart);
  const e = Math.min(end, winEnd);
  if (e <= s) return null;
  return {
    appointmentId: a.id,
    startOffset: (s - winStart) / MS_PER_MINUTE,
    endOffset: (e - winStart) / MS_PER_MINUTE,
    clippedStart: start < winStart,
    clippedEnd: end > winEnd,
  };
}

// Every grid cell the segment touches, including partly covered ones.
export function getOccupiedSlots(seg: DaySegment, slotMinutes: number): number[] {
  const first = Math.floor(seg.startOffset / slotMinutes);
  const last = Math.ceil(seg.endOffset / slotMinutes) - 1;
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}
// Every date (YYYY-MM-DD) from rangeStart to rangeEnd, inclusive. One date if rangeEnd is omitted.
export function getDateKeysInRange(rangeStart: string, rangeEnd?: string): string[] {
  const [y, m, d] = rangeStart.split("-").map(Number) as [number, number, number];
  const last = rangeEnd ?? rangeStart;
  const keys: string[] = [];
  for (let i = 0; i < 366; i++) {
    const key = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
    keys.push(key);
    if (key >= last) break;
  }
  return keys;
}

// "10:00" style label for a moment, as seen in the given timezone.
export function formatTimeLabel(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(ms);
}