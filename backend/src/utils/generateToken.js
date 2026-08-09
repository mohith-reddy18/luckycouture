const jwt = require("jsonwebtoken");

function generateToken(userId, role) {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function sendTokenResponse(user, statusCode, res, message, extraPayload = {}) {
  const token = generateToken(user._id, user.role);

  const cookieDays = Number(process.env.JWT_COOKIE_EXPIRES_DAYS || 7);
  const cookieOptions = {
    expires: new Date(Date.now() + cookieDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };

  res.cookie("token", token, cookieOptions);

  return res.status(statusCode).json({
    success: true,
    message,
    token,
    data: user.toSafeObject ? user.toSafeObject() : user,
    ...extraPayload,
  });
}

module.exports = { generateToken, sendTokenResponse };
