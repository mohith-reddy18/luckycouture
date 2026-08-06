/**
 * Cloudinary is optional. If credentials are present in the environment,
 * uploads are sent to Cloudinary; otherwise the upload middleware falls
 * back to local disk storage under /uploads (see middleware/upload.js).
 * This keeps the API fully functional in development without requiring
 * a Cloudinary account, while being production-ready once configured.
 */
const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

let cloudinary = null;

if (isConfigured) {
  cloudinary = require("cloudinary").v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

module.exports = { cloudinary, isCloudinaryConfigured: isConfigured };
