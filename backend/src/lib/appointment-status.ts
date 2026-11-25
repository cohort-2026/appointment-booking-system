import type { AppointmentStatus } from "../generated/prisma/client.js";

export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ["CONFIRMED", "RESCHEDULED"];
