/**
 * SMS OTP Service
 * Logs OTP to server console in dev mode, or dispatches via SMS gateway if FAST2SMS_API_KEY is configured.
 */

const sendSmsOtp = async (phone, otp) => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  const digits = String(phone || "").replace(/\D/g, "");
  const mobile = digits.length >= 10 ? digits.slice(-10) : digits;

  if (!mobile || mobile.length !== 10) {
    return { success: false, error: "Please enter a valid 10-digit phone number" };
  }

  if (!apiKey) {
    console.log(`[SMS MOCK] 📱 OTP for ${mobile}: ${otp}`);
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
      return { success: true, data };
    }
    return { success: true, mock: true, warning: data?.message || "SMS delivery failed" };
  } catch (err) {
    return { success: true, mock: true, warning: err.message };
  }
};

module.exports = { sendSmsOtp };
