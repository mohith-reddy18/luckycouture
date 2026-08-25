require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Order = require("../src/models/Order");
const TailoringOrder = require("../src/models/TailoringOrder");

async function inspectOrders() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const shoppingOrders = await Order.find().sort({ createdAt: -1 }).lean();
  console.log(`\nFound ${shoppingOrders.length} Shopping Orders:`);
  shoppingOrders.forEach((o, i) => {
    console.log(`[${i}] _id: ${o._id}, orderId: ${o.orderId}, status: ${o.status}, paymentStatus: ${o.paymentStatus}, paymentMethod: ${o.paymentMethod}, amountPaid: ${o.amountPaid}, total: ${o.total}, reason: "${o.rejectionReason || ''}", createdAt: ${o.createdAt?.toISOString()}, updatedAt: ${o.updatedAt?.toISOString()}`);
  });

  const tailoringOrders = await TailoringOrder.find().sort({ createdAt: -1 }).lean();
  console.log(`\nFound ${tailoringOrders.length} Tailoring Orders:`);
  tailoringOrders.forEach((t, i) => {
    console.log(`[${i}] _id: ${t._id}, orderId: ${t.orderId}, status: ${t.status}, paymentStatus: ${t.paymentStatus}, amountPaid: ${t.amountPaid}, reason: "${t.rejectionReason || ''}", createdAt: ${t.createdAt?.toISOString()}, updatedAt: ${t.updatedAt?.toISOString()}`);
  });

  await mongoose.disconnect();
}

inspectOrders().catch((err) => {
  console.error(err);
  process.exit(1);
});
