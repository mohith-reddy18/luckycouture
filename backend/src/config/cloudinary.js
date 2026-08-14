/**
 * Cloudinary configuration.
 *
 * Supports both:
 * 1. CLOUDINARY_URL (e.g. cloudinary://<api_key>:<api_secret>@<cloud_name>)
 * 2. Individual keys: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 *
 * In development, if neither is provided, uploads fall back to local disk storage.
 * In production, Cloudinary is required for persistent external CDN asset storage.
 */
const cloudinary = require("cloudinary").v2;

const hasIndividualKeys = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

const hasCloudinaryUrl = Boolean(process.env.CLOUDINARY_URL);

const isConfigured = hasIndividualKeys || hasCloudinaryUrl;

if (isConfigured) {
  if (hasIndividualKeys) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  } else if (hasCloudinaryUrl) {
    cloudinary.config({
      cloudinary_url: process.env.CLOUDINARY_URL,
      secure: true,
    });
  }
}

module.exports = { cloudinary, isCloudinaryConfigured: isConfigured };
