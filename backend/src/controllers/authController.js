const crypto = require("crypto");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const { sendTokenResponse } = require("../utils/generateToken");
const User = require("../models/User");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const { sendEmail } = require("../utils/mailer");

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const user = await User.create({ name, email, phone, password });

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

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updatePassword,
  mergeGuestData,
};
