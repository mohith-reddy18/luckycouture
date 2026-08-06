const { body } = require("express-validator");

const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Please provide a valid email").normalizeEmail(),
  body("phone")
    .optional()
    .matches(/^[+]?[0-9\s-]{7,15}$/)
    .withMessage("Please provide a valid phone number"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
];

const loginRules = [
  body("email").isEmail().withMessage("Please provide a valid email").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const forgotPasswordRules = [body("email").isEmail().withMessage("Please provide a valid email").normalizeEmail()];

const resetPasswordRules = [
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
];

module.exports = { registerRules, loginRules, forgotPasswordRules, resetPasswordRules };
