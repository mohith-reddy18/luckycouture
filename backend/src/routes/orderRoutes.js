const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const {
  placeOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  listAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");

const router = express.Router();

router.use(protect);
router.post("/", placeOrder);
router.get("/", authorize("admin"), listAllOrders);
router.get("/me", getMyOrders);
router.get("/:id", getOrder);
router.patch("/:id/cancel", cancelOrder);
router.patch("/:id/status", authorize("admin"), updateOrderStatus);

module.exports = router;
