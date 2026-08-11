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
      console.error(`[SMS ERROR] ❌ Fast2SMS API response error for ${mobile}:`, data);
      return {
        success: false,
        error: Array.isArray(data?.message) ? data.message.join(", ") : (data?.message || "SMS delivery failed"),
        data,
      };
    }
  } catch (err) {
    console.error(`[SMS ERROR] ❌ Fast2SMS request exception for ${mobile}:`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendSmsOtp };
