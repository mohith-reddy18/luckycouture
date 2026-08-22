const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const SupportConversation = require("../models/SupportConversation");
const SupportMessage = require("../models/SupportMessage");
const Notification = require("../models/Notification");
const Order = require("../models/Order");
const TailoringOrder = require("../models/TailoringOrder");
const PriorityOrder = require("../models/PriorityOrder");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");

/**
 * Sanitize diagnostic data to strictly prohibit sensitive fields
 */
function sanitizeDiagnostics(raw = {}) {
  if (!raw || typeof raw !== "object") return {};
  const allowed = {
    pageUrl: typeof raw.pageUrl === "string" ? raw.pageUrl.slice(0, 500) : "",
    browser: typeof raw.browser === "string" ? raw.browser.slice(0, 100) : "",
    device: typeof raw.device === "string" ? raw.device.slice(0, 50) : "",
    userAgent: typeof raw.userAgent === "string" ? raw.userAgent.slice(0, 300) : "",
    timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date(),
  };
  return allowed;
}

/**
 * Fetch basic safe order summary without exposing sensitive credentials
 */
async function fetchSafeOrderSummary(orderId) {
  if (!orderId) return null;
  const cleanId = String(orderId).trim();
  const isMongoId = mongoose.Types.ObjectId.isValid(cleanId) && /^[0-9a-fA-F]{24}$/.test(cleanId);

  // Check shopping orders
  const shoppingQuery = isMongoId ? { $or: [{ _id: cleanId }, { orderId: cleanId }] } : { orderId: cleanId };
  const shopOrder = await Order.findOne(shoppingQuery).select("orderId status paymentStatus total createdAt items").lean();
  if (shopOrder) {
    return {
      orderId: shopOrder.orderId || shopOrder._id.toString(),
      type: "shopping",
      status: shopOrder.status,
      paymentStatus: shopOrder.paymentStatus,
      total: shopOrder.total,
      createdAt: shopOrder.createdAt,
      itemCount: shopOrder.items?.length || 1,
    };
  }

  // Check tailoring orders
  const tailoringQuery = isMongoId ? { $or: [{ _id: cleanId }, { orderId: cleanId }] } : { orderId: cleanId };
  const tailorOrder = await TailoringOrder.findOne(tailoringQuery).select("orderId status paymentStatus totalEstimatedCost createdAt garmentType").lean();
  if (tailorOrder) {
    return {
      orderId: tailorOrder.orderId || tailorOrder._id.toString(),
      type: "tailoring",
      status: tailorOrder.status,
      paymentStatus: tailorOrder.paymentStatus,
      total: tailorOrder.totalEstimatedCost,
      createdAt: tailorOrder.createdAt,
      garmentType: tailorOrder.garmentType,
    };
  }

  // Check priority orders
  const priorityQuery = isMongoId ? { $or: [{ _id: cleanId }, { orderId: cleanId }] } : { orderId: cleanId };
  const priorityOrder = await PriorityOrder.findOne(priorityQuery).select("orderId status paymentStatus totalEstimatedCost createdAt garmentType").lean();
  if (priorityOrder) {
    return {
      orderId: priorityOrder.orderId || priorityOrder._id.toString(),
      type: "priority",
      status: priorityOrder.status,
      paymentStatus: priorityOrder.paymentStatus,
      total: priorityOrder.totalEstimatedCost,
      createdAt: priorityOrder.createdAt,
      garmentType: priorityOrder.garmentType,
    };
  }

  return { orderId: cleanId, type: "unknown" };
}

// POST /api/support/conversations — Start a new customer support conversation
const createConversation = asyncHandler(async (req, res) => {
  const { category, subject, orderId, orderType, initialMessage, diagnostics, attachments } = req.body;

  if (!initialMessage || !initialMessage.trim()) {
    throw new ApiError(400, "Please provide an initial message describing your inquiry");
  }

  const validCategories = [
    "order",
    "payment",
    "delivery",
    "refund",
    "cancellation",
    "tailoring",
    "account",
    "technical",
    "other",
  ];

  const selectedCategory = validCategories.includes(category) ? category : "other";
  const cleanSubject = (subject || `${selectedCategory.toUpperCase()} Support Request`).trim().slice(0, 200);

  const conversation = await SupportConversation.create({
    user: req.user._id,
    category: selectedCategory,
    subject: cleanSubject,
    orderId: orderId ? String(orderId).trim() : undefined,
    orderType: orderType || "none",
    status: "open",
    diagnostics: sanitizeDiagnostics(diagnostics),
    lastMessage: initialMessage.trim().slice(0, 500),
    lastMessageAt: new Date(),
    lastSenderRole: "customer",
    unreadByUser: 0,
    unreadByAdmin: 1,
  });

  const messageDoc = await SupportMessage.create({
    conversation: conversation._id,
    sender: req.user._id,
    senderRole: "customer",
    senderName: req.user.name || "Customer",
    message: initialMessage.trim(),
    attachments: Array.isArray(attachments) ? attachments.slice(0, 5) : [],
    isRead: false,
  });

  sendResponse(res, 201, "Support conversation started", {
    conversation,
    initialMessage: messageDoc,
  });
});

// GET /api/support/conversations — Customer's active and past conversations
const getMyConversations = asyncHandler(async (req, res) => {
  const conversations = await SupportConversation.find({ user: req.user._id })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();

  sendResponse(res, 200, "Conversations fetched", conversations);
});

// GET /api/support/conversations/:id — Get full conversation thread and messages
const getConversationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid conversation ID");
  }

  const conversation = await SupportConversation.findById(id)
    .populate("user", "name email phone role")
    .populate("resolvedBy", "name email");

  if (!conversation) {
    throw new ApiError(404, "Support conversation not found");
  }

  const convUserId = conversation.user?._id ? conversation.user._id.toString() : conversation.user.toString();
  const isOwner = req.user && convUserId === req.user._id.toString();
  const isAdmin = req.user && req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "You are not authorized to view this support conversation");
  }

  // Fetch messages
  const messages = await SupportMessage.find({ conversation: conversation._id })
    .sort({ createdAt: 1 })
    .lean();

  // Reset unread count based on viewer
  if (isOwner && !isAdmin && conversation.unreadByUser > 0) {
    conversation.unreadByUser = 0;
    await conversation.save();
    await SupportMessage.updateMany(
      { conversation: conversation._id, senderRole: "admin", isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
  } else if (isAdmin && conversation.unreadByAdmin > 0) {
    conversation.unreadByAdmin = 0;
    await conversation.save();
    await SupportMessage.updateMany(
      { conversation: conversation._id, senderRole: "customer", isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
  }

  // Attach safe order context if linked
  let orderSummary = null;
  if (conversation.orderId) {
    orderSummary = await fetchSafeOrderSummary(conversation.orderId);
  }

  sendResponse(res, 200, "Conversation details fetched", {
    conversation,
    messages,
    orderSummary,
  });
});

// POST /api/support/conversations/:id/messages — Send a message in a conversation
const sendMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { message, attachments } = req.body;

  if (!message || !message.trim()) {
    throw new ApiError(400, "Message text is required");
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid conversation ID");
  }

  const conversation = await SupportConversation.findById(id);
  if (!conversation) {
    throw new ApiError(404, "Support conversation not found");
  }

  const convUserId = conversation.user.toString();
  const isOwner = req.user && convUserId === req.user._id.toString();
  const isAdmin = req.user && req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "You are not authorized to send messages in this conversation");
  }

  const senderRole = isAdmin ? "admin" : "customer";
  const trimmedMsg = message.trim();

  const messageDoc = await SupportMessage.create({
    conversation: conversation._id,
    sender: req.user._id,
    senderRole,
    senderName: req.user.name || (isAdmin ? "Lucky Couture Support" : "Customer"),
    message: trimmedMsg,
    attachments: Array.isArray(attachments) ? attachments.slice(0, 5) : [],
    isRead: false,
  });

  // Update conversation status & unread counters
  conversation.lastMessage = trimmedMsg.slice(0, 500);
  conversation.lastMessageAt = new Date();
  conversation.lastSenderRole = senderRole;

  if (isAdmin) {
    conversation.unreadByUser = (conversation.unreadByUser || 0) + 1;
    if (conversation.status === "open") {
      conversation.status = "in_progress";
    }
    // Create customer notification
    try {
      await Notification.create({
        user: conversation.user,
        type: "system",
        title: "Lucky Couture Support Reply",
        message: `New message on your inquiry: "${trimmedMsg.slice(0, 100)}"`,
        link: `/support/${conversation._id}`,
      });
    } catch (notifErr) {
      console.error("Failed to create support notification:", notifErr);
    }
  } else {
    conversation.unreadByAdmin = (conversation.unreadByAdmin || 0) + 1;
    if (conversation.status === "resolved" || conversation.status === "closed") {
      conversation.status = "in_progress";
    }
  }

  await conversation.save();

  sendResponse(res, 201, "Message sent", {
    message: messageDoc,
    conversation,
  });
});

// PATCH /api/support/conversations/:id/reopen — Reopen a resolved conversation
const reopenConversation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid conversation ID");
  }

  const conversation = await SupportConversation.findById(id);
  if (!conversation) {
    throw new ApiError(404, "Support conversation not found");
  }

  const convUserId = conversation.user.toString();
  const isOwner = req.user && convUserId === req.user._id.toString();
  const isAdmin = req.user && req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "Not authorized to reopen this conversation");
  }

  conversation.status = "open";
  conversation.resolvedAt = undefined;
  conversation.resolvedBy = undefined;
  conversation.lastMessageAt = new Date();
  await conversation.save();

  sendResponse(res, 200, "Conversation reopened", conversation);
});

// ─── ADMIN ONLY ENDPOINTS ──────────────────────────────────────────────────

// GET /api/support/admin/conversations — Admin list all conversations with filters
const adminListConversations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, category, search } = req.query;

  const filter = {};

  if (status && status !== "all") {
    filter.status = status;
  }

  if (category && category !== "all") {
    filter.category = category;
  }

  if (search && search.trim()) {
    const term = search.trim();
    const searchRegex = new RegExp(term, "i");
    filter.$or = [
      { subject: searchRegex },
      { orderId: searchRegex },
      { lastMessage: searchRegex },
    ];
  }

  const [items, total] = await Promise.all([
    SupportConversation.find(filter)
      .populate("user", "name email phone")
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SupportConversation.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Admin support conversations fetched", items, buildPaginationMeta(page, limit, total));
});

// GET /api/support/admin/stats — Admin summary metrics
const adminGetStats = asyncHandler(async (req, res) => {
  const [total, openCount, inProgressCount, resolvedCount, unreadMessagesTotal] = await Promise.all([
    SupportConversation.countDocuments(),
    SupportConversation.countDocuments({ status: "open" }),
    SupportConversation.countDocuments({ status: "in_progress" }),
    SupportConversation.countDocuments({ status: "resolved" }),
    SupportConversation.aggregate([
      { $group: { _id: null, totalUnread: { $sum: "$unreadByAdmin" } } },
    ]),
  ]);

  const stats = {
    total,
    open: openCount,
    inProgress: inProgressCount,
    resolved: resolvedCount,
    unreadAdminCount: unreadMessagesTotal[0]?.totalUnread || 0,
  };

  sendResponse(res, 200, "Support stats fetched", stats);
});

// PATCH /api/support/admin/conversations/:id/status — Admin update conversation status
const adminUpdateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["open", "in_progress", "resolved", "closed"];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, "Invalid status. Allowed values: open, in_progress, resolved, closed");
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid conversation ID");
  }

  const conversation = await SupportConversation.findById(id);
  if (!conversation) {
    throw new ApiError(404, "Support conversation not found");
  }

  conversation.status = status;
  if (status === "resolved" || status === "closed") {
    conversation.resolvedAt = new Date();
    conversation.resolvedBy = req.user._id;

    // Notify customer that issue is resolved
    try {
      await Notification.create({
        user: conversation.user,
        type: "system",
        title: "Support Request Resolved",
        message: `Your inquiry (${conversation.subject || conversation.category}) has been marked as resolved. You can reopen anytime if you need further help.`,
        link: `/support/${conversation._id}`,
      });
    } catch (notifErr) {
      console.error("Failed to create resolve notification:", notifErr);
    }
  } else {
    conversation.resolvedAt = undefined;
    conversation.resolvedBy = undefined;
  }

  await conversation.save();

  sendResponse(res, 200, "Conversation status updated", conversation);
});

module.exports = {
  createConversation,
  getMyConversations,
  getConversationById,
  sendMessage,
  reopenConversation,
  adminListConversations,
  adminGetStats,
  adminUpdateStatus,
};
