import assert from "node:assert/strict";
import test from "node:test";
import { parseServicePayload } from "./phase1-validation.js";

test("cleanup can be set or cleared without rewriting booking snapshots", () => {
  assert.deepEqual(parseServicePayload({ bufferAfterMinutes: 15 }, true), { ok: true, data: { bufferAfterMinutes: 15 } });
  assert.deepEqual(parseServicePayload({ bufferAfterMinutes: 0 }, true), { ok: true, data: { bufferAfterMinutes: 0 } });
  const legacy = parseServicePayload({ name: "Consultation", durationMinutes: 120 });
  assert.equal(legacy.ok, true);
});
test("cleanup rejects fractional, negative, excessive and nonnumeric values", () => {
  for (const value of [-1, 1.5, 1441, "15", null, true]) assert.equal(parseServicePayload({ bufferAfterMinutes: value }, true).ok, false);
});
