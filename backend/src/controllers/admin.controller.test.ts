import assert from "node:assert/strict";
import test from "node:test";
import { maskEmail } from "./admin.controller.js";

test("maskEmail hides the local email portion", () => {
  assert.equal(maskEmail("alice@example.com"), "a****@example.com");
  assert.equal(maskEmail("x@example.com"), "x*@example.com");
});

test("maskEmail safely handles missing domains", () => {
  assert.equal(maskEmail("alice"), "hidden");
});
