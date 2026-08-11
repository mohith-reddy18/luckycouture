require("dotenv").config();
const { sendSmsOtp } = require("./src/utils/smsService");

console.log("Testing SMS Service unit verification...");
console.log("FAST2SMS_API_KEY present:", Boolean(process.env.FAST2SMS_API_KEY));

(async () => {
  // Test invalid number validation
  const test1 = await sendSmsOtp("123", "999999");
  console.log("Test 1 (invalid phone):", test1);

  // Test phone extraction logic
  const testPhone = "+91 9999999999";
  const digits = testPhone.replace(/\D/g, "");
  const mobile = digits.length >= 10 ? digits.slice(-10) : digits;
  console.log(`Phone format test: '${testPhone}' -> '${mobile}'`);
  console.log("SMS Service unit test complete.");
})();
