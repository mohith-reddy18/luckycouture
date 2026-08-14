const fs = require("fs");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

/**
 * Given a multer file written to temporary /uploads, persists it to
 * Cloudinary (if configured) or returns a local fallback path.
 */
async function persistUploadedFile(file, folder = "lucky-couture") {
  if (isCloudinaryConfigured) {
    const result = await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: "auto",
      use_filename: true,
      unique_filename: true,
    });
    // Remove local temp file after upload to Cloudinary
    fs.unlink(file.path, () => {});
    return { url: result.secure_url || result.url, publicId: result.public_id };
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[Lucky Couture Storage Warning] Cloudinary credentials are not configured in production. Uploads are falling back to local disk storage, which does not persist across container restarts or serverless lambdas. Please set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in your hosting environment variables."
    );
  }

  return { url: `/uploads/${file.filename}`, publicId: file.filename };
}

async function deleteUploadedFile(publicId) {
  if (!publicId) return;
  if (isCloudinaryConfigured) {
    await cloudinary.uploader.destroy(publicId).catch(() => {});
  } else {
    const path = require("path").join(__dirname, "..", "..", "uploads", publicId);
    fs.unlink(path, () => {});
  }
}

module.exports = { persistUploadedFile, deleteUploadedFile };
