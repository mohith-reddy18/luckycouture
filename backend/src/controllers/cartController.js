const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// GET /api/cart
const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
  if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });
  sendResponse(res, 200, "Cart fetched", cart);
});

// POST /api/cart
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, size, color } = req.body;

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, "Product not found");
  if (product.stock < quantity) throw new ApiError(400, "Not enough stock available");

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = new Cart({ user: req.user._id, items: [] });

  const existing = cart.items.find(
    (i) => i.product.toString() === productId && i.size === size && i.color === color
  );
  if (existing) existing.quantity += quantity;
  else cart.items.push({ product: productId, quantity, size, color, priceAtAdd: product.price });

  await cart.save();
  await cart.populate("items.product");
  sendResponse(res, 200, "Item added to cart", cart);
});

// PATCH /api/cart/:itemId
const updateCartItem = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new ApiError(404, "Cart not found");

  const item = cart.items.id(req.params.itemId);
  if (!item) throw new ApiError(404, "Cart item not found");

  if (req.body.quantity !== undefined) item.quantity = Math.max(1, req.body.quantity);
  await cart.save();
  await cart.populate("items.product");
  sendResponse(res, 200, "Cart item updated", cart);
});

// DELETE /api/cart/:itemId
const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new ApiError(404, "Cart not found");

  cart.items = cart.items.filter((i) => i._id.toString() !== req.params.itemId);
  await cart.save();
  await cart.populate("items.product");
  sendResponse(res, 200, "Item removed from cart", cart);
});

// DELETE /api/cart
const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] }, { new: true });
  sendResponse(res, 200, "Cart cleared", cart);
});

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart };
