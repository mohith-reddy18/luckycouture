const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

const User = require("../backend/src/models/User");
const Product = require("../backend/src/models/Product");
const Order = require("../backend/src/models/Order");
const TailoringOrder = require("../backend/src/models/TailoringOrder");
const PriorityOrder = require("../backend/src/models/PriorityOrder");
const { TERMINAL_STATUSES, normalizeAdminOrder, matchesSchedule } = require("../backend/src/utils/orderClassifier");

async function verifyAtlas() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log("=== ATLAS PRODUCTION DATABASE VERIFICATION ===");

    // 1. Total Customers
    const totalCustomers = await User.countDocuments({ role: { $ne: "admin" } });
    console.log(`1. Total Customers (role != admin): ${totalCustomers}`);

    // 2. Total Products (Active catalog items)
    const totalProductsAll = await Product.countDocuments({});
    const totalProductsActive = await Product.countDocuments({ status: { $ne: "archived" } });
    console.log(`2. Total Products: All=${totalProductsAll}, Active/Non-Archived=${totalProductsActive}`);

    // 3. Shopping Orders
    const unverifiedRazorpayFilter = {
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      amountPaid: 0,
      status: "placed",
      stockDeducted: false,
    };
    const totalShoppingOrders = await Order.countDocuments({ $nor: [unverifiedRazorpayFilter] });
    console.log(`3. Shopping Orders (excluding unverified checkout sessions): ${totalShoppingOrders}`);

    // 4. Tailoring Orders
    const totalTailoringOrders = await TailoringOrder.countDocuments({ status: { $nin: ["pending_payment"] } });
    const totalPriorityOrders = await PriorityOrder.countDocuments({});
    const totalCombinedTailoring = totalTailoringOrders + totalPriorityOrders;
    console.log(`4. Tailoring Orders: TailoringDoc=${totalTailoringOrders}, PriorityDoc=${totalPriorityOrders}, Combined=${totalCombinedTailoring}`);

    // 5. Total Sales Revenue
    const orderRevAgg = await Order.aggregate([
      { $match: { status: { $nin: ["cancelled", "rejected"] }, $nor: [unverifiedRazorpayFilter] } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const tailoringRevAgg = await TailoringOrder.aggregate([
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
    ]);
    const priorityRevAgg = await PriorityOrder.aggregate([
      { $match: { status: { $nin: ["cancelled", "rejected"] } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$finalPrice", { $ifNull: ["$basePrice", 0] }] } } } },
    ]);

    const sRev = orderRevAgg[0]?.total || 0;
    const tRev = tailoringRevAgg[0]?.total || 0;
    const pRev = priorityRevAgg[0]?.total || 0;
    const totalSalesRevenue = sRev + tRev + pRev;

    console.log(`5. Total Sales Revenue: Shopping=₹${sRev}, Tailoring=₹${tRev}, Priority=₹${pRev} => Total=₹${totalSalesRevenue}`);

    // 6. Pending Orders
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
      Order.find(shoppingPendingFilter).lean(),
      TailoringOrder.find(tailoringPendingFilter).lean(),
      PriorityOrder.find(priorityPendingFilter).lean(),
    ]);

    const normalizedShopping = (activeShoppingDocs || []).map((d) => normalizeAdminOrder(d, "shopping"));
    const normalizedTailoring = (activeTailoringDocs || []).map((d) => normalizeAdminOrder(d, "tailoring"));
    const normalizedPriority = (activePriorityDocs || []).map((d) => normalizeAdminOrder(d, "priority"));

    let pendingShopping = 0;
    normalizedShopping.forEach((o) => {
      if (matchesSchedule(o, "pending")) pendingShopping++;
    });

    let pendingTailoring = 0;
    normalizedTailoring.forEach((o) => {
      if (matchesSchedule(o, "pending")) pendingTailoring++;
    });

    let pendingPriority = 0;
    normalizedPriority.forEach((o) => {
      if (matchesSchedule(o, "pending")) pendingPriority++;
    });

    const totalPendingOrders = pendingShopping + pendingTailoring + pendingPriority;
    console.log(`6. Pending Orders: Shopping=${pendingShopping}, Tailoring=${pendingTailoring + pendingPriority} => Total Pending=${totalPendingOrders}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error in verifyAtlas:", err);
  }
}

verifyAtlas();
