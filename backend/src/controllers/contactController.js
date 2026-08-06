const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const ContactMessage = require("../models/ContactMessage");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");

// POST /api/contact
const createContactMessage = asyncHandler(async (req, res) => {
  const message = await ContactMessage.create(req.body);
  sendResponse(res, 201, "Message sent — we'll reply soon", message);
});

// GET /api/contact (admin)
const listContactMessages = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const [items, total] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ContactMessage.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Messages fetched", items, buildPaginationMeta(page, limit, total));
});

// PATCH /api/contact/:id (admin) — mark read / reply
const updateContactMessage = asyncHandler(async (req, res) => {
  const { status, adminReply } = req.body;
  const update = { ...(status && { status }) };
  if (adminReply) {
    update.adminReply = adminReply;
    update.repliedAt = new Date();
    update.status = "replied";
  }
  const message = await ContactMessage.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!message) throw new ApiError(404, "Message not found");
  sendResponse(res, 200, "Message updated", message);
});

// DELETE /api/contact/:id (admin)
const deleteContactMessage = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findByIdAndDelete(req.params.id);
  if (!message) throw new ApiError(404, "Message not found");
  sendResponse(res, 200, "Message deleted");
});

module.exports = { createContactMessage, listContactMessages, updateContactMessage, deleteContactMessage };
