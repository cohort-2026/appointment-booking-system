import { Resend } from "resend";

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

export async function sendAppointmentConfirmationEmail(input: {
  to: string;
  firstName: string;
  serviceName: string;
  providerName: string;
  startsAt: Date;
  durationMinutes: number;
  appointmentUrl: string;
}): Promise<void> {
  const appointmentDate = new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Africa/Johannesburg",
  }).format(input.startsAt);
  const safeFirstName = escapeHtml(input.firstName);
  const safeServiceName = escapeHtml(input.serviceName);
  const safeProviderName = escapeHtml(input.providerName);
  const safeAppointmentDate = escapeHtml(appointmentDate);
  const safeAppointmentUrl = escapeHtml(input.appointmentUrl);

  await sendEmail(
    input.to,
    `Appointment confirmed: ${input.serviceName}`,
    `Hi ${input.firstName}, your appointment for ${input.serviceName} with ${input.providerName} is confirmed for ${appointmentDate}. Duration: ${input.durationMinutes} minutes. View your saved appointment: ${input.appointmentUrl}`,
    `<p>Hi ${safeFirstName},</p><p>Your appointment is confirmed.</p><ul><li><strong>Service:</strong> ${safeServiceName}</li><li><strong>Provider:</strong> ${safeProviderName}</li><li><strong>Date and time:</strong> ${safeAppointmentDate}</li><li><strong>Duration:</strong> ${input.durationMinutes} minutes</li></ul><p><a href="${safeAppointmentUrl}">View your saved appointment</a></p>`,
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
