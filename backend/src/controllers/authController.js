const crypto = require("crypto");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const { sendTokenResponse } = require("../utils/generateToken");
const User = require("../models/User");
const Otp = require("../models/Otp");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const { sendEmail } = require("../utils/mailer");
const {
  sendTwilioVerification,
  checkTwilioVerification,
  formatE164,
  sendOtpSms,
  maskPhoneNumber,
} = require("../utils/twilioService");
const { validatePhoneNumber, normalizePhoneNumber } = require("../utils/phoneValidator");

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, phone, password, email } = req.body;

  if (!name || !name.trim()) throw new ApiError(400, "Full name is required");
  if (!phone || !phone.trim()) throw new ApiError(400, "Phone number is required");
  if (!password || password.length < 8) throw new ApiError(400, "Password must be at least 8 characters");

  const phoneCheck = validatePhoneNumber(phone);
  if (!phoneCheck.isValid) {
    throw new ApiError(400, phoneCheck.error || "Please provide a valid phone number");
  }
  const cleanPhone = phoneCheck.normalized;

  const existingPhone = await User.findOne({ phone: cleanPhone });
  if (existingPhone) throw new ApiError(409, "An account with this phone number already exists");

  if (email && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) throw new ApiError(409, "An account with this email already exists");
  }

  const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : undefined;
  const isAdmin = cleanEmail === "mohithreddybade18@gmail.com";

  const user = await User.create({
    name: name.trim(),
    phone: cleanPhone,
    ...(cleanEmail ? { email: cleanEmail } : {}),
    password,
    role: isAdmin ? "admin" : "customer",
    authProvider: cleanEmail && !cleanPhone ? "email" : "phone",
  });

  // Every customer gets an empty cart/wishlist document up front so
  // later merge-on-login logic never has to special-case "missing".
  await Promise.all([
    Cart.create({ user: user._id, items: [] }),
    Wishlist.create({ user: user._id, products: [], designs: [] }),
  ]);

  sendTokenResponse(user, 201, res, "Account created successfully");
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const identifier = (req.body.email || req.body.phone || req.body.identifier || "").trim();
  const { password } = req.body;

  if (!identifier) {
    throw new ApiError(400, "Email or phone number is required");
  }

  const isEmail = identifier.includes("@");
  let user;

  if (isEmail) {
    user = await User.findOne({ email: identifier.toLowerCase() }).select("+password");
  } else {
    const normPhone = normalizePhoneNumber(identifier);
    const phoneDigits = identifier.replace(/\D/g, "");
    user = await User.findOne({
      $or: [
        { phone: identifier },
        ...(normPhone ? [{ phone: normPhone }] : []),
        ...(phoneDigits ? [{ phone: { $regex: phoneDigits + "$" } }] : []),
      ],
    }).select("+password");
  }

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email/phone or password");
  }

  const isTargetAdmin = user.email && user.email.toLowerCase() === "mohithreddybade18@gmail.com";

  // If the user is the target admin email but somehow is not an admin, upgrade them automatically.
  if (isTargetAdmin && user.role !== "admin") {
    user.role = "admin";
    await user.save({ validateBeforeSave: false });
  }

  if (!user.isActive) throw new ApiError(403, "This account has been deactivated");

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res, "Logged in successfully");
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  res.cookie("token", "", { expires: new Date(0), httpOnly: true });
  sendResponse(res, 200, "Logged out successfully");
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  sendResponse(res, 200, "Current user fetched", req.user.toSafeObject());
});

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  // Always respond the same way whether or not the account exists,
  // so the endpoint can't be used to enumerate registered emails.
  if (user) {
    const resetToken = user.generateResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your Lucky Couture password",
        html: `<p>Hi ${user.name},</p><p>Click below to reset your password. This link expires in 30 minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
    } catch {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      throw new ApiError(500, "Could not send reset email — please try again later");
    }
  }

  sendResponse(res, 200, "If an account exists for that email, a reset link has been sent");
});

// PATCH /api/auth/reset-password/:token
const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) throw new ApiError(400, "Reset link is invalid or has expired");

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res, "Password reset successfully");
});

// PATCH /api/auth/update-password
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword) {
    throw new ApiError(400, "Current password is required");
  }
  if (!newPassword) {
    throw new ApiError(400, "New password is required");
  }
  if (confirmPassword && newPassword !== confirmPassword) {
    throw new ApiError(400, "New passwords do not match.");
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Google / social login user without local password
  if (!user.password && (user.googleId || user.authProvider === "google")) {
    throw new ApiError(
      400,
      "Your account uses Google Sign-In. Password changes are managed through your Google account."
    );
  }

  if (!user.password || !(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, "Current password is incorrect.");
  }

  user.password = newPassword;
  user.hasPassword = true;
  await user.save();
  sendTokenResponse(user, 200, res, "Password changed successfully.");
});

// POST /api/auth/merge-guest-data
// Merges a guest's temporary localStorage cart/wishlist into their account right after login/signup.
const mergeGuestData = asyncHandler(async (req, res) => {
  const { cartItems = [], wishlistProductIds = [], wishlistDesignIds = [] } = req.body;

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

  for (const item of cartItems) {
    const exists = cart.items.find((i) => i.product.toString() === item.product && i.size === item.size && i.color === item.color);
    if (exists) exists.quantity += item.quantity || 1;
    else cart.items.push(item);
  }
  await cart.save();

  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) wishlist = await Wishlist.create({ user: req.user._id, products: [], designs: [] });

  wishlist.products = Array.from(new Set([...wishlist.products.map(String), ...wishlistProductIds]));
  wishlist.designs = Array.from(new Set([...wishlist.designs.map(String), ...wishlistDesignIds]));
  await wishlist.save();

  sendResponse(res, 200, "Guest cart and wishlist merged", { cart, wishlist });
});

// POST /api/auth/google
const googleAuth = asyncHandler(async (req, res) => {
  const { credential, profile, access_token } = req.body;
  let googleId, email, name, picture;

  // 1. Try decoding JWT credential if present
  if (credential && typeof credential === "string") {
    try {
      const parts = credential.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        googleId = payload.sub;
        email = payload.email;
        name = payload.name;
        picture = payload.picture;
      }
    } catch {
      // fallback to profile / access_token
    }
  }

  // 2. Try payload profile if present
  if (!email && profile && typeof profile === "object") {
    googleId = profile.id || profile.sub || googleId;
    email = profile.email;
    name = profile.name || name;
    picture = profile.picture || picture;
  }

  // 3. Fallback: fetch userinfo directly from Google API server-side using access_token
  const tokenToUse = access_token || (credential && typeof credential === "string" && !credential.includes(".") ? credential : null);
  if (!email && tokenToUse) {
    try {
      const googleRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      if (googleRes.ok) {
        const gData = await googleRes.json();
        googleId = gData.sub || gData.id || googleId;
        email = gData.email;
        name = gData.name || name;
        picture = gData.picture || picture;
      }
    } catch (e) {
      console.error("Server-side Google userinfo fetch error:", e.message);
    }
  }

  if (!email) {
    throw new ApiError(400, "Could not verify Google authentication — missing email");
  }

  const isTargetAdmin = email === "mohithreddybade18@gmail.com";
  const queryConditions = [{ email }];
  if (googleId) queryConditions.push({ googleId });
  let user = await User.findOne({ $or: queryConditions }).select("+password");
  let isNewUser = false;

  if (user) {
    if (!user.googleId && googleId) {
      user.googleId = googleId;
    }
    if (isTargetAdmin && user.role !== "admin") {
      user.role = "admin";
    }
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });
  } else {
    user = await User.create({
      googleId,
      name: name || "Google User",
      email,
      avatar: picture ? { url: picture } : undefined,
      role: isTargetAdmin ? "admin" : "customer",
      isEmailVerified: true,
      hasPassword: false,
      authProvider: "google",
      lastLoginAt: new Date(),
    });
    isNewUser = true;
  }

  // Ensure cart & wishlist exist
  let cart = await Cart.findOne({ user: user._id });
  if (!cart) await Cart.create({ user: user._id, items: [] });
  let wishlist = await Wishlist.findOne({ user: user._id });
  if (!wishlist) await Wishlist.create({ user: user._id, products: [], designs: [] });

  sendTokenResponse(user, 200, res, "Logged in with Google successfully", { isNewUser });
});

// POST /api/auth/forgot-password-otp
const forgotPasswordPhoneOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone || !phone.trim()) {
    throw new ApiError(400, "Phone number is required");
  }

  const phoneCheck = validatePhoneNumber(phone);
  if (!phoneCheck.isValid) {
    throw new ApiError(400, phoneCheck.error || "Please enter a valid phone number");
  }
  const cleanPhone = formatE164(phoneCheck.normalized || phone);
  const normPhone = normalizePhoneNumber(phone);
  const rawDigits = phone.replace(/\D/g, "");

  const queryConditions = [
    { phone: cleanPhone },
    ...(phone && phone !== cleanPhone ? [{ phone: phone.trim() }] : []),
    ...(normPhone && normPhone !== cleanPhone ? [{ phone: normPhone }] : []),
    ...(rawDigits && rawDigits.length >= 10 ? [{ phone: { $regex: rawDigits.slice(-10) + "$" } }] : []),
  ];

  const user = await User.findOne({ $or: queryConditions });

  if (!user) {
    throw new ApiError(404, "No account registered with this phone number. Please check the number or create an account.");
  }

  // Check rate limiting / resend cooldown (60 seconds)
  const existingRecentOtp = await Otp.findOne({
    phone: cleanPhone,
    purpose: "password_reset",
    resendAfter: { $gt: new Date() },
  });

  if (existingRecentOtp) {
    const secondsRemaining = Math.max(1, Math.ceil((existingRecentOtp.resendAfter - new Date()) / 1000));
    throw new ApiError(429, `Please wait ${secondsRemaining}s before requesting another verification code`);
  }

  // Dispatch real Twilio Verify SMS
  const result = await sendTwilioVerification(cleanPhone);
  if (!result.success) {
    console.error(`[FORGOT PASSWORD OTP ERROR] Twilio Verify failed for ${cleanPhone}:`, result.error, result.code ? `(Code: ${result.code})` : "");
    throw new ApiError(400, result.error || "Failed to send verification code. Please try again later.");
  }

  // Invalidate previous OTP entries for this phone + purpose and record cooldown
  await Otp.deleteMany({ phone: cleanPhone, purpose: "password_reset" });
  await Otp.create({
    phone: cleanPhone,
    otpHash: "twilio_verify",
    purpose: "password_reset",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    resendAfter: new Date(Date.now() + 60 * 1000), // 60 seconds
  });

  sendResponse(res, 200, "Verification code sent to your phone number", {
    phone: cleanPhone,
    maskedPhone: maskPhoneNumber(cleanPhone),
  });
});

// POST /api/auth/verify-password-reset-otp
const verifyPasswordResetOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp || String(otp).trim().length < 4) {
    throw new ApiError(400, "Phone number and verification code are required");
  }

  const phoneCheck = validatePhoneNumber(phone);
  if (!phoneCheck.isValid) {
    throw new ApiError(400, phoneCheck.error || "Please enter a valid phone number");
  }
  const cleanPhone = formatE164(phoneCheck.normalized || phone);

  // Verify code with Twilio Verify API
  const result = await checkTwilioVerification(cleanPhone, otp);
  if (!result.success) {
    console.error(`[VERIFY PASSWORD OTP ERROR] Twilio check failed for ${cleanPhone}:`, result.error);
    throw new ApiError(400, result.error || "Invalid or expired verification code");
  }

  // Find user associated with verified phone
  const phoneDigits = cleanPhone.replace(/\D/g, "");
  const user = await User.findOne({
    $or: [
      { phone: cleanPhone },
      ...(phoneDigits ? [{ phone: { $regex: phoneDigits + "$" } }] : []),
    ],
  });

  if (!user) {
    throw new ApiError(404, "User account not found");
  }

  // Create single-use reset authorization token (10 minutes)
  const resetToken = user.generateResetToken();
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  // Mark local OTP session as completed
  await Otp.updateMany({ phone: cleanPhone, purpose: "password_reset" }, { isUsed: true });

  sendResponse(res, 200, "Phone number verified successfully", {
    resetToken,
    phone: cleanPhone,
  });
});

// POST /api/auth/reset-password-otp
const resetPasswordPhoneOtp = asyncHandler(async (req, res) => {
  const { phone, otp, resetToken, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  let user = null;

  // Flow A: Verified single-use resetToken path
  if (resetToken) {
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      throw new ApiError(400, "Password reset session has expired or is invalid. Please verify your phone number again.");
    }
  }
  // Flow B: Legacy direct verification fallback
  else if (phone && otp) {
    const phoneCheck = validatePhoneNumber(phone);
    if (!phoneCheck.isValid) {
      throw new ApiError(400, phoneCheck.error || "Please enter a valid phone number");
    }
    const cleanPhone = formatE164(phoneCheck.normalized || phone);

    const result = await checkTwilioVerification(cleanPhone, otp);
    if (!result.success) {
      throw new ApiError(400, result.error || "Invalid or expired verification code");
    }

    const phoneDigits = cleanPhone.replace(/\D/g, "");
    user = await User.findOne({
      $or: [
        { phone: cleanPhone },
        ...(phoneDigits ? [{ phone: { $regex: phoneDigits + "$" } }] : []),
      ],
    }).select("+password");

    if (!user) {
      throw new ApiError(404, "User account not found");
    }
  } else {
    throw new ApiError(400, "Missing reset authorization token or verification code");
  }

  // Update password and invalidate reset token
  user.password = newPassword;
  user.hasPassword = true;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  // Clear any residual OTPs for this phone
  if (user.phone) {
    await Otp.deleteMany({ phone: user.phone, purpose: "password_reset" });
  }

  sendTokenResponse(user, 200, res, "Password reset successfully. You are now logged in.");
});

module.exports = {
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
};
