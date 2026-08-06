const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const { getSettings, updateSettings } = require("../controllers/adminSettingController");
const { getDashboardSummary } = require("../controllers/adminDashboardController");

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/dashboard", getDashboardSummary);
router.get("/settings", getSettings);
router.patch("/settings", updateSettings);

module.exports = router;
