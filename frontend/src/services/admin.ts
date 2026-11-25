import { apiFetch } from "./api";

export type AdminStats = {
  totalUsers: number;
  totalBusinesses: number;
  totalProviders: number;
  totalBookingsThisMonth: number;
};

export type AdminDashboardResponse = {
  success: boolean;
  stats: AdminStats;
};

export type AdminJobResult = {
  success: boolean;
  attempted: number;
  accepted: number;
  failed: number;
};

export function fetchAdminDashboard() {
  return apiFetch<AdminDashboardResponse>("/admin/dashboard");
}

export function runAdminJobs() {
  return apiFetch<AdminJobResult>("/admin/jobs/run", { method: "POST" });
}
