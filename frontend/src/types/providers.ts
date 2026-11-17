import { apiFetch } from "../services/api";

export type ProviderService = {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number | null;
  assigned?: boolean;
  bookable?: boolean;
};

export type Provider = {
  id: string;
  kind: "SOLE_PROVIDER" | "BUSINESS";
  name: string;
  category: string;
  description: string;
  city: string | null;
  hours: string;
  initials: string;
  status: "Open" | "Closed";
  services: ProviderService[];
};

// providers.ts - Example of adding a try/catch block to handle the error
export async function fetchProviders() {
  try {
    const data = await apiFetch('/providers');
    return data;
  } catch (error) {
    console.error("Failed to load home providers:", error);
    // Return an empty list or trigger a UI notification to the user
    return []; 
  }
}