const nodemailer = require("nodemailer");

function cleanVal(v) {
  if (!v) return "";
  return String(v).trim().replace(/^["']|["']$/g, "");
}

function getTransporter() {
  const service = cleanVal(process.env.SMTP_SERVICE);
  const host = cleanVal(process.env.SMTP_HOST);
  const user = cleanVal(process.env.SMTP_USER);
  const pass = cleanVal(process.env.SMTP_PASSWORD);
  const port = Number(cleanVal(process.env.SMTP_PORT)) || (cleanVal(process.env.SMTP_SECURE) === "true" ? 465 : 587);
  const isSecure = cleanVal(process.env.SMTP_SECURE) === "true" || port === 465;

  if (service) {
    if (!user || !pass) {
      throw new Error(`SMTP_SERVICE is set to '${service}', but SMTP_USER or SMTP_PASSWORD is not configured in server environment variables.`);
    }
    console.log(`[mailer] Initializing transporter with service: ${service}, user: ${user}`);
    return nodemailer.createTransport({
      service,
      auth: { user, pass },
    });
  }

  if (host) {
    if (!user || !pass) {
      console.warn(`[mailer:warning] SMTP_HOST is '${host}', but SMTP_USER or SMTP_PASSWORD is missing.`);
    }
    console.log(`[mailer] Initializing transporter with host: ${host}:${port}, secure: ${isSecure}, user: ${user ? user : "none"}`);
    return nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: user && pass ? { user, pass } : undefined,
      tls: {
        rejectUnauthorized: false,
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
    const errMsg = "Mail transporter is not configured on the server. Please add SMTP_HOST (or SMTP_SERVICE=gmail), SMTP_USER, and SMTP_PASSWORD in Render environment variables.";
    console.error(`[mailer:unconfigured] ${errMsg}`);
    throw new Error(errMsg);
  }

  const rawFrom = cleanVal(process.env.EMAIL_FROM);
  const rawUser = cleanVal(process.env.SMTP_USER);
  const fromAddress = rawFrom || (rawUser ? `"Lucky Couture" <${rawUser}>` : '"Lucky Couture" <no-reply@luckycouture.in>');

  try {
    console.log(`[mailer] Sending email From: ${fromAddress} -> To: ${to} (Reply-To: ${replyTo || "none"})...`);
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      replyTo: replyTo || undefined,
      subject,
      html,
      text: text || undefined,
    });
    console.log(`[mailer:success] Email accepted by provider. MessageId: ${info?.messageId}`);
    return info;
  } catch (sendErr) {
    console.error("[mailer:sendError]", {
      code: sendErr.code,
      response: sendErr.response,
      responseCode: sendErr.responseCode,
      message: sendErr.message,
    });
    if (sendErr.code === "EAUTH") {
      throw new Error(`SMTP authentication failed for '${rawUser}'. Check your SMTP_PASSWORD (or generate a 16-character Google App Password if using Gmail).`);
    }
    if (sendErr.code === "ESOCKET" || sendErr.code === "ETIMEDOUT") {
      throw new Error(`SMTP connection failed or timed out connecting to mail server (${cleanVal(process.env.SMTP_HOST) || "SMTP host"}).`);
    }
    if (sendErr.code === "EENVELOPE") {
      throw new Error(`Email envelope rejected by mail provider: ${sendErr.response || sendErr.message}`);
    }
    throw new Error(sendErr.message || "Failed to send email through mail provider.");
  }
}

module.exports = { sendEmail };
