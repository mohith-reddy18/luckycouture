const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

const User = require("../backend/src/models/User");
const Product = require("../backend/src/models/Product");
const Order = require("../backend/src/models/Order");
const TailoringOrder = require("../backend/src/models/TailoringOrder");
const PriorityOrder = require("../backend/src/models/PriorityOrder");

async function verifyPostReset() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);

    console.log("==================================================");
    console.log("POST-RESET DASHBOARD METRICS VERIFICATION");
    console.log("==================================================");

    const totalCustomers = await User.countDocuments({ role: { $ne: "admin" } });
    const totalProducts = await Product.countDocuments({ status: { $ne: "archived" } });
    const shoppingOrdersCount = await Order.countDocuments({});
    const tailoringOrdersCount = await TailoringOrder.countDocuments({});
    const priorityOrdersCount = await PriorityOrder.countDocuments({});

    const unverifiedRazorpayFilter = {
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      amountPaid: 0,
      status: "placed",
      stockDeducted: false,
    };

    const orderRevAgg = await Order.aggregate([
      { $match: { status: { $nin: ["cancelled", "rejected"] }, $nor: [unverifiedRazorpayFilter] } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$totalAmount", "$total"] } } } },
    ]);
    const tailoringRevAgg = await TailoringOrder.aggregate([
      { $match: { status: { $nin: ["cancelled", "rejected", "pending_payment"] } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$totalAmount", "$finalPrice"] } } } },
    ]);

    const totalRevenue = (orderRevAgg[0]?.total || 0) + (tailoringRevAgg[0]?.total || 0);

    console.log(`Total Customers        : ${totalCustomers} (Preserved user accounts)`);
    console.log(`Total Products         : ${totalProducts} (Preserved catalog)`);
    console.log(`Shopping Orders        : ${shoppingOrdersCount} (Reset to 0)`);
    console.log(`Tailoring Orders       : ${tailoringOrdersCount} (Reset to 0)`);
    console.log(`Priority Orders        : ${priorityOrdersCount} (Reset to 0)`);
    console.log(`Total Sales Revenue    : ₹${totalRevenue} (Reset to ₹0)`);

    await mongoose.disconnect();
  } catch (err) {
    console.error("Verification error:", err);
  }
}

verifyPostReset();
