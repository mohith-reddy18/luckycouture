const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { designCreateRules, designUpdateRules } = require("../validators/designValidators");
const {
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
} = require("../controllers/designController");

const router = express.Router();

// Public gallery browsing
router.get("/", listDesigns);

// Admin-only: full list (all statuses) for CMS panel — static path before /:idOrSlug
router.get("/admin-list", protect, authorize("admin"), listDesignsAdmin);

// Customer submissions ("designs I like") — static paths first, before the
// dynamic /:idOrSlug route below, so Express doesn't swallow them as an id.
router.post("/submit", protect, submitCustomerDesign);
router.get("/my-submissions", protect, getMySubmissions);
router.delete("/my-submissions/:id", protect, deleteMySubmission);

// Admin moderation queue for customer submissions
router.get("/moderation-queue", protect, authorize("admin"), getModerationQueue);
router.patch("/:id/moderate", protect, authorize("admin"), moderateDesign);

// Admin CRUD for the official gallery
router.post("/", protect, authorize("admin"), designCreateRules, validate, createDesign);
router.patch("/:id", protect, authorize("admin"), designUpdateRules, validate, updateDesign);
router.delete("/:id", protect, authorize("admin"), deleteDesign);

// Dynamic detail/related routes last
router.get("/:id/related", getRelatedDesigns);
router.get("/:idOrSlug", getDesign);

module.exports = router;
