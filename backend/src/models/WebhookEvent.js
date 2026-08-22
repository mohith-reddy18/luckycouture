const mongoose = require("mongoose");

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
    processingStatus: {
      type: String,
      enum: ["processing", "processed", "failed", "ignored"],
      default: "processing",
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      index: true,
    },
    dbOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    error: {
      type: String,
    },
    eventPayload: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

webhookEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model("WebhookEvent", webhookEventSchema);
