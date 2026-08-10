const readline = require("readline");
const mongoose = require("mongoose");
const Order = require("../src/models/Order");
const TailoringOrder = require("../src/models/TailoringOrder");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Please paste your PRODUCTION MongoDB URI to wipe the dummy data: ", async (uri) => {
  if (!uri || !uri.startsWith("mongodb")) {
    console.error("Invalid MongoDB URI provided.");
    rl.close();
    return;
  }

  try {
    console.log("Connecting to Production Database...");
    await mongoose.connect(uri.trim(), { family: 4 });
    console.log("Connected successfully!");

    // Remove all shopping and tailoring orders
    await Order.deleteMany({});
    console.log("Deleted all Shopping Orders from the production database.");

    await TailoringOrder.deleteMany({});
    console.log("Deleted all Tailoring Orders from the production database.");

    console.log("\n✅ Production Database successfully wiped clean of dummy orders!");
  } catch (err) {
    console.error("Error wiping database:", err);
  } finally {
    mongoose.disconnect();
    rl.close();
  }
});
