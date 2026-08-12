const twilio = require("twilio");

/**
 * Format phone number to E.164 standard (+[country code][number])
 */
const formatE164 = (phone) => {
  if (!phone) return "";
  let cleaned = String(phone).trim().replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    if (/^\d{10}$/.test(cleaned)) {
      cleaned = "+91" + cleaned;
    } else {
      cleaned = "+" + cleaned;
    }
  }
  return cleaned;
};

/**
 * Validate E.164 format regex: + followed by 7 to 15 digits
 */
const isValidE164 = (phone) => {
  return /^\+[1-9]\d{6,14}$/.test(phone);
};

/**
 * Get configured Twilio client instance
 */
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  try {
    return twilio(accountSid, authToken);
  } catch (err) {
    console.error("[TWILIO CLIENT ERROR]", err.message);
    return null;
  }
};

/**
 * Start Twilio Verify SMS verification
 */
const sendTwilioVerification = async (phone) => {
  const formattedPhone = formatE164(phone);
  if (!isValidE164(formattedPhone)) {
    return { success: false, error: "Please enter a valid phone number in E.164 format (e.g. +919876543210)" };
  }

  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const client = getTwilioClient();

  if (!client || !serviceSid) {
    console.error("[TWILIO CONFIG ERROR] Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_VERIFY_SERVICE_SID");
    return { success: false, error: "SMS verification service is not configured on the server" };
  }

  try {
    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications
      .create({ to: formattedPhone, channel: "sms" });

    return { success: true, status: verification.status, phone: formattedPhone };
  } catch (err) {
    console.error("[TWILIO VERIFICATION ERROR]", err.message);
    const msg = err.message || "Failed to send SMS verification code";
    return { success: false, error: msg };
  }
};

/**
 * Check Twilio Verify SMS verification code
 */
const checkTwilioVerification = async (phone, code) => {
  const formattedPhone = formatE164(phone);
  if (!isValidE164(formattedPhone)) {
    return { success: false, error: "Invalid phone number format" };
  }

  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const client = getTwilioClient();

  if (!client || !serviceSid) {
    return { success: false, error: "SMS verification service is not configured on the server" };
  }

  try {
    const verificationCheck = await client.verify.v2
      .services(serviceSid)
      .verificationChecks
      .create({ to: formattedPhone, code: String(code).trim() });

    if (verificationCheck.status === "approved") {
      return { success: true, status: "approved" };
    }
    return { success: false, error: "Invalid or expired verification code" };
  } catch (err) {
    console.error("[TWILIO CHECK ERROR]", err.message);
    const msg = err.status === 404 ? "Verification code has expired or was not requested" : (err.message || "Verification code check failed");
    return { success: false, error: msg };
  }
};

module.exports = {
  formatE164,
  isValidE164,
  sendTwilioVerification,
  checkTwilioVerification,
};
