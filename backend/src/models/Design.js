const mongoose = require("mongoose");

const designSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    description: { type: String },
    images: [{ url: String, publicId: String }],
    thumbnail: { url: String, publicId: String },
    fabricRecommendation: [{ type: String }],
    occasion: [{ type: String }],
    difficultyLevel: { type: String, enum: ["simple", "moderate", "heavy"], default: "moderate" },
    estimatedStitchingDays: { type: Number, default: 5 },
    estimatedPrice: { type: Number },
    tags: [{ type: String }],
    status: { type: String, enum: ["active", "draft", "pending_review", "rejected", "archived"], default: "active" },
    source: { type: String, enum: ["admin", "customer"], default: "admin" },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // set when source === "customer"
    moderationNote: String, // admin's reason if rejected
    isFeatured: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    wishlistCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // --- CMS pricing & garment fields (added for Admin Catalog Management) ---
    // The stitching/work cost charged for this design (does NOT include fabric)
    designCost: { type: Number, min: 0 },
    // Garment type this design applies to (Blouse, Kurti, Lehenga, etc.)
    garment: { type: String, trim: true },
    // Human-readable design complexity label used by DesignDetail & tailoring
    designType: { type: String, trim: true },
    // How many metres of fabric are typically required for this garment
    standardFabricQty: { type: Number, min: 0 },
    // Which fabrics are suitable for this design
    availableFabrics: [{ type: String }],
    // Display sort order (lower = shown first in gallery)
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

designSchema.index({ title: "text", description: "text", tags: "text" });
designSchema.index({ category: 1, status: 1 });
designSchema.index({ isFeatured: 1, createdAt: -1 });
designSchema.index({ source: 1, status: 1 });
designSchema.index({ submittedBy: 1 });

module.exports = mongoose.model("Design", designSchema);
