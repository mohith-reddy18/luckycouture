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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const tomorrowEnd = new Date();
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const shoppingPendingFilter = { status: { $nin: ["delivered", "cancelled", "returned", "rejected"] } };
  const tailoringPendingFilter = { status: { $nin: ["delivered", "cancelled", "rejected"] } };

  const [
    totalCustomers,
    totalProducts,
    totalOrders,
    totalTailoringOrders,
    pendingTailoringOrders,
    pendingPriorityOrders,
    lowStockProductsCount,
    unreadMessagesCount,
    totalOrderRevenueAgg,
    monthlyOrderRevenueAgg,
    totalTailoringRevenueAgg,
    monthlyTailoringRevenueAgg,
    recentOrders,
    recentTailoringOrders,
    lowStockItems,
    todaysShoppingCount,
    todaysTailoringCount,
    tomorrowsShoppingCount,
    tomorrowsTailoringCount,
    overdueShoppingCount,
    overdueTailoringCount,
    pendingShoppingCount,
    pendingTailoringCount,
  ] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    Product.countDocuments(),
    Order.countDocuments(),
    TailoringOrder.countDocuments(),
    TailoringOrder.countDocuments({ status: { $in: ["pending", "confirmed", "fabric_received", "cutting", "stitching", "quality_check"] } }),
    TailoringOrder.countDocuments({ isFastDelivery: true, status: { $nin: ["delivered", "cancelled", "rejected"] } }),
    Product.countDocuments({ stock: { $lte: 5 } }),
    ContactMessage.countDocuments({ status: "new" }),
    Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    TailoringOrder.aggregate([
      { $match: { status: { $nin: ["cancelled", "rejected"] } } },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $ifNull: [
                "$finalPrice",
                {
                  $ifNull: [
                    "$estimatedPrice",
                    { $add: ["$stitchingCost", "$designCost", "$fabricCost", "$deliveryCharge"] }
                  ]
                }
              ]
            }
          }
        }
      },
    ]),
    TailoringOrder.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: { $nin: ["cancelled", "rejected"] } } },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $ifNull: [
                "$finalPrice",
                {
                  $ifNull: [
                    "$estimatedPrice",
                    { $add: ["$stitchingCost", "$designCost", "$fabricCost", "$deliveryCharge"] }
                  ]
                }
              ]
            }
          }
        }
      },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "name email").lean(),
    TailoringOrder.find().sort({ createdAt: -1 }).limit(5).populate("customer", "name phone").lean(),
    Product.find({ stock: { $lte: 5 } }).limit(5).select("name category stock price image").lean(),
    // Today's orders (both shopping & tailoring)
    Order.countDocuments({
      ...shoppingPendingFilter,
      $or: [
        { estimatedDeliveryDate: { $gte: todayStart, $lte: todayEnd } },
        { estimatedDeliveryDate: null, createdAt: { $gte: todayStart, $lte: todayEnd } }
      ]
    }),
    TailoringOrder.countDocuments({
      ...tailoringPendingFilter,
      expectedDeliveryDate: { $gte: todayStart, $lte: todayEnd }
    }),
    // Tomorrow's orders (both shopping & tailoring)
    Order.countDocuments({
      ...shoppingPendingFilter,
      estimatedDeliveryDate: { $gt: todayEnd, $lte: tomorrowEnd }
    }),
    TailoringOrder.countDocuments({
      ...tailoringPendingFilter,
      expectedDeliveryDate: { $gt: todayEnd, $lte: tomorrowEnd }
    }),
    // Overdue orders (both shopping & tailoring)
    Order.countDocuments({
      ...shoppingPendingFilter,
      estimatedDeliveryDate: { $lt: todayStart }
    }),
    TailoringOrder.countDocuments({
      ...tailoringPendingFilter,
      expectedDeliveryDate: { $lt: todayStart }
    }),
    // Total pending orders (both shopping & tailoring)
    Order.countDocuments(shoppingPendingFilter),
    TailoringOrder.countDocuments(tailoringPendingFilter),
  ]);

  const totalRevenue = (totalOrderRevenueAgg[0]?.total || 0) + (totalTailoringRevenueAgg[0]?.total || 0);
  const monthlyRevenue = (monthlyOrderRevenueAgg[0]?.total || 0) + (monthlyTailoringRevenueAgg[0]?.total || 0);

  sendResponse(res, 200, "Dashboard summary fetched", {
    totalCustomers,
    totalProducts,
    totalOrders,
    totalTailoringOrders,
    totalRevenue,
    monthlyRevenue,
    pendingTailoringOrders,
    pendingPriorityOrders,
    lowStockProducts: lowStockProductsCount,
    unreadMessages: unreadMessagesCount,
    recentOrders: recentOrders || [],
    recentTailoringOrders: recentTailoringOrders || [],
    lowStockItems: lowStockItems || [],
    ordersCompletion: {
      todaysOrders: (todaysShoppingCount || 0) + (todaysTailoringCount || 0),
      tomorrowsOrders: (tomorrowsShoppingCount || 0) + (tomorrowsTailoringCount || 0),
      overdueOrders: (overdueShoppingCount || 0) + (overdueTailoringCount || 0),
      totalPendingOrders: (pendingShoppingCount || 0) + (pendingTailoringCount || 0),
      shoppingPending: pendingShoppingCount || 0,
      tailoringPending: pendingTailoringCount || 0,
    },
  });
});

module.exports = { getDashboardSummary };
