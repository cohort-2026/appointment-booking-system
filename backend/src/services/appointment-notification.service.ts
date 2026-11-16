import { sendAppointmentConfirmationEmail } from "./email.service.js";

type SavedAppointment = {
  id: string;
  status: string;
  scheduledStart: Date;
  service: { name: string; durationMinutes: number };
  customer: { firstName: string; email: string };
  soleProvider: { displayName: string } | null;
  business: { name: string } | null;
  staff: { user: { firstName: string; lastName: string | null } } | null;
};

/** Call only after commit. Email configuration/delivery can never fail booking creation. */
export async function notifyAppointmentCreated(
  appointment: SavedAppointment,
  send = sendAppointmentConfirmationEmail,
  frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
): Promise<boolean> {
  try {
    const origin = new URL(frontendOrigin);
    if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password) {
      throw new Error("Invalid frontend origin configuration");
    }
    const appointmentUrl = new URL(
      `/dashboard/customer/appointments/${encodeURIComponent(appointment.id)}?confirmed=1`,
      origin,
    ).toString();
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
      durationMinutes: appointment.service.durationMinutes,
      appointmentUrl,
    });
    return true;
  } catch {
    // Keep configuration, transport errors and recipient information out of logs.
    console.error("Appointment confirmation email failed", { appointmentId: appointment.id });
    return false;
  }
}
