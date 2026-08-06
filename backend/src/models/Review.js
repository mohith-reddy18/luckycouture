const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" }, // used to verify purchase
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: String,
    comment: { type: String, required: true },
    images: [{ url: String, publicId: String }],
    isVerifiedPurchase: { type: Boolean, default: false },
    status: { type: String, enum: ["visible", "hidden"], default: "visible" },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ product: 1, user: 1 }, { unique: true }); // one review per user per product

module.exports = mongoose.model("Review", reviewSchema);
