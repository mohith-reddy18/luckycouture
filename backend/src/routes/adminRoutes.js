const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const { getSettings, updateSettings } = require("../controllers/adminSettingController");
const { getDashboardSummary } = require("../controllers/adminDashboardController");
const { listAdminOrders, listAdminPayments } = require("../controllers/adminOrderController");

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/dashboard", getDashboardSummary);
router.get("/orders", listAdminOrders);
router.get("/payments", listAdminPayments);
router.get("/settings", getSettings);
router.patch("/settings", updateSettings);

module.exports = router;

