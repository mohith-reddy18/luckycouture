const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");

/**
 * Resolves a product identifier (MongoDB _id, slug, sku, or custom ID)
 * to the actual Product document.
 */
async function resolveProduct(idOrSlug) {
  if (!idOrSlug) return null;
  const str = String(idOrSlug).trim();
  const isObjectId = mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str);

  if (isObjectId) {
    const productById = await Product.findById(str);
    if (productById) return productById;
  }

  return await Product.findOne({
    $or: [
      { slug: str },
      { sku: str },
      { slug: str.toLowerCase() },
    ],
  });
}

async function recalculateRating(productId) {
  if (!productId) return;
  const productObjectId = mongoose.Types.ObjectId.isValid(productId) && typeof productId === "string"
    ? new mongoose.Types.ObjectId(productId)
    : productId;

  const stats = await Review.aggregate([
    { $match: { product: productObjectId, status: "visible" } },
    { $group: { _id: "$product", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const { avg = 0, count = 0 } = stats[0] || {};
  await Product.findByIdAndUpdate(productObjectId, {
    ratingAverage: Math.round(avg * 10) / 10,
    ratingCount: count,
  });
}

// GET /api/reviews/product/:productId?sort=newest|highest|lowest
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await resolveProduct(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const sortMap = { newest: { createdAt: -1 }, highest: { rating: -1 }, lowest: { rating: 1 } };
  const sortBy = sortMap[req.query.sort] || sortMap.newest;

  const reviews = await Review.find({ product: product._id, status: "visible" })
    .populate("user", "name")
    .sort(sortBy);

  sendResponse(res, 200, "Reviews fetched", reviews);
});

// POST /api/reviews
const createReview = asyncHandler(async (req, res) => {
  const { productId, rating, title, comment, orderId } = req.body;

  if (!productId) {
    throw new ApiError(400, "Product ID is required");
  }
  if (!rating || Number(rating) < 1 || Number(rating) > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }
  if (!comment || !comment.trim()) {
    throw new ApiError(400, "Review comment is required");
  }

  const product = await resolveProduct(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Prevent duplicate reviews per user per product
  const existingReview = await Review.findOne({ product: product._id, user: req.user._id });
  if (existingReview) {
    throw new ApiError(400, "You have already reviewed this product");
  }

  let isVerifiedPurchase = false;
  let validOrderId = null;

  if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
      "items.product": product._id,
      status: { $in: ["delivered"] },
    });
    if (order) {
      isVerifiedPurchase = true;
      validOrderId = order._id;
    }
  } else {
    // If orderId wasn't explicitly provided, check if user has any delivered order containing this product
    const order = await Order.findOne({
      user: req.user._id,
      "items.product": product._id,
      status: { $in: ["delivered"] },
    });
    if (order) {
      isVerifiedPurchase = true;
      validOrderId = order._id;
    }
  }

  const review = await Review.create({
    product: product._id,
    user: req.user._id,
    order: validOrderId,
    rating: Number(rating),
    title: title ? title.trim() : undefined,
    comment: comment.trim(),
    isVerifiedPurchase,
  });

  await recalculateRating(product._id);
  sendResponse(res, 201, "Review submitted", review);
});

// DELETE /api/reviews/:id (owner or admin)
const deleteReview = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(404, "Review not found");
  }
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
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(404, "Review not found");
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
