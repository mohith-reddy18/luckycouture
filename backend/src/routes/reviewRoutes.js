const express = require("express");
const { protect } = require("../middleware/auth");
const { getProductReviews, createReview, deleteReview } = require("../controllers/reviewController");

const router = express.Router();

router.get("/product/:productId", getProductReviews);
router.post("/", protect, createReview);
router.delete("/:id", protect, deleteReview);

module.exports = router;
