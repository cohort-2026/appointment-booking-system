import { MIN_RECOVERY_MINUTES } from "./booking-buffer.js";

export interface ServicePayload {
  name?: string;
  description?: string | null;
  durationMinutes?: number;
  bufferAfterMinutes?: number;
  expectedPrice?: number | null;
  active?: boolean;
}

export interface AvailabilityRulePayload {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
}

type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const SERVICE_FIELDS = new Set([
  "name",
  "description",
  "durationMinutes",
  "bufferAfterMinutes",
  "expectedPrice",
  "active",
]);

export function parseServicePayload(
  input: unknown,
  partial = false,
): ValidationResult<ServicePayload> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "A service object is required" };
  }

  const body = input as Record<string, unknown>;
  const unknownFields = Object.keys(body).filter((field) => !SERVICE_FIELDS.has(field));
  if (unknownFields.length > 0) {
    return { ok: false, error: `Unsupported service field: ${unknownFields[0]}` };
  }

  if (!partial && (!Object.hasOwn(body, "name") || !Object.hasOwn(body, "durationMinutes"))) {
    return { ok: false, error: "Service name and duration are required" };
  }
  if (partial && Object.keys(body).length === 0) {
    return { ok: false, error: "At least one service field must be provided" };
  }

  const data: ServicePayload = {};
  if (Object.hasOwn(body, "name")) {
    if (typeof body.name !== "string" || body.name.trim().length === 0 || body.name.trim().length > 100) {
      return { ok: false, error: "Service name must contain 1 to 100 characters" };
    }
    data.name = body.name.trim();
  }

  if (Object.hasOwn(body, "description")) {
    if (body.description !== null && (typeof body.description !== "string" || body.description.trim().length > 1000)) {
      return { ok: false, error: "Service description must be 1000 characters or fewer" };
    }
    data.description = typeof body.description === "string" ? body.description.trim() || null : null;
  }

  if (Object.hasOwn(body, "durationMinutes")) {
    if (!Number.isInteger(body.durationMinutes) || (body.durationMinutes as number) < 1 || (body.durationMinutes as number) > 1440) {
      return { ok: false, error: "Service duration must be a whole number between 1 and 1440 minutes" };
    }
    data.durationMinutes = body.durationMinutes as number;
  }

  if (Object.hasOwn(body, "bufferAfterMinutes")) {
    if (!Number.isInteger(body.bufferAfterMinutes) || (body.bufferAfterMinutes as number) < MIN_RECOVERY_MINUTES || (body.bufferAfterMinutes as number) > 1440) {
      return { ok: false, error: `Cleanup must be a whole number between ${MIN_RECOVERY_MINUTES} and 1440 minutes` };
    }
    data.bufferAfterMinutes = body.bufferAfterMinutes as number;
  }

  if (Object.hasOwn(body, "expectedPrice")) {
    if (body.expectedPrice === null) {
      data.expectedPrice = null;
    } else {
      const expectedPrice = typeof body.expectedPrice === "number" || typeof body.expectedPrice === "string"
        ? Number(body.expectedPrice)
        : Number.NaN;
      if (!Number.isFinite(expectedPrice) || expectedPrice < 0) {
        return { ok: false, error: "Expected price must be a non-negative number or null" };
      }
      data.expectedPrice = expectedPrice;
    }
  }

  if (Object.hasOwn(body, "active")) {
    if (typeof body.active !== "boolean") {
      return { ok: false, error: "Service active must be a boolean" };
    }
    data.active = body.active;
  }

  return { ok: true, data };
}

export function parseAvailabilityRules(input: unknown): ValidationResult<AvailabilityRulePayload[]> {
  if (!Array.isArray(input)) {
    return { ok: false, error: "Availability must be an array of weekly rules" };
  }

  const rules: AvailabilityRulePayload[] = [];
  const byDay = new Map<number, Array<{ start: number; end: number }>>();

  for (const [index, rawRule] of input.entries()) {
    if (!rawRule || typeof rawRule !== "object" || Array.isArray(rawRule)) {
      return { ok: false, error: `Availability rule ${index + 1} must be an object` };
    }

    const rule = rawRule as Record<string, unknown>;
    const allowedFields = new Set(["dayOfWeek", "startTime", "endTime", "active"]);
    if (Object.keys(rule).some((field) => !allowedFields.has(field))) {
      return { ok: false, error: `Availability rule ${index + 1} contains an unsupported field` };
    }
    if (!Number.isInteger(rule.dayOfWeek) || (rule.dayOfWeek as number) < 0 || (rule.dayOfWeek as number) > 6) {
      return { ok: false, error: `Availability rule ${index + 1} dayOfWeek must be between 0 and 6` };
    }
    if (typeof rule.startTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(rule.startTime)) {
      return { ok: false, error: `Availability rule ${index + 1} startTime must use HH:mm format` };
    }
    if (typeof rule.endTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(rule.endTime)) {
      return { ok: false, error: `Availability rule ${index + 1} endTime must use HH:mm format` };
    }
    if (rule.active !== undefined && typeof rule.active !== "boolean") {
      return { ok: false, error: `Availability rule ${index + 1} active must be a boolean` };
    }

    const start = Number(rule.startTime.slice(0, 2)) * 60 + Number(rule.startTime.slice(3));
    const end = Number(rule.endTime.slice(0, 2)) * 60 + Number(rule.endTime.slice(3));
    if (start >= end) {
      return { ok: false, error: `Availability rule ${index + 1} must end after it starts` };
    }

    const dayOfWeek = rule.dayOfWeek as number;
    const dayRules = byDay.get(dayOfWeek) ?? [];
    if (dayRules.some((existing) => start < existing.end && end > existing.start)) {
      return { ok: false, error: `Availability rules for day ${dayOfWeek} cannot overlap` };
    }
    dayRules.push({ start, end });
    byDay.set(dayOfWeek, dayRules);
    rules.push({
      dayOfWeek,
      startTime: rule.startTime,
      endTime: rule.endTime,
      active: rule.active ?? true,
    });
  }

  return { ok: true, data: rules };
}