import { bookedDurationMinutes } from "../lib/booking-snapshot.js";
import type { CustomerAppointment } from "./appointment-lifecycle.service.js";
import { sendAppointmentChangeEmail, sendAppointmentConfirmationEmail } from "./email.service.js";

type SavedAppointment = {
  id: string;
  status: string;
  scheduledStart: Date;
  scheduledEnd: Date | null;
  service: { name: string; durationMinutes: number };
  customer: { firstName: string; email: string };
  soleProvider: { displayName: string } | null;
  business: { name: string } | null;
  staff: { user: { firstName: string; lastName: string | null } } | null;
};

function savedAppointmentUrl(id: string, frontendOrigin: string, justBooked = false): string {
  const origin = new URL(frontendOrigin);
  if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password) {
    throw new Error("Invalid frontend origin configuration");
  }
  const url = new URL(`/dashboard/customer/appointments/${encodeURIComponent(id)}`, origin);
  if (justBooked) url.searchParams.set("confirmed", "1");
  return url.toString();
}

/** Call only after commit. Email configuration/delivery can never fail booking creation. */
export async function notifyAppointmentCreated(
  appointment: SavedAppointment,
  send = sendAppointmentConfirmationEmail,
  frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
): Promise<boolean> {
  try {
    await send({
      to: appointment.customer.email,
      firstName: appointment.customer.firstName,
      appointmentId: appointment.id,
      status: appointment.status,
      serviceName: appointment.service.name,
      providerName: appointment.soleProvider?.displayName ?? appointment.business?.name ?? "Provider",
      staffName: appointment.staff
        ? `${appointment.staff.user.firstName} ${appointment.staff.user.lastName ?? ""}`.trim()
        : null,
      startsAt: appointment.scheduledStart,
      durationMinutes: bookedDurationMinutes(appointment),
      appointmentUrl: savedAppointmentUrl(appointment.id, frontendOrigin, true),
    });
    return true;
  } catch {
    // Keep configuration, transport errors and recipient information out of logs.
    console.error("Appointment confirmation email failed", { appointmentId: appointment.id });
    return false;
  }
}


/** Run after commit. Failure to send does not affect the saved appointment. */
export async function notifyCustomerAppointmentChanged(
  appointment: CustomerAppointment,
  type: "CANCELLED" | "RESCHEDULED",
  previousStart: Date,
): Promise<void> {
  try {
    await sendAppointmentChangeEmail({
      to: appointment.customer.email,
      firstName: appointment.customer.firstName,
      serviceName: appointment.service.name,
      type,
      oldStartsAt: previousStart,
      startsAt: appointment.scheduledStart,
      appointmentUrl: savedAppointmentUrl(appointment.id, process.env.FRONTEND_ORIGIN ?? "http://localhost:5173"),
    });
  } catch {
    console.error("Appointment change email failed", { appointmentId: appointment.id });
  }
}
