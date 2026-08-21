const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const ContactMessage = require("../models/ContactMessage");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");

const { sendEmail } = require("../utils/mailer");

// POST /api/contact
const createContactMessage = asyncHandler(async (req, res) => {
  const { name, firstName, lastName, email, message } = req.body;
  const resolvedName = (name || firstName || "User").trim();
  const customerEmail = (email || "").trim();
  const customerMessage = (message || "").trim();

  const saved = await ContactMessage.create({
    firstName: resolvedName,
    lastName: (lastName || "").trim(),
    email: customerEmail,
    subject: "Lucky Couture Technical Support Request",
    message: customerMessage,
  });

  // Forward notification email to technical support with customer's email as replyTo
  try {
    await sendEmail({
      to: "mohithreddybade18@gmail.com",
      replyTo: customerEmail,
      subject: `Lucky Couture Technical Support Request - from ${resolvedName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #222; line-height: 1.6;">
          <h2 style="color: #612c37; border-bottom: 2px solid #ce9a77; padding-bottom: 8px;">Lucky Couture Technical Support Request</h2>
          <p>You have received a new technical support inquiry from the website contact form.</p>
          <div style="background-color: #fcf9f5; border: 1px solid #e8e0d5; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>Customer Name:</strong> ${resolvedName}</p>
            <p style="margin: 0 0 8px;"><strong>Customer Email:</strong> <a href="mailto:${customerEmail}">${customerEmail}</a></p>
            <p style="margin: 0; color: #612c37;"><strong>Direct Reply:</strong> Click <em>Reply</em> in your email client to respond directly to this customer.</p>
          </div>
          <h3 style="color: #222; margin-top: 20px;">Customer Message:</h3>
          <div style="background-color: #f9f9f9; border-left: 4px solid #ce9a77; padding: 12px 16px; margin: 12px 0; font-size: 14px; white-space: pre-wrap;">${customerMessage}</div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #888;">Lucky Couture Platform &bull; Amaravathi Road, Guntur 522007</p>
        </div>
      `,
      text: `Lucky Couture Technical Support Request\n\nName: ${resolvedName}\nEmail: ${customerEmail}\n\nMessage:\n${customerMessage}`,
    });
  } catch (emailErr) {
    console.error("[Technical Support Email Error]:", emailErr);
    if (process.env.SMTP_HOST || process.env.SMTP_SERVICE) {
      throw new ApiError(500, "Unable to deliver email to technical support. Please try again or reach out via phone/WhatsApp.");
    }
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
