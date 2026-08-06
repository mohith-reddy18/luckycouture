const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const { persistUploadedFile } = require("../utils/storageService");

// POST /api/uploads (single file, field name "image")
const uploadSingle = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No file uploaded");
  const result = await persistUploadedFile(req.file, req.body.folder || "lucky-couture");
  sendResponse(res, 201, "File uploaded", result);
});

// POST /api/uploads/multiple (field name "images")
const uploadMultiple = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) throw new ApiError(400, "No files uploaded");
  const results = await Promise.all(req.files.map((f) => persistUploadedFile(f, req.body.folder || "lucky-couture")));
  sendResponse(res, 201, "Files uploaded", results);
});

module.exports = { uploadSingle, uploadMultiple };
