const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const BlogPost = require("../models/BlogPost");
const slugify = require("../utils/slugify");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");

// GET /api/blogs (public — only published articles)
const listPublishedBlogs = asyncHandler(async (req, res) => {
  const { category, tag, q, sort } = req.query;
  const filter = { status: "published" };

  if (category && category !== "All") {
    filter.category = category;
  }

  if (tag) {
    filter.tags = tag;
  }

  if (q && q.trim()) {
    const term = q.trim();
    filter.$or = [
      { title: { $regex: term, $options: "i" } },
      { excerpt: { $regex: term, $options: "i" } },
      { category: { $regex: term, $options: "i" } },
      { tags: { $regex: term, $options: "i" } },
    ];
  }

  let sortOption = { publishedAt: -1 };
  if (sort === "popular") {
    sortOption = { views: -1, publishedAt: -1 };
  } else if (sort === "oldest") {
    sortOption = { publishedAt: 1 };
  }

  const { page, limit, skip } = getPagination(req.query, 12, 50);

  const [posts, total] = await Promise.all([
    BlogPost.find(filter)
      .select("-content") // optimize payload on list view
      .sort(sortOption)
      .skip(skip)
      .limit(limit),
    BlogPost.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Blog posts fetched successfully", posts, buildPaginationMeta(page, limit, total));
});

// GET /api/blogs/:slug (public — fetch single article by slug or ObjectId, plus related posts)
const getBlogBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const str = String(slug || "").trim();

  if (!str) throw new ApiError(400, "Blog identifier is required");

  const isMongoId = mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str);
  const conditions = [{ slug: str.toLowerCase() }];
  if (isMongoId) {
    conditions.unshift({ _id: str });
  }

  const post = await BlogPost.findOne({ $or: conditions });
  if (!post) throw new ApiError(404, "Article not found");

  // Non-admins can only view published posts
  if (post.status !== "published" && (!req.user || req.user.role !== "admin")) {
    throw new ApiError(404, "Article not found");
  }

  // Increment views silently in background
  BlogPost.findByIdAndUpdate(post._id, { $inc: { views: 1 } }).exec().catch(() => {});

  // Fetch up to 3 related published posts from the same category
  const relatedPosts = await BlogPost.find({
    _id: { $ne: post._id },
    category: post.category,
    status: "published",
  })
    .select("title slug category excerpt featuredImage readTime publishedAt")
    .sort({ publishedAt: -1 })
    .limit(3);

  // Fallback to recent posts if fewer than 3 related
  let finalRelated = relatedPosts;
  if (relatedPosts.length < 3) {
    const fallbackPosts = await BlogPost.find({
      _id: { $nin: [post._id, ...relatedPosts.map((p) => p._id)] },
      status: "published",
    })
      .select("title slug category excerpt featuredImage readTime publishedAt")
      .sort({ publishedAt: -1 })
      .limit(3 - relatedPosts.length);
    finalRelated = [...relatedPosts, ...fallbackPosts];
  }

  sendResponse(res, 200, "Article fetched successfully", {
    post,
    relatedPosts: finalRelated,
  });
});

// --- Admin Endpoints ---

// GET /api/blogs/admin/all (admin — list all articles including drafts/archived)
const listAllBlogsAdmin = asyncHandler(async (req, res) => {
  const { status, category, q } = req.query;
  const filter = {};

  if (status && status !== "all") {
    filter.status = status;
  }
  if (category && category !== "all" && category !== "All") {
    filter.category = category;
  }
  if (q && q.trim()) {
    const term = q.trim();
    filter.$or = [
      { title: { $regex: term, $options: "i" } },
      { excerpt: { $regex: term, $options: "i" } },
      { slug: { $regex: term, $options: "i" } },
    ];
  }

  const { page, limit, skip } = getPagination(req.query, 20, 100);

  const [posts, total] = await Promise.all([
    BlogPost.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    BlogPost.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Admin blog list fetched", posts, buildPaginationMeta(page, limit, total));
});

// POST /api/blogs (admin — create new article)
const createBlog = asyncHandler(async (req, res) => {
  const {
    title,
    slug: customSlug,
    category,
    excerpt,
    content,
    featuredImage,
    author,
    readTime,
    tags,
    status = "published",
    publishedAt,
    metaTitle,
    metaDescription,
  } = req.body;

  if (!title || !title.trim()) throw new ApiError(400, "Article title is required");
  if (!excerpt || !excerpt.trim()) throw new ApiError(400, "Article excerpt is required");
  if (!content || !content.trim()) throw new ApiError(400, "Article content is required");

  let finalSlug = customSlug ? slugify(customSlug) : slugify(title);
  if (!finalSlug) finalSlug = `article-${Date.now()}`;

  // Ensure unique slug
  let slugConflict = await BlogPost.findOne({ slug: finalSlug });
  let count = 1;
  while (slugConflict) {
    finalSlug = `${slugify(title || "article")}-${count++}`;
    slugConflict = await BlogPost.findOne({ slug: finalSlug });
  }

  const post = await BlogPost.create({
    title: title.trim(),
    slug: finalSlug,
    category: category || "Fashion & Trends",
    excerpt: excerpt.trim(),
    content: content.trim(),
    featuredImage: {
      url: featuredImage?.url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=80",
      alt: featuredImage?.alt || title.trim(),
    },
    author: author ? author.trim() : "Lucky Couture Studio",
    readTime: readTime ? readTime.trim() : "5 min read",
    tags: Array.isArray(tags) ? tags : typeof tags === "string" ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    status,
    publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
    metaTitle: metaTitle || title.trim(),
    metaDescription: metaDescription || excerpt.trim(),
    createdBy: req.user?._id,
  });

  sendResponse(res, 201, "Article created successfully", post);
});

// PATCH /api/blogs/:id (admin — update article)
const updateBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const str = String(id || "").trim();

  const isMongoId = mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str);
  const conditions = [{ slug: str.toLowerCase() }];
  if (isMongoId) {
    conditions.unshift({ _id: str });
  }

  const post = await BlogPost.findOne({ $or: conditions });
  if (!post) throw new ApiError(404, "Article not found");

  const updates = {};
  const allowed = [
    "title", "category", "excerpt", "content", "author", "readTime",
    "status", "publishedAt", "metaTitle", "metaDescription"
  ];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (req.body.slug && req.body.slug !== post.slug) {
    const newSlug = slugify(req.body.slug);
    const existing = await BlogPost.findOne({ slug: newSlug, _id: { $ne: post._id } });
    if (existing) throw new ApiError(400, "Slug already in use by another article");
    updates.slug = newSlug;
  }

  if (req.body.featuredImage) {
    updates.featuredImage = {
      url: req.body.featuredImage.url || post.featuredImage?.url,
      alt: req.body.featuredImage.alt !== undefined ? req.body.featuredImage.alt : post.featuredImage?.alt,
    };
  }

  if (req.body.tags !== undefined) {
    updates.tags = Array.isArray(req.body.tags)
      ? req.body.tags
      : typeof req.body.tags === "string"
      ? req.body.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];
  }

  const updated = await BlogPost.findByIdAndUpdate(post._id, updates, { new: true, runValidators: true });

  sendResponse(res, 200, "Article updated successfully", updated);
});

// DELETE /api/blogs/:id (admin — delete article)
const deleteBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const str = String(id || "").trim();

  const isMongoId = mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str);
  const conditions = [{ slug: str.toLowerCase() }];
  if (isMongoId) {
    conditions.unshift({ _id: str });
  }

  const post = await BlogPost.findOneAndDelete({ $or: conditions });
  if (!post) throw new ApiError(404, "Article not found");

  sendResponse(res, 200, "Article deleted successfully", { _id: post._id, title: post.title });
});

module.exports = {
  listPublishedBlogs,
  getBlogBySlug,
  listAllBlogsAdmin,
  createBlog,
  updateBlog,
  deleteBlog,
};
