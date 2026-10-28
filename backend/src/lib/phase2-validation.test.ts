import assert from "node:assert/strict";
import test from "node:test";
import {
  parseServiceIdList,
  parseStaffActiveUpdate,
  parseStaffInvitationAcceptance,
  parseStaffInvitationEmail,
} from "./phase2-validation.js";

test("staff invitation email is normalized and validated", () => {
  assert.deepEqual(parseStaffInvitationEmail({ email: "  STAFF@EXAMPLE.COM " }), {
    ok: true,
    data: "staff@example.com",
  });
  assert.equal(parseStaffInvitationEmail({ email: "not-an-email" }).ok, false);
  assert.equal(parseStaffInvitationEmail({ email: "staff@example.com", businessId: "forged" }).ok, false);
});

test("invitation acceptance requires a token, valid password, and terms acceptance", () => {
  const token = "a".repeat(43);
  assert.deepEqual(parseStaffInvitationAcceptance({
    token,
    firstName: "Sam",
    lastName: "Lee",
    password: "StrongPass1!",
    agree: true,
  }), {
    ok: true,
    data: { token, firstName: "Sam", lastName: "Lee", password: "StrongPass1!" },
  });
  assert.equal(parseStaffInvitationAcceptance({ token, firstName: "Sam", password: "weak" }).ok, false);
});

test("staff update only accepts the active flag", () => {
  assert.deepEqual(parseStaffActiveUpdate({ isActive: false }), { ok: true, data: false });
  assert.equal(parseStaffActiveUpdate({ role: "ADMIN" }).ok, false);
});

test("service assignment IDs must be unique non-empty strings", () => {
  assert.deepEqual(parseServiceIdList(["service-1", "service-2"]), {
    ok: true,
    data: ["service-1", "service-2"],
  });
  assert.equal(parseServiceIdList(["service-1", "service-1"]).ok, false);
  assert.equal(parseServiceIdList([""]).ok, false);
});