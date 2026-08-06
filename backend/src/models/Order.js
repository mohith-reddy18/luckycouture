const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: String, // snapshot at time of order
    image: String,
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    size: String,
    color: String,
    tailoringRequested: { type: Boolean, default: false }, // "buy as-is or have it tailored"
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, default: () => `ORD-${uuidv4().slice(0, 8).toUpperCase()}` },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
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
    status: {
      type: String,
      enum: ["placed", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned"],
      default: "placed",
    },
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

orderSchema.pre("save", function trackStatus(next) {
  if (this.isModified("status")) {
    this.statusHistory.push({ status: this.status, changedAt: new Date() });
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
