const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

const Order = require("../backend/src/models/Order");
const TailoringOrder = require("../backend/src/models/TailoringOrder");

async function inspectFin() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);

    console.log("=== SHOPPING ORDERS ===");
    const shopping = await Order.find({}).lean();
    shopping.forEach(o => {
      console.log(`Order ${o.orderId || o._id}: status=${o.status}, paymentStatus=${o.paymentStatus}, total=${o.total}, totalAmount=${o.totalAmount}, amountPaid=${o.amountPaid}`);
    });

    console.log("\n=== TAILORING ORDERS ===");
    const tailoring = await TailoringOrder.find({}).lean();
    tailoring.forEach(t => {
      console.log(`Tailoring ${t.orderId || t._id}: status=${t.status}, paymentStatus=${t.paymentStatus}, finalPrice=${t.finalPrice}, estimatedPrice=${t.estimatedPrice}, totalAmount=${t.totalAmount}, amountPaid=${t.amountPaid}`);
    });

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}
inspectFin();
