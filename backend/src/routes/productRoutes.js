const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { productRules } = require("../validators/productValidators");
const {
  listProducts,
  getProduct,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const router = express.Router();

router.get("/", listProducts);
router.get("/:id/related", getRelatedProducts);
router.get("/:idOrSlug", getProduct);
router.post("/", protect, authorize("admin"), productRules, validate, createProduct);
router.patch("/:id", protect, authorize("admin"), updateProduct);
router.delete("/:id", protect, authorize("admin"), deleteProduct);

module.exports = router;
