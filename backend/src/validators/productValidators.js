const { body } = require("express-validator");

const productRules = [
  body("name").trim().notEmpty().withMessage("Product name is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("category").isMongoId().withMessage("A valid category is required"),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("mrp").isFloat({ min: 0 }).withMessage("MRP must be a positive number"),
  body("stock").optional().isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
];

module.exports = { productRules };
