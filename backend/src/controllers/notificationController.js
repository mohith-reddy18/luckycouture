const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/ApiResponse");
const Notification = require("../models/Notification");

// GET /api/notifications
const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
  sendResponse(res, 200, "Notifications fetched", { notifications, unreadCount });
});

// PATCH /api/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isRead: true });
  sendResponse(res, 200, "Notification marked as read");
});

// PATCH /api/notifications/read-all
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  sendResponse(res, 200, "All notifications marked as read");
});

module.exports = { listNotifications, markAsRead, markAllAsRead };
