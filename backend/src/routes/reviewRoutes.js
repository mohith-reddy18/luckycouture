const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const { getProductReviews, createReview, deleteReview, getAllReviews, updateReviewStatus } = require("../controllers/reviewController");

const router = express.Router();

router.get("/product/:productId", getProductReviews);
router.post("/", protect, createReview);
router.delete("/:id", protect, deleteReview);

// Admin routes
router.get("/", protect, authorize("admin"), getAllReviews);
router.patch("/:id/status", protect, authorize("admin"), updateReviewStatus);

module.exports = router;
