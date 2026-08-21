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

  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const isSecure = process.env.SMTP_SECURE === "true" || port === 465;

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: isSecure,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASSWORD
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
          : undefined,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });
  }

  return null;
}

async function sendEmail({ to, subject, html, replyTo, text }) {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(`[mailer:warning] No SMTP transporter configured on server.`);
    if (process.env.NODE_ENV === "production") {
      throw new Error("Mail transporter is not configured on the server. Please check SMTP environment variables.");
    }
    console.log(`[mailer:dev] Simulated email to ${to} (replyTo: ${replyTo || "none"}) — "${subject}"`);
    return { simulated: true };
  }

  const fromAddress =
    process.env.EMAIL_FROM ||
    (process.env.SMTP_USER ? `"Lucky Couture" <${process.env.SMTP_USER}>` : '"Lucky Couture" <no-reply@luckycouture.in>');

  return transporter.sendMail({
    from: fromAddress,
    to,
    replyTo: replyTo || undefined,
    subject,
    html,
    text: text || undefined,
  });
}

module.exports = { sendEmail };
