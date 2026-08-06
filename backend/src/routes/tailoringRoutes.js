const express = require("express");
const { protect, authorize, optionalAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { tailoringOrderRules } = require("../validators/tailoringValidators");
const {
  createTailoringOrder,
  getMyTailoringOrders,
  getTailoringOrder,
  getAvailability,
  listAllTailoringOrders,
  updateTailoringStatus,
} = require("../controllers/tailoringController");

const router = express.Router();

router.get("/availability", getAvailability);
router.post("/", optionalAuth, tailoringOrderRules, validate, createTailoringOrder);

router.get("/me", protect, getMyTailoringOrders);
router.get("/:id", optionalAuth, getTailoringOrder);

router.get("/", protect, authorize("admin"), listAllTailoringOrders);
router.patch("/:id/status", protect, authorize("admin"), updateTailoringStatus);

module.exports = router;
