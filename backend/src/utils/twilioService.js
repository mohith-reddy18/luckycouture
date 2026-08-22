const twilio = require("twilio");

/**
 * Format phone number to strict E.164 format (+[country code][number]).
 * Defaults to Indian standard (+91) if 10 contiguous digits are given.
 */
const formatE164 = (phone) => {
  if (!phone) return "";
  const cleaned = phone.replace(/[^0-9+]/g, "");

  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
};

/**
 * Validate E.164 international phone number format.
 */
const isValidE164 = (phone) => {
  return /^\+[1-9]\d{7,14}$/.test(phone);
};

/**
 * Mask phone number for secure client display (e.g. "+91 ******3210").
 */
const maskPhoneNumber = (phone) => {
  if (!phone) return "";
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.length <= 4) return "******";
  const last4 = cleaned.slice(-4);
  const prefix = cleaned.startsWith("+") ? cleaned.slice(0, 3) + " " : "";
  return `${prefix}******${last4}`;
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
 * Send OTP via Twilio SMS Message or fallback logger
 */
const sendOtpSms = async (phone, otpCode, purpose = "password_reset") => {
  const formattedPhone = formatE164(phone);
  if (!isValidE164(formattedPhone)) {
    return { success: false, error: "Invalid phone number format." };
  }

  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  const purposeText =
    purpose === "password_reset" ? "password reset" : "verification";
  const messageBody = `Your Lucky Couture ${purposeText} OTP is ${otpCode}. Valid for 5 minutes. Do not share this code with anyone.`;

  if (client && fromNumber) {
    try {
      await client.messages.create({
        body: messageBody,
        to: formattedPhone,
        from: fromNumber,
      });
      return { success: true };
    } catch (err) {
      console.error("[TWILIO SMS ERROR]", err.message);
      // If live Twilio fails, return graceful error or proceed in development
      if (process.env.NODE_ENV === "production") {
        return { success: false, error: "Failed to dispatch SMS code. Please try again later." };
      }
    }
  }

  // Development / sandbox fallback
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n========================================`);
    console.log(`[LUCKY COUTURE SMS SIMULATION]`);
    console.log(`To: ${formattedPhone}`);
    console.log(`Body: ${messageBody}`);
    console.log(`========================================\n`);
  }

  return { success: true };
};

/**
 * Start Twilio Verify SMS verification (legacy verify service)
 */
const sendTwilioVerification = async (phone) => {
  const formattedPhone = formatE164(phone);
  if (!isValidE164(formattedPhone)) {
    return { success: false, error: "Invalid phone number format. Must be a valid international number (e.g. +919876543210)" };
  }

  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const client = getTwilioClient();

  if (!client || !serviceSid) {
    return { success: false, error: "SMS service is temporarily unavailable. Please try again later." };
  }

  try {
    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({ to: formattedPhone, channel: "sms" });

    return { success: true, status: verification.status };
  } catch (err) {
    console.error("[TWILIO VERIFICATION ERROR]", err.message);
    return { success: false, error: err.message || "Failed to send verification code" };
  }
};

/**
 * Check Twilio Verify SMS verification code
 */
const checkTwilioVerification = async (phone, code) => {
  const formattedPhone = formatE164(phone);
  if (!isValidE164(formattedPhone) || !code || code.trim().length < 4) {
    return { success: false, error: "Please enter a valid phone number and verification code." };
  }

  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const client = getTwilioClient();

  if (!client || !serviceSid) {
    return { success: false, error: "SMS service is temporarily unavailable. Please try again later." };
  }

  try {
    const verificationCheck = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: formattedPhone, code: code.trim() });

    if (verificationCheck.status === "approved") {
      return { success: true, status: "approved" };
    }
    return { success: false, error: "Invalid or expired verification code." };
  } catch (err) {
    console.error("[TWILIO CHECK ERROR]", err.message);
    return { success: false, error: err.message || "Failed to verify code." };
  }
};

module.exports = {
  formatE164,
  isValidE164,
  maskPhoneNumber,
  sendOtpSms,
  sendTwilioVerification,
  checkTwilioVerification,
};
