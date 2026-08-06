const express = require("express");
const { protect, authorize, optionalAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { uploadSingle, uploadMultiple } = require("../controllers/uploadController");

const router = express.Router();

// Admin-only: product/design/category imagery management.
router.post("/", protect, authorize("admin"), upload.single("image"), uploadSingle);
router.post("/multiple", protect, authorize("admin"), upload.array("images", 10), uploadMultiple);

// Open to guests and logged-in customers alike: reference images attached
// to a tailoring or priority stitching booking. Multer's file-type/size
// limits still apply, and rate limiting is handled globally in app.js.
router.post("/reference-images", optionalAuth, upload.array("images", 5), uploadMultiple);

module.exports = router;
