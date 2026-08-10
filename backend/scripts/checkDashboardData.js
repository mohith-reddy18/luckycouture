require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Order = require("../src/models/Order");
const User = require("../src/models/User");

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  
  const totalOrders = await Order.countDocuments();
  const revAgg = await Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]);
  const users = await User.countDocuments({ role: "customer" });
  
  const allOrders = await Order.find();
  
  console.log("Total Orders:", totalOrders);
  console.log("Revenue:", revAgg);
  console.log("Users:", users);
  console.log("All Orders data:", allOrders);
  
  mongoose.disconnect();
}
run();
