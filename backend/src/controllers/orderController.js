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
    // ── Direct checkout: validate every item against DB inventory ──────────────
    for (const item of directItems) {
      const prodId = item.product || item._id || item.id;
      let dbProduct = null;
      if (prodId && /^[0-9a-fA-F]{24}$/.test(String(prodId))) {
        dbProduct = await Product.findById(prodId);
      } else if (item.name) {
        dbProduct = await Product.findOne({ name: item.name });
      }

      if (dbProduct) {
        if (dbProduct.status !== "active") {
          throw new ApiError(400, `${dbProduct.name} is no longer available`);
        }

        if (Array.isArray(dbProduct.colorVariants) && dbProduct.colorVariants.length > 0 && item.color) {
          const cv = dbProduct.colorVariants.find((v) => v.color?.toLowerCase() === item.color?.toLowerCase());
          if (cv && Array.isArray(cv.inventory) && cv.inventory.length > 0 && item.size) {
            const inv = cv.inventory.find((i) => i.size?.toLowerCase() === item.size?.toLowerCase());
            if (!inv || Number(inv.quantity) <= 0) {
              throw new ApiError(400, `Size "${item.size}" in "${item.color}" for "${dbProduct.name}" is currently out of stock`);
            }
            if (Number(inv.quantity) < Number(item.quantity)) {
              throw new ApiError(400, `Only ${inv.quantity} units available for ${dbProduct.name} (${item.color}, ${item.size})`);
            }
            // Decrement variant stock
            inv.quantity = Math.max(0, Number(inv.quantity) - Number(item.quantity));
          }
        }

        if (dbProduct.stock < Number(item.quantity)) {
          throw new ApiError(400, `Not enough stock for ${dbProduct.name}`);
        }
        dbProduct.stock = Math.max(0, dbProduct.stock - Number(item.quantity));
        await dbProduct.save();
      }

      const lineTotal = Number(item.price) * Number(item.quantity);
      subtotal += lineTotal;
      items.push({
        product:  dbProduct ? dbProduct._id : (prodId || undefined),
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

      if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0 && cartItem.color) {
        const cv = product.colorVariants.find((v) => v.color?.toLowerCase() === cartItem.color?.toLowerCase());
        if (cv && Array.isArray(cv.inventory) && cv.inventory.length > 0 && cartItem.size) {
          const inv = cv.inventory.find((i) => i.size?.toLowerCase() === cartItem.size?.toLowerCase());
          if (!inv || Number(inv.quantity) <= 0) {
            throw new ApiError(400, `Size "${cartItem.size}" in "${cartItem.color}" for "${product.name}" is currently out of stock`);
          }
          if (Number(inv.quantity) < Number(cartItem.quantity)) {
            throw new ApiError(400, `Only ${inv.quantity} units available for ${product.name} (${cartItem.color}, ${cartItem.size})`);
          }
          // Decrement variant stock
          inv.quantity = Math.max(0, Number(inv.quantity) - Number(cartItem.quantity));
        }
      }

      if (product.stock < cartItem.quantity) {
        throw new ApiError(400, `Not enough stock for ${product.name}`);
      }
      product.stock = Math.max(0, product.stock - Number(cartItem.quantity));
      await product.save();

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
  if (req.body.status) updateFields.status = req.body.status;
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

module.exports = { placeOrder, getMyOrders, getOrder, listAllOrders, updateOrderStatus };
