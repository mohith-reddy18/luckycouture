const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const Category = require("../models/Category");
const slugify = require("../utils/slugify");

// GET /api/categories
const listCategories = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.type) filter.type = { $in: [req.query.type, "both"] };
  const categories = await Category.find(filter).sort({ sortOrder: 1, name: 1 });
  sendResponse(res, 200, "Categories fetched", categories);
});

// POST /api/categories (admin)
const createCategory = asyncHandler(async (req, res) => {
  const slug = req.body.slug ? slugify(req.body.slug) : slugify(req.body.name);
  const category = await Category.create({ ...req.body, slug });
  sendResponse(res, 201, "Category created", category);
});

// PATCH /api/categories/:id (admin)
const updateCategory = asyncHandler(async (req, res) => {
  const update = { ...req.body };
  if (update.name && !update.slug) update.slug = slugify(update.name);
  const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!category) throw new ApiError(404, "Category not found");
  sendResponse(res, 200, "Category updated", category);
});

// DELETE /api/categories/:id (admin)
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");
  sendResponse(res, 200, "Category deleted");
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory, slugify };
