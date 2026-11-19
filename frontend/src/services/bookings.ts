import { apiFetch } from "./api";

export type BookingStaffOption = { id: string; name: string };
export type BookingSlot = { startsAt: string; endsAt: string; label: string; status: "AVAILABLE" | "BOOKED"; recoveryUntil?: string };

export type ProviderAvailabilityResponse = {
  success: boolean;
  timeZone: string;
  cancellationCutoffHours: number;
  service: { id: string; name: string; durationMinutes: number; bufferAfterMinutes: number; expectedPrice: string | null };
  staff: BookingStaffOption[];
  selectedStaffId: string | null;
  slots: BookingSlot[];
};

export function fetchProviderAvailability(input: {
  providerId: string;
  serviceId: string;
  date: string;
  staffId?: string;
}) {
  const query = new URLSearchParams({ serviceId: input.serviceId, date: input.date });
  if (input.staffId) query.set("staffId", input.staffId);

  return apiFetch<ProviderAvailabilityResponse>(
    `/providers/${encodeURIComponent(input.providerId)}/availability?${query.toString()}`,
  );
}

export function createAppointment(input: {
  customerNotes?: string;
  providerId: string;
  serviceId: string;
  startsAt: string;
  staffId?: string;
}) {
  return apiFetch<{
    success: boolean;
    appointment: { id: string; service: string; durationMinutes: number; startsAt: string; status: string };
  }>("/customer/appointments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}


export type SavedAppointment = {
  id: string; time: string; endsAt: string | null; service: string; durationMinutes: number;
  price: string | null; status: string; timeZone: string; customerNotes: string | null;
  providerName: string; providerId: string | null; staffName: string | null;
  address: string | null; phone: string | null; cancellationCutoffHours: number; changeDeadline: string;
};
export function fetchAppointment(id: string) {
  return apiFetch<{ success: boolean; appointment: SavedAppointment }>(`/customer/appointments/${encodeURIComponent(id)}`);
}
