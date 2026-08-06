const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const TailoringOrder = require("../models/TailoringOrder");
const AdminSetting = require("../models/AdminSetting");
const Notification = require("../models/Notification");
const { findNextAvailableDate } = require("../utils/capacityCalculator");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");

// POST /api/tailoring — works for both logged-in customers and guests
const createTailoringOrder = asyncHandler(async (req, res) => {
  const settings = await AdminSetting.getSingleton();

  const scheduledDate = await findNextAvailableDate({
    isPriority: false,
    dailyCapacity: settings.dailyTailoringCapacity,
  });

  const expectedDeliveryDate = new Date(scheduledDate);
  expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + (req.body.isFastDelivery ? 1 : 5));

  const order = await TailoringOrder.create({
    ...req.body,
    customer: req.user?._id,
    scheduledDate,
    expectedDeliveryDate,
    status: "pending",
  });

  if (req.user) {
    await Notification.create({
      user: req.user._id,
      type: "booking_confirmed",
      title: "Tailoring booking received",
      message: `Your ${order.garmentType} booking is confirmed for ${expectedDeliveryDate.toDateString()}.`,
      link: `/orders/tailoring/${order._id}`,
    });
  }

  sendResponse(res, 201, "Tailoring order booked", order);
});

// GET /api/tailoring/me
const getMyTailoringOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { customer: req.user._id };

  const [items, total] = await Promise.all([
    TailoringOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    TailoringOrder.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Tailoring orders fetched", items, buildPaginationMeta(page, limit, total));
});

// GET /api/tailoring/:id
const getTailoringOrder = asyncHandler(async (req, res) => {
  const order = await TailoringOrder.findById(req.params.id).populate("referenceDesign", "title thumbnail");
  if (!order) throw new ApiError(404, "Tailoring order not found");

  const isOwner = order.customer
    ? Boolean(req.user && order.customer.toString() === req.user._id.toString())
    : true;
  if (!isOwner && req.user?.role !== "admin") throw new ApiError(403, "Not authorized to view this order");

  sendResponse(res, 200, "Tailoring order fetched", order);
});

// GET /api/tailoring/availability?date=YYYY-MM-DD — lets the frontend show remaining slots before booking
const getAvailability = asyncHandler(async (req, res) => {
  const settings = await AdminSetting.getSingleton();
  const date = req.query.date ? new Date(req.query.date) : new Date();
  date.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const bookedCount = await TailoringOrder.countDocuments({
    scheduledDate: { $gte: date, $lte: dayEnd },
    status: { $nin: ["cancelled", "rejected"] },
  });

  sendResponse(res, 200, "Availability fetched", {
    date,
    dailyCapacity: settings.dailyTailoringCapacity,
    booked: bookedCount,
    remaining: Math.max(settings.dailyTailoringCapacity - bookedCount, 0),
    isFull: bookedCount >= settings.dailyTailoringCapacity,
  });
});

// --- Admin ---

// GET /api/tailoring (admin)
const listAllTailoringOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const [items, total] = await Promise.all([
    TailoringOrder.find(filter).populate("customer", "name email phone").sort({ scheduledDate: 1 }).skip(skip).limit(limit),
    TailoringOrder.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Tailoring orders fetched", items, buildPaginationMeta(page, limit, total));
});

// PATCH /api/tailoring/:id/status (admin)
const updateTailoringStatus = asyncHandler(async (req, res) => {
  const { status, adminNotes, assignedTailor } = req.body;
  const order = await TailoringOrder.findByIdAndUpdate(
    req.params.id,
    { ...(status && { status }), ...(adminNotes && { adminNotes }), ...(assignedTailor && { assignedTailor }) },
    { new: true }
  );
  if (!order) throw new ApiError(404, "Tailoring order not found");

  if (order.customer) {
    await Notification.create({
      user: order.customer,
      type: "tailoring_status",
      title: "Tailoring order update",
      message: `Your order ${order.orderNumber} is now ${order.status.replace(/_/g, " ")}.`,
      link: `/orders/tailoring/${order._id}`,
    });
  }

  sendResponse(res, 200, "Tailoring order updated", order);
});

module.exports = {
  createTailoringOrder,
  getMyTailoringOrders,
  getTailoringOrder,
  getAvailability,
  listAllTailoringOrders,
  updateTailoringStatus,
};
