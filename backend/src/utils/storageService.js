const fs = require("fs");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

/**
 * Given a multer file already written to /uploads by middleware/upload.js,
 * either pushes it to Cloudinary (if configured) and removes the local
 * temp copy, or just returns a locally-servable URL. Controllers never
 * need to know which path is active.
 */
async function persistUploadedFile(file, folder = "lucky-couture") {
  if (isCloudinaryConfigured) {
    const result = await cloudinary.uploader.upload(file.path, { folder });
    fs.unlink(file.path, () => {});
    return { url: result.secure_url, publicId: result.public_id };
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
