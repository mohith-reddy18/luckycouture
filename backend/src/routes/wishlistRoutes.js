const express = require("express");
const { protect } = require("../middleware/auth");
const { getWishlist, toggleProductWishlist, toggleDesignWishlist } = require("../controllers/wishlistController");

const router = express.Router();

router.use(protect);
router.get("/", getWishlist);
router.post("/products/:productId", toggleProductWishlist);
router.post("/designs/:designId", toggleDesignWishlist);

module.exports = router;
