const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    sku: { type: String, unique: true, sparse: true },
    images: [{ url: String, publicId: String }],
    thumbnail: { url: String, publicId: String },
    sizes: [{ type: String }],
    colors: [{ type: String }],
    fabric: { type: String },
    stock: { type: Number, default: 0, min: 0 },
    tags: [{ type: String }],
    isFeatured: { type: Boolean, default: false },
    isBestseller: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: true },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    tailoringAvailable: { type: Boolean, default: true }, // "have any piece professionally tailored"
    status: { type: String, enum: ["active", "draft", "archived"], default: "active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isBestseller: 1, isNewArrival: 1 });

productSchema.virtual("discountPercent").get(function discountPercent() {
  if (!this.mrp || this.mrp <= this.price) return 0;
  return Math.round(100 - (this.price / this.mrp) * 100);
});

productSchema.virtual("stockStatus").get(function stockStatus() {
  if (this.stock <= 0) return "out_of_stock";
  if (this.stock <= 5) return "low_stock";
  return "in_stock";
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Product", productSchema);
