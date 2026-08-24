const mongoose = require("mongoose");

const tailoringDraftSchema = new mongoose.Schema(
  {
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    guestInfo: {
      name: String,
      phone: String,
      email: String,
    },
    tailoringPayload: { type: mongoose.Schema.Types.Mixed, required: true },
    totalAmount: { type: Number, required: true },
    advanceAmount: { type: Number, required: true },
    platformFee: { type: Number, default: 0 },
    designCost: { type: Number, default: 0 },
    fabricCost: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    deliverySnapshot: { type: mongoose.Schema.Types.Mixed },
    scheduledDate: { type: Date, required: true },
    expectedDeliveryDate: { type: Date, required: true },
    approxDistanceKm: Number,
    deliveryCategory: String,
    status: { type: String, default: "draft" },
    createdAt: { type: Date, default: Date.now, expires: 86400 }, // TTL: Auto-delete abandoned draft after 24 hours
  },
  { timestamps: true }
);

module.exports = mongoose.model("TailoringDraft", tailoringDraftSchema);
