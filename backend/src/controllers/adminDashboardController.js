const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/ApiResponse");
const User = require("../models/User");
const Order = require("../models/Order");
const TailoringOrder = require("../models/TailoringOrder");
const PriorityOrder = require("../models/PriorityOrder");
const Product = require("../models/Product");
const ContactMessage = require("../models/ContactMessage");
const { getISTDateBoundaries, isISTToday, isISTTomorrow, isISTOverdue } = require("../utils/adminDateUtils");
const { TERMINAL_STATUSES, normalizeAdminOrder } = require("../utils/orderClassifier");

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

  // Today's, Tomorrow's, Overdue, and Pending counts (Strictly Internal Ready Deadline-based via authoritative order Date calculator)
  const [activeShoppingDocs, activeTailoringDocs, activePriorityDocs] = await Promise.all([
    Order.find(shoppingPendingFilter).lean().catch(() => []),
    TailoringOrder.find(tailoringPendingFilter).lean().catch(() => []),
    PriorityOrder.find(priorityPendingFilter).lean().catch(() => []),
  ]);

  const normalizedShopping = (activeShoppingDocs || []).map((d) => normalizeAdminOrder(d, "shopping"));
  const normalizedTailoring = (activeTailoringDocs || []).map((d) => normalizeAdminOrder(d, "tailoring"));
  const normalizedPriority = (activePriorityDocs || []).map((d) => normalizeAdminOrder(d, "priority"));

  let todaysShopping = 0;
  let tomorrowsShopping = 0;
  let overdueShopping = 0;
  const pendingShopping = normalizedShopping.length;

  normalizedShopping.forEach((o) => {
    const readyDate = o.adminReadyDate;
    if (readyDate) {
      if (isISTToday(readyDate)) todaysShopping++;
      else if (isISTTomorrow(readyDate)) tomorrowsShopping++;
      else if (isISTOverdue(readyDate)) overdueShopping++;
    }
  });

  let todaysTailoring = 0;
  let tomorrowsTailoring = 0;
  let overdueTailoring = 0;
  const pendingTailoring = normalizedTailoring.length;

  normalizedTailoring.forEach((o) => {
    const readyDate = o.adminReadyDate;
    if (readyDate) {
      if (isISTToday(readyDate)) todaysTailoring++;
      else if (isISTTomorrow(readyDate)) tomorrowsTailoring++;
      else if (isISTOverdue(readyDate)) overdueTailoring++;
    }
  });

  let todaysPriority = 0;
  let tomorrowsPriority = 0;
  let overduePriority = 0;
  const pendingPriority = normalizedPriority.length;

  normalizedPriority.forEach((o) => {
    const readyDate = o.adminReadyDate;
    if (readyDate) {
      if (isISTToday(readyDate)) todaysPriority++;
      else if (isISTTomorrow(readyDate)) tomorrowsPriority++;
      else if (isISTOverdue(readyDate)) overduePriority++;
    }
  });

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

// POST /api/admin/trigger-daily-email — Manual trigger for Admin Daily Order Email
const triggerDailyReport = asyncHandler(async (req, res) => {
  const { generateAndSendDailyReport } = require("../services/dailyOrderReportService");
  const result = await generateAndSendDailyReport({ force: true, triggeredBy: "admin_manual" });
  sendResponse(res, 200, "Daily admin order report email triggered successfully", result);
});

module.exports = { getDashboardSummary, triggerDailyReport };
