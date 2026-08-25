require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Order = require("../src/models/Order");
const TailoringOrder = require("../src/models/TailoringOrder");

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");

  const orders = await Order.find({});
  console.log("=== ALL SHOPPING ORDERS ===");
  orders.forEach((o) => {
    console.log({
      _id: o._id,
      orderId: o.orderId,
      status: o.status,
      paymentStatus: o.paymentStatus,
      amountPaid: o.amountPaid,
      advancePaid: o.advancePaid,
      totalAmount: o.totalAmount,
      total: o.total,
      payments: o.payments,
      createdAt: o.createdAt,
    });
  });

  const specific = await Order.findOne({ orderId: "SHOP-187576213286118" });
  console.log("\n=== SPECIFIC ORDER SHOP-187576213286118 ===");
  console.log(JSON.stringify(specific, null, 2));

  await mongoose.disconnect();
}

inspect().catch(console.error);
