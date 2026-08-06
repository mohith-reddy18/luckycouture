const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/ApiResponse");
const User = require("../models/User");
const Order = require("../models/Order");
const TailoringOrder = require("../models/TailoringOrder");
const PriorityOrder = require("../models/PriorityOrder");
const Product = require("../models/Product");
const ContactMessage = require("../models/ContactMessage");

// GET /api/admin/dashboard — single-screen overview per Volume 5
const getDashboardSummary = asyncHandler(async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalOrders,
    pendingTailoringOrders,
    pendingPriorityOrders,
    lowStockProducts,
    unreadMessages,
    monthlyRevenueAgg,
    bestSellers,
  ] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    Order.countDocuments(),
    TailoringOrder.countDocuments({ status: "pending" }),
    PriorityOrder.countDocuments({ status: "pending" }),
    Product.countDocuments({ stock: { $lte: 5, $gt: 0 }, status: "active" }),
    ContactMessage.countDocuments({ status: "new" }),
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Product.find({ isBestseller: true, status: "active" }).limit(5).select("name price ratingAverage"),
  ]);

  sendResponse(res, 200, "Dashboard summary fetched", {
    totalUsers,
    totalOrders,
    pendingTailoringOrders,
    pendingPriorityOrders,
    lowStockProducts,
    unreadMessages,
    monthlyRevenue: monthlyRevenueAgg[0]?.total || 0,
    bestSellers,
  });
});

module.exports = { getDashboardSummary };
