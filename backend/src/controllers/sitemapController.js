const asyncHandler = require("../utils/asyncHandler");
const Product = require("../models/Product");
const Design = require("../models/Design");
const BlogPost = require("../models/BlogPost");

const SITE_URL = "https://www.luckycouture.in";

const staticRoutes = [
  { url: "/", changefreq: "daily", priority: "1.0" },
  { url: "/shop", changefreq: "daily", priority: "0.9" },
  { url: "/design-gallery", changefreq: "daily", priority: "0.9" },
  { url: "/tailoring", changefreq: "weekly", priority: "0.8" },
  { url: "/priority-stitching", changefreq: "weekly", priority: "0.8" },
  { url: "/blog", changefreq: "daily", priority: "0.85" },
  { url: "/about", changefreq: "monthly", priority: "0.7" },
  { url: "/contact", changefreq: "monthly", priority: "0.7" },
  { url: "/support", changefreq: "monthly", priority: "0.7" },
  { url: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { url: "/terms", changefreq: "yearly", priority: "0.3" },
  { url: "/refund-policy", changefreq: "yearly", priority: "0.3" },
  { url: "/cancellation-policy", changefreq: "yearly", priority: "0.3" },
];

/**
 * GET /sitemap.xml or GET /api/sitemap.xml
 * Dynamically queries all published blogs, active products, and active designs
 * and streams a valid XML sitemap.
 */
const getDynamicSitemap = asyncHandler(async (req, res) => {
  const [products, designs, blogs] = await Promise.all([
    Product.find({ isActive: { $ne: false } }).select("_id slug updatedAt").lean().catch(() => []),
    Design.find({ isActive: { $ne: false } }).select("_id slug updatedAt").lean().catch(() => []),
    BlogPost.find({ isPublished: { $ne: false } }).select("slug updatedAt").lean().catch(() => []),
  ]);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // 1. Static Pages
  for (const route of staticRoutes) {
    xml += `  <url>\n`;
    xml += `    <loc>${SITE_URL}${route.url}</loc>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  // 2. Blog Posts
  for (const blog of blogs) {
    if (!blog.slug) continue;
    const lastmod = blog.updatedAt ? new Date(blog.updatedAt).toISOString().split("T")[0] : null;
    xml += `  <url>\n`;
    xml += `    <loc>${SITE_URL}/blog/${encodeURIComponent(blog.slug)}</loc>\n`;
    if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>monthly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  // 3. Products
  for (const product of products) {
    const identifier = product.slug || product._id;
    if (!identifier) continue;
    const lastmod = product.updatedAt ? new Date(product.updatedAt).toISOString().split("T")[0] : null;
    xml += `  <url>\n`;
    xml += `    <loc>${SITE_URL}/shop/${encodeURIComponent(identifier)}</loc>\n`;
    if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  // 4. Designs
  for (const design of designs) {
    const identifier = design.slug || design._id;
    if (!identifier) continue;
    const lastmod = design.updatedAt ? new Date(design.updatedAt).toISOString().split("T")[0] : null;
    xml += `  <url>\n`;
    xml += `    <loc>${SITE_URL}/design-gallery/${encodeURIComponent(identifier)}</loc>\n`;
    if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;

  res.header("Content-Type", "application/xml");
  res.header("Cache-Control", "public, max-age=3600"); // 1 hour cache
  res.status(200).send(xml);
});

module.exports = { getDynamicSitemap };
