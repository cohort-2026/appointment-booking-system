import { bookedDurationMinutes } from "../lib/booking-snapshot.js";
import type { CustomerAppointment } from "./appointment-lifecycle.service.js";
import { sendAppointmentChangeEmail, sendAppointmentConfirmationEmail, sendAppointmentScheduleAlert } from "./email.service.js";

type SavedAppointment = {
  id: string;
  status: string;
  scheduledStart: Date;
  scheduledEnd: Date | null;
  service: { name: string; durationMinutes: number };
  customer: { firstName: string; email: string };
  soleProvider: { displayName: string; user: { email: string } } | null;
  business: { name: string; owner: { email: string } } | null;
  staff: { user: { firstName: string; lastName: string | null; email: string } } | null;
};

export function savedAppointmentUrl(id: string, frontendOrigin: string, justBooked = false): string {
  const origin = new URL(frontendOrigin);
  if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password) {
    throw new Error("Invalid frontend origin configuration");
  }
  const url = new URL(`/dashboard/customer/appointments/${encodeURIComponent(id)}`, origin);
  if (justBooked) url.searchParams.set("confirmed", "1");
  return url.toString();
}

/** Do not send production customers links pointing at a local development server. */
export function emailFrontendOrigin(): string {
  const configured = process.env.FRONTEND_ORIGIN?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("FRONTEND_ORIGIN must be configured for appointment emails");
  }
  return "http://localhost:5173";
}

async function notifyScheduleRecipients(
  appointment: SavedAppointment,
  change: "CREATED" | "CANCELLED" | "RESCHEDULED",
  previousStart: Date | undefined,
  send: typeof sendAppointmentScheduleAlert,
) {
  const staffEmail = appointment.staff?.user.email;
  const ownerEmail = appointment.business?.owner.email ?? appointment.soleProvider?.user.email;
  const recipients = new Map<string, "owner" | "staff">();
  if (ownerEmail) recipients.set(ownerEmail, "owner");
  if (staffEmail) recipients.set(staffEmail, "staff");
  recipients.delete(appointment.customer.email);

  await Promise.all([...recipients].map(async ([to, audience]) => {
    try {
      await send({
        to, audience, change, previousStart, startsAt: appointment.scheduledStart,
        serviceName: appointment.service.name, appointmentId: appointment.id,
        providerName: appointment.business?.name ?? appointment.soleProvider?.displayName ?? "Provider",
      });
    } catch {
      console.error("Appointment schedule alert failed", { appointmentId: appointment.id, audience });
    }
  }));
}

/** Call only after commit. Delivery failures leave the booking saved. */
export async function notifyAppointmentCreated(
  appointment: SavedAppointment,
  sendConfirmation = sendAppointmentConfirmationEmail,
  frontendOrigin?: string,
  sendAlert = sendAppointmentScheduleAlert,
): Promise<void> {
  await Promise.all([
    notifyCustomerConfirmation(appointment, sendConfirmation, frontendOrigin),
    notifyScheduleRecipients(appointment, "CREATED", undefined, sendAlert),
  ]);
}

async function notifyCustomerConfirmation(
  appointment: SavedAppointment,
  send = sendAppointmentConfirmationEmail,
  frontendOrigin?: string,
): Promise<void> {
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
      appointmentUrl: savedAppointmentUrl(appointment.id, frontendOrigin ?? emailFrontendOrigin(), true),
    });
  } catch {
    // Keep configuration, transport errors and recipient information out of logs.
    console.error("Appointment confirmation email failed", { appointmentId: appointment.id });
  }
}


/** Run after commit. Failure to send does not affect the saved appointment. */
export async function notifyAppointmentChanged(
  appointment: CustomerAppointment,
  type: "CANCELLED" | "RESCHEDULED",
  previousStart: Date,
  sendCustomer = sendAppointmentChangeEmail,
  sendAlert = sendAppointmentScheduleAlert,
): Promise<void> {
  await Promise.all([
    notifyCustomerAppointmentChanged(appointment, type, previousStart, sendCustomer),
    notifyScheduleRecipients(appointment, type, previousStart, sendAlert),
  ]);
}

async function notifyCustomerAppointmentChanged(
  appointment: CustomerAppointment,
  type: "CANCELLED" | "RESCHEDULED",
  previousStart: Date,
  send: typeof sendAppointmentChangeEmail,
): Promise<void> {
  try {
    await send({
      to: appointment.customer.email,
      firstName: appointment.customer.firstName,
      serviceName: appointment.service.name,
      type,
      oldStartsAt: previousStart,
      startsAt: appointment.scheduledStart,
      appointmentUrl: savedAppointmentUrl(appointment.id, emailFrontendOrigin()),
      appointmentId: appointment.id,
      providerName: appointment.soleProvider?.displayName ?? appointment.business?.name ?? "Provider",
      durationMinutes: bookedDurationMinutes(appointment),
      rescheduleCount: appointment.rescheduleCount,
    });
  } catch {
    console.error("Appointment change email failed", { appointmentId: appointment.id });
  }
}
