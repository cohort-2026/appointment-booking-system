import test from "node:test";
import assert from "node:assert/strict";
import { appointmentCalendar } from "./appointment-calendar.js";

const base = {
  id: "appointment-123",
  startsAt: new Date("2026-11-23T08:00:00Z"),
  endsAt: new Date("2026-11-23T09:00:00Z"),
  service: "Cut, style; wash",
  provider: "Demo Team",
};

test("confirmation attachment uses the saved UTC interval and escapes descriptions", () => {
  const file = appointmentCalendar(base);
  assert.match(file, /UID:appointment-123@itthynkappoint/);
  assert.match(file, /DTSTART:20261123T080000Z/);
  assert.match(file, /DTEND:20261123T090000Z/);
  assert.ok(file.includes("SUMMARY:Cut\\, style\\; wash - Demo Team"));
  assert.match(file, /METHOD:PUBLISH/);
  assert.ok(file.includes("\r\n"));
});

test("reschedule and cancellation preserve event UID and increase sequence", () => {
  const moved = appointmentCalendar({ ...base, sequence: 1 });
  const cancelled = appointmentCalendar({ ...base, sequence: 2, cancelled: true });
  for (const event of [moved, cancelled]) assert.match(event, /UID:appointment-123@itthynkappoint/);
  assert.match(moved, /SEQUENCE:1/);
  assert.match(cancelled, /SEQUENCE:2/);
  assert.match(cancelled, /METHOD:CANCEL/);
  assert.match(cancelled, /STATUS:CANCELLED/);
});
