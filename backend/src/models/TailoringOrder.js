const mongoose = require("mongoose");

const tailoringOrderSchema = new mongoose.Schema(
  {
    // Customer-facing reference ID: 15-digit numeric string, cryptographically
    // generated in the controller with a collision-retry loop.
    // MongoDB _id is kept for all internal relationships and authorization.
    orderId: { type: String, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // null for guest bookings
    guestInfo: {
      name: String,
      phone: String,
      email: String,
    },
    garmentType: { type: String, required: true },
    referenceType: { type: String, enum: ["gallery", "uploaded", "none"], default: "none" },
    referenceDesign: { type: mongoose.Schema.Types.ObjectId, ref: "Design" },
    referenceDesignTitle: { type: String },
    referenceDesignImage: { type: String },
    referenceImage: { type: String },
    fabricSource: { type: String, enum: ["customer_provided", "shop_provided"], required: true },
    fabricDropoffDate: Date,
    preferredMaterial: String,
    hasReferenceImages: { type: Boolean, default: false },
    referenceImages: [{ url: String, publicId: String }],
    designComplexity: { type: String, enum: ["simple", "embroidery", "maggam", "other"], default: "simple" },
    measurements: { type: Map, of: Number, default: {} },
    measurementProfile: { type: mongoose.Schema.Types.ObjectId }, // optional link to a saved User.measurementProfiles._id
    description: String,
    deliveryMethod: { type: String, enum: ["store_pickup", "home_delivery"], default: "store_pickup" },
    deliveryAddress: {
      address: String,
      city: String,
      pincode: String,
    },
    approxDistanceKm: Number,
    deliveryCategory: {
      type: String,
      enum: ["store_pickup", "guntur_city", "near_guntur", "outside_guntur", "long_distance", "distance_unavailable"],
      default: "store_pickup",
    },
    deliveryCharge: { type: Number, default: 0 },
    deliveryChargeStatus: {
      type: String,
      enum: ["fixed", "calculated", "to_be_confirmed", "not_applicable"],
      default: "not_applicable",
    },
    isFastDelivery: { type: Boolean, default: false }, // legacy 1-day rush flag distinct from full Priority Stitching flow
    scheduledDate: { type: Date, required: true }, // date this order occupies in the daily capacity
    expectedDeliveryDate: { type: Date, required: true },
    designCost: { type: Number, default: 0 },
    fabricCost: { type: Number, default: 0 },
    stitchingCost: { type: Number, default: 0 },
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
