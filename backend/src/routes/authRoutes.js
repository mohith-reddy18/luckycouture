const express = require("express");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { authLimiter } = require("../middleware/rateLimiter");
const {
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
} = require("../validators/authValidators");
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updatePassword,
  mergeGuestData,
  googleAuth,
  forgotPasswordPhoneOtp,
  verifyPasswordResetOtp,
  resetPasswordPhoneOtp,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", authLimiter, registerRules, validate, register);
router.post("/google", authLimiter, googleAuth);
router.post("/login", authLimiter, loginRules, validate, login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.post("/forgot-password", authLimiter, forgotPasswordRules, validate, forgotPassword);
router.patch("/reset-password/:token", authLimiter, resetPasswordRules, validate, resetPassword);
router.post("/forgot-password-otp", authLimiter, forgotPasswordPhoneOtp);
router.post("/verify-password-reset-otp", authLimiter, verifyPasswordResetOtp);
router.post("/reset-password-otp", authLimiter, resetPasswordPhoneOtp);
router.patch("/update-password", protect, updatePassword);
router.post("/merge-guest-data", protect, mergeGuestData);

module.exports = router;
