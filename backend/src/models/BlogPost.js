const mongoose = require("mongoose");

const blogPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Fashion & Trends",
        "Blouse Designs",
        "Saree Styling",
        "Tailoring Tips",
        "Measurements & Fit",
        "Fabric Guide",
        "Lucky Couture Updates",
      ],
      default: "Fashion & Trends",
    },
    excerpt: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    featuredImage: {
      url: { type: String, required: true },
      alt: { type: String, default: "" },
    },
    author: {
      type: String,
      default: "Lucky Couture Studio",
    },
    readTime: {
      type: String,
      default: "5 min read",
    },
    tags: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ["published", "draft", "archived"],
      default: "published",
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    metaTitle: {
      type: String,
      trim: true,
    },
    metaDescription: {
      type: String,
      trim: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

blogPostSchema.index({ title: "text", excerpt: "text", content: "text", tags: "text" });
blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ category: 1, status: 1, publishedAt: -1 });
blogPostSchema.index({ slug: 1 });

module.exports = mongoose.model("BlogPost", blogPostSchema);
