const { body } = require("express-validator");

const tailoringOrderRules = [
  body("garmentType").trim().notEmpty().withMessage("Garment type is required"),
  body("fabricSource")
    .isIn(["customer_provided", "shop_provided"])
    .withMessage("fabricSource must be customer_provided or shop_provided"),
  body("guestInfo.phone")
    .if(body("customer").not().exists())
    .notEmpty()
    .withMessage("Phone number is required for guest bookings"),
  body("measurements").optional().isObject().withMessage("Measurements must be an object"),
];

const priorityOrderRules = [
  body("garmentType").trim().notEmpty().withMessage("Garment type is required"),
  body("fabricSource")
    .isIn(["customer_provided", "shop_provided"])
    .withMessage("fabricSource must be customer_provided or shop_provided"),
];

module.exports = { tailoringOrderRules, priorityOrderRules };
