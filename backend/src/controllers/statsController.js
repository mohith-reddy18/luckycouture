const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/ApiResponse");
const User = require("../models/User");
const Order = require("../models/Order");
const TailoringOrder = require("../models/TailoringOrder");
const PriorityOrder = require("../models/PriorityOrder");
const Review = require("../models/Review");

/**
 * GET /api/stats
 * Public endpoint returning aggregate trust & experience statistics.
 * Never exposes any customer or order personal data.
 */
const getPublicStats = asyncHandler(async (req, res) => {
  const [
    customersCount,
    deliveredOrdersCount,
    deliveredTailoringCount,
    deliveredPriorityCount,
    reviewAgg,
  ] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    Order.countDocuments({ status: "delivered" }),
    TailoringOrder.countDocuments({ status: "delivered" }),
    PriorityOrder.countDocuments({ status: "delivered" }),
    Review.aggregate([
      { $match: { status: "visible" } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          satisfiedCount: {
            $sum: {
              $cond: [{ $gte: ["$rating", 4] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);

  const completedOrders =
    (deliveredOrdersCount || 0) +
    (deliveredTailoringCount || 0) +
    (deliveredPriorityCount || 0);

  const reviewStats = reviewAgg && reviewAgg.length > 0 ? reviewAgg[0] : null;
  const totalReviews = reviewStats ? reviewStats.totalReviews : 0;
  const overallRating =
    totalReviews > 0
      ? Math.round(reviewStats.avgRating * 10) / 10
      : 5.0;
  const customerSatisfaction =
    totalReviews > 0
      ? Math.round((reviewStats.satisfiedCount / totalReviews) * 100)
      : 100;

  sendResponse(res, 200, "Public trust statistics fetched successfully", {
    customersServed: customersCount || 0,
    completedOrders,
    overallRating,
    customerSatisfaction,
    totalReviews,
  });
});

module.exports = {
  getPublicStats,
};
