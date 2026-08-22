const mongoose = require("mongoose");

const supportConversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "order",
        "payment",
        "delivery",
        "refund",
        "cancellation",
        "tailoring",
        "account",
        "technical",
        "other",
      ],
      required: true,
      default: "other",
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    orderId: {
      type: String,
      trim: true,
      index: true,
    },
    orderType: {
      type: String,
      enum: ["shopping", "tailoring", "priority", "none"],
      default: "none",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
      index: true,
    },
    diagnostics: {
      pageUrl: { type: String, trim: true },
      browser: { type: String, trim: true },
      device: { type: String, trim: true },
      timestamp: { type: Date, default: Date.now },
      userAgent: { type: String, trim: true },
    },
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastSenderRole: {
      type: String,
      enum: ["customer", "admin", "bot"],
      default: "customer",
    },
    unreadByUser: {
      type: Number,
      default: 0,
    },
    unreadByAdmin: {
      type: Number,
      default: 1,
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

supportConversationSchema.index({ user: 1, status: 1, updatedAt: -1 });
supportConversationSchema.index({ status: 1, lastMessageAt: -1 });
supportConversationSchema.index({ orderId: 1, user: 1 });

module.exports = mongoose.model("SupportConversation", supportConversationSchema);
