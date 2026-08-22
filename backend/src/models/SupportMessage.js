const mongoose = require("mongoose");

const supportMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportConversation",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["customer", "admin", "bot"],
      required: true,
      default: "customer",
    },
    senderName: {
      type: String,
      trim: true,
      default: "User",
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    attachments: [
      {
        url: { type: String, required: true },
        filename: { type: String },
        fileType: { type: String },
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

supportMessageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model("SupportMessage", supportMessageSchema);
