const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");
const { slugify } = require("./categoryController");

// GET /api/products
// Supports: search (q — matches product name or category name), category,
// minPrice/maxPrice, minDiscount, minRating, bestseller, newArrival, sort, page, limit
const listProducts = asyncHandler(async (req, res) => {
  const { q, category, minPrice, maxPrice, minRating, bestseller, newArrival, sort } = req.query;
  const filter = { status: "active" };

  if (q) {
    const matchingCategories = await Category.find({ name: { $regex: q, $options: "i" } }, "_id");
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { category: { $in: matchingCategories.map((c) => c._id) } },
    ];
  }
  if (category) filter.category = category;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (minRating) filter.ratingAverage = { $gte: Number(minRating) };
  if (bestseller === "true") filter.isBestseller = true;
  if (newArrival === "true") filter.isNewArrival = true;

  const sortMap = {
    "price-asc": { price: 1 },
    "price-desc": { price: -1 },
    rating: { ratingAverage: -1 },
    newest: { createdAt: -1 },
    popularity: { ratingCount: -1 },
  };
  const sortBy = sortMap[sort] || { createdAt: -1 };

  const { page, limit, skip } = getPagination(req.query);

  const [items, total] = await Promise.all([
    Product.find(filter).populate("category", "name slug").sort(sortBy).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Products fetched", items, buildPaginationMeta(page, limit, total));
});

// GET /api/products/:idOrSlug
const getProduct = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const query = idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? { _id: idOrSlug } : { slug: idOrSlug };
  const product = await Product.findOne(query).populate("category", "name slug");
  if (!product) throw new ApiError(404, "Product not found");
  sendResponse(res, 200, "Product fetched", product);
});

// GET /api/products/:id/related
const getRelatedProducts = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found");

  const related = await Product.find({
    _id: { $ne: product._id },
    category: product.category,
    status: "active",
  })
    .limit(8)
    .sort({ ratingAverage: -1 });

  sendResponse(res, 200, "Related products fetched", related);
});

// POST /api/products (admin)
const createProduct = asyncHandler(async (req, res) => {
  const slug = req.body.slug ? slugify(req.body.slug) : slugify(`${req.body.name}-${Date.now()}`);
  const product = await Product.create({ ...req.body, slug, createdBy: req.user._id });
  sendResponse(res, 201, "Product created", product);
});

// PATCH /api/products/:id (admin)
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) throw new ApiError(404, "Product not found");
  sendResponse(res, 200, "Product updated", product);
});

// DELETE /api/products/:id (admin)
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new ApiError(404, "Product not found");
  sendResponse(res, 200, "Product deleted");
});

module.exports = {
  listProducts,
  getProduct,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
