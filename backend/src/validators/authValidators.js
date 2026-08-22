const { body } = require("express-validator");
const { validatePhoneNumber } = require("../utils/phoneValidator");

const registerRules = [
  body("name").trim().notEmpty().withMessage("Full name is required"),
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .custom((val) => {
      const { isValid, error } = validatePhoneNumber(val);
      if (!isValid) throw new Error(error || "Invalid phone number format");
      return true;
    }),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
];

const loginRules = [
  body("email").trim().notEmpty().withMessage("Email or phone number is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const forgotPasswordRules = [body("email").isEmail().withMessage("Please provide a valid email").normalizeEmail()];

const resetPasswordRules = [
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
];

const updatePasswordRules = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
];

module.exports = {
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  updatePasswordRules,
};
