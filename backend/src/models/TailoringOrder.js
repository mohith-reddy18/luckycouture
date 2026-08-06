const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const tailoringOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, default: () => `TLR-${uuidv4().slice(0, 8).toUpperCase()}` },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // null for guest bookings
    guestInfo: {
      name: String,
      phone: String,
      email: String,
    },
    garmentType: { type: String, required: true },
    referenceDesign: { type: mongoose.Schema.Types.ObjectId, ref: "Design" },
    fabricSource: { type: String, enum: ["customer_provided", "shop_provided"], required: true },
    fabricDropoffDate: Date,
    preferredMaterial: String,
    hasReferenceImages: { type: Boolean, default: false },
    referenceImages: [{ url: String, publicId: String }],
    designComplexity: { type: String, enum: ["simple", "embroidery", "maggam", "other"], default: "simple" },
    measurements: { type: Map, of: Number, default: {} },
    measurementProfile: { type: mongoose.Schema.Types.ObjectId }, // optional link to a saved User.measurementProfiles._id
    description: String,
    isFastDelivery: { type: Boolean, default: false }, // legacy 1-day rush flag distinct from full Priority Stitching flow
    scheduledDate: { type: Date, required: true }, // date this order occupies in the daily capacity
    expectedDeliveryDate: { type: Date, required: true },
    estimatedPrice: Number,
    finalPrice: Number,
    paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "fabric_received",
        "cutting",
        "stitching",
        "quality_check",
        "ready_for_pickup",
        "delivered",
        "cancelled",
        "rejected",
      ],
      default: "pending",
    },
    assignedTailor: { type: String },
    adminNotes: String,
    statusHistory: [
      {
        status: String,
        note: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true }
);

tailoringOrderSchema.index({ customer: 1, createdAt: -1 });
tailoringOrderSchema.index({ scheduledDate: 1, status: 1 });
tailoringOrderSchema.index({ status: 1 });

tailoringOrderSchema.pre("save", function trackStatus(next) {
  if (this.isModified("status")) {
    this.statusHistory.push({ status: this.status, changedAt: new Date() });
  }
  next();
});

module.exports = mongoose.model("TailoringOrder", tailoringOrderSchema);
