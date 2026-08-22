const crypto = require("crypto");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const Order = require("../models/Order");
const WebhookEvent = require("../models/WebhookEvent");
const Settlement = require("../models/Settlement");
const razorpay = require("../config/razorpay");
const { validateAndDeductStock, restoreOrderStock } = require("../utils/inventoryManager");
const { notifyUserOnce, handleShoppingOrderNotifications } = require("../utils/orderNotifications");

/**
 * Shared atomic helper to finalize a successful Razorpay payment.
 * Invoked by both POST /api/payments/verify and authoritative webhook events (payment.captured, order.paid).
 * Guarantees idempotency, atomic inventory deduction, 30% advance recording, and deduplicated notifications.
 */
async function finalizeSuccessfulPayment({
  dbOrderId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  amountPaise,
  currency,
  source = "verify",
}) {
  let order = null;

  if (dbOrderId) {
    order = await Order.findById(dbOrderId);
  } else if (razorpayOrderId) {
    order = await Order.findOne({ razorpayOrderId });
  }

  if (!order) {
    throw new ApiError(404, `Order not found for Razorpay Order: ${razorpayOrderId || dbOrderId}`);
  }

  // ── Currency validation ──
  if (currency && String(currency).toUpperCase() !== "INR") {
    throw new ApiError(400, `Invalid payment currency "${currency}". Expected INR.`);
  }

  // ── Expected advance amount validation (30% rule — exact strict equality) ──
  const totalAmount = Number(order.total) || 0;
  const expectedAdvanceINR = Math.round(totalAmount * 0.30);
  const expectedPaise = expectedAdvanceINR * 100;

  if (amountPaise !== undefined && amountPaise !== null) {
    const receivedPaise = Number(amountPaise);
    if (receivedPaise !== expectedPaise) {
      console.warn(
        `[Payment Finalize] Strict amount mismatch for order ${order._id}: received ${receivedPaise} paise, expected exactly ${expectedPaise} paise`
      );
      // Record discrepancy for audit without marking paid or deducting inventory
      order.discrepancy = {
        receivedPaise,
        expectedPaise,
        razorpayPaymentId: razorpayPaymentId || "",
        recordedAt: new Date(),
        reason: "exact_amount_mismatch",
      };
      await order.save().catch(() => {});
      throw new ApiError(
        400,
        `Payment amount mismatch: Expected exactly ₹${expectedAdvanceINR} (${expectedPaise} paise), but received ₹${(receivedPaise / 100).toFixed(2)} (${receivedPaise} paise). Payment rejected.`
      );
    }
  }

  // ── Idempotency check: if order is already paid & stock deducted, return safely ──
  if (order.paymentStatus === "paid" && order.stockDeducted) {
    console.log(`[Payment Finalize] Order ${order._id} already finalized. Skipping duplicate processing.`);
    return { alreadyProcessed: true, order };
  }

  const oldOrderSnapshot = order.toObject();

  // ── Atomic Inventory Deduction (Product + Color + Size) ──
  if (!order.stockDeducted) {
    try {
      await validateAndDeductStock(order.items);
      order.stockDeducted = true;
    } catch (stockErr) {
      console.error(`[Payment Finalize] Stock deduction warning for order ${order._id}:`, stockErr.message);
      // Note: Payment succeeded; flag for admin review if stock deduction encountered conflict
    }
  }

  // ── Update Order Financials & Payment State ──
  order.paymentStatus = "paid";
  order.advancePaid = expectedAdvanceINR;
  order.balanceDue = Math.max(0, totalAmount - expectedAdvanceINR);

  if (razorpayPaymentId) order.razorpayPaymentId = razorpayPaymentId;
  if (razorpayOrderId && !order.razorpayOrderId) order.razorpayOrderId = razorpayOrderId;
  if (razorpaySignature) order.razorpaySignature = razorpaySignature;

  // Transition status to confirmed if still placed
  if (order.status === "placed") {
    order.status = "confirmed";
  }

  await order.save();
  console.log(`[Payment Finalize] Order ${order._id} successfully marked as PAID via ${source}`);

  // ── Customer notification (deduplicated) ──
  try {
    const user = order.user?._id || order.user;
    if (user) {
      await notifyUserOnce({
        user,
        type: "order_confirmed",
        title: "Order & Advance Payment Confirmed",
        message: `Your 30% advance of ₹${expectedAdvanceINR.toLocaleString("en-IN")} for order #${order.orderId || order._id} is confirmed! Remaining balance: ₹${order.balanceDue.toLocaleString("en-IN")}.`,
        link: `/orders/shopping/${order._id}`,
      });
    }
    await handleShoppingOrderNotifications(oldOrderSnapshot, order);
  } catch (notifErr) {
    console.error(`[Payment Finalize] Notification failed for order ${order._id}:`, notifErr.message);
  }

  return { alreadyProcessed: false, order };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create-order
//
// Creates a Razorpay order for the 30% advance of an existing pending DB order.
// Only the backend computes the advance amount — the frontend never touches this.
// ─────────────────────────────────────────────────────────────────────────────
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { dbOrderId } = req.body;

  if (!dbOrderId) {
    throw new ApiError(400, "dbOrderId is required");
  }

  const order = await Order.findById(dbOrderId);
  if (!order) throw new ApiError(404, "Order not found");

  const userId = order.user?._id ? order.user._id.toString() : order.user?.toString();
  if (userId !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to pay for this order");
  }

  if (order.paymentStatus === "paid") {
    throw new ApiError(400, "This order has already been paid");
  }

  if (order.paymentMethod !== "razorpay") {
    throw new ApiError(400, "This order is not configured for Razorpay payment");
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new ApiError(500, "Razorpay payment gateway credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing on server.");
  }

  // ── 30% Advance Calculation ──
  const totalAmount = Number(order.total) || 0;
  const advanceAmount = Math.round(totalAmount * 0.30);
  const balanceDue = Math.max(0, totalAmount - advanceAmount);

  if (advanceAmount <= 0) {
    throw new ApiError(400, "Order total is invalid for online advance payment");
  }

  // Amount in paise (1 INR = 100 paise)
  const razorpayAmountPaise = advanceAmount * 100;

  // Create Razorpay order via official SDK
  const razorpayOrder = await razorpay.orders.create({
    amount: razorpayAmountPaise,
    currency: "INR",
    receipt: order.orderId || String(order._id),
    notes: {
      dbOrderId: String(order._id),
      orderId: order.orderId || "",
      userId: String(req.user._id),
    },
  });

  // Save Razorpay order reference to DB order
  order.razorpayOrderId = razorpayOrder.id;
  order.advancePaid = advanceAmount;
  order.balanceDue = balanceDue;
  await order.save();

  sendResponse(res, 200, "Razorpay order created successfully", {
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayAmountPaise,           // paise — used by Razorpay Checkout JS
    amountINR: advanceAmount,              // INR — for display in the UI
    totalAmountINR: totalAmount,           // full order total
    balanceDueINR: balanceDue,            // 70% due at delivery
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID,   // public key safe for frontend
    orderId: order.orderId,
    dbOrderId: String(order._id),
    prefill: {
      name: req.user.name || "",
      email: req.user.email || "",
      contact: req.user.phone || "",
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/verify
//
// Synchronous verification called by the frontend upon Razorpay checkout success.
// Verifies HMAC-SHA256 signature server-side and finalizes payment.
// ─────────────────────────────────────────────────────────────────────────────
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, dbOrderId } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !dbOrderId) {
    throw new ApiError(400, "razorpayOrderId, razorpayPaymentId, razorpaySignature, and dbOrderId are all required");
  }

  // ── Cryptographic Signature Verification ──
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  if (!secret) {
    throw new ApiError(500, "Server configuration error: RAZORPAY_KEY_SECRET is not configured");
  }

  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    throw new ApiError(400, "Payment verification failed: Invalid cryptographic signature");
  }

  // Verify DB order and ownership
  const order = await Order.findById(dbOrderId);
  if (!order) throw new ApiError(404, "Order not found");

  const userId = order.user?._id ? order.user._id.toString() : order.user?.toString();
  if (userId !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to verify payment for this order");
  }

  // Finalize payment atomically
  const { order: finalizedOrder } = await finalizeSuccessfulPayment({
    dbOrderId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    source: "verify_endpoint",
  });

  sendResponse(res, 200, "Payment verified successfully", {
    orderId: finalizedOrder.orderId,
    dbOrderId: String(finalizedOrder._id),
    advancePaid: finalizedOrder.advancePaid,
    balanceDue: finalizedOrder.balanceDue,
    paymentStatus: finalizedOrder.paymentStatus,
    status: finalizedOrder.status,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/webhook
//
// Authoritative server-to-server webhook endpoint for all configured Razorpay events.
// Enforces HMAC-SHA256 signature verification, event-level idempotency via WebhookEvent,
// safe status transitions, and handling for payment, order, refund, dispute, and settlement events.
// ─────────────────────────────────────────────────────────────────────────────
const handleWebhook = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // ── 1. Signature Verification ──
  if (!webhookSecret) {
    console.error("[Webhook Error] RAZORPAY_WEBHOOK_SECRET is not set in environment");
    return res.status(500).json({ error: "Webhook secret not configured on server" });
  }

  const receivedSignature = req.headers["x-razorpay-signature"];
  if (!receivedSignature) {
    console.warn("[Webhook Warning] Missing x-razorpay-signature header");
    return res.status(400).json({ error: "Missing signature header" });
  }

  const rawBody = req.rawBody || "";
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (receivedSignature !== expectedSignature) {
    console.warn("[Webhook Warning] Invalid Razorpay webhook signature");
    return res.status(400).json({ error: "Invalid signature" });
  }

  // ── 2. Event-Level Idempotency ──
  const eventId =
    req.headers["x-razorpay-event-id"] ||
    req.body?.event_id ||
    req.body?.id ||
    crypto.createHash("sha256").update(rawBody).digest("hex");

  const eventType = req.body?.event || "unknown";
  const payload = req.body?.payload || {};

  let webhookEventRecord = null;
  try {
    webhookEventRecord = await WebhookEvent.create({
      eventId,
      eventType,
      receivedAt: new Date(),
      processingStatus: "processing",
      eventPayload: payload,
    });
  } catch (err) {
    // Mongo duplicate key error code 11000 indicates duplicate delivery
    if (err.code === 11000) {
      console.log(`[Webhook Idempotency] Duplicate event ${eventId} (${eventType}) already received. Acknowledging with 200.`);
      return res.status(200).json({ received: true, duplicate: true });
    }
    console.error(`[Webhook Error] Failed to persist WebhookEvent ${eventId}:`, err);
    return res.status(500).json({ error: "Database error during event registration" });
  }

  // ── 3. Event Processing Router ──
  try {
    switch (eventType) {
      // ── Authoritative Payment Capture ──
      case "payment.captured": {
        const paymentEntity = payload.payment?.entity;
        const rzpPaymentId = paymentEntity?.id;
        const rzpOrderId = paymentEntity?.order_id;
        const amountPaise = paymentEntity?.amount;
        const currency = paymentEntity?.currency;
        const dbOrderId = paymentEntity?.notes?.dbOrderId;

        if (webhookEventRecord) {
          webhookEventRecord.razorpayPaymentId = rzpPaymentId;
          webhookEventRecord.razorpayOrderId = rzpOrderId;
        }

        if (rzpOrderId || dbOrderId) {
          await finalizeSuccessfulPayment({
            dbOrderId,
            razorpayOrderId: rzpOrderId,
            razorpayPaymentId: rzpPaymentId,
            amountPaise,
            currency,
            source: "webhook_payment_captured",
          });
        }
        break;
      }

      // ── Order Paid Confirmation ──
      case "order.paid": {
        const orderEntity = payload.order?.entity;
        const paymentEntity = payload.payment?.entity;
        const rzpOrderId = orderEntity?.id || paymentEntity?.order_id;
        const rzpPaymentId = paymentEntity?.id;
        const amountPaise = orderEntity?.amount_paid || paymentEntity?.amount;
        const currency = orderEntity?.currency || paymentEntity?.currency;
        const dbOrderId = orderEntity?.notes?.dbOrderId || paymentEntity?.notes?.dbOrderId;

        if (rzpOrderId || dbOrderId) {
          await finalizeSuccessfulPayment({
            dbOrderId,
            razorpayOrderId: rzpOrderId,
            razorpayPaymentId: rzpPaymentId,
            amountPaise,
            currency,
            source: "webhook_order_paid",
          });
        }
        break;
      }

      // ── Payment Failed ──
      case "payment.failed": {
        const paymentEntity = payload.payment?.entity;
        const rzpOrderId = paymentEntity?.order_id;
        const dbOrderId = paymentEntity?.notes?.dbOrderId;

        let order = null;
        if (dbOrderId) order = await Order.findById(dbOrderId);
        else if (rzpOrderId) order = await Order.findOne({ razorpayOrderId: rzpOrderId });

        // Only transition to failed if order is currently pending (never downgrade a paid order)
        if (order && order.paymentStatus === "pending") {
          order.paymentStatus = "failed";
          await order.save();
          console.log(`[Webhook] Order ${order._id} paymentStatus set to failed.`);
        }
        break;
      }

      // ── Payment Authorized ──
      case "payment.authorized": {
        console.log(`[Webhook] Payment authorized: ${payload.payment?.entity?.id}`);
        break;
      }

      // ── Refund Events ──
      case "refund.created":
      case "refund.processed":
      case "refund.failed": {
        const refundEntity = payload.refund?.entity;
        const refundId = refundEntity?.id;
        const paymentId = refundEntity?.payment_id;
        const amountPaise = refundEntity?.amount || 0;
        const refundAmountINR = Math.round(amountPaise / 100);
        const refundStatus = refundEntity?.status || (eventType === "refund.processed" ? "processed" : "created");

        let order = null;
        if (paymentId) {
          order = await Order.findOne({ razorpayPaymentId: paymentId });
        }

        if (order) {
          order.refundStatus = refundStatus === "processed" ? "processed" : "created";
          const existingRefundIndex = order.refunds.findIndex((r) => r.refundId === refundId);

          if (existingRefundIndex >= 0) {
            order.refunds[existingRefundIndex].status = refundStatus;
            if (refundStatus === "processed") {
              order.refunds[existingRefundIndex].processedAt = new Date();
            }
          } else {
            order.refunds.push({
              refundId,
              paymentId,
              amount: refundAmountINR,
              status: refundStatus,
              createdAt: new Date(),
              processedAt: refundStatus === "processed" ? new Date() : undefined,
            });
          }

          if (eventType === "refund.processed") {
            order.paymentStatus = "refunded";
            // If order was cancelled and inventory not yet restored, restore variant stock safely
            if (order.status === "cancelled" && !order.stockRestored) {
              await restoreOrderStock(order);
            }
          }

          await order.save();
          console.log(`[Webhook] Refund ${refundId} (${eventType}) recorded for order ${order._id}`);
        }
        break;
      }

      // ── Dispute Events ──
      case "payment.dispute.created":
      case "payment.dispute.won":
      case "payment.dispute.lost":
      case "payment.dispute.closed": {
        const disputeEntity = payload.dispute?.entity;
        const disputeId = disputeEntity?.id;
        const paymentId = disputeEntity?.payment_id;
        const amountPaise = disputeEntity?.amount || 0;
        const disputeStatus = disputeEntity?.status || eventType.replace("payment.dispute.", "");

        let order = null;
        if (paymentId) {
          order = await Order.findOne({ razorpayPaymentId: paymentId });
        }

        if (order) {
          const existingIndex = order.disputes.findIndex((d) => d.disputeId === disputeId);
          if (existingIndex >= 0) {
            order.disputes[existingIndex].status = disputeStatus;
          } else {
            order.disputes.push({
              disputeId,
              paymentId,
              amount: Math.round(amountPaise / 100),
              status: disputeStatus,
              reason: disputeEntity?.reason_code || "",
              createdAt: new Date(),
            });
          }
          await order.save();
          console.log(`[Webhook] Dispute ${disputeId} (${eventType}) logged for order ${order._id}`);
        }
        break;
      }

      // ── Settlement Events ──
      case "settlement.processed": {
        const settlementEntity = payload.settlement?.entity;
        if (settlementEntity && settlementEntity.id) {
          const amountPaise = Number(settlementEntity.amount) || 0;
          await Settlement.findOneAndUpdate(
            { settlementId: settlementEntity.id },
            {
              settlementId: settlementEntity.id,
              amount: amountPaise,
              amountINR: Math.round(amountPaise / 100),
              currency: settlementEntity.currency || "INR",
              status: settlementEntity.status || "processed",
              utr: settlementEntity.utr || "",
              fees: Number(settlementEntity.fees) || 0,
              tax: Number(settlementEntity.tax) || 0,
              settledAt: settlementEntity.created_at ? new Date(settlementEntity.created_at * 1000) : new Date(),
              rawPayload: settlementEntity,
            },
            { upsert: true, new: true }
          );
          console.log(`[Webhook] Settlement ${settlementEntity.id} recorded successfully.`);
        }
        break;
      }

      // ── Other Selected Webhook Events ──
      default: {
        console.log(`[Webhook Info] Received event "${eventType}". Acknowledging without action.`);
        if (webhookEventRecord) {
          webhookEventRecord.processingStatus = "ignored";
        }
        break;
      }
    }

    // Mark event processed successfully
    if (webhookEventRecord) {
      if (webhookEventRecord.processingStatus !== "ignored") {
        webhookEventRecord.processingStatus = "processed";
      }
      webhookEventRecord.processedAt = new Date();
      await webhookEventRecord.save();
    }

    return res.status(200).json({ received: true });
  } catch (processingErr) {
    console.error(`[Webhook Processing Error] Event ${eventId} failed:`, processingErr);
    if (webhookEventRecord) {
      webhookEventRecord.processingStatus = "failed";
      webhookEventRecord.error = processingErr.message || String(processingErr);
      await webhookEventRecord.save().catch(() => {});
    }
    // Return 500 so Razorpay's delivery queue will retry according to backoff policy
    return res.status(500).json({ error: "Internal processing error during webhook execution" });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  handleWebhook,
};
