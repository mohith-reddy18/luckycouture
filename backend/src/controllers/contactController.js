const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const ContactMessage = require("../models/ContactMessage");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");

const { sendEmail } = require("../utils/mailer");

// POST /api/contact
const createContactMessage = asyncHandler(async (req, res) => {
  console.log("[Contact Support] Incoming request received:", {
    name: req.body?.name || req.body?.firstName,
    email: req.body?.email,
    messageLength: req.body?.message ? String(req.body.message).length : 0,
  });

  const { name, firstName, lastName, email, message } = req.body;
  const resolvedName = (name || firstName || "User").trim();
  const customerEmail = (email || "").trim();
  const customerMessage = (message || "").trim();

  if (!resolvedName) {
    throw new ApiError(400, "Please provide your name");
  }
  if (!customerEmail || !/^\S+@\S+\.\S+$/.test(customerEmail)) {
    throw new ApiError(400, "Please provide a valid email address");
  }
  if (!customerMessage || customerMessage.length < 3) {
    throw new ApiError(400, "Please describe the issue in detail (at least 3 characters)");
  }

  const nowFormatted = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "medium",
  });

  const saved = await ContactMessage.create({
    firstName: resolvedName,
    lastName: (lastName || "").trim(),
    email: customerEmail,
    subject: "Lucky Couture Technical Support Request",
    message: customerMessage,
  });
  console.log("[Contact Support] Stored support request in DB with ID:", saved._id);

  // Forward notification email to technical support with customer's email as replyTo
  console.log("[Contact Support] Attempting email dispatch to mohithreddybade18@gmail.com...");
  try {
    const info = await sendEmail({
      to: "mohithreddybade18@gmail.com",
      replyTo: customerEmail,
      subject: `Lucky Couture Technical Support Request - from ${resolvedName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #222; line-height: 1.6; border: 1px solid #e8e0d5; border-radius: 12px; overflow: hidden; background: #ffffff;">
          <div style="background-color: #612c37; padding: 20px 24px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 20px; color: #fdfbf7;">Lucky Couture Technical Support Request</h2>
            <p style="margin: 4px 0 0; font-size: 13px; color: #e8d0bc;">Website & App Technical Inquiry</p>
          </div>
          <div style="padding: 24px;">
            <div style="background-color: #fcf9f5; border: 1px solid #e8e0d5; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0 0 8px; font-size: 14px;"><strong>Customer Name:</strong> ${resolvedName}</p>
              <p style="margin: 0 0 8px; font-size: 14px;"><strong>Customer Email:</strong> <a href="mailto:${customerEmail}" style="color: #612c37; font-weight: 600;">${customerEmail}</a></p>
              <p style="margin: 0 0 8px; font-size: 14px;"><strong>Submitted On:</strong> ${nowFormatted} (IST)</p>
              <p style="margin: 0; font-size: 13px; color: #612c37; font-weight: 600;">Direct Reply: Click 'Reply' in your email client to respond directly to ${customerEmail}.</p>
            </div>
            <h3 style="color: #612c37; margin: 0 0 10px; font-size: 16px;">Message:</h3>
            <div style="background-color: #f9f9f9; border-left: 4px solid #ce9a77; padding: 14px 16px; font-size: 14px; white-space: pre-wrap; line-height: 1.6; border-radius: 0 8px 8px 0;">${customerMessage}</div>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0 16px;" />
            <p style="font-size: 12px; color: #888; margin: 0; text-align: center;">Lucky Couture Studio &bull; Amaravathi Road, Guntur 522007</p>
          </div>
        </div>
      `,
      text: `Lucky Couture Technical Support Request\n\nName: ${resolvedName}\nEmail: ${customerEmail}\nDate/Time: ${nowFormatted}\n\nMessage:\n${customerMessage}\n\n(Reply directly to this email to reach the customer)`,
    });
    console.log("[Contact Support] Email accepted by mail service. MessageId:", info?.messageId);
  } catch (emailErr) {
    console.error("[Contact Support Email Error]:", emailErr.message);
    const detail = emailErr.message || "Failed to deliver email through mail service.";
    throw new ApiError(500, `Email dispatch failed: ${detail}`);
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
