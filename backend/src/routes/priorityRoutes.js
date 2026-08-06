const express = require("express");
const { protect, authorize, optionalAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { priorityOrderRules } = require("../validators/tailoringValidators");
const {
  createPriorityOrder,
  getMyPriorityOrders,
  getPriorityOrder,
  getPriorityAvailability,
  listAllPriorityOrders,
  approvePriorityOrder,
  rejectPriorityOrder,
  updatePriorityOrder,
} = require("../controllers/priorityController");

const router = express.Router();

router.get("/availability", getPriorityAvailability);
router.post("/", optionalAuth, priorityOrderRules, validate, createPriorityOrder);

router.get("/me", protect, getMyPriorityOrders);
router.get("/:id", optionalAuth, getPriorityOrder);

router.get("/", protect, authorize("admin"), listAllPriorityOrders);
router.patch("/:id/approve", protect, authorize("admin"), approvePriorityOrder);
router.patch("/:id/reject", protect, authorize("admin"), rejectPriorityOrder);
router.patch("/:id/status", protect, authorize("admin"), updatePriorityOrder);

module.exports = router;
