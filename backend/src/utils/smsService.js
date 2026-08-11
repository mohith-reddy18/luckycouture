/**
 * Fast2SMS Utility Service
 * Sends OTP via Fast2SMS bulkV2 route="otp" API
 */

const sendSmsOtp = async (phone, otp) => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  const digits = String(phone || "").replace(/\D/g, "");
  const mobile = digits.length >= 10 ? digits.slice(-10) : digits;

  if (!mobile || mobile.length !== 10) {
    console.warn(`[SMS WARNING] ⚠️ Invalid phone format for SMS: ${phone} (extracted ${mobile})`);
    return { success: false, error: "Please enter a valid 10-digit Indian phone number" };
  }

  if (!apiKey) {
    console.warn(`[SMS WARNING] ⚠️ FAST2SMS_API_KEY is not set. OTP logged to console only.`);
    return { success: true, mock: true };
  }

  try {
    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "otp",
        numbers: mobile,
        variables_values: String(otp),
      }),
    });

    const data = await response.json();

    if (data && data.return === true) {
      console.log(`[SMS SUCCESS] 📱 OTP successfully dispatched via Fast2SMS to +91-${mobile}`);
      return { success: true, data };
    } else {
      const rawErrorMsg = Array.isArray(data?.message) ? data.message.join(", ") : (data?.message || "SMS delivery failed");
      console.error(`[SMS ERROR] ❌ Fast2SMS API response error for ${mobile}:`, data);

      if (rawErrorMsg.toLowerCase().includes("website verification")) {
        console.warn(`\n=======================================================================`);
        console.warn(`[SMS ACTION REQUIRED] ⚠️ FAST2SMS WEBSITE VERIFICATION REQUIRED!`);
        console.warn(`Fast2SMS requires website domain verification before sending OTP SMS.`);
        console.warn(`To fix this:`);
        console.warn(`1. Log in to https://www.fast2sms.com/`);
        console.warn(`2. Navigate to 'OTP Message' menu in the sidebar`);
        console.warn(`3. Submit & verify your website domain URL (e.g. your deployed web URL)`);
        console.warn(`=======================================================================\n`);
      }

      // Check if mock fallback is enabled or non-production environment allowing fallback on provider error
      const allowFallback = process.env.ALLOW_OTP_MOCK_FALLBACK === "true" || process.env.NODE_ENV !== "production";
      if (allowFallback) {
        console.warn(`[SMS FALLBACK] ⚠️ Fast2SMS dispatch failed (${rawErrorMsg}). Falling back to console OTP logging so user testing is not blocked.`);
        return { success: true, mock: true, warning: rawErrorMsg };
      }

      return {
        success: false,
        error: rawErrorMsg,
        data,
      };
    }
  } catch (err) {
    console.error(`[SMS ERROR] ❌ Fast2SMS request exception for ${mobile}:`, err.message);
    const allowFallback = process.env.ALLOW_OTP_MOCK_FALLBACK === "true" || process.env.NODE_ENV !== "production";
    if (allowFallback) {
      console.warn(`[SMS FALLBACK] ⚠️ Fast2SMS exception (${err.message}). Falling back to console OTP logging.`);
      return { success: true, mock: true, warning: err.message };
    }
    return { success: false, error: err.message };
  }
};

module.exports = { sendSmsOtp };
