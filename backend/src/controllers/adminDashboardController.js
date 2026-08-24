const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/ApiResponse");
const User = require("../models/User");
const Order = require("../models/Order");
const TailoringOrder = require("../models/TailoringOrder");
const PriorityOrder = require("../models/PriorityOrder");
const Product = require("../models/Product");
const ContactMessage = require("../models/ContactMessage");
const { getISTDateBoundaries } = require("../utils/adminDateUtils");
const { TERMINAL_STATUSES } = require("../utils/orderClassifier");

// GET /api/admin/dashboard — Overview metrics for Admin Dashboard
const getDashboardSummary = asyncHandler(async (req, res) => {
  const { todayStart, todayEnd, tomorrowStart, tomorrowEnd, monthStart } = getISTDateBoundaries();  // Strict non-terminal filter: "completed" is NEVER counted as pending or overdue
  // Payment gate: Exclude uncompleted/abandoned Razorpay payment attempts
  const unverifiedRazorpayFilter = {
    paymentMethod: "razorpay",
    paymentStatus: "pending",
    amountPaid: 0,
    status: "placed",
    stockDeducted: false,
  };

  const shoppingPendingFilter = {
    status: { $nin: TERMINAL_STATUSES },
    $nor: [unverifiedRazorpayFilter],
  };
  const tailoringPendingFilter = {
    status: { $nin: [...TERMINAL_STATUSES, "pending_payment"] },
    $nor: [{ paymentStatus: "pending", amountPaid: 0 }],
  };
  const priorityPendingFilter = { status: { $nin: TERMINAL_STATUSES } };

  // Fetch counts safely
  const [
    totalCustomers,
    totalProducts,
    totalOrders,
    totalTailoringOrders,
    totalPriorityOrders,
    pendingTailoringOrders,
    pendingPriorityOrders,
    lowStockProductsCount,
    unreadMessagesCount,
  ] = await Promise.all([
    User.countDocuments({ role: "customer" }).catch(() => 0),
    Product.countDocuments().catch(() => 0),
    Order.countDocuments({ $nor: [unverifiedRazorpayFilter] }).catch(() => 0),
    TailoringOrder.countDocuments({ status: { $nin: ["pending_payment"] } }).catch(() => 0),
    PriorityOrder.countDocuments().catch(() => 0),
    TailoringOrder.countDocuments(tailoringPendingFilter).catch(() => 0),
    PriorityOrder.countDocuments(priorityPendingFilter).catch(() => 0),
    Product.countDocuments({ stock: { $lte: 5 } }).catch(() => 0),
    ContactMessage.countDocuments({ status: "new" }).catch(() => 0),
  ]);

  // Revenues (excluding rejected and cancelled orders)
  const [
    orderRevAgg,
    orderMonthRevAgg,
    tailoringRevAgg,
    tailoringMonthRevAgg,
    priorityRevAgg,
    priorityMonthRevAgg,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { status: { $nin: ["cancelled", "rejected"] }, $nor: [unverifiedRazorpayFilter] } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]).catch(() => []),
    Order.aggregate([
      { $match: { createdAt: { $gte: monthStart }, status: { $nin: ["cancelled", "rejected"] }, $nor: [unverifiedRazorpayFilter] } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]).catch(() => []),
    TailoringOrder.aggregate([
      { $match: { status: { $nin: ["cancelled", "rejected", "pending_payment"] } } },
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
                    {
                      $add: [
                        { $ifNull: ["$stitchingCost", 0] },
                        { $ifNull: ["$designCost", 0] },
                        { $ifNull: ["$fabricCost", 0] },
                        { $ifNull: ["$deliveryCharge", 0] },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    ]).catch(() => []),
    TailoringOrder.aggregate([
      { $match: { createdAt: { $gte: monthStart }, status: { $nin: ["cancelled", "rejected", "pending_payment"] } } },
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
                    {
                      $add: [
                        { $ifNull: ["$stitchingCost", 0] },
                        { $ifNull: ["$designCost", 0] },
                        { $ifNull: ["$fabricCost", 0] },
                        { $ifNull: ["$deliveryCharge", 0] },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    ]).catch(() => []),
    PriorityOrder.aggregate([
      { $match: { status: { $nin: ["cancelled", "rejected"] } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$finalPrice", { $ifNull: ["$basePrice", 0] }] } } } },
    ]).catch(() => []),
    PriorityOrder.aggregate([
      { $match: { createdAt: { $gte: monthStart }, status: { $nin: ["cancelled", "rejected"] } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$finalPrice", { $ifNull: ["$basePrice", 0] }] } } } },
    ]).catch(() => []),
  ]);

  const totalRevenue =
    (orderRevAgg[0]?.total || 0) +
    (tailoringRevAgg[0]?.total || 0) +
    (priorityRevAgg[0]?.total || 0);

  const monthlyRevenue =
    (orderMonthRevAgg[0]?.total || 0) +
    (tailoringMonthRevAgg[0]?.total || 0) +
    (priorityMonthRevAgg[0]?.total || 0);

  // Recent lists (excluding unverified/abandoned Razorpay attempts)
  const [recentOrders, recentTailoringOrders, lowStockItems] = await Promise.all([
    Order.find({ $nor: [unverifiedRazorpayFilter] }).sort({ createdAt: -1 }).limit(5).populate("user", "name email").lean().catch(() => []),
    TailoringOrder.find({ status: { $nin: ["pending_payment"] } }).sort({ createdAt: -1 }).limit(5).populate("customer", "name phone").lean().catch(() => []),
    Product.find({ stock: { $lte: 5 } }).limit(5).select("name category stock price image").lean().catch(() => []),
  ]);

  // Today's, Tomorrow's, Overdue, and Pending counts (Strictly deadline-based)
  const [
    // Today Shopping
    todaysShopping,
    // Today Tailoring
    todaysTailoring,
    // Today Priority
    todaysPriority,
    // Tomorrow Shopping
    tomorrowsShopping,
    // Tomorrow Tailoring
    tomorrowsTailoring,
    // Tomorrow Priority
    tomorrowsPriority,
    // Overdue Shopping
    overdueShopping,
    // Overdue Tailoring
    overdueTailoring,
    // Overdue Priority
    overduePriority,
    // Total Pending
    pendingShopping,
    pendingTailoring,
    pendingPriority,
  ] = await Promise.all([
    // Today Shopping
    Order.countDocuments({
      ...shoppingPendingFilter,
      estimatedDeliveryDate: { $gte: todayStart, $lte: todayEnd },
    }).catch(() => 0),
    // Today Tailoring
    TailoringOrder.countDocuments({
      ...tailoringPendingFilter,
      expectedDeliveryDate: { $gte: todayStart, $lte: todayEnd },
    }).catch(() => 0),
    // Today Priority
    PriorityOrder.countDocuments({
      ...priorityPendingFilter,
      expectedDeliveryAt: { $gte: todayStart, $lte: todayEnd },
    }).catch(() => 0),

    // Tomorrow Shopping
    Order.countDocuments({
      ...shoppingPendingFilter,
      estimatedDeliveryDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
    }).catch(() => 0),
    // Tomorrow Tailoring
    TailoringOrder.countDocuments({
      ...tailoringPendingFilter,
      expectedDeliveryDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
    }).catch(() => 0),
    // Tomorrow Priority
    PriorityOrder.countDocuments({
      ...priorityPendingFilter,
      expectedDeliveryAt: { $gte: tomorrowStart, $lte: tomorrowEnd },
    }).catch(() => 0),

    // Overdue Shopping
    Order.countDocuments({
      ...shoppingPendingFilter,
      estimatedDeliveryDate: { $lt: todayStart },
    }).catch(() => 0),
    // Overdue Tailoring
    TailoringOrder.countDocuments({
      ...tailoringPendingFilter,
      expectedDeliveryDate: { $lt: todayStart },
    }).catch(() => 0),
    // Overdue Priority
    PriorityOrder.countDocuments({
      ...priorityPendingFilter,
      expectedDeliveryAt: { $lt: todayStart },
    }).catch(() => 0),

    // Total Pending
    Order.countDocuments(shoppingPendingFilter).catch(() => 0),
    TailoringOrder.countDocuments(tailoringPendingFilter).catch(() => 0),
    PriorityOrder.countDocuments(priorityPendingFilter).catch(() => 0),
  ]);

  const todaysOrders = todaysShopping + todaysTailoring + todaysPriority;
  const tomorrowsOrders = tomorrowsShopping + tomorrowsTailoring + tomorrowsPriority;
  const overdueOrders = overdueShopping + overdueTailoring + overduePriority;
  const totalPendingOrders = pendingShopping + pendingTailoring + pendingPriority;

  sendResponse(res, 200, "Dashboard summary fetched", {
    totalCustomers,
    totalProducts,
    totalOrders: totalOrders + totalTailoringOrders + totalPriorityOrders,
    totalShoppingOrders: totalOrders,
    totalTailoringOrders: totalTailoringOrders + totalPriorityOrders,
    totalRevenue,
    monthlyRevenue,
    pendingTailoringOrders: pendingTailoringOrders + pendingPriorityOrders,
    pendingPriorityOrders,
    lowStockProducts: lowStockProductsCount,
    unreadMessages: unreadMessagesCount,
    recentOrders: recentOrders || [],
    recentTailoringOrders: recentTailoringOrders || [],
    lowStockItems: lowStockItems || [],
    ordersCompletion: {
      todaysOrders,
      tomorrowsOrders,
      overdueOrders,
      totalPendingOrders,
      shoppingPending: pendingShopping,
      tailoringPending: pendingTailoring + pendingPriority,
    },
  });
});

module.exports = { getDashboardSummary };
