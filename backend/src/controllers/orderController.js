const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const AdminSetting = require("../models/AdminSetting");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");
const { generateOrderId } = require("../utils/generateOrderId");

// POST /api/orders — checkout from the current DB cart OR from a direct item list sent by the frontend
const placeOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod, couponCode, items: directItems, needsDelivery = true } = req.body;

  const settings = await AdminSetting.getSingleton();

  let items = [];
  let subtotal = 0;

  if (directItems && Array.isArray(directItems) && directItems.length > 0) {
    // ── Direct checkout: frontend sends its own cart snapshot ──────────────
    for (const item of directItems) {
      const lineTotal = Number(item.price) * Number(item.quantity);
      subtotal += lineTotal;
      items.push({
        name:     item.name,
        image:    item.image || "",
        price:    Number(item.price),
        quantity: Number(item.quantity),
        size:     item.size || "",
        color:    item.color || "",
      });
    }
  } else {
    // ── DB cart checkout: reads the server-side cart document ──────────────
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
    if (!cart || cart.items.length === 0) throw new ApiError(400, "Your cart is empty");

    for (const cartItem of cart.items) {
      const product = cartItem.product;
      if (!product || product.status !== "active") {
        throw new ApiError(400, `${product?.name || "An item"} is no longer available`);
      }
      if (product.stock < cartItem.quantity) {
        throw new ApiError(400, `Not enough stock for ${product.name}`);
      }
      const lineTotal = product.price * cartItem.quantity;
      subtotal += lineTotal;
      items.push({
        product: product._id,
        name:    product.name,
        image:   product.thumbnail?.url || product.images?.[0]?.url,
        price:   product.price,
        quantity: cartItem.quantity,
        size:    cartItem.size,
        color:   cartItem.color,
      });
    }

    // Decrement stock and clear DB cart on successful DB-cart checkout
    await Promise.all(
      items.map((i) => i.product && Product.findByIdAndUpdate(i.product, { $inc: { stock: -i.quantity } }))
    );
    cart.items = [];
    await cart.save();
  }

  const isDeliveryRequested = Boolean(needsDelivery);
  const city = (shippingAddress?.city || "").trim().toLowerCase();
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
        shippingAddress: isDeliveryRequested ? shippingAddress : {},
        subtotal,
        discount,
        shippingFee,
        tax: 0,
        total,
        couponCode,
        paymentMethod: paymentMethod || "cod",
        estimatedDeliveryDate,
        deliveryDateReviewed,
      });
      break;
    } catch (err) {
      if (err.code !== 11000 || attempt === 4) throw err;
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
  // Support lookup by MongoDB _id OR the customer-facing orderId (SHOP-XXX or old 15-digit format)
  const isPublicId = id.startsWith("SHOP-") || (id.length === 15 && /^\d+$/.test(id));
  const order = await Order.findOne(
    isPublicId ? { orderId: id } : { _id: id }
  )
    .populate("items.product", "name images thumbnail price category")
    .populate("user", "name email phone role");
  if (!order) throw new ApiError(404, "Order not found");

  const userId = order.user?._id ? order.user._id.toString() : order.user?.toString();
  const isOwner = Boolean(req.user && userId === req.user._id.toString());
  if (!isOwner && req.user?.role !== "admin") throw new ApiError(403, "Not authorized to view this order");

  sendResponse(res, 200, "Order fetched", order);
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

const { handleShoppingOrderNotifications } = require("../utils/orderNotifications");

// PATCH /api/orders/:id/status (admin)
const updateOrderStatus = asyncHandler(async (req, res) => {
  const existingOrder = await Order.findById(req.params.id);
  if (!existingOrder) throw new ApiError(404, "Order not found");

  const updateFields = {};
  if (req.body.status) updateFields.status = req.body.status;
  if (req.body.estimatedDeliveryDate) {
    updateFields.estimatedDeliveryDate = new Date(req.body.estimatedDeliveryDate);
    updateFields.deliveryDateReviewed = true;
  }
  if (req.body.shippingFee !== undefined && req.body.shippingFee !== null) {
    const fee = Number(req.body.shippingFee) || 0;
    updateFields.shippingFee = fee;
    updateFields.total = (existingOrder.subtotal || 0) - (existingOrder.discount || 0) + fee + (existingOrder.tax || 0);
  }
  if (req.body.isLongDistance !== undefined) {
    updateFields.isLongDistance = Boolean(req.body.isLongDistance);
  }

  const updatedOrder = await Order.findByIdAndUpdate(req.params.id, updateFields, { new: true });
  
  // Trigger order notifications for confirmed/updated delivery price, delivery date, status
  try {
    await handleShoppingOrderNotifications(existingOrder, updatedOrder);
  } catch (err) {
    console.error("Error sending shopping order notifications:", err);
  }

  sendResponse(res, 200, "Order updated successfully", updatedOrder);
});

module.exports = { placeOrder, getMyOrders, getOrder, listAllOrders, updateOrderStatus };
