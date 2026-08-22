const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product:  { type: mongoose.Schema.Types.ObjectId, ref: "Product" }, // optional — null when product is not in DB
    name:     String,
    image:    String,
    price:    { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    size:     String,
    color:    String,
    tailoringRequested: { type: Boolean, default: false },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // Customer-facing reference ID: 15-digit numeric string, cryptographically
    // generated in the controller with a collision-retry loop.
    // MongoDB _id is kept for all internal relationships and authorization.
    orderId: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    needsDelivery: { type: Boolean, default: true },
    isLongDistance: { type: Boolean, default: false },
    shippingAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
      phone: String,
    },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    couponCode: String,
    paymentMethod: { type: String, enum: ["cod", "razorpay", "upi", "card"], default: "cod" },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    // Razorpay-specific payment tracking
    razorpayOrderId:   { type: String, index: true },   // Razorpay order ID (order_xxx)
    razorpayPaymentId: { type: String, index: true },   // Razorpay payment ID after success (pay_xxx)
    razorpaySignature: { type: String },
    advancePaid:       { type: Number, default: 0 },  // 30% advance collected
    balanceDue:        { type: Number, default: 0 },  // 70% remaining at delivery
    refundStatus:      { type: String, enum: ["none", "created", "processed", "failed"], default: "none" },
    refunds: [
      {
        refundId: String,
        paymentId: String,
        amount: Number,
        status: String,
        createdAt: { type: Date, default: Date.now },
        processedAt: Date,
      },
    ],
    disputes: [
      {
        disputeId: String,
        paymentId: String,
        amount: Number,
        status: String,
        reason: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    discrepancy: {
      receivedPaise: Number,
      expectedPaise: Number,
      razorpayPaymentId: String,
      recordedAt: Date,
      reason: String,
    },
    // Stock management: true = inventory already decremented for this order
    stockDeducted: { type: Boolean, default: false },
    estimatedDeliveryDate: Date,
    deliveryDateReviewed: { type: Boolean, default: false },
    linkedTailoringOrder: { type: mongoose.Schema.Types.ObjectId, ref: "TailoringOrder" },
    status: {
      type: String,
      enum: ["placed", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned"],
      default: "placed",
    },
    stockRestored: { type: Boolean, default: false },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ estimatedDeliveryDate: 1, status: 1 });

orderSchema.pre("save", function trackStatus(next) {
  if (this.isModified("status")) {
    this.statusHistory.push({ status: this.status, changedAt: new Date() });
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
