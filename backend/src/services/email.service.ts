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

export async function sendStaffInvitationEmail(
  to: string,
  businessName: string,
  token: string,
): Promise<void> {
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
  const invitationUrl = `${frontendOrigin.replace(/\/$/, "")}/staff-invitation/accept?token=${encodeURIComponent(token)}`;
  const safeBusinessName = escapeHtml(businessName);
  const safeInvitationUrl = escapeHtml(invitationUrl);

  await sendEmail(
    to,
    `Invitation to join ${businessName}`,
    `You have been invited to join ${businessName} as a staff member. Accept the invitation within 48 hours: ${invitationUrl}`,
    `<p>You have been invited to join <strong>${safeBusinessName}</strong> as a staff member.</p>
      <p><a href="${safeInvitationUrl}">Accept invitation</a></p>
      <p>This link expires in 48 hours. If you were not expecting this invitation, you can ignore this email.</p>`,
  );
}