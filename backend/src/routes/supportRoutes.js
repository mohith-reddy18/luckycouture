const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  createConversation,
  getMyConversations,
  getConversationById,
  sendMessage,
  reopenConversation,
  adminListConversations,
  adminGetStats,
  adminUpdateStatus,
} = require("../controllers/supportController");

const router = express.Router();

// ── Admin-only support endpoints ──────────────────────────────────────────
router.get("/admin/conversations", protect, authorize("admin"), adminListConversations);
router.get("/admin/stats", protect, authorize("admin"), adminGetStats);
router.patch("/admin/conversations/:id/status", protect, authorize("admin"), adminUpdateStatus);

// ── Customer support endpoints ────────────────────────────────────────────
router.post("/conversations", protect, createConversation);
router.get("/conversations", protect, getMyConversations);
router.get("/conversations/:id", protect, getConversationById);
router.post("/conversations/:id/messages", protect, sendMessage);
router.patch("/conversations/:id/reopen", protect, reopenConversation);

module.exports = router;
