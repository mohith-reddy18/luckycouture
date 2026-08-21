const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const User = require("../models/User");

/**
 * Requires a valid JWT (from the Authorization header or the httpOnly
 * cookie) and attaches the authenticated user to req.user.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    throw new ApiError(401, "Not authorized — please log in");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, "Invalid or expired session — please log in again");
  }

  const user = await User.findById(decoded.id).select("-password");
  if (!user || !user.isActive) {
    throw new ApiError(401, "Account no longer exists or has been deactivated");
  }

  req.user = user;
  next();
});

/**
 * Populates req.user if a valid token is present, but does not reject
 * the request otherwise. Used for guest-friendly routes (e.g. designs,
 * products) where wishlist/cart state should show for logged-in users.
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (user && user.isActive) req.user = user;
  } catch {
    // invalid/expired token on an optional route — proceed as guest
  }
  next();
});

/**
 * Restricts a route to one or more roles. Use after `protect`.
 * Example: router.delete('/:id', protect, authorize('admin'), ...)
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new ApiError(403, "You do not have permission to perform this action");
  }
  next();
};

module.exports = { protect, optionalAuth, authorize };
