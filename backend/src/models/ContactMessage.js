const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: String,
    phone: String,
    email: { type: String, required: true },
    subject: String,
    message: { type: String, required: true },
    status: { type: String, enum: ["new", "read", "replied", "archived"], default: "new" },
    repliedAt: Date,
    adminReply: String,
  },
  { timestamps: true }
);

contactMessageSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
