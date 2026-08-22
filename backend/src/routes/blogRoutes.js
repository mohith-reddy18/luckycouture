const express = require("express");
const { protect, authorize, optionalAuth } = require("../middleware/auth");
const {
  listPublishedBlogs,
  getBlogBySlug,
  listAllBlogsAdmin,
  createBlog,
  updateBlog,
  deleteBlog,
} = require("../controllers/blogController");

const router = express.Router();

// Public routes
router.get("/", listPublishedBlogs);
router.get("/article/:slug", optionalAuth, getBlogBySlug);
router.get("/:slug", optionalAuth, getBlogBySlug);

// Admin-only management routes
router.get("/admin/all", protect, authorize("admin"), listAllBlogsAdmin);
router.post("/", protect, authorize("admin"), createBlog);
router.patch("/:id", protect, authorize("admin"), updateBlog);
router.delete("/:id", protect, authorize("admin"), deleteBlog);

module.exports = router;
