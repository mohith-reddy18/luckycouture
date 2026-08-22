const mongoose = require("mongoose");
const crypto = require("crypto");

const otpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ["password_reset", "phone_verification", "login"],
      default: "password_reset",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    resendAfter: {
      type: Date,
      default: () => new Date(Date.now() + 60 * 1000), // 60 seconds cooldown
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index to auto-delete expired documents
    },
  },
  { timestamps: true }
);

// Helper static method to hash OTP
otpSchema.statics.hashOtp = function (otp) {
  return crypto.createHash("sha256").update(String(otp).trim()).digest("hex");
};

// Helper instance method to verify OTP
otpSchema.methods.verifyOtp = function (candidateOtp) {
  if (this.isUsed) return { valid: false, reason: "OTP has already been used" };
  if (new Date() > this.expiresAt) return { valid: false, reason: "OTP has expired. Please request a new code." };
  if (this.attempts >= this.maxAttempts) {
    return { valid: false, reason: "Too many failed attempts. Please request a new verification code." };
  }

  const candidateHash = crypto.createHash("sha256").update(String(candidateOtp).trim()).digest("hex");
  const isMatch = this.otpHash === candidateHash;

  return { valid: isMatch, reason: isMatch ? null : "Invalid verification code" };
};

module.exports = mongoose.model("Otp", otpSchema);
