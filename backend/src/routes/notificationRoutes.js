const express = require("express");
const { protect } = require("../middleware/auth");
const { listNotifications, markAsRead, markAllAsRead } = require("../controllers/notificationController");

const router = express.Router();

router.use(protect);
router.get("/", listNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

module.exports = router;
