const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const AdminSetting = require("../models/AdminSetting");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");

// POST /api/orders — checkout from the current cart
const placeOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod, couponCode } = req.body;

  const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
  if (!cart || cart.items.length === 0) throw new ApiError(400, "Your cart is empty");

  const settings = await AdminSetting.getSingleton();

  const items = [];
  let subtotal = 0;

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
      name: product.name,
      image: product.thumbnail?.url || product.images?.[0]?.url,
      price: product.price,
      quantity: cartItem.quantity,
      size: cartItem.size,
      color: cartItem.color,
    });
  }

  // Coupon validation is intentionally minimal here — a full Coupon model
  // is a natural next addition; this keeps the checkout flow functional now.
  const discount = 0;
  const shippingFee = subtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee;
  const tax = 0;
  const total = subtotal - discount + shippingFee + tax;

  const order = await Order.create({
    user: req.user._id,
    items,
    shippingAddress,
    subtotal,
    discount,
    shippingFee,
    tax,
    total,
    couponCode,
    paymentMethod: paymentMethod || "cod",
  });

  // Decrement stock and clear the cart now that the order is placed.
  await Promise.all(
    items.map((i) => Product.findByIdAndUpdate(i.product, { $inc: { stock: -i.quantity } }))
  );
  cart.items = [];
  await cart.save();

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
  const order = await Order.findById(req.params.id).populate("items.product", "name images");
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
  const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!order) throw new ApiError(404, "Order not found");
  sendResponse(res, 200, "Order status updated", order);
});

module.exports = { placeOrder, getMyOrders, getOrder, listAllOrders, updateOrderStatus };
