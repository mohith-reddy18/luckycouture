const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

const mongoose = require("mongoose");
const Order = require("../backend/src/models/Order");
const TailoringOrder = require("../backend/src/models/TailoringOrder");
const PriorityOrder = require("../backend/src/models/PriorityOrder");
const { getISTDateBoundaries, isISTToday, isISTTomorrow, isISTOverdue } = require("../backend/src/utils/adminDateUtils");
const { resolveLegacyOrderDates, formatDateRangeText } = require("../backend/src/utils/orderDateCalculator");
const { TERMINAL_STATUSES, normalizeAdminOrder } = require("../backend/src/utils/orderClassifier");

async function audit() {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/luckycouture";
    console.log("Connecting to MongoDB:", mongoUri.split("@").pop());
    await mongoose.connect(mongoUri);

    console.log("\n=== 1. IST TIMEZONE BOUNDARIES ===");
    const boundaries = getISTDateBoundaries();
    console.log("Current System Time (UTC):", new Date().toISOString());
    console.log("IST Today Window:", boundaries.todayStart.toISOString(), "to", boundaries.todayEnd.toISOString());
    console.log("IST Tomorrow Window:", boundaries.tomorrowStart.toISOString(), "to", boundaries.tomorrowEnd.toISOString());

    console.log("\n=== 2. SHOPPING ORDERS IN MONGODB ===");
    const shoppingOrders = await Order.find({}).lean();
    console.log(`Found ${shoppingOrders.length} Shopping Orders:`);
    shoppingOrders.forEach((o, i) => {
      const dates = resolveLegacyOrderDates(o, "shopping");
      const isPending = !TERMINAL_STATUSES.includes(o.status);
      console.log(`[Shop ${i+1}] _id=${o._id}, orderId=${o.orderId}, status="${o.status}", createdAt=${o.createdAt?.toISOString()}`);
      console.log(`         stored adminReadyDate:`, o.adminReadyDate);
      console.log(`         resolved adminReadyDate:`, dates.adminReadyDate?.toISOString());
      console.log(`         isPending: ${isPending}, isToday: ${isISTToday(dates.adminReadyDate)}, isTomorrow: ${isISTTomorrow(dates.adminReadyDate)}, isOverdue: ${isISTOverdue(dates.adminReadyDate)}`);
    });

    console.log("\n=== 3. TAILORING ORDERS IN MONGODB ===");
    const tailoringOrders = await TailoringOrder.find({}).lean();
    console.log(`Found ${tailoringOrders.length} Tailoring Orders:`);
    tailoringOrders.forEach((o, i) => {
      const dates = resolveLegacyOrderDates(o, "tailoring");
      const isPending = !TERMINAL_STATUSES.includes(o.status) && o.status !== "pending_payment";
      console.log(`[Tailor ${i+1}] _id=${o._id}, orderId=${o.orderId}, status="${o.status}", createdAt=${o.createdAt?.toISOString()}`);
      console.log(`           stored adminReadyDate:`, o.adminReadyDate);
      console.log(`           resolved adminReadyDate:`, dates.adminReadyDate?.toISOString());
      console.log(`           isPending: ${isPending}, isToday: ${isISTToday(dates.adminReadyDate)}, isTomorrow: ${isISTTomorrow(dates.adminReadyDate)}, isOverdue: ${isISTOverdue(dates.adminReadyDate)}`);
    });

    console.log("\n=== 4. PRIORITY ORDERS IN MONGODB ===");
    const priorityOrders = await PriorityOrder.find({}).lean();
    console.log(`Found ${priorityOrders.length} Priority Orders:`);
    priorityOrders.forEach((o, i) => {
      const dates = resolveLegacyOrderDates(o, "priority");
      const isPending = !TERMINAL_STATUSES.includes(o.status);
      console.log(`[Priority ${i+1}] _id=${o._id}, orderNumber=${o.orderNumber}, status="${o.status}", createdAt=${o.createdAt?.toISOString()}`);
      console.log(`             stored adminReadyDate:`, o.adminReadyDate);
      console.log(`             resolved adminReadyDate:`, dates.adminReadyDate?.toISOString());
      console.log(`             isPending: ${isPending}, isToday: ${isISTToday(dates.adminReadyDate)}, isTomorrow: ${isISTTomorrow(dates.adminReadyDate)}, isOverdue: ${isISTOverdue(dates.adminReadyDate)}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Audit error:", err);
  }
}

audit();
