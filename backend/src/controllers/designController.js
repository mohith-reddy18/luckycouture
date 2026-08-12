const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const Design = require("../models/Design");
const Category = require("../models/Category");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");
const slugify = require("../utils/slugify");

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
  if (category) filter.category = category;
  if (occasion) filter.occasion = occasion;
  if (difficultyLevel) filter.difficultyLevel = difficultyLevel;

  const sortMap = {
    newest: { createdAt: -1 },
    popularity: { viewCount: -1 },
    trending: { wishlistCount: -1 },
  };
  const sortBy = sortMap[sort] || { createdAt: -1 };

  const { page, limit, skip } = getPagination(req.query);
  const [items, total] = await Promise.all([
    Design.find(filter).populate("category", "name slug").sort(sortBy).skip(skip).limit(limit).lean(),
    Design.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Designs fetched", items, buildPaginationMeta(page, limit, total));
});

// GET /api/designs/:idOrSlug
const getDesign = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const query = idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? { _id: idOrSlug } : { slug: idOrSlug };
  const design = await Design.findOneAndUpdate(query, { $inc: { viewCount: 1 } }, { new: true })
    .populate("category", "name slug")
    .lean();
  if (!design) throw new ApiError(404, "Design not found");
  sendResponse(res, 200, "Design fetched", design);
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
  const slug = req.body.slug ? slugify(req.body.slug) : slugify(`${req.body.title}-${Date.now()}`);
  const design = await Design.create({ ...req.body, slug, createdBy: req.user._id, source: "admin", status: "active" });
  sendResponse(res, 201, "Design created", design);
});

// POST /api/designs/submit (customer) — "designs I like", held for admin review
// before it appears in the public gallery.
const submitCustomerDesign = asyncHandler(async (req, res) => {
  const { title, category, description, images, occasion, fabricRecommendation, tags } = req.body;
  if (!images || images.length === 0) {
    throw new ApiError(400, "At least one image is required to submit a design");
  }

  const slug = slugify(`${title || "customer-design"}-${Date.now()}`);
  const design = await Design.create({
    title: title || "Customer submission",
    slug,
    category,
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

// GET /api/designs/my-submissions (customer) — see their own submissions at any status
const getMySubmissions = asyncHandler(async (req, res) => {
  const designs = await Design.find({ submittedBy: req.user._id }).populate("category", "name slug").sort({ createdAt: -1 });
  sendResponse(res, 200, "Your submitted designs fetched", designs);
});

// DELETE /api/designs/my-submissions/:id (customer) — withdraw a submission that's still pending
const deleteMySubmission = asyncHandler(async (req, res) => {
  const design = await Design.findOne({ _id: req.params.id, submittedBy: req.user._id });
  if (!design) throw new ApiError(404, "Submission not found");
  if (design.status === "active") {
    throw new ApiError(400, "This design has already been approved and published — contact support to remove it");
  }
  await design.deleteOne();
  sendResponse(res, 200, "Submission withdrawn");
});

// GET /api/designs/moderation-queue (admin) — pending customer submissions
const getModerationQueue = asyncHandler(async (req, res) => {
  const designs = await Design.find({ source: "customer", status: "pending_review" })
    .populate("category", "name slug")
    .populate("submittedBy", "name email")
    .sort({ createdAt: 1 });
  sendResponse(res, 200, "Moderation queue fetched", designs);
});

// PATCH /api/designs/:id/moderate (admin) — { action: "approve" | "reject", note? }
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

// PATCH /api/designs/:id (admin)
const updateDesign = asyncHandler(async (req, res) => {
  const design = await Design.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!design) throw new ApiError(404, "Design not found");
  sendResponse(res, 200, "Design updated", design);
});

// DELETE /api/designs/:id (admin)
const deleteDesign = asyncHandler(async (req, res) => {
  const design = await Design.findByIdAndDelete(req.params.id);
  if (!design) throw new ApiError(404, "Design not found");
  sendResponse(res, 200, "Design deleted");
});

module.exports = {
  listDesigns,
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
};
