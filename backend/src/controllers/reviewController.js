const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");

async function recalculateRating(productId) {
  const stats = await Review.aggregate([
    { $match: { product: productId, status: "visible" } },
    { $group: { _id: "$product", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const { avg = 0, count = 0 } = stats[0] || {};
  await Product.findByIdAndUpdate(productId, {
    ratingAverage: Math.round(avg * 10) / 10,
    ratingCount: count,
  });
}

// GET /api/reviews/product/:productId?sort=newest|highest|lowest
const getProductReviews = asyncHandler(async (req, res) => {
  const sortMap = { newest: { createdAt: -1 }, highest: { rating: -1 }, lowest: { rating: 1 } };
  const sortBy = sortMap[req.query.sort] || sortMap.newest;

  const reviews = await Review.find({ product: req.params.productId, status: "visible" })
    .populate("user", "name")
    .sort(sortBy);

  sendResponse(res, 200, "Reviews fetched", reviews);
});

// POST /api/reviews
const createReview = asyncHandler(async (req, res) => {
  const { productId, rating, title, comment, orderId } = req.body;

  let isVerifiedPurchase = false;
  if (orderId) {
    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
      "items.product": productId,
      status: { $in: ["delivered"] },
    });
    isVerifiedPurchase = Boolean(order);
  }

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    order: orderId,
    rating,
    title,
    comment,
    isVerifiedPurchase,
  });

  await recalculateRating(productId);
  sendResponse(res, 201, "Review submitted", review);
});

// DELETE /api/reviews/:id (owner or admin)
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, "Review not found");

  const isOwner = review.user.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") throw new ApiError(403, "Not authorized to delete this review");

  await review.deleteOne();
  await recalculateRating(review.product);
  sendResponse(res, 200, "Review deleted");
});

// GET /api/reviews
const getAllReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({})
    .populate("user", "name email")
    .populate("product", "name images")
    .sort({ createdAt: -1 });

  sendResponse(res, 200, "All reviews fetched", reviews);
});

// PATCH /api/reviews/:id/status
const updateReviewStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["visible", "hidden"].includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!review) throw new ApiError(404, "Review not found");

  await recalculateRating(review.product);
  sendResponse(res, 200, "Review status updated", review);
});

module.exports = { getProductReviews, createReview, deleteReview, getAllReviews, updateReviewStatus };
