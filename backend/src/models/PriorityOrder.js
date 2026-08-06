const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const priorityOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, default: () => `PRI-${uuidv4().slice(0, 8).toUpperCase()}` },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    guestInfo: {
      name: String,
      phone: String,
      email: String,
    },
    garmentType: { type: String, required: true },
    fabricSource: { type: String, enum: ["customer_provided", "shop_provided"], required: true },
    measurements: { type: Map, of: Number, default: {} },
    referenceImages: [{ url: String, publicId: String }],
    description: String,
    scheduledDate: { type: Date, required: true },
    expectedDeliveryAt: { type: Date, required: true }, // 24-30hr window from confirmation
    surchargePercent: { type: Number, required: true, min: 0 },
    basePrice: Number,
    finalPrice: Number,
    paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "in_progress", "ready_for_pickup", "delivered", "cancelled"],
      default: "pending",
    },
    assignedTailor: String,
    adminNotes: String,
  },
  { timestamps: true }
);

priorityOrderSchema.index({ customer: 1, createdAt: -1 });
priorityOrderSchema.index({ scheduledDate: 1, status: 1 });

module.exports = mongoose.model("PriorityOrder", priorityOrderSchema);
