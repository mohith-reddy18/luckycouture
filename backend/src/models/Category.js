const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    type: {
      type: String,
      enum: ["shop", "design", "both"],
      default: "both",
    }, // distinguishes Shop categories (Sarees/Dresses/Nighties/Wedding) from Design Gallery categories
    description: { type: String },
    image: { url: String, publicId: String },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

categorySchema.index({ type: 1, isActive: 1 });

module.exports = mongoose.model("Category", categorySchema);
