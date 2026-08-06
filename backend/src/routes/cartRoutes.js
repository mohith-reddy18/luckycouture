const express = require("express");
const { protect } = require("../middleware/auth");
const { getCart, addToCart, updateCartItem, removeCartItem, clearCart } = require("../controllers/cartController");

const router = express.Router();

router.use(protect);
router.get("/", getCart);
router.post("/", addToCart);
router.patch("/:itemId", updateCartItem);
router.delete("/:itemId", removeCartItem);
router.delete("/", clearCart);

module.exports = router;
