const Razorpay = require("razorpay");

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn(
    "[Razorpay] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set. " +
    "Payment features will not work until these environment variables are configured."
  );
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_secret",
});

module.exports = razorpay;

