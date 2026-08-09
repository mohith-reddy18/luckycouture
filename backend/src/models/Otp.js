const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // Auto-delete document upon expiration
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Otp", otpSchema);
