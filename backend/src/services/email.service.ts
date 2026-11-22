import { Resend } from "resend";
import { appointmentCalendar } from "../lib/appointment-calendar.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html: string,
  calendar?: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;


  if (!apiKey || !from) {
    throw new Error("Email is not configured");
  }

  const recipient =
    process.env.NODE_ENV === "production"
      ? to
      : process.env.OTP_TEST_RECIPIENT?.trim() || to;

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: recipient,
    subject,
    text,
    html,
    ...(calendar ? { attachments: [{
      filename: "appointment.ics",
      content: Buffer.from(calendar, "utf8").toString("base64"),
      contentType: "text/calendar",
    }] } : {}),
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

export async function sendVerificationEmail(
  to: string,
  firstName: string,
  code: string,
): Promise<void> {
  await sendEmail(
    to,
    "Your verification code",
    `Hi ${firstName}, your verification code is ${code}. It expires in 10 minutes.`,
    `
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>Your verification code is:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;">${code}</p>
      <p>It expires in 10 minutes. If you didn't create an account, you can ignore this email.</p>
    `,
  );
}

export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  code: string,
): Promise<void> {
  await sendEmail(
    to,
    "Your password reset code",
    `Hi ${firstName}, your password reset code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    `
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>Use this code to reset your password:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;">${code}</p>
      <p>It expires in 10 minutes. If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>
    `,
  );
}

export type AppointmentConfirmationInput = {
  to: string;
  firstName: string;
  appointmentId: string;
  status: string;
  serviceName: string;
  providerName: string;
  staffName: string | null;
  startsAt: Date;
  durationMinutes: number;
  appointmentUrl: string;
};

export function buildAppointmentConfirmationEmail(input: AppointmentConfirmationInput) {
  const date = new Intl.DateTimeFormat("en-ZA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Africa/Johannesburg",
  }).format(input.startsAt);
  const status = input.status.replaceAll("_", " ");
  const details: Array<[string, string]> = [
    ["Reference", input.appointmentId],
    ["Status", status],
    ["Service", input.serviceName],
    ["Provider", input.providerName],
    ...(input.staffName ? [["Assigned staff", input.staffName] as [string, string]] : []),
    ["Date and time", `${date} (SAST)`],
    ["Duration", `${input.durationMinutes} minutes`],
  ];
  return {
    subject: `Appointment confirmed: ${input.serviceName}`,
    text: `Hi ${input.firstName}, your appointment has been saved.\n${details.map(([label, value]) => `${label}: ${value}`).join("\n")}\nView your saved appointment: ${input.appointmentUrl}`,
    html: `<p>Hi ${escapeHtml(input.firstName)},</p><p>Your appointment has been saved.</p><ul>${details.map(([label, value]) => `<li><strong>${label}:</strong> ${escapeHtml(value)}</li>`).join("")}</ul><p><a href="${escapeHtml(input.appointmentUrl)}">View your saved appointment</a></p>`,
  };
}

export async function sendAppointmentConfirmationEmail(input: AppointmentConfirmationInput): Promise<void> {
  const content = buildAppointmentConfirmationEmail(input);
  await sendEmail(input.to, content.subject, content.text, content.html,
    appointmentCalendar({
      id: input.appointmentId,
      startsAt: input.startsAt,
      endsAt: new Date(input.startsAt.getTime() + input.durationMinutes * 60_000),
      service: input.serviceName,
      provider: input.providerName,
    }),
  );
}

export async function sendStaffInvitationEmail(
  to: string,
  firstName: string,
  businessName: string,
  title: string,
  token: string,
): Promise<void> {
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
  const invitationUrl = new URL("/accept-staff-invitation", frontendOrigin);
  invitationUrl.searchParams.set("token", token);
  const link = invitationUrl.toString();

  await sendEmail(
    to,
    `Invitation to join ${businessName}`,
    `Hi ${firstName}, ${businessName} invited you to join as ${title}. Set your password using this link: ${link}. The link expires in 7 days.`,
    `<p>Hi ${escapeHtml(firstName)},</p><p><strong>${escapeHtml(businessName)}</strong> invited you to join as ${escapeHtml(title)}.</p><p><a href="${escapeHtml(link)}">Accept invitation and set your password</a></p><p>This link expires in 7 days. If you weren't expecting this invitation, you can ignore this email.</p>`,
  );
}


export async function sendAppointmentChangeEmail(input: {
  to: string;
  firstName: string;
  serviceName: string;
  type: "CANCELLED" | "RESCHEDULED";
  oldStartsAt: Date;
  startsAt: Date;
  appointmentUrl: string;
  appointmentId: string;
  providerName: string;
  durationMinutes: number;
  rescheduleCount: number;
}): Promise<void> {
  const format = new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "long", timeStyle: "short", timeZone: "Africa/Johannesburg",
  });
  const previous = format.format(input.oldStartsAt);
  const subject = input.type === "CANCELLED" ? "Appointment cancelled" : "Appointment rescheduled";
  const summary = input.type === "CANCELLED"
    ? `Your ${input.serviceName} appointment on ${previous} (SAST) was cancelled.`
    : `Your ${input.serviceName} appointment moved from ${previous} to ${format.format(input.startsAt)} (SAST).`;
  await sendEmail(
    input.to, subject,
    `Hi ${input.firstName}, ${summary}\nView your saved appointment: ${input.appointmentUrl}`,
    `<p>Hi ${escapeHtml(input.firstName)},</p><p>${escapeHtml(summary)}</p><p><a href="${escapeHtml(input.appointmentUrl)}">View your saved appointment</a></p>`,
    appointmentCalendar({
      id: input.appointmentId,
      startsAt: input.startsAt,
      endsAt: new Date(input.startsAt.getTime() + input.durationMinutes * 60_000),
      service: input.serviceName,
      provider: input.providerName,
      sequence: input.rescheduleCount + (input.type === "CANCELLED" ? 1 : 0),
      cancelled: input.type === "CANCELLED",
    }),
  );
}

/** Best-effort reminder for tomorrow's appointment (SAST). */
export async function sendAppointmentReminderEmail(input: {
  to: string;
  firstName: string;
  serviceName: string;
  providerName: string;
  startsAt: Date;
  appointmentUrl: string;
}): Promise<void> {
  const time = new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "long", timeStyle: "short", timeZone: "Africa/Johannesburg",
  }).format(input.startsAt);
  const sentence = `Reminder: ${input.serviceName} with ${input.providerName} is scheduled for ${time} (SAST).`;
  await sendEmail(
    input.to,
    `Appointment reminder: ${input.serviceName}`,
    `Hi ${input.firstName}, ${sentence}\nView your booking: ${input.appointmentUrl}`,
    `<p>Hi ${escapeHtml(input.firstName)},</p><p>${escapeHtml(sentence)}</p><p><a href="${escapeHtml(input.appointmentUrl)}">View your booking</a></p>`,
  );
}

export async function sendAppointmentScheduleAlert(input: {
  to: string;
  audience: "owner" | "staff";
  change: "CREATED" | "CANCELLED" | "RESCHEDULED";
  previousStart: Date | undefined;
  startsAt: Date;
  serviceName: string;
  providerName: string;
  appointmentId: string;
}): Promise<void> {
  const time = new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "long", timeStyle: "short", timeZone: "Africa/Johannesburg",
  });
  const subject = {
    CREATED: input.audience === "staff" ? "New booking assigned to you" : "New booking for your schedule",
    CANCELLED: "Booking cancelled on your schedule",
    RESCHEDULED: "Booking moved on your schedule",
  }[input.change];
  const schedule = input.change === "RESCHEDULED" && input.previousStart
    ? `Moved from ${time.format(input.previousStart)} (SAST) to ${time.format(input.startsAt)} (SAST).`
    : `${time.format(input.startsAt)} (SAST).`;
  const lines = [`${input.serviceName} with ${input.providerName}`, schedule, `Reference: ${input.appointmentId}`];
  await sendEmail(
    input.to, subject, lines.join("\n"),
    lines.map(line => `<p>${escapeHtml(line)}</p>`).join(""),
  );
}
