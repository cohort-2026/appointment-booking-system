import assert from "node:assert/strict";
import test from "node:test";
import { parseServicePayload } from "./phase1-validation.js";

test("cleanup accepts the minimum and longer service settings", () => {
  assert.deepEqual(parseServicePayload({ bufferAfterMinutes: 15 }, true), { ok: true, data: { bufferAfterMinutes: 15 } });
  assert.deepEqual(parseServicePayload({ bufferAfterMinutes: 30 }, true), { ok: true, data: { bufferAfterMinutes: 30 } });
  const legacy = parseServicePayload({ name: "Consultation", durationMinutes: 120 });
  assert.equal(legacy.ok, true);
});
test("cleanup rejects fractional, negative, excessive and nonnumeric values", () => {
  for (const value of [-1, 0, 14, 15.5, 1441, "15", null, true]) assert.equal(parseServicePayload({ bufferAfterMinutes: value }, true).ok, false);
});
