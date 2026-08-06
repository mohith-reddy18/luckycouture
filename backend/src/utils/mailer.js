const nodemailer = require("nodemailer");

/**
 * Thin wrapper around Nodemailer. If SMTP env vars aren't set (e.g. in
 * local development), emails are logged to the console instead of
 * throwing, so the rest of the flow (password reset, order confirmations)
 * can still be exercised without a real mail provider.
 */
function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
}

async function sendEmail({ to, subject, html }) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[mailer:dev] Would send email to ${to} — "${subject}"`);
    return { simulated: true };
  }

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || "Lucky Couture <no-reply@luckycouture.in>",
    to,
    subject,
    html,
  });
}

module.exports = { sendEmail };
