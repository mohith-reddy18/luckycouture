require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Order = require("../src/models/Order");
const TailoringOrder = require("../src/models/TailoringOrder");

async function checkNullFields() {
  await mongoose.connect(process.env.MONGO_URI);

  const nullOrderIds = await Order.find({ $or: [{ orderId: null }, { orderId: { $exists: false } }] }).lean();
  console.log("Orders with null/missing orderId:", nullOrderIds.length);

  const allOrders = await Order.find().lean();
  console.log("\nALL ORDERS DETAIL:");
  allOrders.forEach((o) => {
    console.log(JSON.stringify({
      _id: o._id,
      orderId: o.orderId,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      amountPaid: o.amountPaid,
      total: o.total,
      rejectionReason: o.rejectionReason,
      refunds: o.refunds,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      user: o.user
    }, null, 2));
  });

  await mongoose.disconnect();
}

checkNullFields().catch(console.error);
