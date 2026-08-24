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
    platformFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    couponCode: String,
    paymentMethod: { type: String, enum: ["cod", "razorpay", "upi", "card"], default: "cod" },
    paymentStatus: {
      type: String,
      enum: ["pending", "partially_paid", "paid", "refunded", "partially_refunded", "failed"],
      default: "pending",
    },
    // Multi-transaction payment ledger (online Razorpay + offline cash/POS)
    payments: [
      {
        paymentType: { type: String, enum: ["advance", "balance", "full"], default: "advance" },
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
    // Razorpay-specific payment tracking
    razorpayOrderId:   { type: String, index: true },   // Razorpay order ID (order_xxx)
    razorpayPaymentId: { type: String, index: true },   // Razorpay payment ID after success (pay_xxx)
    razorpaySignature: { type: String },
    advancePaid:       { type: Number, default: 0 },  // 30% advance collected
    balanceDue:        { type: Number, default: 0 },  // 70% remaining at delivery
    totalAmount:       { type: Number },              // Authoritative total
    amountPaid:        { type: Number, default: 0 },  // Authoritative verified paid
    amountDue:         { type: Number, default: 0 },  // Authoritative remaining due
    refundStatus:      { type: String, enum: ["none", "created", "processed", "failed"], default: "none" },
    refunds: [
      {
        refundId: String,
        paymentId: String,
        amount: Number,
        reason: String,
        status: String,
        createdAt: { type: Date, default: Date.now },
        processedAt: Date,
        processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
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
    rejectionReason: { type: String },
    rejectedAt: { type: Date },
    completedAt: { type: Date },
    status: {
      type: String,
      enum: ["placed", "confirmed", "packed", "shipped", "delivered", "completed", "cancelled", "returned", "rejected"],
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
  // 1. Authoritative Total Amount synchronization
  if (this.totalAmount === undefined || this.totalAmount === null) {
    this.totalAmount = this.total ?? 0;
  }
  this.total = this.totalAmount;

  // 2. Authoritative Payments Ledger calculation if payments exist
  if (Array.isArray(this.payments) && this.payments.length > 0) {
    const totalCaptured = this.payments
      .filter((p) => p.status === "captured")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    this.amountPaid = totalCaptured;
  } else {
    if (this.amountPaid === undefined || this.amountPaid === null) {
      this.amountPaid = this.advancePaid ?? 0;
    }
  }
  this.advancePaid = this.amountPaid;

  // 3. Authoritative Amount Due synchronization
  this.amountDue = Math.max(0, (this.totalAmount || 0) - (this.amountPaid || 0));
  this.balanceDue = this.amountDue;

  // 4. Authoritative Payment Status update
  if (this.amountDue === 0 && this.amountPaid >= this.totalAmount && (this.totalAmount || 0) > 0) {
    this.paymentStatus = "paid";
  } else if (this.amountPaid > 0 && this.paymentStatus !== "refunded" && this.paymentStatus !== "partially_refunded") {
    this.paymentStatus = "partially_paid";
  }

  if (this.isModified("status")) {
    this.statusHistory.push({ status: this.status, changedAt: new Date() });
  }
  next();
});



module.exports = mongoose.model("Order", orderSchema);
