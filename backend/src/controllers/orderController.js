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
const { validateAndDeductStock, restoreOrderStock } = require("../utils/inventoryManager");
const { handleShoppingOrderNotifications } = require("../utils/orderNotifications");

// POST /api/orders — checkout from the current DB cart OR from a direct item list sent by the frontend
const placeOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod, couponCode, items: directItems, needsDelivery = true } = req.body;

  const settings = await AdminSetting.getSingleton();

  const isRazorpay = (paymentMethod || "cod") === "razorpay";

  let rawItems = [];

  if (directItems && Array.isArray(directItems) && directItems.length > 0) {
    rawItems = directItems;
  } else {
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
    if (!cart || cart.items.length === 0) throw new ApiError(400, "Your cart is empty");

    rawItems = cart.items.map((cartItem) => ({
      product: cartItem.product?._id || cartItem.product,
      name: cartItem.product?.name,
      image: cartItem.product?.thumbnail?.url || cartItem.product?.images?.[0]?.url,
      price: cartItem.product?.price,
      quantity: cartItem.quantity,
      size: cartItem.size,
      color: cartItem.color,
    }));
  }

  // ── Validate & atomically deduct variant stock (exact color + size) ──
  // For Razorpay orders, stock is validated BUT NOT deducted here.
  // Deduction happens in paymentController.verifyPayment after signature check.
  let items;
  if (isRazorpay) {
    // Validate stock availability without deducting — just snapshot item data
    const { validateStockAvailability } = require("../utils/inventoryManager");
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
    };
  }

  const city = (validatedShippingAddress?.city || "").trim().toLowerCase();
  const isGuntur = city === "guntur";
  const isLongDistance = isDeliveryRequested && !isGuntur;

  const discount = 0;
  let shippingFee = 0;

  if (isDeliveryRequested) {
    if (isGuntur) {
      // Local Guntur delivery fee: Free if >= threshold, otherwise standard fee
      shippingFee = subtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee;
    } else {
      // Long distance delivery requires manual confirmation; no automatic fee is charged
      shippingFee = 0;
    }
  } else {
    // Store Pickup: no delivery charge
    shippingFee = 0;
  }

  // Lucky Couture does NOT charge GST
  const tax = 0;
  const total = subtotal - discount + shippingFee + tax;

  // Guntur 24hr / 11 AM delivery cutoff logic (only for Guntur local delivery)
  const now = new Date();
  let estimatedDeliveryDate = null;
  let deliveryDateReviewed = false;

  if (isDeliveryRequested && isGuntur) {
    deliveryDateReviewed = true;
    estimatedDeliveryDate = new Date();
    if (now.getHours() < 11) {
      estimatedDeliveryDate.setHours(20, 0, 0, 0); // Today by 8 PM
    } else {
      estimatedDeliveryDate.setDate(now.getDate() + 1);
      estimatedDeliveryDate.setHours(20, 0, 0, 0); // Tomorrow by 8 PM
    }
  } else {
    // Store pickup or long-distance delivery requires confirmation (no same-day promise)
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
        subtotal,
        discount,
        shippingFee,
        tax: 0,
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
  const filter = { user: req.user._id };

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
  const filter = {};
  if (status) filter.status = status;

  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const [items, total] = await Promise.all([
    Order.find(filter).populate("user", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Orders fetched", items, buildPaginationMeta(page, limit, total));
});

// PATCH /api/orders/:id/status (admin)
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

  const updateFields = {};
  if (req.body.status) {
    updateFields.status = req.body.status;
    if (req.body.status === "cancelled" || req.body.status === "rejected") {
      // Restore variant stock idempotently (Product + Color + Size)
      await restoreOrderStock(existingOrder);
      updateFields.stockRestored = true;
    }
  }

  if (req.body.expectedDeliveryDate || req.body.estimatedDeliveryDate) {
    updateFields.estimatedDeliveryDate = new Date(req.body.expectedDeliveryDate || req.body.estimatedDeliveryDate);
    updateFields.deliveryDateReviewed = true;
  }
  if (req.body.deliveryCharge !== undefined && req.body.deliveryCharge !== null) {
    const fee = Number(req.body.deliveryCharge) || 0;
    updateFields.shippingFee = fee;
    updateFields.total = (existingOrder.subtotal || 0) - (existingOrder.discount || 0) + fee + (existingOrder.tax || 0);
  } else if (req.body.shippingFee !== undefined && req.body.shippingFee !== null) {
    const fee = Number(req.body.shippingFee) || 0;
    updateFields.shippingFee = fee;
    updateFields.total = (existingOrder.subtotal || 0) - (existingOrder.discount || 0) + fee + (existingOrder.tax || 0);
  }
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

module.exports = {
  placeOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  listAllOrders,
  updateOrderStatus,
};
