export const BOOKING_DRAFT_KEY = "appointment-booking-draft";
export const BOOKING_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export type BookingDraft = {
  version: 1;
  providerId: string;
  serviceId: string;
  date: string;
  startsAt?: string;
  staffId?: string;
  customerId?: string;
  savedAt: number;
};

export function parseBookingDraft(raw: string | null): BookingDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (value.version !== undefined && value.version !== 1) return null;
    if (typeof value.providerId !== "string" || !/^(sole|business):[A-Za-z0-9_-]+$/.test(value.providerId)) return null;
    if (typeof value.serviceId !== "string" || !value.serviceId) return null;
    if (typeof value.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) return null;
    if (value.startsAt !== undefined && (typeof value.startsAt !== "string" || !Number.isFinite(Date.parse(value.startsAt)))) return null;
    for (const key of ["staffId", "customerId"]) {
      if (value[key] !== undefined && (typeof value[key] !== "string" || !value[key])) return null;
    }
    return {
      version: 1,
      providerId: value.providerId,
      serviceId: value.serviceId,
      date: value.date,
      ...(value.startsAt ? { startsAt: value.startsAt } : {}),
      ...(value.staffId ? { staffId: value.staffId } : {}),
      ...(value.customerId ? { customerId: value.customerId } : {}),
      // Legacy drafts have no timestamp: retain service information, but never auto-submit them.
      savedAt: typeof value.savedAt === "number" && Number.isFinite(value.savedAt) ? value.savedAt : 0,
    };
  } catch {
    return null;
  }
}

export function readBookingDraft(): BookingDraft | null {
  try {
    return parseBookingDraft(window.localStorage.getItem(BOOKING_DRAFT_KEY));
  } catch {
    return null;
  }
}

export function saveBookingDraft(draft: BookingDraft): boolean {
  try {
    window.localStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearBookingDraft(): boolean {
  try {
    window.localStorage.removeItem(BOOKING_DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}

export function isBookingDraftExpired(draft: BookingDraft, now = Date.now()): boolean {
  return draft.savedAt <= 0 || draft.savedAt > now || now - draft.savedAt >= BOOKING_DRAFT_TTL_MS;
}

export function draftBelongsToCustomer(draft: BookingDraft, customerId: string): boolean {
  return !draft.customerId || draft.customerId === customerId;
}

export function bookingDraftPath(draft: Pick<BookingDraft, "providerId">): string {
  return `/providers/${encodeURIComponent(draft.providerId)}`;
}
