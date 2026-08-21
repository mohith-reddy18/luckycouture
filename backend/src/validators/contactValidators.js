const { body } = require("express-validator");

const contactMessageRules = [
  body().custom((value, { req }) => {
    const name = req.body.name || req.body.firstName;
    if (!name || !String(name).trim()) {
      throw new Error("Please enter your name");
    }
    return true;
  }),
  body("email").trim().isEmail().withMessage("Please provide a valid email address"),
  body("message").trim().isLength({ min: 3 }).withMessage("Please describe the issue in detail"),
];

module.exports = { contactMessageRules };
