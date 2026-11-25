import assert from "node:assert/strict";
import test from "node:test";
import { generateAppointmentSlots, intersectAvailabilityWindows, parseLocalDate, timeRangesOverlap, type AvailabilityWindow } from "./availability.service.js";
import { bookingMonthBounds, bookingDate, bookingMinute, bookingWeekday, bookingTimeLabel } from "../lib/time.js";
const monday: AvailabilityWindow = { dayOfWeek: 1, startTime: "09:00", endTime: "12:00", active: true };
const at = (time: string) => new Date(`2030-01-07T${time}:00+02:00`);
const base = { date: "2030-01-07", durationMinutes: 45, availability: [monday], bookedRanges: [], now: new Date("2029-01-01Z") };
test("Johannesburg dates, weekday and labels are independent of the host timezone", () => {
  assert.equal(parseLocalDate("2030-01-07")?.toISOString(), "2030-01-06T22:00:00.000Z");
  assert.equal(bookingDate(new Date("2030-01-06T22:30Z")), "2030-01-07");
  assert.equal(bookingWeekday(new Date("2030-01-06T22:30Z")), 1);
  assert.equal(bookingMinute(at("09:00")), 540);
  assert.equal(bookingTimeLabel(at("09:00")), "09:00 SAST");
  for (const invalid of ["2030-02-30", "2030/02/04", "2030-13-01", "2030-1-7"]) assert.equal(parseLocalDate(invalid), null);
});
test("45-minute services start every 15 minutes and finish inside hours", () => {
  const slots = generateAppointmentSlots(base);
  assert.equal(slots.length, 10);
  assert.equal(slots[0]?.startsAt.toISOString(), "2030-01-07T07:00:00.000Z");
  assert.equal(slots[1]?.startsAt.toISOString(), "2030-01-07T07:15:00.000Z");
  assert.equal(slots.at(-1)?.startsAt.toISOString(), "2030-01-07T09:15:00.000Z");
});
test("full service and cleanup must fit; exact adjacent boundary is allowed", () => {
  const slots = generateAppointmentSlots({ ...base, durationMinutes: 120, bufferAfterMinutes: 15 });
  assert.deepEqual(slots.map(s => bookingTimeLabel(s.startsAt)), ["09:00 SAST", "09:15 SAST", "09:30 SAST", "09:45 SAST"]);
  assert.equal(timeRangesOverlap(at("09:00"), 135, at("11:15"), 45), false);
  assert.equal(timeRangesOverlap(at("09:00"), 135, at("11:00"), 45), true);
});
test("cleanup on existing bookings blocks new starts and candidate cleanup cannot overlap the next visit", () => {
  const slots = generateAppointmentSlots({ ...base, durationMinutes: 30, bufferAfterMinutes: 15,
    bookedRanges: [{ start: at("10:00"), durationMinutes: 60, bufferAfterMinutes: 15 }] });
  const status = (time: string) => slots.find(s => +s.startsAt === +at(time))?.status;
  assert.equal(status("09:15"), "AVAILABLE");
  assert.equal(status("09:30"), "BOOKED");
  assert.equal(status("11:00"), "BOOKED");
  assert.equal(+slots.find(s => +s.startsAt === +at("11:00"))!.recoveryUntil!, +at("11:15"));
  assert.equal(slots.find(s => +s.startsAt === +at("10:45"))?.recoveryUntil, undefined);
  assert.equal(status("11:15"), "AVAILABLE");
});
test("recovery stays visible near closing even when a service no longer fits", () => {
  const slots = generateAppointmentSlots({ ...base, durationMinutes: 45, bufferAfterMinutes: 15,
    bookedRanges: [{ start: at("10:45"), durationMinutes: 60, bufferAfterMinutes: 15 }] });
  assert.deepEqual(slots.at(-1), { startsAt: at("11:45"), status: "BOOKED", recoveryUntil: at("12:00") });
});
test("past starts disappear; gaps stay closed; overlapping hours do not duplicate slots", () => {
  const slots = generateAppointmentSlots({ ...base, durationMinutes: 30, now: at("09:30"),
    availability: [monday, monday] });
  assert.equal(bookingTimeLabel(slots[0]!.startsAt), "09:45 SAST");
  assert.equal(new Set(slots.map(s => +s.startsAt)).size, slots.length);
  const split = generateAppointmentSlots({ ...base, durationMinutes: 60, availability: [
    { ...monday, endTime: "10:00" }, { ...monday, startTime: "10:30" }] });
  assert.equal(split.some(s => +s.startsAt === +at("09:30")), false);
});
test("effective business hours intersect staff hours; absent staff hours inherit, explicit inactive hours do not", () => {
  const window = { ...monday, startTime: "09:15", endTime: "11:00" };
  assert.deepEqual(intersectAvailabilityWindows([monday], [window], 1), [window]);
  assert.deepEqual(intersectAvailabilityWindows([monday], [], 1), [monday]);
  assert.deepEqual(intersectAvailabilityWindows([monday], [{ ...window, active: false }], 1), []);
  assert.deepEqual(generateAppointmentSlots({ ...base, availability: [] }), []);
});

test("Johannesburg month bounds agree at UTC month and year boundaries", () => {
  const { start, end } = bookingMonthBounds(new Date("2026-12-31T22:30:00Z"));
  assert.equal(start.toISOString(), "2026-12-31T22:00:00.000Z");
  assert.equal(end.toISOString(), "2027-01-31T22:00:00.000Z");
});
