const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const ContactMessage = require("../models/ContactMessage");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");

const { sendEmail } = require("../utils/mailer");

// POST /api/contact
const createContactMessage = asyncHandler(async (req, res) => {
  const { name, firstName, lastName, email, subject, issue, message } = req.body;
  const resolvedName = (name || firstName || "User").trim();
  const resolvedSubject = (issue || subject || "Technical Support Request").trim();

  const saved = await ContactMessage.create({
    firstName: resolvedName,
    lastName: (lastName || "").trim(),
    email: email.trim(),
    subject: resolvedSubject,
    message: message.trim(),
  });

  // Attempt to forward notification email to technical support
  try {
    await sendEmail({
      to: "mohithreddybade18@gmail.com",
      subject: `[Technical Support] ${resolvedSubject} — ${resolvedName}`,
      html: `
        <h2>Technical Support Request</h2>
        <p><strong>From:</strong> ${resolvedName} (&lt;${email.trim()}&gt;)</p>
        <p><strong>Issue / Subject:</strong> ${resolvedSubject}</p>
        <hr style="border: 0; border-top: 1px solid #ddd; margin: 16px 0;" />
        <h3>Message Details:</h3>
        <p style="white-space: pre-wrap; background: #f9f9f9; padding: 12px; border-radius: 6px;">${message.trim()}</p>
      `,
    });
  } catch (emailErr) {
    console.error("[Technical Support Email Error]:", emailErr);
  }

  sendResponse(res, 201, "Your technical support request has been submitted successfully.", saved);
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
