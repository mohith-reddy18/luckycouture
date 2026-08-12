const { sendTwilioVerification, checkTwilioVerification, formatE164, isValidE164 } = require("./twilioService");

/**
 * Backward compatibility wrapper for SMS service.
 * Fast2SMS implementation has been migrated to Twilio Verify V2 API.
 */
const sendSmsOtp = async (phone) => {
  return await sendTwilioVerification(phone);
};

module.exports = {
  sendSmsOtp,
  sendTwilioVerification,
  checkTwilioVerification,
  formatE164,
  isValidE164,
};
