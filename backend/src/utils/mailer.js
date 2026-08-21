const nodemailer = require("nodemailer");

/**
 * Thin wrapper around Nodemailer. If SMTP env vars aren't set (e.g. in
 * local development), emails are logged to the console instead of
 * throwing, so the rest of the flow (password reset, order confirmations)
 * can still be exercised without a real mail provider.
 */
function getTransporter() {
  if (process.env.SMTP_SERVICE) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      throw new Error(`SMTP_SERVICE is set to '${process.env.SMTP_SERVICE}', but SMTP_USER or SMTP_PASSWORD is missing in server environment variables.`);
    }
    return nodemailer.createTransport({
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.SMTP_USER.trim(),
        pass: process.env.SMTP_PASSWORD.trim(),
      },
    });
  }

  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const isSecure = process.env.SMTP_SECURE === "true" || port === 465;

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST.trim(),
      port,
      secure: isSecure,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASSWORD
          ? { user: process.env.SMTP_USER.trim(), pass: process.env.SMTP_PASSWORD.trim() }
          : undefined,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });
  }

  return null;
}

async function sendEmail({ to, subject, html, replyTo, text }) {
  let transporter;
  try {
    transporter = getTransporter();
  } catch (initErr) {
    console.error("[mailer:initError]", initErr.message);
    throw initErr;
  }

  if (!transporter) {
    console.warn(`[mailer:warning] No SMTP transporter configured on server.`);
    throw new Error("Mail transporter is not configured on the server. Please set SMTP_HOST/SMTP_SERVICE, SMTP_USER, and SMTP_PASSWORD in environment variables.");
  }

  const fromAddress =
    process.env.EMAIL_FROM ||
    (process.env.SMTP_USER ? `"Lucky Couture" <${process.env.SMTP_USER.trim()}>` : '"Lucky Couture" <no-reply@luckycouture.in>');

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      replyTo: replyTo || undefined,
      subject,
      html,
      text: text || undefined,
    });
    return info;
  } catch (sendErr) {
    console.error("[mailer:sendError]", sendErr);
    if (sendErr.code === "EAUTH") {
      throw new Error("SMTP authentication failed. Please verify SMTP_USER and SMTP_PASSWORD (or Gmail App Password).");
    }
    if (sendErr.code === "ESOCKET" || sendErr.code === "ETIMEDOUT") {
      throw new Error(`SMTP connection timed out or socket failed connecting to ${process.env.SMTP_HOST || "mail server"}.`);
    }
    if (sendErr.code === "EENVELOPE") {
      throw new Error(`Email envelope rejected by mail server: ${sendErr.response || sendErr.message}`);
    }
    throw new Error(sendErr.message || "Failed to send email through mail transporter.");
  }
}

module.exports = { sendEmail };
