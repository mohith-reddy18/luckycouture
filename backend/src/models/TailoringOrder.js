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
    totalAmount: { type: Number },
    amountPaid: { type: Number, default: 0 },
    amountDue: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "partially_paid", "paid", "refunded", "partially_refunded"],
      default: "pending",
    },

    payments: [
      {
        paymentType: { type: String, enum: ["advance", "balance", "full"], required: true },
        paymentMethod: { type: String, enum: ["razorpay", "cash", "pos", "other"], default: "razorpay" },
        razorpayOrderId: String,
        razorpayPaymentId: String,
        razorpaySignature: String,
        amount: { type: Number, required: true },
        status: { type: String, enum: ["captured", "refunded", "failed"], default: "captured" },
        paidAt: { type: Date, default: Date.now },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        notes: String,
      },
    ],
    refunds: [
      {
        refundId: { type: String, required: true },
        paymentId: { type: String },
        amount: { type: Number, required: true },
        reason: String,
        status: { type: String, default: "processed" },
        processedAt: { type: Date, default: Date.now },
        processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    status: {
      type: String,
      enum: [
        "pending_payment",
        "pending",
        "confirmed",
        "fabric_received",
        "cutting",
        "stitching",
        "quality_check",
        "ready_for_pickup",
        "delivered",
        "completed",
        "cancelled",
        "rejected",
      ],
      default: "pending_payment",
    },
    rejectionReason: String,
    rejectedAt: Date,
    completedAt: Date,
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
tailoringOrderSchema.index({ paymentStatus: 1 });
tailoringOrderSchema.index({ "payments.razorpayOrderId": 1 });
tailoringOrderSchema.index({ "payments.razorpayPaymentId": 1 });

tailoringOrderSchema.pre("save", function trackStatus(next) {
  if (this.isModified("status")) {
    this.statusHistory.push({ status: this.status, changedAt: new Date() });
  }

  // 1. Authoritative Total Amount
  if (this.totalAmount === undefined || this.totalAmount === null) {
    this.totalAmount = this.finalPrice ?? this.estimatedPrice ?? 0;
  }

  // 2. Authoritative Payments Ledger calculation
  if (Array.isArray(this.payments) && this.payments.length > 0) {
    const totalCaptured = this.payments
      .filter((p) => p.status === "captured")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    this.amountPaid = totalCaptured;
  }

  // 3. Authoritative Amount Due
  this.amountDue = Math.max(0, (this.totalAmount || 0) - (this.amountPaid || 0));

  // 4. Authoritative Payment Status
  if (this.amountDue === 0 && this.amountPaid >= this.totalAmount && (this.totalAmount || 0) > 0) {
    this.paymentStatus = "paid";
  } else if (this.amountPaid > 0 && this.paymentStatus !== "refunded" && this.paymentStatus !== "partially_refunded") {
    this.paymentStatus = "partially_paid";
  }

  next();
});


module.exports = mongoose.model("TailoringOrder", tailoringOrderSchema);

