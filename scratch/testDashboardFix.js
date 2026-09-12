const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });
const mongoose = require("mongoose");

const Order = require("../backend/src/models/Order");
const TailoringOrder = require("../backend/src/models/TailoringOrder");
const PriorityOrder = require("../backend/src/models/PriorityOrder");
const { getISTDateBoundaries, isISTToday, isISTTomorrow, isISTOverdue } = require("../backend/src/utils/adminDateUtils");
const { TERMINAL_STATUSES, normalizeAdminOrder } = require("../backend/src/utils/orderClassifier");

async function testDashboard() {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/luckycouture";
    await mongoose.connect(mongoUri);
    console.log("Connected to Mongo.");

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

    const [activeShoppingDocs, activeTailoringDocs, activePriorityDocs] = await Promise.all([
      Order.find(shoppingPendingFilter).lean().catch(() => []),
      TailoringOrder.find(tailoringPendingFilter).lean().catch(() => []),
      PriorityOrder.find(priorityPendingFilter).lean().catch(() => []),
    ]);

    const normalizedShopping = (activeShoppingDocs || []).map((d) => normalizeAdminOrder(d, "shopping"));
    const normalizedTailoring = (activeTailoringDocs || []).map((d) => normalizeAdminOrder(d, "tailoring"));
    const normalizedPriority = (activePriorityDocs || []).map((d) => normalizeAdminOrder(d, "priority"));

    let todaysShopping = 0, tomorrowsShopping = 0, overdueShopping = 0;
    const pendingShopping = normalizedShopping.length;

    normalizedShopping.forEach((o) => {
      const readyDate = o.adminReadyDate;
      if (readyDate) {
        if (isISTToday(readyDate)) todaysShopping++;
        else if (isISTTomorrow(readyDate)) tomorrowsShopping++;
        else if (isISTOverdue(readyDate)) overdueShopping++;
      }
    });

    let todaysTailoring = 0, tomorrowsTailoring = 0, overdueTailoring = 0;
    const pendingTailoring = normalizedTailoring.length;

    normalizedTailoring.forEach((o) => {
      const readyDate = o.adminReadyDate;
      if (readyDate) {
        if (isISTToday(readyDate)) todaysTailoring++;
        else if (isISTTomorrow(readyDate)) tomorrowsTailoring++;
        else if (isISTOverdue(readyDate)) overdueTailoring++;
      }
    });

    let todaysPriority = 0, tomorrowsPriority = 0, overduePriority = 0;
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

    console.log("\n=== DASHBOARD ORDERS COMPLETION RESULTS ===");
    console.log("Tomorrow's Orders:", tomorrowsOrders);
    console.log("Today's Orders:", todaysOrders);
    console.log("Overdue Orders:", overdueOrders);
    console.log("Total Pending Orders:", totalPendingOrders);
    console.log("Breakdown:", {
      shopping: { pending: pendingShopping, today: todaysShopping, tomorrow: tomorrowsShopping, overdue: overdueShopping },
      tailoring: { pending: pendingTailoring, today: todaysTailoring, tomorrow: tomorrowsTailoring, overdue: overdueTailoring },
      priority: { pending: pendingPriority, today: todaysPriority, tomorrow: tomorrowsPriority, overdue: overduePriority },
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Test error:", err);
  }
}

testDashboard();
