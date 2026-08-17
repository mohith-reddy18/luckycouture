const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const Review = require("../models/Review");
const Product = require("../models/Product");
const Design = require("../models/Design");
const Order = require("../models/Order");
const TailoringOrder = require("../models/TailoringOrder");

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

/**
 * Resolves a design identifier (MongoDB _id, slug, or title)
 * to the actual Design document.
 */
async function resolveDesign(idOrSlug) {
  if (!idOrSlug) return null;
  const str = String(idOrSlug).trim();
  const isObjectId = mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str);

  if (isObjectId) {
    const designById = await Design.findById(str);
    if (designById) return designById;
  }

  return await Design.findOne({
    $or: [
      { slug: str },
      { slug: str.toLowerCase() },
      { title: str },
    ],
  });
}

/**
 * Recalculates and updates aggregate ratings on Product document.
 */
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

/**
 * Recalculates and updates aggregate ratings on Design document.
 */
async function recalculateDesignRating(designId) {
  if (!designId) return;
  const designObjectId = mongoose.Types.ObjectId.isValid(designId) && typeof designId === "string"
    ? new mongoose.Types.ObjectId(designId)
    : designId;

  const stats = await Review.aggregate([
    { $match: { design: designObjectId, status: "visible" } },
    { $group: { _id: "$design", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const { avg = 0, count = 0 } = stats[0] || {};
  await Design.findByIdAndUpdate(designObjectId, {
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

// GET /api/reviews/design/:designId?sort=newest|highest|lowest
const getDesignReviews = asyncHandler(async (req, res) => {
  const { designId } = req.params;
  const design = await resolveDesign(designId);
  if (!design) {
    throw new ApiError(404, "Design not found");
  }

  const sortMap = { newest: { createdAt: -1 }, highest: { rating: -1 }, lowest: { rating: 1 } };
  const sortBy = sortMap[req.query.sort] || sortMap.newest;

  const reviews = await Review.find({ design: design._id, status: "visible" })
    .populate("user", "name")
    .sort(sortBy);

  sendResponse(res, 200, "Design reviews fetched", reviews);
});

// GET /api/reviews/eligibility?productId=... or ?designId=...
const checkReviewEligibility = asyncHandler(async (req, res) => {
  const { productId, designId } = req.query;
  const userId = req.user?._id;

  if (!productId && !designId) {
    throw new ApiError(400, "productId or designId is required");
  }

  if (!userId) {
    return sendResponse(res, 200, "Eligibility checked", {
      canReview: false,
      status: "unauthenticated",
      existingReview: null,
      message: "Please sign in to leave a review.",
    });
  }

  if (productId) {
    const product = await resolveProduct(productId);
    if (!product) throw new ApiError(404, "Product not found");

    const existingReview = await Review.findOne({ product: product._id, user: userId }).populate("user", "name");
    if (existingReview) {
      return sendResponse(res, 200, "Eligibility checked", {
        canReview: false,
        status: "already_reviewed",
        existingReview,
        message: "You have already reviewed this product.",
      });
    }

    const orders = await Order.find({ user: userId, "items.product": product._id });
    if (orders.length === 0) {
      return sendResponse(res, 200, "Eligibility checked", {
        canReview: false,
        status: "not_purchased",
        existingReview: null,
        message: "Purchase this item and complete your order to leave a review.",
      });
    }

    const completedOrder = orders.find((o) => o.status === "delivered");
    if (!completedOrder) {
      return sendResponse(res, 200, "Eligibility checked", {
        canReview: false,
        status: "order_not_completed",
        existingReview: null,
        message: "You can review this item after your order is completed.",
      });
    }

    return sendResponse(res, 200, "Eligibility checked", {
      canReview: true,
      status: "eligible",
      existingReview: null,
      message: "You are eligible to review this item.",
    });
  }

  if (designId) {
    const design = await resolveDesign(designId);
    if (!design) throw new ApiError(404, "Design not found");

    const existingReview = await Review.findOne({ design: design._id, user: userId }).populate("user", "name");
    if (existingReview) {
      return sendResponse(res, 200, "Eligibility checked", {
        canReview: false,
        status: "already_reviewed",
        existingReview,
        message: "You have already reviewed this design.",
      });
    }

    const tailoringOrders = await TailoringOrder.find({
      customer: userId,
      referenceDesign: design._id,
    });
    if (tailoringOrders.length === 0) {
      return sendResponse(res, 200, "Eligibility checked", {
        canReview: false,
        status: "not_purchased",
        existingReview: null,
        message: "Order this design through custom tailoring and complete your order to leave a review.",
      });
    }

    const completedOrder = tailoringOrders.find((o) => o.status === "delivered");
    if (!completedOrder) {
      return sendResponse(res, 200, "Eligibility checked", {
        canReview: false,
        status: "order_not_completed",
        existingReview: null,
        message: "You can review this design after your order is completed.",
      });
    }

    return sendResponse(res, 200, "Eligibility checked", {
      canReview: true,
      status: "eligible",
      existingReview: null,
      message: "You are eligible to review this design.",
    });
  }
});

// POST /api/reviews
const createReview = asyncHandler(async (req, res) => {
  const { productId, designId, rating, title, comment } = req.body;

  if (!productId && !designId) {
    throw new ApiError(400, "productId or designId is required");
  }
  if (!rating || Number(rating) < 1 || Number(rating) > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }
  if (!comment || !comment.trim()) {
    throw new ApiError(400, "Review comment is required");
  }

  const userId = req.user._id;

  if (productId) {
    const product = await resolveProduct(productId);
    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    // 1. One review per user per product check
    const existingReview = await Review.findOne({ product: product._id, user: userId });
    if (existingReview) {
      throw new ApiError(400, "You have already reviewed this product");
    }

    // 2. Strict purchase check
    const orders = await Order.find({ user: userId, "items.product": product._id });
    if (orders.length === 0) {
      throw new ApiError(403, "You can only review items you have purchased.");
    }

    // 3. Strict completed order check ("delivered")
    const completedOrder = orders.find((o) => o.status === "delivered");
    if (!completedOrder) {
      throw new ApiError(403, "You can review this item after your order is completed.");
    }

    const review = await Review.create({
      product: product._id,
      user: userId,
      order: completedOrder._id,
      rating: Number(rating),
      title: title ? title.trim() : undefined,
      comment: comment.trim(),
      isVerifiedPurchase: true,
      isEdited: false,
      editedAt: null,
    });

    await recalculateRating(product._id);
    const populated = await Review.findById(review._id).populate("user", "name").lean();
    return sendResponse(res, 201, "Review submitted", populated);
  }

  if (designId) {
    const design = await resolveDesign(designId);
    if (!design) {
      throw new ApiError(404, "Design not found");
    }

    // 1. One review per user per design check
    const existingReview = await Review.findOne({ design: design._id, user: userId });
    if (existingReview) {
      throw new ApiError(400, "You have already reviewed this design");
    }

    // 2. Strict design order check
    const tailoringOrders = await TailoringOrder.find({
      customer: userId,
      referenceDesign: design._id,
    });
    if (tailoringOrders.length === 0) {
      throw new ApiError(403, "You can only review designs you have ordered.");
    }

    // 3. Strict completed order check ("delivered")
    const completedOrder = tailoringOrders.find((o) => o.status === "delivered");
    if (!completedOrder) {
      throw new ApiError(403, "You can review this design after your order is completed.");
    }

    const review = await Review.create({
      design: design._id,
      user: userId,
      tailoringOrder: completedOrder._id,
      rating: Number(rating),
      title: title ? title.trim() : undefined,
      comment: comment.trim(),
      isVerifiedPurchase: true,
      isEdited: false,
      editedAt: null,
    });

    await recalculateDesignRating(design._id);
    const populated = await Review.findById(review._id).populate("user", "name").lean();
    return sendResponse(res, 201, "Review submitted", populated);
  }
});

// PATCH /api/reviews/:id (owner only) — edit rating/comment
const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, title, comment } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Review not found");
  }

  const review = await Review.findById(id);
  if (!review) throw new ApiError(404, "Review not found");

  // Strict authorization: authenticated user ID === review.user ID
  if (review.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to edit this review");
  }

  if (rating !== undefined) {
    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      throw new ApiError(400, "Rating must be between 1 and 5");
    }
    review.rating = numRating;
  }

  if (comment !== undefined) {
    if (!comment.trim()) throw new ApiError(400, "Review comment cannot be empty");
    review.comment = comment.trim();
  }

  if (title !== undefined) {
    review.title = title ? title.trim() : undefined;
  }

  review.isEdited = true;
  review.editedAt = new Date();
  await review.save();

  if (review.product) {
    await recalculateRating(review.product);
  }
  if (review.design) {
    await recalculateDesignRating(review.design);
  }

  const populated = await Review.findById(review._id).populate("user", "name").lean();
  sendResponse(res, 200, "Review updated", populated);
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

  const productId = review.product;
  const designId = review.design;

  await review.deleteOne();

  if (productId) await recalculateRating(productId);
  if (designId) await recalculateDesignRating(designId);

  sendResponse(res, 200, "Review deleted");
});

// GET /api/reviews
const getAllReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({})
    .populate("user", "name email")
    .populate("product", "name images")
    .populate("design", "title images")
    .sort({ createdAt: -1 });

  sendResponse(res, 200, "All reviews fetched", reviews);
});

// PATCH /api/reviews/:id/status (admin)
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

  if (review.product) await recalculateRating(review.product);
  if (review.design) await recalculateDesignRating(review.design);

  sendResponse(res, 200, "Review status updated", review);
});

module.exports = {
  getProductReviews,
  getDesignReviews,
  checkReviewEligibility,
  createReview,
  updateReview,
  deleteReview,
  getAllReviews,
  updateReviewStatus,
  resolveProduct,
  resolveDesign,
};

