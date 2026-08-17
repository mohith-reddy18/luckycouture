const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    design: { type: mongoose.Schema.Types.ObjectId, ref: "Design" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" }, // used to verify product purchase
    tailoringOrder: { type: mongoose.Schema.Types.ObjectId, ref: "TailoringOrder" }, // used to verify design order
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: String,
    comment: { type: String, required: true },
    images: [{ url: String, publicId: String }],
    isVerifiedPurchase: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    status: { type: String, enum: ["visible", "hidden"], default: "visible" },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ design: 1, createdAt: -1 });
reviewSchema.index(
  { product: 1, user: 1 },
  {
    unique: true,
    partialFilterExpression: { product: { $exists: true, $type: "objectId" } },
  }
);
reviewSchema.index(
  { design: 1, user: 1 },
  {
    unique: true,
    partialFilterExpression: { design: { $exists: true, $type: "objectId" } },
  }
);

module.exports = mongoose.model("Review", reviewSchema);

