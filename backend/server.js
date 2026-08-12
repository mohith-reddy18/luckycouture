const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

console.log("[ENV DIAGNOSTIC] Twilio configuration check:", {
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? "PRESENT" : "MISSING",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? "PRESENT" : "MISSING",
  TWILIO_VERIFY_SERVICE_SID: process.env.TWILIO_VERIFY_SERVICE_SID ? "PRESENT" : "MISSING",
});

const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`Lucky Couture API listening on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
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
