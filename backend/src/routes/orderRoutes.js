const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  placeOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  listAllOrders,
  updateOrderStatus,
  completeOrder,
  rejectOrder,
} = require("../controllers/orderController");

const router = express.Router();

router.use(protect);
router.post("/", placeOrder);
router.get("/", authorize("admin"), listAllOrders);
router.get("/me", getMyOrders);
router.get("/:id", getOrder);
router.patch("/:id/cancel", cancelOrder);
router.patch("/:id/status", authorize("admin"), updateOrderStatus);
router.patch("/:id/complete", authorize("admin"), completeOrder);
router.patch("/:id/reject", authorize("admin"), rejectOrder);

module.exports = router;

