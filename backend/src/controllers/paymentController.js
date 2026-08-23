const crypto = require("crypto");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const Order = require("../models/Order");
const TailoringOrder = require("../models/TailoringOrder");
const WebhookEvent = require("../models/WebhookEvent");
const Settlement = require("../models/Settlement");
const razorpay = require("../config/razorpay");
const { validateAndDeductStock, restoreOrderStock } = require("../utils/inventoryManager");
const { notifyUserOnce, handleShoppingOrderNotifications } = require("../utils/orderNotifications");

/**
 * Shared atomic helper to finalize a successful Razorpay payment.
 * Invoked by both POST /api/payments/verify and authoritative webhook events (payment.captured, order.paid).
 * Guarantees idempotency, atomic inventory deduction, advance/balance recording, and deduplicated notifications.
 * Supports both shopping orders (Order) and custom tailoring orders (TailoringOrder).
 */
async function finalizeSuccessfulPayment({
  dbOrderId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  amountPaise,
  currency,
  orderType,
  source = "verify",
}) {
  // ── Currency validation ──
  if (currency && String(currency).toUpperCase() !== "INR") {
    throw new ApiError(400, `Invalid payment currency "${currency}". Expected INR.`);
  }

  // Determine whether this is a tailoring or shopping order
  let isTailoring = orderType === "tailoring";
  let tailoringOrder = null;
  let shoppingOrder = null;

  if (isTailoring || (!orderType && dbOrderId)) {
    if (dbOrderId && mongoose.Types.ObjectId.isValid(dbOrderId)) {
      tailoringOrder = await TailoringOrder.findById(dbOrderId);
    } else if (dbOrderId) {
      tailoringOrder = await TailoringOrder.findOne({ orderId: String(dbOrderId) });
    }
  }

  if (!tailoringOrder && razorpayOrderId) {
    tailoringOrder = await TailoringOrder.findOne({
      $or: [
        { "payments.razorpayOrderId": razorpayOrderId },
        { razorpayOrderId: razorpayOrderId },
      ],
    });
  }

  if (tailoringOrder) {
    isTailoring = true;
  } else {
    // Look up in shopping Order collection
    if (dbOrderId && mongoose.Types.ObjectId.isValid(dbOrderId)) {
      shoppingOrder = await Order.findById(dbOrderId);
    } else if (dbOrderId) {
      shoppingOrder = await Order.findOne({ orderId: String(dbOrderId) });
    } else if (razorpayOrderId) {
      shoppingOrder = await Order.findOne({ razorpayOrderId });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TAILORING ORDER PAYMENT FINALIZATION
  // ─────────────────────────────────────────────────────────────────────────
  if (isTailoring && tailoringOrder) {
    const order = tailoringOrder;

    // Idempotency check: verify if this exact payment ID was already recorded in ledger
    const existingPayment = order.payments?.find(
      (p) => p.razorpayPaymentId && p.razorpayPaymentId === razorpayPaymentId
    );
    if (existingPayment) {
      console.log(`[Payment Finalize] Tailoring order ${order._id} payment ${razorpayPaymentId} already recorded. Skipping.`);
      return { alreadyProcessed: true, order, orderType: "tailoring" };
    }

    const totalAmount = Number(order.totalAmount || order.finalPrice || order.estimatedPrice || 0);
    const currentPaid = Number(order.amountPaid || 0);
    const currentDue = Math.max(0, totalAmount - currentPaid);

    let paymentAmountINR = 0;
    if (amountPaise !== undefined && amountPaise !== null) {
      paymentAmountINR = Math.round(Number(amountPaise) / 100);
    } else {
      // Default to advance (30%) or balance due
      paymentAmountINR = currentPaid === 0 ? Math.round(totalAmount * 0.30) : currentDue;
    }

    // Determine payment purpose
    let paymentPurpose = "advance";
    if (currentPaid > 0 || paymentAmountINR >= currentDue) {
      paymentPurpose = paymentAmountINR >= totalAmount ? "full" : "balance";
    }

    // Append to payments ledger
    if (!Array.isArray(order.payments)) {
      order.payments = [];
    }
    order.payments.push({
      paymentType: paymentPurpose,
      paymentMethod: "razorpay",
      razorpayOrderId: razorpayOrderId || "",
      razorpayPaymentId: razorpayPaymentId || "",
      razorpaySignature: razorpaySignature || "",
      amount: paymentAmountINR,
      status: "captured",
      paidAt: new Date(),
    });

    // Authoritatively recompute amountPaid and amountDue
    const newAmountPaid = order.payments
      .filter((p) => p.status === "captured")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    order.amountPaid = newAmountPaid;
    order.amountDue = Math.max(0, totalAmount - newAmountPaid);

    // Update paymentStatus
    if (order.amountDue === 0 && order.amountPaid >= totalAmount) {
      order.paymentStatus = "paid";
    } else if (order.amountPaid > 0) {
      order.paymentStatus = "partially_paid";
    }

    // Auto-confirm order if initial payment (30% or more) is verified and status is pending
    if (order.status === "pending_payment" || order.status === "pending") {
      order.status = "confirmed";
    }

    await order.save();
    console.log(`[Payment Finalize] Tailoring order ${order._id} successfully updated with payment ${razorpayPaymentId} (Paid: ₹${order.amountPaid}, Due: ₹${order.amountDue}, Status: ${order.status}, PaymentStatus: ${order.paymentStatus})`);

    // Customer notification
    try {
      const user = order.customer?._id || order.customer;
      if (user) {
        const isFull = order.paymentStatus === "paid";
        await notifyUserOnce({
          user,
          type: isFull ? "tailoring_paid" : "tailoring_confirmed",
          title: isFull ? "Tailoring Order Fully Paid" : "Tailoring Order & 30% Advance Confirmed",
          message: isFull
            ? `Your tailoring order #${order.orderId || order._id} is now fully paid (₹${order.totalAmount || totalAmount}). Our masters are crafting your outfit!`
            : `Your 30% advance of ₹${paymentAmountINR.toLocaleString("en-IN")} for tailoring order #${order.orderId || order._id} is confirmed! Remaining balance: ₹${order.amountDue.toLocaleString("en-IN")}.`,
          link: `/orders/tailoring/${order._id}`,
        });
      }
    } catch (notifErr) {
      console.error(`[Payment Finalize] Tailoring notification failed for order ${order._id}:`, notifErr.message);
    }

    return { alreadyProcessed: false, order, orderType: "tailoring" };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SHOPPING ORDER PAYMENT FINALIZATION (Original Exact Logic Preserved)
  // ─────────────────────────────────────────────────────────────────────────
  const order = shoppingOrder;
  if (!order) {
    throw new ApiError(404, `Order not found for Razorpay Order: ${razorpayOrderId || dbOrderId}`);
  }

  // Expected advance amount validation (30% rule — exact strict equality)
  const totalAmount = Number(order.total) || 0;
  const expectedAdvanceINR = Math.round(totalAmount * 0.30);
  const expectedPaise = expectedAdvanceINR * 100;

  if (amountPaise !== undefined && amountPaise !== null) {
    const receivedPaise = Number(amountPaise);
    if (receivedPaise !== expectedPaise) {
      console.warn(
        `[Payment Finalize] Strict amount mismatch for shopping order ${order._id}: received ${receivedPaise} paise, expected exactly ${expectedPaise} paise`
      );
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

  // Idempotency check: if order is already paid & stock deducted, return safely
  if (order.paymentStatus === "paid" && order.stockDeducted) {
    console.log(`[Payment Finalize] Shopping order ${order._id} already finalized. Skipping duplicate processing.`);
    return { alreadyProcessed: true, order, orderType: "shopping" };
  }

  const oldOrderSnapshot = order.toObject();

  // Atomic Inventory Deduction (Product + Color + Size)
  if (!order.stockDeducted) {
    try {
      await validateAndDeductStock(order.items);
      order.stockDeducted = true;
    } catch (stockErr) {
      console.error(`[Payment Finalize] Stock deduction warning for order ${order._id}:`, stockErr.message);
    }
  }

  // Update Order Financials & Payment State
  order.paymentStatus = "paid";
  order.advancePaid = expectedAdvanceINR;
  order.balanceDue = Math.max(0, totalAmount - expectedAdvanceINR);

  if (razorpayPaymentId) order.razorpayPaymentId = razorpayPaymentId;
  if (razorpayOrderId && !order.razorpayOrderId) order.razorpayOrderId = razorpayOrderId;
  if (razorpaySignature) order.razorpaySignature = razorpaySignature;

  if (order.status === "placed") {
    order.status = "confirmed";
  }

  await order.save();
  console.log(`[Payment Finalize] Shopping order ${order._id} successfully marked as PAID via ${source}`);

  // Customer notification (deduplicated)
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

  return { alreadyProcessed: false, order, orderType: "shopping" };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create-order
//
// Creates a Razorpay order for an existing pending DB order.
// Supports both Shopping Orders (30% advance) and Tailoring Orders (30% advance or remaining balance).
// Only the backend computes payment amounts — the frontend never supplies amounts.
// ─────────────────────────────────────────────────────────────────────────────
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { dbOrderId, orderType = "shopping", paymentType = "advance" } = req.body;

  if (!dbOrderId) {
    throw new ApiError(400, "dbOrderId is required");
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new ApiError(500, "Razorpay payment gateway credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing on server.");
  }

  // ── 1. TAILORING ORDER BRANCH ──
  if (orderType === "tailoring") {
    const isMongoId = mongoose.Types.ObjectId.isValid(dbOrderId) && /^[0-9a-fA-F]{24}$/.test(String(dbOrderId));
    const conditions = [{ orderId: String(dbOrderId) }];
    if (isMongoId) conditions.unshift({ _id: dbOrderId });

    const order = await TailoringOrder.findOne({ $or: conditions });
    if (!order) throw new ApiError(404, "Tailoring order not found");

    // Check ownership / permission
    const customerId = order.customer?._id ? order.customer._id.toString() : order.customer?.toString();
    const isOwner = Boolean(
      req.user && (
        (customerId && customerId === req.user._id.toString()) ||
        (order.guestInfo?.email && req.user.email && order.guestInfo.email.toLowerCase() === req.user.email.toLowerCase()) ||
        (order.guestInfo?.phone && req.user.phone && order.guestInfo.phone.replace(/\D/g, "") === req.user.phone.replace(/\D/g, ""))
      )
    );
    if (!isOwner && req.user?.role !== "admin") {
      throw new ApiError(403, "Not authorized to pay for this tailoring order");
    }

    if (order.status === "rejected" || order.status === "cancelled") {
      throw new ApiError(400, `Cannot process payment for an order that is ${order.status}`);
    }

    const totalAmount = Number(order.totalAmount || order.finalPrice || order.estimatedPrice || 0);
    if (totalAmount <= 0) {
      throw new ApiError(400, "Tailoring order total amount is invalid for online payment");
    }

    const amountPaid = Number(order.amountPaid || 0);
    const amountDue = Math.max(0, totalAmount - amountPaid);

    if (order.paymentStatus === "paid" || amountDue <= 0) {
      throw new ApiError(400, "This tailoring order has already been fully paid");
    }

    // Determine charge amount authoritatively on backend
    let chargeAmountINR = 0;
    let resolvedPaymentType = paymentType;

    if (resolvedPaymentType === "balance") {
      chargeAmountINR = amountDue;
    } else if (resolvedPaymentType === "full") {
      chargeAmountINR = totalAmount;
    } else {
      // Advance payment: 30% of total
      if (amountPaid > 0) {
        // If already partially paid, advance becomes remaining balance
        chargeAmountINR = amountDue;
        resolvedPaymentType = "balance";
      } else {
        chargeAmountINR = Math.round(totalAmount * 0.30);
        resolvedPaymentType = "advance";
      }
    }

    if (chargeAmountINR <= 0) {
      throw new ApiError(400, "Calculated payment amount is zero");
    }

    const razorpayAmountPaise = chargeAmountINR * 100;

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: razorpayAmountPaise,
      currency: "INR",
      receipt: order.orderId || String(order._id),
      notes: {
        orderType: "tailoring",
        dbOrderId: String(order._id),
        orderId: order.orderId || "",
        paymentType: resolvedPaymentType,
        userId: String(req.user._id),
      },
    });

    return sendResponse(res, 200, "Razorpay order created successfully for tailoring", {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayAmountPaise,             // in paise for Razorpay Checkout JS
      amountINR: chargeAmountINR,              // in INR for UI
      totalAmountINR: totalAmount,
      amountPaidINR: amountPaid,
      balanceDueINR: Math.max(0, totalAmount - (amountPaid + chargeAmountINR)),
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.orderId,
      dbOrderId: String(order._id),
      orderType: "tailoring",
      paymentType: resolvedPaymentType,
      prefill: {
        name: req.user.name || order.guestInfo?.name || "",
        email: req.user.email || order.guestInfo?.email || "",
        contact: req.user.phone || order.guestInfo?.phone || "",
      },
    });
  }

  // ── 2. SHOPPING ORDER BRANCH (Exact existing behavior) ──
  const order = await Order.findById(dbOrderId);
  if (!order) throw new ApiError(404, "Order not found");
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
// Supports both Shopping Orders and Tailoring Orders.
// ─────────────────────────────────────────────────────────────────────────────
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, dbOrderId, orderType = "shopping" } = req.body;

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

  // Check order existence and ownership based on orderType
  let resolvedOrderType = orderType;
  if (resolvedOrderType === "tailoring") {
    const isMongoId = mongoose.Types.ObjectId.isValid(dbOrderId) && /^[0-9a-fA-F]{24}$/.test(String(dbOrderId));
    const conditions = [{ orderId: String(dbOrderId) }];
    if (isMongoId) conditions.unshift({ _id: dbOrderId });

    const tailoringOrder = await TailoringOrder.findOne({ $or: conditions });
    if (!tailoringOrder) throw new ApiError(404, "Tailoring order not found");

    const customerId = tailoringOrder.customer?._id ? tailoringOrder.customer._id.toString() : tailoringOrder.customer?.toString();
    const isOwner = Boolean(
      req.user && (
        (customerId && customerId === req.user._id.toString()) ||
        (tailoringOrder.guestInfo?.email && req.user.email && tailoringOrder.guestInfo.email.toLowerCase() === req.user.email.toLowerCase()) ||
        (tailoringOrder.guestInfo?.phone && req.user.phone && tailoringOrder.guestInfo.phone.replace(/\D/g, "") === req.user.phone.replace(/\D/g, ""))
      )
    );
    if (!isOwner && req.user?.role !== "admin") {
      throw new ApiError(403, "Not authorized to verify payment for this tailoring order");
    }
  } else {
    const order = await Order.findById(dbOrderId);
    if (!order) {
      // Check if it was actually a tailoring order
      const tailoringOrder = await TailoringOrder.findById(dbOrderId).catch(() => null);
      if (tailoringOrder) {
        resolvedOrderType = "tailoring";
      } else {
        throw new ApiError(404, "Order not found");
      }
    } else {
      const userId = order.user?._id ? order.user._id.toString() : order.user?.toString();
      if (userId !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized to verify payment for this order");
      }
    }
  }

  // Finalize payment atomically
  const { order: finalizedOrder, orderType: finalizedType } = await finalizeSuccessfulPayment({
    dbOrderId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    orderType: resolvedOrderType,
    source: "verify_endpoint",
  });

  if (finalizedType === "tailoring") {
    return sendResponse(res, 200, "Tailoring payment verified successfully", {
      orderId: finalizedOrder.orderId,
      dbOrderId: String(finalizedOrder._id),
      orderType: "tailoring",
      totalAmount: finalizedOrder.totalAmount || finalizedOrder.finalPrice || finalizedOrder.estimatedPrice,
      amountPaid: finalizedOrder.amountPaid,
      amountDue: finalizedOrder.amountDue,
      paymentStatus: finalizedOrder.paymentStatus,
      status: finalizedOrder.status,
      payments: finalizedOrder.payments,
    });
  }

  sendResponse(res, 200, "Payment verified successfully", {
    orderId: finalizedOrder.orderId,
    dbOrderId: String(finalizedOrder._id),
    orderType: "shopping",
    advancePaid: finalizedOrder.advancePaid,
    balanceDue: finalizedOrder.balanceDue,
    paymentStatus: finalizedOrder.paymentStatus,
    status: finalizedOrder.status,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/record-offline
//
// Admin-only endpoint to record offline balance collection (Cash or POS).
// Authoritatively validates remaining amountDue and records ledger entry.
// ─────────────────────────────────────────────────────────────────────────────
const recordOfflineBalancePayment = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Access denied: Admin privileges required to record offline payment");
  }

  const { dbOrderId, orderType = "tailoring", paymentMethod, amount, notes } = req.body;

  if (!dbOrderId) {
    throw new ApiError(400, "dbOrderId is required");
  }

  const validMethods = ["cash", "pos"];
  const method = String(paymentMethod || "").trim().toLowerCase();
  if (!validMethods.includes(method)) {
    throw new ApiError(400, `Invalid payment method "${paymentMethod}". Allowed methods are "cash" or "pos".`);
  }

  if (orderType === "tailoring") {
    const isMongoId = mongoose.Types.ObjectId.isValid(dbOrderId) && /^[0-9a-fA-F]{24}$/.test(String(dbOrderId));
    const conditions = [{ orderId: String(dbOrderId) }];
    if (isMongoId) conditions.unshift({ _id: dbOrderId });

    const order = await TailoringOrder.findOne({ $or: conditions });
    if (!order) throw new ApiError(404, "Tailoring order not found");

    if (order.status === "rejected" || order.status === "cancelled") {
      throw new ApiError(400, `Cannot record offline payment for an order that is ${order.status}`);
    }

    const totalAmount = Number(order.totalAmount || order.finalPrice || order.estimatedPrice || 0);
    const currentPaid = Number(order.amountPaid || 0);
    const amountDue = Math.max(0, totalAmount - currentPaid);

    if (order.paymentStatus === "paid" || amountDue <= 0) {
      throw new ApiError(400, "This order is already fully paid (no remaining balance)");
    }

    const paymentAmount = amount !== undefined && amount !== null && amount !== "" ? Number(amount) : amountDue;

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new ApiError(400, "Payment amount must be greater than zero");
    }

    if (paymentAmount > amountDue) {
      throw new ApiError(
        400,
        `Payment amount (₹${paymentAmount}) cannot exceed the authoritative remaining balance of ₹${amountDue}`
      );
    }

    // Append to payments ledger
    if (!Array.isArray(order.payments)) {
      order.payments = [];
    }

    order.payments.push({
      paymentType: "balance",
      paymentMethod: method,
      amount: paymentAmount,
      status: "captured",
      paidAt: new Date(),
      recordedBy: req.user._id,
      notes: notes || `Offline balance collected via ${method.toUpperCase()} by Admin (${req.user.name || req.user.email})`,
    });

    // Recompute financials
    const newPaid = order.payments
      .filter((p) => p.status === "captured")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    order.amountPaid = newPaid;
    order.amountDue = Math.max(0, totalAmount - newPaid);

    if (order.amountDue === 0 && order.amountPaid >= totalAmount) {
      order.paymentStatus = "paid";
    } else if (order.amountPaid > 0) {
      order.paymentStatus = "partially_paid";
    }

    await order.save();
    console.log(`[Offline Payment] Recorded ₹${paymentAmount} via ${method} on Tailoring Order ${order._id} by admin ${req.user._id}`);

    // Notify customer
    try {
      const user = order.customer?._id || order.customer;
      if (user) {
        await notifyUserOnce({
          user,
          type: "tailoring_offline_payment",
          title: "Payment Received",
          message: `Your payment of ₹${paymentAmount.toLocaleString("en-IN")} via ${method.toUpperCase()} for order #${order.orderId || order._id} has been recorded! Balance remaining: ₹${order.amountDue.toLocaleString("en-IN")}.`,
          link: `/orders/tailoring/${order._id}`,
        });
      }
    } catch (notifErr) {
      console.error("[Offline Payment] Notification error:", notifErr);
    }

    return sendResponse(res, 200, `Offline payment of ₹${paymentAmount} recorded successfully via ${method.toUpperCase()}`, {
      orderId: order.orderId,
      dbOrderId: String(order._id),
      orderType: "tailoring",
      totalAmount,
      amountPaid: order.amountPaid,
      amountDue: order.amountDue,
      paymentStatus: order.paymentStatus,
      status: order.status,
      payments: order.payments,
    });
  }

  // Shopping order offline payment
  const order = await Order.findById(dbOrderId);
  if (!order) throw new ApiError(404, "Order not found");

  const balanceDue = Number(order.balanceDue || 0);
  const paymentAmount = amount !== undefined && amount !== null && amount !== "" ? Number(amount) : balanceDue;

  order.balanceDue = Math.max(0, balanceDue - paymentAmount);
  if (order.balanceDue === 0) {
    order.paymentStatus = "paid";
  }

  await order.save();
  return sendResponse(res, 200, "Shopping order balance payment recorded", order);
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
        const orderType = paymentEntity?.notes?.orderType || "shopping";

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
            orderType,
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
        const orderType = orderEntity?.notes?.orderType || paymentEntity?.notes?.orderType || "shopping";

        if (rzpOrderId || dbOrderId) {
          await finalizeSuccessfulPayment({
            dbOrderId,
            razorpayOrderId: rzpOrderId,
            razorpayPaymentId: rzpPaymentId,
            amountPaise,
            currency,
            orderType,
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
        const orderType = paymentEntity?.notes?.orderType;

        if (orderType === "tailoring") {
          let tailoringOrder = null;
          if (dbOrderId) tailoringOrder = await TailoringOrder.findById(dbOrderId);
          else if (rzpOrderId) tailoringOrder = await TailoringOrder.findOne({ "payments.razorpayOrderId": rzpOrderId });
          if (tailoringOrder && tailoringOrder.paymentStatus === "pending") {
            // Keep pending_payment
            console.log(`[Webhook] Tailoring order ${tailoringOrder._id} payment attempt failed.`);
          }
        } else {
          let order = null;
          if (dbOrderId) order = await Order.findById(dbOrderId);
          else if (rzpOrderId) order = await Order.findOne({ razorpayOrderId: rzpOrderId });

          if (order && order.paymentStatus === "pending") {
            order.paymentStatus = "failed";
            await order.save();
            console.log(`[Webhook] Order ${order._id} paymentStatus set to failed.`);
          }
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

        // First check Tailoring Orders
        let tailoringOrder = null;
        if (paymentId) {
          tailoringOrder = await TailoringOrder.findOne({ "payments.razorpayPaymentId": paymentId });
        }

        if (tailoringOrder) {
          if (!Array.isArray(tailoringOrder.refunds)) tailoringOrder.refunds = [];
          const existingRefundIndex = tailoringOrder.refunds.findIndex((r) => r.refundId === refundId);

          if (existingRefundIndex >= 0) {
            tailoringOrder.refunds[existingRefundIndex].status = refundStatus;
            if (refundStatus === "processed") {
              tailoringOrder.refunds[existingRefundIndex].processedAt = new Date();
            }
          } else {
            tailoringOrder.refunds.push({
              refundId,
              paymentId,
              amount: refundAmountINR,
              status: refundStatus,
              processedAt: refundStatus === "processed" ? new Date() : undefined,
            });
          }

          if (eventType === "refund.processed") {
            const totalRefunded = tailoringOrder.refunds
              .filter((r) => r.status === "processed")
              .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

            if (totalRefunded >= (tailoringOrder.amountPaid || 0) && tailoringOrder.amountPaid > 0) {
              tailoringOrder.paymentStatus = "refunded";
            } else if (totalRefunded > 0) {
              tailoringOrder.paymentStatus = "partially_refunded";
            }
          }

          await tailoringOrder.save();
          console.log(`[Webhook] Refund ${refundId} (${eventType}) recorded for tailoring order ${tailoringOrder._id}`);
          break;
        }

        // Check Shopping Orders
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
            if (order.status === "cancelled" && !order.stockRestored) {
              await restoreOrderStock(order);
            }
          }

          await order.save();
          console.log(`[Webhook] Refund ${refundId} (${eventType}) recorded for shopping order ${order._id}`);
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
  recordOfflineBalancePayment,
  handleWebhook,
};

