const { body } = require("express-validator");

const contactMessageRules = [
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("email").isEmail().withMessage("Please provide a valid email"),
  body("message").trim().isLength({ min: 5 }).withMessage("Message is too short"),
];

module.exports = { contactMessageRules };
