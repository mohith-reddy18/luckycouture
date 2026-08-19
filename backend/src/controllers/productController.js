const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");
const slugify = require("../utils/slugify");
const { deleteUploadedFile } = require("../utils/storageService");

const DEFAULT_PRODUCT_IMAGES = {
  wedding: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80",
  sarees: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80",
  dresses: "https://images.unsplash.com/photo-1596783074418-47953288d926?w=800&auto=format&fit=crop&q=80",
  nighties: "https://images.unsplash.com/photo-1518049362265-d5b2a6467637?w=800&auto=format&fit=crop&q=80",
  men: "https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=800&auto=format&fit=crop&q=80",
  kids: "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=800&auto=format&fit=crop&q=80",
  default: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80",
};

function normalizeProduct(p) {
  if (!p) return p;
  const hasThumb = p.thumbnail?.url && String(p.thumbnail.url).trim();
  const hasImg = p.images?.length > 0 && p.images[0]?.url && String(p.images[0].url).trim();
  if (!hasThumb && !hasImg) {
    const catSlug = (p.category?.slug || (typeof p.category === "string" ? p.category : "") || "").toLowerCase();
    const fallbackUrl = DEFAULT_PRODUCT_IMAGES[catSlug] || DEFAULT_PRODUCT_IMAGES.default;
    return {
      ...p,
      thumbnail: { url: fallbackUrl },
      images: [{ url: fallbackUrl }],
    };
  }
  return p;
}

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

  const normalizedItems = items.map(normalizeProduct);
  sendResponse(res, 200, "Products fetched", normalizedItems, buildPaginationMeta(page, limit, total));
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

  const slug = req.body.slug ? slugify(req.body.slug) : slugify(`${req.body.name}-${Date.now()}`);
  const product = await Product.create({ ...req.body, slug, createdBy: req.user._id });
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

  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate("category", "name slug");
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
