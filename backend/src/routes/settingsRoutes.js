const express = require("express");
const { getPublicSettings } = require("../controllers/adminSettingController");

const router = express.Router();

// Public, read-only subset of AdminSetting — e.g. the frontend uses this to
// know whether Priority Stitching is currently enabled without needing auth.
router.get("/public", getPublicSettings);

module.exports = router;
