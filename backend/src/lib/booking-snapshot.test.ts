import test from "node:test";
import assert from "node:assert/strict";
import { createBookingSnapshot, bookedDurationMinutes, bookedPrice } from "./booking-snapshot.js";

test("snapshot keeps service end separate from cleanup and preserves exact price", () => {
  const price = { toString: () => "123.45" }; // Decimal-like value is retained, not converted to float.
  const service = { durationMinutes: 120, expectedPrice: price, bufferAfterMinutes: 15 };
  const start = new Date("2026-11-19T07:00:00Z");
  const snapshot = createBookingSnapshot(start, service);
  assert.equal(snapshot.scheduledEnd.toISOString(), "2026-11-19T09:00:00.000Z");
  assert.equal(snapshot.priceAtBooking, price);
  assert.equal(snapshot.bufferAfterMinutesAtBooking, 15);
  service.durationMinutes = 30;
  service.bufferAfterMinutes = 0;
  assert.equal(bookedDurationMinutes({ scheduledStart: start, ...snapshot, service }), 120);
  assert.equal(snapshot.bufferAfterMinutesAtBooking, 15);
});

test("unknown price stays null; legacy rows have an explicit temporary fallback", () => {
  const start = new Date("2026-11-19T07:00:00Z");
  assert.equal(createBookingSnapshot(start, {
    durationMinutes: 45, expectedPrice: null, bufferAfterMinutes: 0,
  }).priceAtBooking, null);
  assert.equal(bookedDurationMinutes({ scheduledStart: start, scheduledEnd: null,
    service: { durationMinutes: 45 } }), 45);
});

test("invalid dates, durations and cleanup cannot produce snapshots", () => {
  for (const durationMinutes of [0, -1, 1.5, NaN]) {
    assert.throws(() => createBookingSnapshot(new Date(), {
      durationMinutes, expectedPrice: null, bufferAfterMinutes: 0,
    }), RangeError);
  }
  for (const bufferAfterMinutes of [-1, 0.5, NaN]) {
    assert.throws(() => createBookingSnapshot(new Date(), {
      durationMinutes: 30, expectedPrice: null, bufferAfterMinutes,
    }), RangeError);
  }
  assert.throws(() => createBookingSnapshot(new Date("invalid"), {
    durationMinutes: 30, expectedPrice: null, bufferAfterMinutes: 0,
  }), RangeError);
});


test("an unknown saved price never becomes a later service price", () => {
  const saved = { scheduledEnd: new Date("2026-11-19T09:00:00Z"),
    priceAtBooking: null, service: { expectedPrice: "999.99" as string | null } };
  assert.equal(bookedPrice(saved), null);
  assert.equal(bookedPrice({ ...saved, scheduledEnd: null }), "999.99");
});
