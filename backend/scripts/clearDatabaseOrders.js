require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Order = require("../src/models/Order");
const TailoringOrder = require("../src/models/TailoringOrder");

async function clearOrders() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    console.log("Connected to MongoDB");

    // Remove all shopping and tailoring orders
    await Order.deleteMany({});
    console.log("Deleted all Shopping Orders from the database.");

    await TailoringOrder.deleteMany({});
    console.log("Deleted all Tailoring Orders from the database.");

    console.log("Database successfully wiped clean of dummy orders!");
  } catch (err) {
    console.error("Error wiping database:", err);
  } finally {
    mongoose.disconnect();
  }
}

clearOrders();
