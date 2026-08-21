const nodemailer = require("nodemailer");

/**
 * Thin wrapper around Nodemailer. If SMTP env vars aren't set (e.g. in
 * local development), emails are logged to the console instead of
 * throwing, so the rest of the flow (password reset, order confirmations)
 * can still be exercised without a real mail provider.
 */
function getTransporter() {
  if (process.env.SMTP_SERVICE) {
    return nodemailer.createTransport({
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  if (!process.env.SMTP_HOST) return null;

  const port = Number(process.env.SMTP_PORT) || 587;
  const isSecure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: isSecure,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
}

async function sendEmail({ to, subject, html, replyTo, text }) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[mailer:dev] Would send email to ${to} (replyTo: ${replyTo || "none"}) — "${subject}"`);
    return { simulated: true };
  }

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || "Lucky Couture <no-reply@luckycouture.in>",
    to,
    replyTo: replyTo || undefined,
    subject,
    html,
    text: text || undefined,
  });
}

module.exports = { sendEmail };
