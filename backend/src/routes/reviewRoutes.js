const express = require("express");
const { protect, optionalAuth, authorize } = require("../middleware/auth");
const {
  getProductReviews,
  getDesignReviews,
  checkReviewEligibility,
  createReview,
  updateReview,
  deleteReview,
  getAllReviews,
  updateReviewStatus,
} = require("../controllers/reviewController");

const router = express.Router();

router.get("/eligibility", optionalAuth, checkReviewEligibility);
router.get("/product/:productId", getProductReviews);
router.get("/design/:designId", getDesignReviews);

router.post("/", protect, createReview);
router.patch("/:id", protect, updateReview);
router.delete("/:id", protect, deleteReview);

// Admin routes
router.get("/", protect, authorize("admin"), getAllReviews);
router.patch("/:id/status", protect, authorize("admin"), updateReviewStatus);

module.exports = router;

