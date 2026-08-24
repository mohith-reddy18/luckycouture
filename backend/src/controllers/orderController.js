const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const AdminSetting = require("../models/AdminSetting");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");
const { generateOrderId } = require("../utils/generateOrderId");
const { validateAddressIntegrity } = require("../utils/pincodeValidator");
const { validateAndDeductStock, validateStockAvailability, restoreOrderStock } = require("../utils/inventoryManager");
const { handleShoppingOrderNotifications, notifyUserOnce } = require("../utils/orderNotifications");
const { calculatePlatformFee } = require("../utils/platformFee");
const razorpay = require("../config/razorpay");

// POST /api/orders — checkout from the current DB cart OR from a direct item list sent by the frontend
const placeOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod, couponCode, items: directItems, needsDelivery = true } = req.body;

  const settings = await AdminSetting.getSingleton();

  const isRazorpay = (paymentMethod || "cod") === "razorpay";

  let rawItems = [];
  if (Array.isArray(directItems) && directItems.length > 0) {
    rawItems = directItems.map((it) => ({
      product: it.product?._id || it.product || it._id || null,
      name: it.name || it.title || "Product",
      image: it.image || (Array.isArray(it.images) && it.images[0]?.url) || (it.thumbnail?.url) || "",
      price: Number(it.price) || 0,
      quantity: Number(it.qty || it.quantity) || 1,
      size: it.size || "",
      color: it.color || "",
      tailoringRequested: Boolean(it.tailoringRequested),
    }));
  } else {
    // Fall back to server-side Cart document
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new ApiError(400, "Your cart is empty");
    }
    rawItems = cart.items.map((it) => ({
      product: it.product?._id || it.product,
      name: it.product?.name || "Product",
      image: it.product?.images?.[0]?.url || "",
      price: it.product?.price || 0,
      quantity: it.quantity || 1,
      size: it.size || "",
      color: it.color || "",
      tailoringRequested: Boolean(it.tailoringRequested),
    }));
  }

  // Stock tracking: COD deducts immediately, Razorpay defers to verify step
  let items;
  if (isRazorpay) {
    items = await validateStockAvailability(rawItems);
  } else {
    items = await validateAndDeductStock(rawItems);
  }

  const subtotal = items.reduce(
    (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );

  const isDeliveryRequested = Boolean(needsDelivery);
  let validatedShippingAddress = shippingAddress;

  if (isDeliveryRequested) {
    if (!shippingAddress || !shippingAddress.line1 || !shippingAddress.pincode) {
      throw new ApiError(400, "Complete Indian delivery address with PIN code is required");
    }

    // Check if user has an existing saved address with already verified location and route distance
    let existingVerified = null;
    if (req.user && Array.isArray(req.user.addresses)) {
      const targetId = shippingAddress._id || shippingAddress.addressId;
      const found = targetId ? req.user.addresses.id(targetId) : req.user.addresses.find(
        (a) =>
          a.line1?.trim().toLowerCase() === shippingAddress.line1?.trim().toLowerCase() &&
          a.pincode?.trim() === shippingAddress.pincode?.trim()
      );
      if (
        found &&
        found.verifiedLocation?.isVerified &&
        found.verifiedLocation?.roadDistanceKm != null &&
        found.verifiedLocation?.storeLocationVersion === "lakshmi_designers_v1"
      ) {
        existingVerified = found;
      }
    }

    if (existingVerified) {
      // Reuse stored verified location and route distance without calling external APIs
      validatedShippingAddress = {
        ...shippingAddress,
        country: "India",
        city: existingVerified.city,
        state: existingVerified.state,
        pincode: existingVerified.pincode,
        locality: existingVerified.locality || "",
        line1: existingVerified.line1,
        line2: existingVerified.line2 || "",
        coordinates: {
          lat: existingVerified.verifiedLocation.lat,
          lng: existingVerified.verifiedLocation.lng,
        },
        roadDistanceKm: existingVerified.verifiedLocation.roadDistanceKm,
      };
    } else {
      // Perform authoritative address and route distance verification
      const addressValidation = await validateAddressIntegrity(shippingAddress);
      if (!addressValidation.valid) {
        throw new ApiError(400, addressValidation.error || "Please provide a valid Indian delivery address");
      }
      validatedShippingAddress = {
        ...shippingAddress,
        country: "India",
        city: addressValidation.data.city,
        state: addressValidation.data.state,
        pincode: addressValidation.data.pincode,
        locality: addressValidation.data.locality,
        line1: addressValidation.data.line1,
        line2: addressValidation.data.line2,
        coordinates: addressValidation.data.coordinates,
        roadDistanceKm: addressValidation.data.roadDistanceKm,
      };
    }
  }

  // Authoritative delivery details (short vs long distance, AP vs Outside AP)
  const { calculateDeliveryDetails } = require("../utils/deliveryPricing");
  const deliveryDetails = isDeliveryRequested
    ? calculateDeliveryDetails({
        roadDistanceKm: validatedShippingAddress?.roadDistanceKm,
        state: validatedShippingAddress?.state,
        pincode: validatedShippingAddress?.pincode,
        city: validatedShippingAddress?.city,
      })
    : null;

  const isShortDistance = Boolean(deliveryDetails?.isShortDistance);
  const isLongDistance = Boolean(deliveryDetails?.isLongDistance);
  const shippingFee = deliveryDetails ? deliveryDetails.deliveryFee : 0;

  const discount = 0;

  // Lucky Couture does NOT charge GST
  const tax = 0;
  const orderBaseAmount = Math.max(0, subtotal - discount + shippingFee);
  const platformFee = calculatePlatformFee(orderBaseAmount);
  const total = Math.round((orderBaseAmount + platformFee + tax) * 100) / 100;

  // Delivery estimation logic
  const now = new Date();
  let estimatedDeliveryDate = null;
  let deliveryDateReviewed = false;

  if (isDeliveryRequested) {
    if (isShortDistance && isGuntur) {
      deliveryDateReviewed = true;
      estimatedDeliveryDate = new Date();
      if (now.getHours() < 11) {
        estimatedDeliveryDate.setHours(20, 0, 0, 0); // Today by 8 PM
      } else {
        estimatedDeliveryDate.setDate(now.getDate() + 1);
        estimatedDeliveryDate.setHours(20, 0, 0, 0); // Tomorrow by 8 PM
      }
    } else if (isLongDistance) {
      deliveryDateReviewed = true;
      estimatedDeliveryDate = new Date();
      if (deliveryDetails?.isAndhraPradesh) {
        estimatedDeliveryDate.setDate(now.getDate() + 7); // Estimated 4-7 days window
      } else {
        estimatedDeliveryDate.setDate(now.getDate() + 10); // Estimated 10+ days window
      }
    }
  } else {
    // Store pickup
    deliveryDateReviewed = false;
  }

  // Generate a cryptographically-secure 15-digit orderId.
  let order;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      order = await Order.create({
        orderId: generateOrderId("SHOP-"),
        user:    req.user._id,
        items,
        needsDelivery: isDeliveryRequested,
        isLongDistance,
        shippingAddress: isDeliveryRequested ? validatedShippingAddress : {},
        deliverySnapshot: isDeliveryRequested
          ? {
              roadDistanceKm: validatedShippingAddress?.roadDistanceKm,
              deliveryCharge: shippingFee,
              isShortDistance,
              isLongDistance,
              isAndhraPradesh: deliveryDetails?.isAndhraPradesh,
              deliveryZone: deliveryDetails?.deliveryZone,
              estimatedDeliveryText: deliveryDetails?.estimatedDeliveryText,
              storeLocationVersion: "lakshmi_designers_v1",
              calculatedAt: new Date(),
              verifiedCoordinates: validatedShippingAddress?.coordinates,
            }
          : undefined,
        subtotal,
        discount,
        shippingFee,
        platformFee,
        tax,
        total,
        couponCode,
        paymentMethod: paymentMethod || "cod",
        // Razorpay orders start as pending — payment verification sets to paid
        paymentStatus: isRazorpay ? "pending" : "pending",
        // Stock tracking: COD deducts immediately, Razorpay defers to verify step
        stockDeducted: !isRazorpay,
        stockRestored: false,
        estimatedDeliveryDate,
        deliveryDateReviewed,
      });
      break;
    } catch (err) {
      if (err.code !== 11000 || attempt === 4) throw err;
    }
  }

  // Remove purchased items from the user's DB cart ONLY for COD orders.
  // For Razorpay orders the cart is cleared by the frontend after payment verification.
  if (!isRazorpay) {
    try {
      const userCart = await Cart.findOne({ user: req.user._id });
      if (userCart && Array.isArray(userCart.items) && userCart.items.length > 0) {
        if (!directItems || directItems.length === 0) {
          userCart.items = [];
        } else {
          userCart.items = userCart.items.filter((ci) => {
            const ciProdId = String(ci.product?._id || ci.product || "");
            const ciColor = String(ci.color || "").trim().toLowerCase();
            const ciSize = String(ci.size || "").trim().toLowerCase();

            const wasPurchased = items.some((pi) => {
              const piProdId = String(pi.product?._id || pi.product || "");
              const piColor = String(pi.color || "").trim().toLowerCase();
              const piSize = String(pi.size || "").trim().toLowerCase();
              return (
                (!piProdId || piProdId === ciProdId) &&
                piColor === ciColor &&
                piSize === ciSize
              );
            });
            return !wasPurchased;
          });
        }
        await userCart.save();
      }
    } catch (cartErr) {
      console.error("Failed to sync DB cart after order placement:", cartErr);
    }
  }

  sendResponse(res, 201, "Order placed successfully", order);
});

// GET /api/orders/me
const getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {
    user: req.user._id,
    // Exclude uncompleted/abandoned Razorpay checkout sessions where no payment was made
    $nor: [
      {
        paymentMethod: "razorpay",
        paymentStatus: "pending",
        amountPaid: 0,
        status: "placed",
        stockDeducted: false,
      },
    ],
  };

  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Orders fetched", items, buildPaginationMeta(page, limit, total));
});

// GET /api/orders/:id
const getOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const str = String(id).trim();
  const isMongoId = mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str);

  const conditions = [{ orderId: str }];
  if (isMongoId) {
    conditions.unshift({ _id: str });
  }

  const order = await Order.findOne({ $or: conditions })
    .populate("items.product", "name images thumbnail price category")
    .populate("user", "name email phone role");
  if (!order) throw new ApiError(404, "Order not found");

  const userId = order.user?._id ? order.user._id.toString() : order.user?.toString();
  const isOwner = Boolean(req.user && userId === req.user._id.toString());
  if (!isOwner && req.user?.role !== "admin") throw new ApiError(403, "Not authorized to view this order");

  sendResponse(res, 200, "Order fetched", order);
});

// PATCH /api/orders/:id/cancel (customer or admin cancellation)
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const str = String(id).trim();
  const isMongoId = mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str);

  const conditions = [{ orderId: str }];
  if (isMongoId) {
    conditions.unshift({ _id: str });
  }

  const order = await Order.findOne({ $or: conditions });
  if (!order) throw new ApiError(404, "Order not found");

  const userId = order.user?._id ? order.user._id.toString() : order.user?.toString();
  const isOwner = Boolean(req.user && userId === req.user._id.toString());
  if (!isOwner && req.user?.role !== "admin") throw new ApiError(403, "Not authorized to cancel this order");

  if (order.status === "cancelled" || order.status === "rejected") {
    // Idempotent: already cancelled or rejected
    return sendResponse(res, 200, `Order is already ${order.status}`, order);
  }

  if (["delivered", "returned"].includes(order.status)) {
    throw new ApiError(400, `Cannot cancel an order that is already ${order.status}`);
  }

  order.status = "cancelled";

  // Idempotent stock restoration — only restore if stock was actually deducted
  await restoreOrderStock(order);

  sendResponse(res, 200, "Order cancelled and stock restored successfully", order);
});

// --- Admin ---

// GET /api/orders (admin)
const listAllOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {
    // Exclude uncompleted/abandoned Razorpay checkout sessions where no payment was made
    $nor: [
      {
        paymentMethod: "razorpay",
        paymentStatus: "pending",
        amountPaid: 0,
        status: "placed",
        stockDeducted: false,
      },
    ],
  };
  if (status) filter.status = status;

  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const [items, total] = await Promise.all([
    Order.find(filter).populate("user", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Orders fetched", items, buildPaginationMeta(page, limit, total));
});

// Legitimate physical fulfillment stages for shopping orders
const ALLOWED_SHOPPING_STAGES = ["confirmed", "packed", "shipped", "delivered"];

// PATCH /api/orders/:id/status (admin) — progress updates only
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const str = String(id).trim();
  const isMongoId = mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str);

  const conditions = [{ orderId: str }];
  if (isMongoId) {
    conditions.unshift({ _id: str });
  }

  const existingOrder = await Order.findOne({ $or: conditions });
  if (!existingOrder) throw new ApiError(404, "Order not found");

  if (existingOrder.status === "completed" || existingOrder.status === "rejected" || existingOrder.status === "cancelled") {
    throw new ApiError(400, `Cannot update status for an order that is ${existingOrder.status}`);
  }

  // Payment gate: Online orders must have verified payment before fulfilling
  if (existingOrder.paymentMethod === "razorpay" && existingOrder.amountPaid === 0 && existingOrder.paymentStatus === "pending") {
    throw new ApiError(400, "Cannot update fulfillment status: Required advance payment has not been verified for this order.");
  }

  const updateFields = {};
  if (req.body.status) {
    const rawStatus = String(req.body.status).trim().toLowerCase();
    if (!ALLOWED_SHOPPING_STAGES.includes(rawStatus)) {
      throw new ApiError(
        400,
        `Invalid status "${req.body.status}". Legitimate progress stages are: ${ALLOWED_SHOPPING_STAGES.join(", ")}. For terminal actions, use the dedicated Complete or Reject Order controls.`
      );
    }
    updateFields.status = rawStatus;
  }

  if (req.body.expectedDeliveryDate || req.body.estimatedDeliveryDate) {
    updateFields.estimatedDeliveryDate = new Date(req.body.expectedDeliveryDate || req.body.estimatedDeliveryDate);
    updateFields.deliveryDateReviewed = true;
  }

  // Delivery charge/shipping fee is strictly system-controlled and non-editable by admins.
  // Any deliveryCharge or shippingFee in the request body is intentionally ignored.

  if (req.body.isLongDistance !== undefined) {
    updateFields.isLongDistance = Boolean(req.body.isLongDistance);
  }

  const updatedOrder = await Order.findByIdAndUpdate(existingOrder._id, updateFields, { new: true });

  // Trigger order notifications for confirmed/updated delivery price, delivery date, status
  try {
    await handleShoppingOrderNotifications(existingOrder, updatedOrder);
  } catch (err) {
    console.error("Error sending shopping order notifications:", err);
  }

  sendResponse(res, 200, "Order updated successfully", updatedOrder);
});

// PATCH /api/orders/:id/complete (admin) — completion guard enforcing 100% full payment
const completeOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const str = String(id || "").trim();
  if (!str) throw new ApiError(400, "Order ID is required");

  const isMongoId = mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str);
  const conditions = [{ orderId: str }];
  if (isMongoId) conditions.unshift({ _id: str });

  const order = await Order.findOne({ $or: conditions });
  if (!order) throw new ApiError(404, "Order not found");

  if (order.status === "rejected" || order.status === "cancelled") {
    throw new ApiError(400, `Cannot complete an order that is ${order.status}`);
  }

  if (order.status === "completed") {
    return sendResponse(res, 200, "Order is already completed", order);
  }

  const totalAmount = Number(order.totalAmount || order.total || 0);
  const amountPaid = Number(order.amountPaid || order.advancePaid || (order.paymentStatus === "paid" ? totalAmount : 0));
  const amountDue = Math.max(0, totalAmount - amountPaid);

  // Strict Completion Rule: 100% full payment required
  if (order.paymentStatus !== "paid" || amountDue > 0 || amountPaid < totalAmount) {
    throw new ApiError(
      400,
      `Cannot complete order: Full payment is required before completion. Total: ₹${totalAmount.toLocaleString("en-IN")}, Amount Paid: ₹${amountPaid.toLocaleString("en-IN")}, Remaining Balance: ₹${amountDue.toLocaleString("en-IN")}.`
    );
  }

  order.status = "completed";
  order.completedAt = new Date();
  await order.save();

  // Customer notification
  try {
    const user = order.user?._id || order.user;
    if (user) {
      await notifyUserOnce({
        user,
        type: "order_completed",
        title: "Order Completed! 🎉",
        message: `Your shopping order #${order.orderId || order._id} has been delivered and marked as completed. Thank you for shopping with Lucky Couture!`,
        link: `/orders/shopping/${order._id}`,
      });
    }
  } catch (err) {
    console.error("Completion notification error:", err);
  }

  sendResponse(res, 200, "Shopping order successfully marked as Completed", order);
});

// PATCH /api/orders/:id/reject (admin) — rejection with automated Razorpay refund & stock rollback
const rejectOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectionReason, reason } = req.body;
  const finalReason = String(rejectionReason || reason || "").trim();

  if (!finalReason) {
    throw new ApiError(400, "A valid rejection reason is required to reject an order.");
  }

  const str = String(id || "").trim();
  if (!str) throw new ApiError(400, "Order ID is required");

  const isMongoId = mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str);
  const conditions = [{ orderId: str }];
  if (isMongoId) conditions.unshift({ _id: str });

  const order = await Order.findOne({ $or: conditions });
  if (!order) throw new ApiError(404, "Order not found");

  if (order.status === "rejected") {
    return sendResponse(res, 200, "Order is already rejected", order);
  }

  if (order.status === "completed") {
    throw new ApiError(400, "Cannot reject an order that is already marked as Completed.");
  }

  // 1. Automated Razorpay Refund for all captured online payments
  if (!Array.isArray(order.refunds)) order.refunds = [];
  const capturedRazorpayPayments = (order.payments || []).filter(
    (p) => p.paymentMethod === "razorpay" && p.status === "captured" && p.razorpayPaymentId
  );

  // Also include top-level razorpayPaymentId if not in ledger
  if (capturedRazorpayPayments.length === 0 && order.razorpayPaymentId && order.advancePaid > 0) {
    capturedRazorpayPayments.push({
      paymentMethod: "razorpay",
      status: "captured",
      razorpayPaymentId: order.razorpayPaymentId,
      amount: order.advancePaid,
    });
  }

  for (const payment of capturedRazorpayPayments) {
    const alreadyRefunded = order.refunds.some(
      (r) => r.paymentId === payment.razorpayPaymentId && (r.status === "processed" || r.status === "created")
    );
    if (!alreadyRefunded && payment.amount > 0) {
      try {
        const refundRes = await razorpay.payments.refund(payment.razorpayPaymentId, {
          amount: Math.round(payment.amount * 100), // in paise
          notes: {
            orderId: order.orderId || String(order._id),
            reason: finalReason,
          },
        });

        order.refunds.push({
          refundId: refundRes.id,
          paymentId: payment.razorpayPaymentId,
          amount: payment.amount,
          reason: finalReason,
          status: "processed",
          processedAt: new Date(),
          processedBy: req.user._id,
        });
        payment.status = "refunded";
      } catch (refundErr) {
        console.error(`[Rejection Refund Error] Razorpay refund for payment ${payment.razorpayPaymentId}:`, refundErr.message);
        order.refunds.push({
          refundId: `REF-REC-${Date.now()}`,
          paymentId: payment.razorpayPaymentId,
          amount: payment.amount,
          reason: `${finalReason} (${refundErr.message})`,
          status: "created",
          processedAt: new Date(),
          processedBy: req.user._id,
        });
      }
    }
  }

  // 2. Idempotent inventory restoration (Product + Color + Size)
  await restoreOrderStock(order);
  order.stockRestored = true;

  order.status = "rejected";
  order.paymentStatus = (order.amountPaid > 0 || order.advancePaid > 0) ? "refunded" : "pending";
  order.refundStatus = order.refunds.length > 0 ? "processed" : "none";
  order.rejectionReason = finalReason;
  order.rejectedAt = new Date();

  await order.save();

  // 3. Notify customer
  try {
    const user = order.user?._id || order.user;
    if (user) {
      await notifyUserOnce({
        user,
        type: "order_rejected",
        title: "Shopping Order Update",
        message: `Your shopping order #${order.orderId || order._id} has been cancelled/rejected. Reason: "${finalReason}". Any advance payments made have been refunded.`,
        link: `/orders/shopping/${order._id}`,
      });
    }
  } catch (err) {
    console.error("Rejection notification error:", err);
  }

  sendResponse(res, 200, "Shopping order rejected, stock restored, and refunds processed successfully", order);
});

module.exports = {
  placeOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  listAllOrders,
  updateOrderStatus,
  completeOrder,
  rejectOrder,
};

