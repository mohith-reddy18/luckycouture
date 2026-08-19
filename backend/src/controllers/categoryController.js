const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const Category = require("../models/Category");
const slugify = require("../utils/slugify");

let categoryCache = {};
let cacheExpiry = 0;

const clearCategoryCache = () => {
  categoryCache = {};
  cacheExpiry = 0;
};

const DEFAULT_CATEGORIES = [
  // 10 Design Gallery Categories
  { name: "Bridal", slug: "bridal", type: "design", sortOrder: 1 },
  { name: "Party Wear", slug: "party-wear", type: "design", sortOrder: 2 },
  { name: "Casual", slug: "casual", type: "design", sortOrder: 3 },
  { name: "Traditional", slug: "traditional", type: "design", sortOrder: 4 },
  { name: "Embroidery", slug: "embroidery", type: "design", sortOrder: 5 },
  { name: "Maggam Work", slug: "maggam-work", type: "design", sortOrder: 6 },
  { name: "Hand Work", slug: "hand-work", type: "design", sortOrder: 7 },
  { name: "Designer", slug: "designer", type: "design", sortOrder: 8 },
  { name: "Festive", slug: "festive", type: "design", sortOrder: 9 },
  { name: "Other", slug: "other", type: "design", sortOrder: 10 },

  // Shop Categories
  { name: "Wedding", slug: "wedding", type: "both", sortOrder: 11 },
  { name: "Sarees", slug: "sarees", type: "shop", sortOrder: 12 },
  { name: "Dresses", slug: "dresses", type: "shop", sortOrder: 13 },
  { name: "Nighties", slug: "nighties", type: "shop", sortOrder: 14 },
  { name: "Blouses", slug: "blouses", type: "shop", sortOrder: 15 },
];

async function ensureDefaultCategories() {
  for (const cat of DEFAULT_CATEGORIES) {
    const exists = await Category.findOne({ slug: cat.slug });
    if (!exists) {
      await Category.create(cat).catch(() => {});
    }
  }
}

// GET /api/categories
const listCategories = asyncHandler(async (req, res) => {
  const typeKey = req.query.type || "all";
  const now = Date.now();

  if (categoryCache[typeKey] && cacheExpiry > now) {
    return sendResponse(res, 200, "Categories fetched", categoryCache[typeKey]);
  }

  await ensureDefaultCategories();

  const filter = { isActive: true };
  if (req.query.type) filter.type = { $in: [req.query.type, "both"] };
  const categories = await Category.find(filter).sort({ sortOrder: 1, name: 1 }).lean();

  categoryCache[typeKey] = categories;
  cacheExpiry = now + 60000; // Cache for 60 seconds

  sendResponse(res, 200, "Categories fetched", categories);
});

// POST /api/categories (admin)
const createCategory = asyncHandler(async (req, res) => {
  const slug = req.body.slug ? slugify(req.body.slug) : slugify(req.body.name);
  const category = await Category.create({ ...req.body, slug });
  clearCategoryCache();
  sendResponse(res, 201, "Category created", category);
});

// PATCH /api/categories/:id (admin)
const updateCategory = asyncHandler(async (req, res) => {
  const update = { ...req.body };
  if (update.name && !update.slug) update.slug = slugify(update.name);
  const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!category) throw new ApiError(404, "Category not found");
  clearCategoryCache();
  sendResponse(res, 200, "Category updated", category);
});

// DELETE /api/categories/:id (admin)
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");
  clearCategoryCache();
  sendResponse(res, 200, "Category deleted");
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory, slugify, ensureDefaultCategories };
