const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  createRazorpayOrder,
  verifyPayment,
  recordOfflineBalancePayment,
  handleWebhook,
} = require("../controllers/paymentController");

const router = express.Router();

// Webhook must use raw body — mounted BEFORE express.json() parses the body.
// In app.js we handle raw body capture via a middleware trick.
// This route is public (Razorpay calls it server-to-server).
router.post("/webhook", handleWebhook);

// Protected payment routes — user must be authenticated
router.post("/create-order", protect, createRazorpayOrder);
router.post("/verify", protect, verifyPayment);
router.post("/record-offline", protect, authorize("admin"), recordOfflineBalancePayment);

module.exports = router;

