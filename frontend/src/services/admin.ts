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

export type OutboxRecord = {
  id: string;
  kind: string;
  recipient: string;
  status: "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "SKIPPED";
  attempts: number;
  scheduledStart: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastError: string | null;
};

export type AdminOutboxResponse = {
  success: boolean;
  items: OutboxRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
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

export function fetchAdminOutbox(page = 1, pageSize = 10) {
  return apiFetch<AdminOutboxResponse>(
    `/admin/outbox?page=${page}&pageSize=${pageSize}`,
  );
}

export function runAdminJobs() {
  return apiFetch<AdminJobResult>("/admin/jobs/run", { method: "POST" });
}
