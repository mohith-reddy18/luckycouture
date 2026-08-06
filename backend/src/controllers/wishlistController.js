const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/ApiResponse");
const Wishlist = require("../models/Wishlist");
const Design = require("../models/Design");

// GET /api/wishlist
const getWishlist = asyncHandler(async (req, res) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id }).populate("products").populate("designs");
  if (!wishlist) wishlist = await Wishlist.create({ user: req.user._id, products: [], designs: [] });
  sendResponse(res, 200, "Wishlist fetched", wishlist);
});

// POST /api/wishlist/products/:productId
const toggleProductWishlist = asyncHandler(async (req, res) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) wishlist = new Wishlist({ user: req.user._id, products: [], designs: [] });

  const { productId } = req.params;
  const exists = wishlist.products.some((p) => p.toString() === productId);
  wishlist.products = exists
    ? wishlist.products.filter((p) => p.toString() !== productId)
    : [...wishlist.products, productId];

  await wishlist.save();
  sendResponse(res, 200, exists ? "Removed from wishlist" : "Added to wishlist", wishlist);
});

// POST /api/wishlist/designs/:designId
const toggleDesignWishlist = asyncHandler(async (req, res) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) wishlist = new Wishlist({ user: req.user._id, products: [], designs: [] });

  const { designId } = req.params;
  const exists = wishlist.designs.some((d) => d.toString() === designId);

  if (exists) {
    wishlist.designs = wishlist.designs.filter((d) => d.toString() !== designId);
    await Design.findByIdAndUpdate(designId, { $inc: { wishlistCount: -1 } });
  } else {
    wishlist.designs.push(designId);
    await Design.findByIdAndUpdate(designId, { $inc: { wishlistCount: 1 } });
  }

  await wishlist.save();
  sendResponse(res, 200, exists ? "Removed from wishlist" : "Added to wishlist", wishlist);
});

module.exports = { getWishlist, toggleProductWishlist, toggleDesignWishlist };
