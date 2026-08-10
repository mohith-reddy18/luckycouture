const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/ApiResponse");
const User = require("../models/User");
const Order = require("../models/Order");
const TailoringOrder = require("../models/TailoringOrder");
const PriorityOrder = require("../models/PriorityOrder");
const Product = require("../models/Product");
const ContactMessage = require("../models/ContactMessage");

// GET /api/admin/dashboard — Overview metrics for Admin Dashboard
const getDashboardSummary = asyncHandler(async (req, res) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalCustomers,
    totalProducts,
    totalOrders,
    totalTailoringOrders,
    pendingTailoringOrders,
    pendingPriorityOrders,
    lowStockProductsCount,
    unreadMessagesCount,
    totalRevenueAgg,
    monthlyRevenueAgg,
    recentOrders,
    recentTailoringOrders,
    lowStockItems,
  ] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    Product.countDocuments(),
    Order.countDocuments(),
    TailoringOrder.countDocuments(),
    TailoringOrder.countDocuments({ status: { $in: ["pending", "confirmed", "in_stitching"] } }),
    PriorityOrder.countDocuments({ status: "pending" }),
    Product.countDocuments({ stock: { $lte: 5 } }),
    ContactMessage.countDocuments({ status: "new" }),
    Order.aggregate([
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "name email"),
    TailoringOrder.find().sort({ createdAt: -1 }).limit(5).populate("customer", "name phone"),
    Product.find({ stock: { $lte: 5 } }).limit(5).select("name category stock price image"),
  ]);

  sendResponse(res, 200, "Dashboard summary fetched", {
    totalCustomers,
    totalProducts,
    totalOrders,
    totalTailoringOrders,
    totalRevenue: totalRevenueAgg[0]?.total || 0,
    monthlyRevenue: monthlyRevenueAgg[0]?.total || 0,
    pendingTailoringOrders,
    pendingPriorityOrders,
    lowStockProducts: lowStockProductsCount,
    unreadMessages: unreadMessagesCount,
    recentOrders: recentOrders || [],
    recentTailoringOrders: recentTailoringOrders || [],
    lowStockItems: lowStockItems || [],
  });
});

module.exports = { getDashboardSummary };
