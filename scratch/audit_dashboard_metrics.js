const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

const User = require("../backend/src/models/User");
const Product = require("../backend/src/models/Product");
const Order = require("../backend/src/models/Order");
const TailoringOrder = require("../backend/src/models/TailoringOrder");
const PriorityOrder = require("../backend/src/models/PriorityOrder");

async function auditMetrics() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("MONGODB_URI not found in env!");
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB Atlas successfully.\n");

    // 1. CUSTOMERS AUDIT
    const allUsersCount = await User.countDocuments({});
    const customerRoleCount = await User.countDocuments({ role: "customer" });
    const adminRoleCount = await User.countDocuments({ role: "admin" });
    const usersByRole = await User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]);

    console.log("=== 1. TOTAL CUSTOMERS ===");
    console.log(`All Users in DB: ${allUsersCount}`);
    console.log(`Users by role:`, usersByRole);
    console.log(`User.countDocuments({ role: "customer" }): ${customerRoleCount}`);
    console.log(`User.countDocuments({ role: "admin" }): ${adminRoleCount}`);

    // 2. PRODUCTS AUDIT
    const totalProducts = await Product.countDocuments({});
    const activeProducts = await Product.countDocuments({ isActive: { $ne: false } });
    const isAvailableProducts = await Product.countDocuments({ isAvailable: { $ne: false } });
    console.log("\n=== 2. TOTAL PRODUCTS ===");
    console.log(`Product.countDocuments({}): ${totalProducts}`);
    console.log(`Product.countDocuments({ isActive: { $ne: false } }): ${activeProducts}`);
    console.log(`Product.countDocuments({ isAvailable: { $ne: false } }): ${isAvailableProducts}`);

    // 3. SHOPPING ORDERS AUDIT
    const unverifiedRazorpayFilter = {
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      amountPaid: 0,
      status: "placed",
      stockDeducted: false,
    };
    const totalShoppingAll = await Order.countDocuments({});
    const totalShoppingExcludingUnverified = await Order.countDocuments({ $nor: [unverifiedRazorpayFilter] });
    const shoppingByStatus = await Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const shoppingByPaymentStatus = await Order.aggregate([{ $group: { _id: "$paymentStatus", count: { $sum: 1 } } }]);

    console.log("\n=== 3. SHOPPING ORDERS ===");
    console.log(`Order.countDocuments({}): ${totalShoppingAll}`);
    console.log(`Order.countDocuments(excluding unverified Razorpay drafts): ${totalShoppingExcludingUnverified}`);
    console.log(`Shopping orders by status:`, shoppingByStatus);
    console.log(`Shopping orders by paymentStatus:`, shoppingByPaymentStatus);

    // 4. TAILORING ORDERS AUDIT
    const totalTailoringAll = await TailoringOrder.countDocuments({});
    const totalTailoringExcludingPendingPayment = await TailoringOrder.countDocuments({ status: { $nin: ["pending_payment"] } });
    const totalPriorityAll = await PriorityOrder.countDocuments({});
    const tailoringByStatus = await TailoringOrder.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);

    console.log("\n=== 4. TAILORING ORDERS ===");
    console.log(`TailoringOrder.countDocuments({}): ${totalTailoringAll}`);
    console.log(`TailoringOrder.countDocuments({ status: { $nin: ["pending_payment"] } }): ${totalTailoringExcludingPendingPayment}`);
    console.log(`PriorityOrder.countDocuments({}): ${totalPriorityAll}`);
    console.log(`Tailoring orders by status:`, tailoringByStatus);

    // 5. TOTAL SALES REVENUE AUDIT
    // Let's inspect how revenue is calculated:
    // A) Sum of total in Order collection
    const orderSumTotal = await Order.aggregate([
      { $match: { status: { $nin: ["cancelled", "rejected"] }, $nor: [unverifiedRazorpayFilter] } },
      { $group: { _id: null, total: { $sum: "$total" }, totalAmountSum: { $sum: "$totalAmount" }, amountPaidSum: { $sum: "$amountPaid" } } }
    ]);
    console.log("\n=== 5. REVENUE AUDIT ===");
    console.log(`Shopping Order revenue agg:`, orderSumTotal);

    // Let's inspect actual paid amounts vs total order amounts across all orders
    const tailoringSumTotal = await TailoringOrder.aggregate([
      { $match: { status: { $nin: ["cancelled", "rejected", "pending_payment"] } } },
      { $group: { _id: null, totalAmountSum: { $sum: "$totalAmount" }, amountPaidSum: { $sum: "$amountPaid" }, estimatedPriceSum: { $sum: "$estimatedPrice" } } }
    ]);
    console.log(`Tailoring Order revenue agg:`, tailoringSumTotal);

    // Also let's inspect actual payment ledger entries (sum of all captured payments in order.payments)
    const shoppingPaymentsLedgerSum = await Order.aggregate([
      { $unwind: "$payments" },
      { $match: { "payments.status": "captured", status: { $nin: ["cancelled", "rejected"] } } },
      { $group: { _id: null, totalCapturedPayments: { $sum: "$payments.amount" } } }
    ]);
    console.log(`Shopping Order captured payments in payments ledger sum:`, shoppingPaymentsLedgerSum);

    const tailoringPaymentsLedgerSum = await TailoringOrder.aggregate([
      { $unwind: "$payments" },
      { $match: { "payments.status": "captured", status: { $nin: ["cancelled", "rejected"] } } },
      { $group: { _id: null, totalCapturedPayments: { $sum: "$payments.amount" } } }
    ]);
    console.log(`Tailoring Order captured payments in payments ledger sum:`, tailoringPaymentsLedgerSum);

    // 6. PENDING ORDERS AUDIT
    const { TERMINAL_STATUSES, normalizeAdminOrder, matchesSchedule } = require("../backend/src/utils/orderClassifier");
    console.log("\n=== 6. PENDING ORDERS AUDIT ===");
    console.log("TERMINAL_STATUSES:", TERMINAL_STATUSES);

    const shoppingPendingDocs = await Order.find({
      status: { $nin: TERMINAL_STATUSES },
      $nor: [unverifiedRazorpayFilter]
    }).lean();

    const tailoringPendingDocs = await TailoringOrder.find({
      status: { $nin: [...TERMINAL_STATUSES, "pending_payment"] },
      $nor: [{ paymentStatus: "pending", amountPaid: 0 }]
    }).lean();

    console.log(`Shopping Pending Docs count: ${shoppingPendingDocs.length}`);
    console.log(`Tailoring Pending Docs count: ${tailoringPendingDocs.length}`);

    let sPendingCount = 0;
    shoppingPendingDocs.forEach(d => {
      const norm = normalizeAdminOrder(d, "shopping");
      if (matchesSchedule(norm, "pending")) sPendingCount++;
    });

    let tPendingCount = 0;
    tailoringPendingDocs.forEach(d => {
      const norm = normalizeAdminOrder(d, "tailoring");
      if (matchesSchedule(norm, "pending")) tPendingCount++;
    });

    console.log(`Shopping matchesSchedule('pending'): ${sPendingCount}`);
    console.log(`Tailoring matchesSchedule('pending'): ${tPendingCount}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error("Audit error:", err);
  }
}

auditMetrics();
