type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface StaffInvitationAcceptance {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}

const STAFF_PASSWORD_RULES = [/.{8,}/, /[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/];

export function parseStaffInvitationEmail(input: unknown): ValidationResult<string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "A valid staff email is required" };
  }
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some((field) => field !== "email")) {
    return { ok: false, error: "Only an email field is accepted" };
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { ok: false, error: "A valid staff email is required" };
  }
  return { ok: true, data: email };
}

export function parseStaffInvitationAcceptance(input: unknown): ValidationResult<StaffInvitationAcceptance> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "A valid invitation, name, and password are required" };
  }
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some((field) => !["token", "firstName", "lastName", "password", "agree"].includes(field))) {
    return { ok: false, error: "The invitation acceptance contains unsupported fields" };
  }
  const token = typeof body.token === "string" ? body.token : "";
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (
    token.length < 32 ||
    token.length > 128 ||
    firstName.length < 1 ||
    firstName.length > 100 ||
    lastName.length > 100 ||
    body.agree !== true ||
    !STAFF_PASSWORD_RULES.every((rule) => rule.test(password))
  ) {
    return { ok: false, error: "A valid invitation, name, password, and terms acceptance are required" };
  }
  return { ok: true, data: { token, firstName, lastName, password } };
}

export function parseStaffActiveUpdate(input: unknown): ValidationResult<boolean> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Only a boolean isActive field may be updated" };
  }
  const body = input as Record<string, unknown>;
  if (Object.keys(body).length !== 1 || typeof body.isActive !== "boolean") {
    return { ok: false, error: "Only a boolean isActive field may be updated" };
  }
  return { ok: true, data: body.isActive };
}

export function parseServiceIdList(input: unknown): ValidationResult<string[]> {
  if (
    !Array.isArray(input) ||
    input.some((id) => typeof id !== "string" || id.length === 0) ||
    new Set(input).size !== input.length
  ) {
    return { ok: false, error: "serviceIds must be an array of unique service IDs" };
  }
  return { ok: true, data: input };
}