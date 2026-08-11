require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  // Sync indexes to automatically drop obsolete unique constraints from the database
  try {
    const Order = require("./src/models/Order");
    const TailoringOrder = require("./src/models/TailoringOrder");
    await Order.syncIndexes();
    await TailoringOrder.syncIndexes();
    console.log("Database indexes synchronized");
  } catch (err) {
    console.error("Failed to sync indexes:", err);
  }

  const server = app.listen(PORT, () => {
    console.log(`Lucky Couture API listening on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
    if (process.env.FAST2SMS_API_KEY) {
      console.log(`[SMS SERVICE] ✅ Fast2SMS integration is active.`);
    } else {
      console.warn(`[SMS SERVICE WARNING] ⚠️ FAST2SMS_API_KEY is missing from environment variables! SMS OTPs will be logged to server console (mock mode).`);
    }
  });

  // Fail loudly instead of leaving the process in a half-broken state.
  process.on("unhandledRejection", (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM received — shutting down gracefully");
    server.close(() => process.exit(0));
  });
}

start();
