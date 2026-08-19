const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");
const slugify = require("../utils/slugify");
const { deleteUploadedFile } = require("../utils/storageService");

// GET /api/products
// Supports: search (q — matches product name or category name), category,
// minPrice/maxPrice, minDiscount, minRating, bestseller, newArrival, sort, page, limit
const listProducts = asyncHandler(async (req, res) => {
  const { q, category, minPrice, maxPrice, minRating, bestseller, newArrival, sort } = req.query;
  const filter = { status: "active" };

  if (q) {
    const matchingCategories = await Category.find({ name: { $regex: q, $options: "i" } }, "_id").lean();
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
    Product.find(filter).populate("category", "name slug").sort(sortBy).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Products fetched", items, buildPaginationMeta(page, limit, total));
});

// GET /api/products/admin-list (admin) — all statuses for CMS panel
const listProductsAdmin = asyncHandler(async (req, res) => {
  const { q, status } = req.query;
  const filter = {};

  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }
  if (status) filter.status = status;

  const { page, limit, skip } = getPagination(req.query);
  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  const normalizedItems = items.map(normalizeProduct);
  sendResponse(res, 200, "Admin products fetched", normalizedItems, buildPaginationMeta(page, limit, total));
});

// GET /api/products/:idOrSlug
const getProduct = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const str = String(idOrSlug).trim();
  const isMongoId = mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str);
  const query = isMongoId
    ? { $or: [{ _id: str }, { slug: str }, { sku: str }] }
    : { $or: [{ slug: str }, { slug: str.toLowerCase() }, { sku: str }] };
  const product = await Product.findOne(query).populate("category", "name slug").lean();
  if (!product) throw new ApiError(404, "Product not found");
  sendResponse(res, 200, "Product fetched", normalizeProduct(product));
});

// GET /api/products/:id/related
const getRelatedProducts = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).select("category").lean();
  if (!product) throw new ApiError(404, "Product not found");

  const related = await Product.find({
    _id: { $ne: product._id },
    category: product.category,
    status: "active",
  })
    .limit(8)
    .sort({ ratingAverage: -1 })
    .lean();

  sendResponse(res, 200, "Related products fetched", related);
});

// POST /api/products (admin)
const createProduct = asyncHandler(async (req, res) => {
  // Deduplication check: if identical product name created by same admin in last 10 seconds, return existing
  if (req.body.name?.trim()) {
    const recentDuplicate = await Product.findOne({
      createdBy: req.user._id,
      name: req.body.name.trim(),
      createdAt: { $gte: new Date(Date.now() - 10000) },
    }).populate("category", "name slug").lean();

    if (recentDuplicate) {
      return sendResponse(res, 200, "Product already saved", recentDuplicate);
    }
  }

  const payload = { ...req.body };
  if (payload.sku === "" || (typeof payload.sku === "string" && !payload.sku.trim())) {
    delete payload.sku;
  } else if (typeof payload.sku === "string") {
    payload.sku = payload.sku.trim();
  }

  const slug = payload.slug ? slugify(payload.slug) : slugify(`${payload.name}-${Date.now()}`);
  const product = await Product.create({ ...payload, slug, createdBy: req.user._id });
  const populated = await Product.findById(product._id).populate("category", "name slug").lean();
  sendResponse(res, 201, "Product created", populated);
});

// PATCH /api/products/:id (admin) — supports image list replacement
const updateProduct = asyncHandler(async (req, res) => {
  const existing = await Product.findById(req.params.id);
  if (!existing) throw new ApiError(404, "Product not found");

  // Clean up orphaned Cloudinary images when the images array changes
  if (req.body.images !== undefined) {
    const newPublicIds = new Set((req.body.images || []).map((img) => img.publicId).filter(Boolean));
    const toDelete = (existing.images || []).filter((img) => img.publicId && !newPublicIds.has(img.publicId));
    await Promise.all(toDelete.map((img) => deleteUploadedFile(img.publicId)));
  }

  if (req.body.thumbnail !== undefined) {
    const newThumbId = req.body.thumbnail?.publicId;
    const oldThumbId = existing.thumbnail?.publicId;
    if (oldThumbId && oldThumbId !== newThumbId) {
      const stillUsed = (req.body.images || existing.images || []).some((img) => img.publicId === oldThumbId);
      if (!stillUsed) await deleteUploadedFile(oldThumbId);
    }
  }

  const payload = { ...req.body };
  let updateOp = { $set: payload };
  if (payload.sku === "" || (typeof payload.sku === "string" && !payload.sku.trim())) {
    delete payload.sku;
    updateOp = { $set: payload, $unset: { sku: 1 } };
  } else if (typeof payload.sku === "string") {
    payload.sku = payload.sku.trim();
  }

  const product = await Product.findByIdAndUpdate(req.params.id, updateOp, { new: true, runValidators: true }).populate("category", "name slug");
  sendResponse(res, 200, "Product updated", product);
});

// DELETE /api/products/:id (admin) — also removes images from Cloudinary
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found");

  // Delete all associated Cloudinary images
  const allPublicIds = [
    ...(product.images || []).map((img) => img.publicId).filter(Boolean),
    product.thumbnail?.publicId,
  ].filter(Boolean);

  const unique = [...new Set(allPublicIds)];
  await Promise.all(unique.map((id) => deleteUploadedFile(id)));

  await product.deleteOne();
  sendResponse(res, 200, "Product deleted");
});

module.exports = {
  listProducts,
  listProductsAdmin,
  getProduct,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
