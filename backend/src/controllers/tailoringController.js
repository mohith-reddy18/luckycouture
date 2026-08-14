const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const TailoringOrder = require("../models/TailoringOrder");
const AdminSetting = require("../models/AdminSetting");
const Notification = require("../models/Notification");
const { findNextAvailableDate } = require("../utils/capacityCalculator");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");
const { generateOrderId } = require("../utils/generateOrderId");

const User = require("../models/User");

// POST /api/tailoring — works for both logged-in customers and guests
const createTailoringOrder = asyncHandler(async (req, res) => {
  const name = (req.body.guestInfo?.name || req.body.name || req.user?.name || "").trim();
  const email = (req.body.guestInfo?.email || req.body.email || req.user?.email || "").trim();
  const phone = (req.body.guestInfo?.phone || req.body.phone || req.user?.phone || "").trim();

  if (!name) {
    throw new ApiError(400, "Full name is required to book a tailoring order");
  }

  if (!email) {
    throw new ApiError(400, "Email address is required to book a tailoring order");
  }

  if (!phone) {
    throw new ApiError(400, "Your phone number is required so our tailoring team can contact you about your order.");
  }

  const phoneRegex = /^[+]?[0-9\s-]{7,15}$/;
  if (!phoneRegex.test(phone)) {
    throw new ApiError(400, "Please provide a valid contact phone number");
  }

  // If user is authenticated and does not have a saved phone number (e.g. Google login user), save it now to their account profile
  if (req.user && (!req.user.phone || !req.user.phone.trim())) {
    try {
      await User.findByIdAndUpdate(req.user._id, { phone }, { runValidators: true });
      req.user.phone = phone;
    } catch (err) {
      console.error("Failed to update user profile phone number:", err.message);
    }
  }

  const settings = await AdminSetting.getSingleton();

  const scheduledDate = await findNextAvailableDate({
    isPriority: false,
    dailyCapacity: settings.dailyTailoringCapacity,
  });

  const expectedDeliveryDate = new Date(scheduledDate);
  expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + (req.body.isFastDelivery ? 1 : 5));

  // Generate a cryptographically-secure 15-digit orderId.
  // Retry up to 5 times on the rare chance of a collision (duplicate key error).
  let order;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      order = await TailoringOrder.create({
        ...req.body,
        guestInfo: {
          name,
          email,
          phone,
        },
        orderId: generateOrderId("TAIL-"),
        customer: req.user?._id,
        scheduledDate,
        expectedDeliveryDate,
        status: "pending",
      });
      break; // success — exit retry loop
    } catch (err) {
      // 11000 = MongoDB duplicate key error code
      if (err.code !== 11000 || attempt === 4) throw err;
    }
  }

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
  const { id } = req.params;
  // Support lookup by MongoDB _id OR the customer-facing orderId (TAIL-XXX or old 15-digit format)
  const isPublicId = id.startsWith("TAIL-") || (id.length === 15 && /^\d+$/.test(id));
  const order = await TailoringOrder.findOne(
    isPublicId ? { orderId: id } : { _id: id }
  )
    .populate("referenceDesign", "title thumbnail image price designCost designType")
    .populate("customer", "name email phone role");
  if (!order) throw new ApiError(404, "Tailoring order not found");

  const customerId = order.customer?._id ? order.customer._id.toString() : order.customer?.toString();
  const isOwner = customerId
    ? Boolean(req.user && customerId === req.user._id.toString())
    : !req.user;
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
      message: `Your order ${order.orderId} is now ${order.status.replace(/_/g, " ")}.`,
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
