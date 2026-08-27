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
    colorVariants: [
      {
        color: { type: String, trim: true },
        images: [{ url: String, publicId: String }],
        thumbnail: { url: String, publicId: String },
        inventory: [
          {
            size: { type: String, trim: true, required: true },
            quantity: { type: Number, default: 0, min: 0 },
            measurements: { type: Map, of: String, default: {} },
            bust: { type: String, trim: true },
            waist: { type: String, trim: true },
            shoulder: { type: String, trim: true },
            hip: { type: String, trim: true },
            length: { type: String, trim: true },
            inseam: { type: String, trim: true },
            topWaist: { type: String, trim: true },
            bottomWaist: { type: String, trim: true },
            bottomLength: { type: String, trim: true },
          },
        ],
        sizes: [{ type: String }],
      },
    ],
    sizeChart: [
      {
        size: { type: String, trim: true },
        bust: { type: String, trim: true },
        waist: { type: String, trim: true },
        shoulder: { type: String, trim: true },
        hip: { type: String, trim: true },
        length: { type: String, trim: true },
        inseam: { type: String, trim: true },
        topWaist: { type: String, trim: true },
        bottomWaist: { type: String, trim: true },
        bottomLength: { type: String, trim: true },
        measurements: { type: Map, of: String, default: {} },
      },
    ],
    fabric: { type: String },
    fabricCategory: { type: String, trim: true },
    fabricTypes: [{ type: String, trim: true }],
    stock: { type: Number, default: 0, min: 0 },
    tags: [{ type: String }],
    isFeatured: { type: Boolean, default: false },
    isBestseller: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: true },
    unitsSold: { type: Number, default: 0, min: 0 },
    limitedTimeDeal: {
      enabled: { type: Boolean, default: false },
      startDate: { type: Date },
      endDate: { type: Date },
    },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    tailoringAvailable: { type: Boolean, default: true }, // "have any piece professionally tailored"
    status: { type: String, enum: ["active", "draft", "archived"], default: "active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Product Details fields
    dimensions: { type: String, trim: true },
    netQuantity: { type: String, trim: true, default: "1 N" },
    // Key-value product specs shown on the Product Detail page (e.g. Fabric, Wash Care, Set Includes)
    specifications: [
      {
        label: { type: String, trim: true },
        value: { type: String, trim: true },
      },
    ],
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ status: 1, category: 1, createdAt: -1 });
productSchema.index({ status: 1, price: 1 });
productSchema.index({ status: 1, ratingAverage: -1 });
productSchema.index({ status: 1, isBestseller: 1, isNewArrival: 1, unitsSold: -1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ price: 1 });

productSchema.virtual("discountPercent").get(function discountPercent() {
  if (!this.mrp || this.mrp <= this.price) return 0;
  return Math.round(100 - (this.price / this.mrp) * 100);
});

productSchema.virtual("stockStatus").get(function stockStatus() {
  if (this.stock <= 0) return "out_of_stock";
  if (this.stock <= 5) return "low_stock";
  return "in_stock";
});

productSchema.virtual("isDealActive").get(function isDealActive() {
  if (!this.limitedTimeDeal || !this.limitedTimeDeal.enabled) return false;
  const now = new Date();
  if (this.limitedTimeDeal.startDate && new Date(this.limitedTimeDeal.startDate) > now) return false;
  if (this.limitedTimeDeal.endDate && new Date(this.limitedTimeDeal.endDate) < now) return false;
  return true;
});

productSchema.pre("save", function (next) {
  if (this.sku === "" || (typeof this.sku === "string" && !this.sku.trim())) {
    this.sku = undefined;
  }

  // Calculate and sync variant inventory, sizes, and colors
  if (Array.isArray(this.colorVariants) && this.colorVariants.length > 0) {
    let totalVariantStock = 0;
    let hasVariantInventory = false;
    const allColors = [];
    const allSizes = new Set();

    this.colorVariants.forEach((cv) => {
      if (cv.color && cv.color.trim()) {
        allColors.push(cv.color.trim());
      }
      if (Array.isArray(cv.inventory) && cv.inventory.length > 0) {
        hasVariantInventory = true;
        cv.sizes = cv.inventory.map((inv) => inv.size).filter(Boolean);
        cv.inventory.forEach((inv) => {
          totalVariantStock += Number(inv.quantity) || 0;
          if (inv.size) allSizes.add(inv.size);
        });
      } else if (Array.isArray(cv.sizes) && cv.sizes.length > 0) {
        // Migration fallback for legacy colorVariants without inventory
        cv.inventory = cv.sizes.map((s) => ({
          size: s,
          quantity: Math.max(0, Math.floor((this.stock || 0) / (cv.sizes.length || 1))),
        }));
        cv.sizes.forEach((s) => allSizes.add(s));
      }
    });

    if (hasVariantInventory || totalVariantStock > 0) {
      this.stock = totalVariantStock;
    }
    if (allColors.length > 0) {
      this.colors = Array.from(new Set(allColors));
    }
    if (allSizes.size > 0) {
      this.sizes = Array.from(allSizes);
    }
  }

  next();
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Product", productSchema);
