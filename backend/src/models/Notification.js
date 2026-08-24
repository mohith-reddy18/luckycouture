const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "order_placed",
        "order_status",
        "order_confirmed",
        "order_paid",
        "order_completed",
        "order_rejected",
        "tailoring_status",
        "tailoring_confirmed",
        "tailoring_paid",
        "priority_status",
        "delivery_confirmed",
        "price_confirmed",
        "booking_confirmed",
        "refund_processed",
        "order_update",
        "promotion",
        "system",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: String, // frontend route to deep-link to, e.g. /orders/:id
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
