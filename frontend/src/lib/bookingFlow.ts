import type { ProviderAvailabilityResponse } from "../services/bookings";
import { getDashboardPath } from "./dashboardPath";
import { bookingDraftPath, clearBookingDraft, draftBelongsToCustomer, isBookingDraftExpired, readBookingDraft, saveBookingDraft } from "./bookingDraft";

// Only known customer destinations are accepted; never navigate arbitrary URLs from query strings.
export function safeCustomerReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || Array.from(value).some(character => character.charCodeAt(0) <= 32 || character === "\\")) return null;
  try {
    const url = new URL(value, "https://booking.invalid");
    if (url.origin !== "https://booking.invalid" || url.hash) return null;
    const path = decodeURIComponent(url.pathname);
    const dashboardBooking = /^\/dashboard\/customer\/book\/((?:sole|business):[A-Za-z0-9_-]+)$/.exec(path);
    if (dashboardBooking) return `/dashboard/customer/book/${encodeURIComponent(dashboardBooking[1])}`;
    const provider = /^\/providers\/((?:sole|business):[A-Za-z0-9_-]+)$/.exec(path);
    if (provider) return `/providers/${encodeURIComponent(provider[1])}`;
    if (/^\/dashboard\/customer\/appointments\/[A-Za-z0-9_-]+$/.test(path)) {
      return path + (url.searchParams.get("confirmed") === "1" ? "?confirmed=1" : "");
    }
    if (/^\/dashboard\/customer(?:\/(?:appointments|book|profile))?$/.test(path)) return path;
    return null;
  } catch {
    return null;
  }
}

export function postLoginDestination(user: { role: string }, requestedReturnTo: unknown): string | null {
  if (user.role === "CUSTOMER") {
    return safeCustomerReturnPath(requestedReturnTo) ?? getDashboardPath(user.role);
  }
  return getDashboardPath(user.role);
}

export function validateBookingSelection(input: {
  business: boolean;
  staffId: string;
  startsAt: string | null;
  availability: ProviderAvailabilityResponse;
  now?: number;
}) {
  const invalidStaff = input.business && Boolean(input.staffId) && !input.availability.staff.some(member => member.id === input.staffId);
  const invalidTime = Boolean(input.startsAt) && (
    invalidStaff ||
    Date.parse(input.startsAt!) <= (input.now ?? Date.now()) ||
    !input.availability.slots.some(slot => slot.startsAt === input.startsAt && slot.status === "AVAILABLE")
  );
  return { invalidStaff, invalidTime };
}

type VerificationResult = { destination: string; message: string; error: boolean };

/** Keep PR #89's automatic booking after OTP for the pending-booking journey. */
export async function finishVerifiedBooking(
  user: { id: string; role: string },
  returnTo: unknown,
  createBooking: (input: { providerId: string; serviceId: string; startsAt: string; staffId?: string; customerNotes?: string }) => Promise<{ appointment: { id: string } }>,
): Promise<VerificationResult> {
  const dashboard = getDashboardPath(user.role) ?? "/";
  if (user.role !== "CUSTOMER") return { destination: dashboard, message: "Email verified!", error: false };
  const explicit = safeCustomerReturnPath(returnTo);
  if (!explicit) return { destination: dashboard, message: "Email verified!", error: false };

  const draft = readBookingDraft();
  // Only a verification initiated for this draft can complete the booking.
  if (!draft || explicit !== bookingDraftPath(draft) || !draftBelongsToCustomer(draft, user.id)) {
    return { destination: explicit, message: "Email verified!", error: false };
  }

  const recoveryPath = explicit;
  const boundDraft = { ...draft, customerId: user.id };
  if (!saveBookingDraft(boundDraft)) {
    return { destination: recoveryPath, message: "Email verified, but your browser could not preserve the booking. Please choose it again.", error: true };
  }
  if (draft.mode) {
    return { destination: recoveryPath, message: "Email verified. Review your selected times to complete your booking.", error: false };
  }
  if (isBookingDraftExpired(draft) || !draft.startsAt || Date.parse(draft.startsAt) <= Date.now()) {
    return { destination: recoveryPath, message: "Email verified. Your saved selection needs an available time before it can be booked.", error: true };
  }

  try {
    const result = await createBooking({
      providerId: draft.providerId,
      serviceId: draft.serviceId,
      startsAt: draft.startsAt,
      ...(draft.staffId ? { staffId: draft.staffId } : {}),
      ...(draft.customerNotes ? { customerNotes: draft.customerNotes } : {}),
    });
    // Clear only after the server confirms that creation succeeded.
    const cleared = clearBookingDraft();
    return {
      destination: `/dashboard/customer/appointments/${encodeURIComponent(result.appointment.id)}?confirmed=1`,
      message: cleared ? "Email verified and your appointment is booked." : "Appointment booked. Browser storage could not be cleared; check My appointments before booking again.",
      error: !cleared,
    };
  } catch (error) {
    // A rejected slot can be replaced. For network/5xx failures, preserve it because
    // the server may have committed; this patch does not introduce idempotency.
    const rejected = error instanceof Error && "status" in error && typeof error.status === "number" && [400, 404, 409, 422].includes(error.status);
    const retained = rejected ? { ...boundDraft, startsAt: undefined } : boundDraft;
    const saved = saveBookingDraft(retained);
    return {
      destination: recoveryPath,
      message: rejected
        ? `Email verified, but the booking was not accepted: ${error.message}. Choose a replacement. ${saved ? "Your service selection is saved." : "Your browser could not save the selection."}`
        : "Email verified, but we could not determine the booking result. Check My appointments before trying again; your selection has been retained where browser storage is available.",
      error: true,
    };
  }
}
