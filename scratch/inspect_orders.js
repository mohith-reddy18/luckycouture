const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../backend/.env") });

const Order = require("../../backend/src/models/Order");
const TailoringOrder = require("../../backend/src/models/TailoringOrder");
const User = require("../../backend/src/models/User");

async function inspect() {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/luckycouture";
    await mongoose.connect(mongoUri);
    console.log("Connected to Mongo");

    const users = await User.find({}).lean();
    console.log(`Total users in DB: ${users.length}`);
    users.forEach(u => {
      console.log(`User: _id=${u._id}, name="${u.name}", email="${u.email}", phone="${u.phone}", role="${u.role}"`);
    });

    const shoppingOrders = await Order.find({}).populate("user").lean();
    console.log(`\nTotal Shopping Orders: ${shoppingOrders.length}`);
    shoppingOrders.forEach(o => {
      console.log(`Shopping Order _id=${o._id}, orderId=${o.orderId}`);
      console.log(`  user ref:`, o.user);
      console.log(`  shippingAddress:`, o.shippingAddress);
    });

    const tailoringOrders = await TailoringOrder.find({}).populate("customer").lean();
    console.log(`\nTotal Tailoring Orders: ${tailoringOrders.length}`);
    tailoringOrders.forEach(o => {
      console.log(`Tailoring Order _id=${o._id}, orderId=${o.orderId}`);
      console.log(`  customer ref:`, o.customer);
      console.log(`  guestInfo:`, o.guestInfo);
      console.log(`  deliveryAddress:`, o.deliveryAddress);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error inspecting DB:", err);
  }
}

inspect();
