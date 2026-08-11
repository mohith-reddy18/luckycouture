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
  const { shippingAddress, paymentMethod, couponCode, items: directItems } = req.body;

  const settings = await AdminSetting.getSingleton();

  let items = [];
  let subtotal = 0;

  if (directItems && Array.isArray(directItems) && directItems.length > 0) {
    // ── Direct checkout: frontend sends its own cart snapshot ──────────────
    // Used when shop products are not yet in the backend Product DB.
    // We trust the price snapshot sent by the client (production would re-validate).
    for (const item of directItems) {
      const lineTotal = Number(item.price) * Number(item.quantity);
      subtotal += lineTotal;
      items.push({
        // `product` is optional here — we store a null-ish ref since we have no real ObjectId
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

  const discount   = 0;
  const shippingFee = subtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee;
  const tax    = 0;
  const total  = subtotal - discount + shippingFee + tax;

  // Guntur 24hr / 11 AM delivery cutoff logic
  const city = (shippingAddress?.city || "").trim().toLowerCase();
  const isGuntur = city === "guntur";
  const now = new Date();
  let estimatedDeliveryDate = null;
  let deliveryDateReviewed = false;

  if (isGuntur) {
    deliveryDateReviewed = true;
    estimatedDeliveryDate = new Date();
    if (now.getHours() < 11) {
      estimatedDeliveryDate.setHours(20, 0, 0, 0); // Today by 8 PM
    } else {
      estimatedDeliveryDate.setDate(now.getDate() + 1);
      estimatedDeliveryDate.setHours(20, 0, 0, 0); // Tomorrow by 8 PM
    }
  } else {
    deliveryDateReviewed = false;
  }

  // Generate a cryptographically-secure 15-digit orderId.
  // Retry up to 5 times on the rare chance of a collision.
  let order;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      order = await Order.create({
        orderId: generateOrderId("SHOP-"),
        user:    req.user._id,
        items,
        shippingAddress,
        subtotal,
        discount,
        shippingFee,
        tax,
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
  ).populate("items.product", "name images");
  if (!order) throw new ApiError(404, "Order not found");

  const isOwner = order.user.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") throw new ApiError(403, "Not authorized to view this order");

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

// PATCH /api/orders/:id/status (admin)
const updateOrderStatus = asyncHandler(async (req, res) => {
  const updateFields = {};
  if (req.body.status) updateFields.status = req.body.status;
  if (req.body.estimatedDeliveryDate) {
    updateFields.estimatedDeliveryDate = new Date(req.body.estimatedDeliveryDate);
    updateFields.deliveryDateReviewed = true;
  }

  const order = await Order.findByIdAndUpdate(req.params.id, updateFields, { new: true });
  if (!order) throw new ApiError(404, "Order not found");
  sendResponse(res, 200, "Order status updated", order);
});

module.exports = { placeOrder, getMyOrders, getOrder, listAllOrders, updateOrderStatus };
