const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const { placeOrder, getMyOrders, getOrder, listAllOrders, updateOrderStatus } = require("../controllers/orderController");

const router = express.Router();

router.use(protect);
router.post("/", placeOrder);
router.get("/me", getMyOrders);
router.get("/:id", getOrder);

router.get("/", authorize("admin"), listAllOrders);
router.patch("/:id/status", authorize("admin"), updateOrderStatus);

module.exports = router;
