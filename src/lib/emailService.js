import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { AUD_VERIFY_EMAIL } from '@/lib/jwtAudience';
import { signPasswordResetToken } from '@/lib/passwordReset';

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
  return transporter;
}

// Gmail SMTP only allows the authenticated user as the actual sender
// address — so we always use SMTP_USER there. EMAIL_FROM becomes the
// display name only (recipients see "Spendix" in their inbox).
function fromHeader() {
  const name = (process.env.EMAIL_FROM || 'Spendix').replace(/"/g, '');
  const address = process.env.SMTP_USER;
  return `"${name}" <${address}>`;
}

export async function sendEmail(to, subject, text, html) {
  const info = await getTransporter().sendMail({
    from: fromHeader(),
    to,
    subject,
    text,
    html,
  });
  return info;
}

// ─────────────────────────────────────────────────────────────────────────
// HTML email template. Inline styles, table-based layout, system fonts —
function renderEmail({ preheader, title, body, ctaLabel, ctaUrl, footnote }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#c9d1d9;-webkit-font-smoothing:antialiased;">
  <!-- Preheader -->
  <div style="display:none;font-size:1px;color:#0d1117;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${preheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0d1117;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background-color:#161b22;border:1px solid #30363d;border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,0.4);overflow:hidden;">
          <!-- Brand header -->
          <tr>
            <td style="padding:28px 32px;border-bottom:1px solid #30363d;background-color:#161b22;">
              <div style="font-size:22px;font-weight:700;letter-spacing:-0.01em;color:#ffffff;">
                <span style="font-size:24px;">💰</span> Spendix
              </div>
              <div style="font-size:13px;color:#8b949e;margin-top:4px;">Personal finance tracker</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px 32px;">
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600;color:#ffffff;line-height:1.3;">${title}</h1>
              <p style="margin:0 0 28px 0;color:#c9d1d9;font-size:15px;line-height:1.6;">${body}</p>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#2f7af0;border-radius:8px;">
                    <a href="${ctaUrl}" style="display:inline-block;padding:13px 30px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:28px 0 0 0;color:#8b949e;font-size:13px;line-height:1.6;">
                Or copy this link into your browser:<br>
                <a href="${ctaUrl}" style="color:#79b8ff;word-break:break-all;text-decoration:underline;">${ctaUrl}</a>
              </p>

              ${
                footnote
                  ? `<p style="margin:24px 0 0 0;color:#8b949e;font-size:13px;line-height:1.6;">${footnote}</p>`
                  : ''
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #30363d;background-color:#161b22;text-align:center;">
              <p style="margin:0;color:#8b949e;font-size:12px;line-height:1.5;">
                You're receiving this because of activity on your Spendix account.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────
// Verification email — link to /verify-email/[token] page (POSTs the token
// on mount so email pre-fetch scanners can't auto-verify).
// ─────────────────────────────────────────────────────────────────────────
export async function sendVerificationEmail(user) {
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: '1d',
    audience: AUD_VERIFY_EMAIL,
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verificationUrl = `${appUrl}/verify-email/${token}`;

  const subject = 'Verify your email · Spendix';
  const text = [
    'Welcome to Spendix!',
    '',
    'Click the link below to verify your email address (valid for 24 hours):',
    verificationUrl,
    '',
    "If you didn't sign up for Spendix, you can safely ignore this email.",
  ].join('\n');

  const html = renderEmail({
    preheader: 'Welcome to Spendix — confirm your email to get started.',
    title: 'Welcome to Spendix 👋',
    body: "Thanks for signing up. Confirm your email address to start tracking your spending — this link is valid for 24 hours.",
    ctaLabel: 'Verify Email',
    ctaUrl: verificationUrl,
    footnote:
      "If you didn't create a Spendix account, you can safely ignore this email.",
  });

  return sendEmail(user.email, subject, text, html);
}

// ─────────────────────────────────────────────────────────────────────────
// Password reset email — link to /reset-password/[token] page. Token signs
// against the user's current bcrypt hash so it auto-invalidates after use.
// ─────────────────────────────────────────────────────────────────────────
export async function sendPasswordResetEmail(user) {
  const token = signPasswordResetToken(user);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password/${token}`;

  const subject = 'Reset your password · Spendix';
  const text = [
    'A password reset was requested for your Spendix account.',
    '',
    'Click the link below to choose a new password (valid for 1 hour):',
    resetUrl,
    '',
    "If you didn't request this, you can safely ignore this email — your current password stays in place.",
  ].join('\n');

  const html = renderEmail({
    preheader: 'Reset your Spendix password — link expires in 1 hour.',
    title: 'Reset your password',
    body: 'A password reset was requested for your account. Click the button below to choose a new one. This link expires in 1 hour.',
    ctaLabel: 'Reset Password',
    ctaUrl: resetUrl,
    footnote:
      "If you didn't request this, you can safely ignore this email — your current password stays in place.",
  });

  return sendEmail(user.email, subject, text, html);
}
