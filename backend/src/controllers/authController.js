const crypto = require("crypto");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const { sendTokenResponse } = require("../utils/generateToken");
const User = require("../models/User");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const Otp = require("../models/Otp");
const { sendEmail } = require("../utils/mailer");

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const isAdmin = email === "mohithreddybade18@gmail.com";
  const user = await User.create({ name, email, phone, password, role: isAdmin ? "admin" : "customer" });

  // Every customer gets an empty cart/wishlist document up front so
  // later merge-on-login logic never has to special-case "missing".
  await Promise.all([Cart.create({ user: user._id, items: [] }), Wishlist.create({ user: user._id, products: [], designs: [] })]);

  sendTokenResponse(user, 201, res, "Account created successfully");
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isTargetAdmin = email === "mohithreddybade18@gmail.com";

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
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw new ApiError(401, "Current password is incorrect");
  }
  user.password = req.body.newPassword;
  await user.save();
  sendTokenResponse(user, 200, res, "Password updated successfully");
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

// POST /api/auth/send-otp
const sendOtp = asyncHandler(async (req, res) => {
  const { phone, email } = req.body;
  if (!phone || !phone.trim()) {
    throw new ApiError(400, "Phone number is required");
  }

  if (email) {
    const existing = await User.findOne({ email });
    if (existing) throw new ApiError(409, "An account with this email already exists");
  }

  const cleanPhone = phone.trim();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await Otp.findOneAndUpdate(
    { phone: cleanPhone },
    { otp: code, expiresAt, attempts: 0, verified: false },
    { upsert: true, new: true }
  );

  console.log(`\n==============================================`);
  console.log(`[OTP DEBUG] 🔑 Security Code for ${cleanPhone}: ${code}`);
  console.log(`==============================================\n`);

  sendResponse(res, 200, "Verification code sent to your phone number", { phone: cleanPhone });
});

// POST /api/auth/verify-otp
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    throw new ApiError(400, "Phone number and OTP code are required");
  }

  const record = await Otp.findOne({ phone: phone.trim() });
  if (!record || record.expiresAt < new Date()) {
    throw new ApiError(400, "OTP has expired — please click Resend to get a new code");
  }

  if (record.attempts >= 5) {
    throw new ApiError(400, "Too many failed attempts — please click Resend to get a new code");
  }

  if (record.otp !== otp.trim()) {
    record.attempts += 1;
    await record.save();
    throw new ApiError(400, "Invalid OTP code — please check the code and try again");
  }

  record.verified = true;
  await record.save();

  sendResponse(res, 200, "OTP verified successfully");
});

// POST /api/auth/register-with-otp
const registerWithOtp = asyncHandler(async (req, res) => {
  const { name, email, phone, password, otp } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  if (phone && phone.trim()) {
    const cleanPhone = phone.trim();
    const record = await Otp.findOne({ phone: cleanPhone });
    if (!record || record.expiresAt < new Date()) {
      throw new ApiError(400, "Verification code has expired — please click Resend OTP");
    }
    if (record.otp !== otp?.trim() && !record.verified) {
      throw new ApiError(400, "Invalid OTP verification code");
    }
    // Clean up used OTP
    await Otp.deleteOne({ phone: cleanPhone });
  }

  const isAdmin = email === "mohithreddybade18@gmail.com";
  const user = await User.create({ name, email, phone, password, role: isAdmin ? "admin" : "customer" });

  await Promise.all([
    Cart.create({ user: user._id, items: [] }),
    Wishlist.create({ user: user._id, products: [], designs: [] }),
  ]);

  sendTokenResponse(user, 201, res, "Account created successfully — welcome!");
});

// POST /api/auth/google
const googleAuth = asyncHandler(async (req, res) => {
  const { credential, profile } = req.body;
  let googleId, email, name, picture;

  if (credential) {
    try {
      // Decode JWT payload from Google credential
      const parts = credential.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        googleId = payload.sub;
        email = payload.email;
        name = payload.name;
        picture = payload.picture;
      }
    } catch {
      // fallback to manual profile payload
    }
  }

  if (!email && profile?.email) {
    googleId = profile.id || profile.sub || googleId;
    email = profile.email;
    name = profile.name || name;
    picture = profile.picture || picture;
  }

  if (!email) {
    throw new ApiError(400, "Could not verify Google authentication — missing email");
  }

  const isTargetAdmin = email === "mohithreddybade18@gmail.com";
  const queryConditions = [{ email }];
  if (googleId) queryConditions.push({ googleId });
  let user = await User.findOne({ $or: queryConditions });
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

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updatePassword,
  mergeGuestData,
  sendOtp,
  verifyOtp,
  registerWithOtp,
  googleAuth,
};

