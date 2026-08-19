const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const Design = require("../models/Design");
const Category = require("../models/Category");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");
const slugify = require("../utils/slugify");
const { deleteUploadedFile } = require("../utils/storageService");

const CATEGORY_LABEL_MAP = {
  bridal: "Bridal",
  party_wear: "Party Wear",
  casual: "Casual",
  traditional: "Traditional",
  embroidery: "Embroidery",
  maggam_work: "Maggam Work",
  hand_work: "Hand Work",
  designer: "Designer",
  festive: "Festive",
  other: "Other",
};

/**
 * Resolves a category input (can be an ObjectId string, a predefined key like "party_wear",
 * or a category name) into a valid Category document ObjectId.
 */
async function resolveCategory(catInput) {
  if (!catInput) return null;
  const str = String(catInput).trim();

  // If already a valid Mongo ObjectId, verify existence
  if (mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str)) {
    const existing = await Category.findById(str);
    if (existing) return existing._id;
  }

  const cleanKey = str.toLowerCase();
  const label = CATEGORY_LABEL_MAP[cleanKey] || str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const slug = slugify(label);

  let doc = await Category.findOne({
    $or: [
      { slug: cleanKey.replace(/_/g, "-") },
      { slug: slug },
      { name: new RegExp(`^${label}$`, "i") },
    ],
  });

  if (!doc) {
    doc = await Category.create({
      name: label,
      slug: slug,
      type: "design",
      isActive: true,
    });
  }

  return doc._id;
}

// GET /api/designs
// Supports: search (q — matches design title or category name), category,
// occasion, difficultyLevel, sort
const listDesigns = asyncHandler(async (req, res) => {
  const { q, category, occasion, difficultyLevel, sort } = req.query;
  const filter = { status: "active" };

  if (q) {
    const matchingCategories = await Category.find({ name: { $regex: q, $options: "i" } }, "_id").lean();
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { category: { $in: matchingCategories.map((c) => c._id) } },
    ];
  }
  if (category) {
    if (mongoose.Types.ObjectId.isValid(category) && /^[0-9a-fA-F]{24}$/.test(category)) {
      filter.category = category;
    } else {
      const catDoc = await Category.findOne({
        $or: [
          { slug: category.toLowerCase().replace(/_/g, "-") },
          { name: new RegExp(`^${category.replace(/_/g, " ")}$`, "i") },
        ],
      });
      if (catDoc) filter.category = catDoc._id;
    }
  }
  if (occasion) filter.occasion = occasion;
  if (difficultyLevel) filter.difficultyLevel = difficultyLevel;

  const sortMap = {
    newest: { createdAt: -1 },
    popularity: { viewCount: -1 },
    trending: { wishlistCount: -1 },
  };
  const sortBy = sortMap[sort] || { sortOrder: 1, createdAt: -1 };

  const { page, limit, skip } = getPagination(req.query);
  const [items, total] = await Promise.all([
    Design.find(filter).populate("category", "name slug").sort(sortBy).skip(skip).limit(limit).lean(),
    Design.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Designs fetched", items, buildPaginationMeta(page, limit, total));
});

// GET /api/designs/admin-list (admin) — all statuses, all sources, for CMS panel
const listDesignsAdmin = asyncHandler(async (req, res) => {
  const { q, status, source } = req.query;
  const filter = {};

  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }
  if (status) filter.status = status;
  if (source) filter.source = source;

  const { page, limit, skip } = getPagination(req.query);
  const [items, total] = await Promise.all([
    Design.find(filter)
      .populate("category", "name slug")
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Design.countDocuments(filter),
  ]);

  const normalizedItems = items.map(normalizeDesign);
  sendResponse(res, 200, "Admin designs fetched", normalizedItems, buildPaginationMeta(page, limit, total));
});

// GET /api/designs/:idOrSlug
const getDesign = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const str = String(idOrSlug).trim();
  const isMongoId = mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str);
  const query = isMongoId
    ? { $or: [{ _id: str }, { slug: str }] }
    : { $or: [{ slug: str }, { slug: str.toLowerCase() }] };
  const design = await Design.findOneAndUpdate(query, { $inc: { viewCount: 1 } }, { new: true })
    .populate("category", "name slug")
    .lean();
  if (!design) throw new ApiError(404, "Design not found");
  sendResponse(res, 200, "Design fetched", normalizeDesign(design));
});

// GET /api/designs/:id/related
const getRelatedDesigns = asyncHandler(async (req, res) => {
  const design = await Design.findById(req.params.id).select("category").lean();
  if (!design) throw new ApiError(404, "Design not found");

  const related = await Design.find({ _id: { $ne: design._id }, category: design.category, status: "active" })
    .limit(8)
    .sort({ viewCount: -1 })
    .lean();

  sendResponse(res, 200, "Related designs fetched", related);
});

// POST /api/designs (admin) — official gallery design, published immediately
const createDesign = asyncHandler(async (req, res) => {
  // Deduplication check: if identical title created by same admin in last 10 seconds, return existing
  if (req.body.title?.trim()) {
    const recentDuplicate = await Design.findOne({
      createdBy: req.user._id,
      title: req.body.title.trim(),
      createdAt: { $gte: new Date(Date.now() - 10000) },
    }).populate("category", "name slug").lean();

    if (recentDuplicate) {
      return sendResponse(res, 200, "Design already saved", recentDuplicate);
    }
  }

  const slug = req.body.slug ? slugify(req.body.slug) : slugify(`${req.body.title}-${Date.now()}`);
  let categoryId = req.body.category;
  if (categoryId) {
    categoryId = await resolveCategory(categoryId);
  }
  const design = await Design.create({
    ...req.body,
    category: categoryId,
    slug,
    createdBy: req.user._id,
    source: "admin",
    status: req.body.status || "active",
  });
  const populated = await Design.findById(design._id).populate("category", "name slug").lean();
  sendResponse(res, 201, "Design created", populated);
});

// POST /api/designs/submit (customer) — "designs I like", held for admin review
const submitCustomerDesign = asyncHandler(async (req, res) => {
  const { title, category, description, images, occasion, fabricRecommendation, tags } = req.body;
  if (!images || images.length === 0) {
    throw new ApiError(400, "At least one image is required to submit a design");
  }

  let categoryId = category;
  if (categoryId) {
    categoryId = await resolveCategory(categoryId);
  }

  const slug = slugify(`${title || "customer-design"}-${Date.now()}`);
  const design = await Design.create({
    title: title || "Customer submission",
    slug,
    category: categoryId,
    description,
    images,
    thumbnail: images[0],
    occasion,
    fabricRecommendation,
    tags,
    source: "customer",
    submittedBy: req.user._id,
    status: "pending_review",
  });

  sendResponse(res, 201, "Thanks! Your design was submitted for review.", design);
});

// GET /api/designs/my-submissions (customer)
const getMySubmissions = asyncHandler(async (req, res) => {
  const designs = await Design.find({ submittedBy: req.user._id }).populate("category", "name slug").sort({ createdAt: -1 });
  sendResponse(res, 200, "Your submitted designs fetched", designs);
});

// DELETE /api/designs/my-submissions/:id (customer)
const deleteMySubmission = asyncHandler(async (req, res) => {
  const design = await Design.findOne({ _id: req.params.id, submittedBy: req.user._id });
  if (!design) throw new ApiError(404, "Submission not found");
  if (design.status === "active") {
    throw new ApiError(400, "This design has already been approved and published — contact support to remove it");
  }
  await design.deleteOne();
  sendResponse(res, 200, "Submission withdrawn");
});

// GET /api/designs/moderation-queue (admin)
const getModerationQueue = asyncHandler(async (req, res) => {
  const designs = await Design.find({ source: "customer", status: "pending_review" })
    .populate("category", "name slug")
    .populate("submittedBy", "name email")
    .sort({ createdAt: 1 });
  sendResponse(res, 200, "Moderation queue fetched", designs);
});

// PATCH /api/designs/:id/moderate (admin)
const moderateDesign = asyncHandler(async (req, res) => {
  const { action, note } = req.body;
  if (!["approve", "reject"].includes(action)) {
    throw new ApiError(400, "action must be 'approve' or 'reject'");
  }

  const design = await Design.findById(req.params.id);
  if (!design) throw new ApiError(404, "Design not found");
  if (design.source !== "customer") throw new ApiError(400, "Only customer submissions go through moderation");

  design.status = action === "approve" ? "active" : "rejected";
  design.moderationNote = note;
  await design.save();

  sendResponse(res, 200, `Design ${action === "approve" ? "approved and published" : "rejected"}`, design);
});

// PATCH /api/designs/:id (admin) — supports image list replacement and category resolution
const updateDesign = asyncHandler(async (req, res) => {
  const existing = await Design.findById(req.params.id);
  if (!existing) throw new ApiError(404, "Design not found");

  const updateData = { ...req.body };
  if (updateData.category) {
    updateData.category = await resolveCategory(updateData.category);
  }

  // If the caller sends a new images array and old images are being removed,
  // clean up orphaned Cloudinary assets.
  if (req.body.images !== undefined) {
    const newPublicIds = new Set((req.body.images || []).map((img) => img.publicId).filter(Boolean));
    const toDelete = (existing.images || []).filter((img) => img.publicId && !newPublicIds.has(img.publicId));
    await Promise.all(toDelete.map((img) => deleteUploadedFile(img.publicId)));
  }

  // Handle thumbnail replacement
  if (req.body.thumbnail !== undefined) {
    const newThumbId = req.body.thumbnail?.publicId;
    const oldThumbId = existing.thumbnail?.publicId;
    if (oldThumbId && oldThumbId !== newThumbId) {
      const stillUsed = (req.body.images || existing.images || []).some((img) => img.publicId === oldThumbId);
      if (!stillUsed) await deleteUploadedFile(oldThumbId);
    }
  }

  const design = await Design.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).populate("category", "name slug");
  sendResponse(res, 200, "Design updated", design);
});

// DELETE /api/designs/:id (admin)
const deleteDesign = asyncHandler(async (req, res) => {
  const design = await Design.findById(req.params.id);
  if (!design) throw new ApiError(404, "Design not found");

  const allPublicIds = [
    ...(design.images || []).map((img) => img.publicId).filter(Boolean),
    design.thumbnail?.publicId,
  ].filter(Boolean);

  const unique = [...new Set(allPublicIds)];
  await Promise.all(unique.map((id) => deleteUploadedFile(id)));

  await design.deleteOne();
  sendResponse(res, 200, "Design deleted");
});

module.exports = {
  listDesigns,
  listDesignsAdmin,
  getDesign,
  getRelatedDesigns,
  createDesign,
  updateDesign,
  deleteDesign,
  submitCustomerDesign,
  getMySubmissions,
  deleteMySubmission,
  getModerationQueue,
  moderateDesign,
  resolveCategory,
};
