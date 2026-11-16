import { describe, it, expect } from "vitest";
import {
  getInterval,
  intervalsOverlap,
  occupiesAvailability,
  filterForStaffAndRange,
  getDaySegment,
  getOccupiedSlots,
  type CalendarAppointment,
} from "./staffCalendar";

const MIN = 60_000;
const at = (iso: string) => Date.parse(iso);

describe("getInterval", () => {
  it("120 minutes at 10:00 occupies 10:00 to 12:00", () => {
    const i = getInterval("2026-11-17T10:00:00Z", 120);
    expect(i.start).toBe(at("2026-11-17T10:00:00Z"));
    expect(i.end).toBe(at("2026-11-17T12:00:00Z"));
  });

  it("45 minutes occupies its real interval, not a whole slot", () => {
    const i = getInterval("2026-11-17T10:00:00Z", 45);
    expect(i.end - i.start).toBe(45 * MIN);
    expect(i.end).toBe(at("2026-11-17T10:45:00Z"));
  });
});

describe("intervalsOverlap", () => {
  it("a booking ending at 12:00 does not block one starting at 12:00", () => {
    const a = getInterval("2026-11-17T10:00:00Z", 120);
    const b = getInterval("2026-11-17T12:00:00Z", 30);
    expect(intervalsOverlap(a, b)).toBe(false);
    expect(intervalsOverlap(b, a)).toBe(false);
  });

  it("bookings that share time do overlap", () => {
    const a = getInterval("2026-11-17T10:00:00Z", 120);
    const b = getInterval("2026-11-17T11:59:00Z", 30);
    expect(intervalsOverlap(a, b)).toBe(true);
  });
});

describe("occupiesAvailability", () => {
  it("cancelled does not occupy", () => {
    expect(occupiesAvailability("CANCELLED")).toBe(false);
    expect(occupiesAvailability("cancelled")).toBe(false);
  });

  it("confirmed occupies", () => {
    expect(occupiesAvailability("CONFIRMED")).toBe(true);
  });
});
const TZ = "Africa/Johannesburg"; // placeholder until the demo timezone is confirmed

const make = (over: Partial<CalendarAppointment>): CalendarAppointment => ({
  id: "a1",
  staffId: "staff-1",
  time: "2026-11-17T08:00:00Z",
  durationMinutes: 60,
  status: "CONFIRMED",
  serviceLabel: "Haircut",
  customerLabel: "Sam",
  ...over,
});

describe("filterForStaffAndRange", () => {
  it("same-name staff with different IDs do not share entries", () => {
    const list = [
      make({ id: "a1", staffId: "staff-1" }),
      make({ id: "a2", staffId: "staff-2" }),
    ];
    const result = filterForStaffAndRange(list, "staff-1", "2026-11-17", undefined, TZ);
    expect(result.map((a) => a.id)).toEqual(["a1"]);
  });

  it("bookings on other dates do not appear", () => {
    const list = [make({ time: "2026-11-18T08:00:00Z" })];
    expect(filterForStaffAndRange(list, "staff-1", "2026-11-17", undefined, TZ)).toHaveLength(0);
  });

  it("cancelled bookings are not returned", () => {
    const list = [make({ status: "CANCELLED" })];
    expect(filterForStaffAndRange(list, "staff-1", "2026-11-17", undefined, TZ)).toHaveLength(0);
  });

  it("uses the given timezone: 22:30 UTC is already the 18th in Johannesburg", () => {
    const list = [make({ time: "2026-11-17T22:30:00Z" })];
    expect(filterForStaffAndRange(list, "staff-1", "2026-11-18", undefined, TZ)).toHaveLength(1);
    expect(filterForStaffAndRange(list, "staff-1", "2026-11-17", undefined, TZ)).toHaveLength(0);
  });

  it("a booking that runs past midnight still shows on the next day", () => {
    // 23:00 local on the 17th for 120 min, ends 01:00 on the 18th
    const list = [make({ time: "2026-11-17T21:00:00Z", durationMinutes: 120 })];
    expect(filterForStaffAndRange(list, "staff-1", "2026-11-18", undefined, TZ)).toHaveLength(1);
  });

  it("a booking ending exactly at midnight does not show on the next day", () => {
    const list = [make({ time: "2026-11-17T20:00:00Z", durationMinutes: 120 })];
    expect(filterForStaffAndRange(list, "staff-1", "2026-11-18", undefined, TZ)).toHaveLength(0);
  });
});
describe("getDaySegment and getOccupiedSlots (window 08:00 to 18:00, Johannesburg is UTC+2)", () => {
  const seg = (over: Partial<CalendarAppointment>, day = "2026-11-17") =>
    getDaySegment(make(over), day, TZ, 8, 18);

  it("120 min at 10:00 fills four half-hour cells or two hourly cells", () => {
    const s = seg({ time: "2026-11-17T08:00:00Z", durationMinutes: 120 })!;
    expect(getOccupiedSlots(s, 30)).toEqual([4, 5, 6, 7]);
    expect(getOccupiedSlots(s, 60)).toEqual([2, 3]);
  });

  it("45 min at 10:00 fills its real interval, with a partly covered last cell", () => {
    const s = seg({ time: "2026-11-17T08:00:00Z", durationMinutes: 45 })!;
    expect([s.startOffset, s.endOffset]).toEqual([120, 165]);
    expect(getOccupiedSlots(s, 30)).toEqual([4, 5]);
  });

  it("a booking that starts before the window is clipped at the top", () => {
    const s = seg({ time: "2026-11-17T05:00:00Z", durationMinutes: 120 })!; // 07:00 to 09:00 local
    expect(s.clippedStart).toBe(true);
    expect([s.startOffset, s.endOffset]).toEqual([0, 60]);
  });

  it("a booking that runs past the window end is clipped at the bottom", () => {
    const s = seg({ time: "2026-11-17T15:00:00Z", durationMinutes: 120 })!; // 17:00 to 19:00 local
    expect(s.clippedEnd).toBe(true);
    expect([s.startOffset, s.endOffset]).toEqual([540, 600]);
  });

  it("returns null when the booking is on another day", () => {
    expect(seg({ time: "2026-11-18T08:00:00Z" })).toBeNull();
  });

  it("back-to-back bookings share no cells", () => {
    const a = seg({ time: "2026-11-17T08:00:00Z", durationMinutes: 120 })!;
    const b = seg({ time: "2026-11-17T10:00:00Z", durationMinutes: 60 })!;
    const shared = getOccupiedSlots(a, 30).filter((i) => getOccupiedSlots(b, 30).includes(i));
    expect(shared).toEqual([]);
  });
});