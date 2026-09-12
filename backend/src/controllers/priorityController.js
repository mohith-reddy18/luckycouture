const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const PriorityOrder = require("../models/PriorityOrder");
const AdminSetting = require("../models/AdminSetting");
const Notification = require("../models/Notification");
const { findNextAvailableDate } = require("../utils/capacityCalculator");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");

// POST /api/priority-stitching
const createPriorityOrder = asyncHandler(async (req, res) => {
  const settings = await AdminSetting.getSingleton();
  if (!settings.priorityStitchingEnabled) {
    throw new ApiError(400, "Priority Stitching is currently unavailable — please choose Standard Stitching");
  }

  const scheduledDate = await findNextAvailableDate({
    isPriority: true,
    dailyCapacity: settings.dailyPriorityCapacity,
  });

  const { calculatePriorityTailoringDates } = require("../utils/orderDateCalculator");

  const dateCalc = calculatePriorityTailoringDates({
    scheduledDate,
    productionHours: 30,
    deliveryMethod: req.body.deliveryMethod || "store_pickup",
    isShortDistance: Boolean(req.body.isShortDistance),
    isAndhraPradesh: Boolean(req.body.isAndhraPradesh ?? true),
    city: req.body.deliveryAddress?.city || req.body.city || "",
  });

  const expectedDeliveryAt = dateCalc.expectedDeliveryMaxDate;
  const adminReadyDate = dateCalc.adminReadyDate;
  const expectedDeliveryMinDate = dateCalc.expectedDeliveryMinDate;
  const expectedDeliveryMaxDate = dateCalc.expectedDeliveryMaxDate;

  // Admin configures a min/max surcharge band; midpoint used as the default,
  // final price is confirmed by an admin before approval per the spec.
  const surchargePercent = Math.round((settings.prioritySurchargeMin + settings.prioritySurchargeMax) / 2);

  const order = await PriorityOrder.create({
    ...req.body,
    customer: req.user?._id,
    scheduledDate,
    expectedDeliveryAt,
    adminReadyDate,
    expectedDeliveryMinDate,
    expectedDeliveryMaxDate,
    surchargePercent,
    status: "pending",
  });

  if (req.user) {
    await Notification.create({
      user: req.user._id,
      type: "priority_status",
      title: "Priority Stitching request received",
      message: `We're reviewing availability for your ${order.garmentType}. You'll be notified once it's approved.`,
      link: `/orders/priority/${order._id}`,
    });
  }

  sendResponse(res, 201, "Priority Stitching request submitted", order);
});

// GET /api/priority-stitching/me
const getMyPriorityOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { customer: req.user._id };

  const [items, total] = await Promise.all([
    PriorityOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    PriorityOrder.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Priority orders fetched", items, buildPaginationMeta(page, limit, total));
});

// GET /api/priority-stitching/:id
const getPriorityOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const str = String(id || "").trim();
  const isMongoId = mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str);
  const conditions = [{ orderNumber: str }, { orderId: str }];
  if (isMongoId) {
    conditions.unshift({ _id: str });
  }

  const order = await PriorityOrder.findOne({ $or: conditions }).populate("customer", "name email phone role");
  if (!order) throw new ApiError(404, "Priority order not found");

  const customerId = order.customer?._id ? order.customer._id.toString() : order.customer?.toString();
  const isOwner = Boolean(
    req.user && (
      (customerId && customerId === req.user._id.toString()) ||
      (order.guestInfo?.email && req.user.email && order.guestInfo.email.toLowerCase() === req.user.email.toLowerCase()) ||
      (order.guestInfo?.phone && req.user.phone && order.guestInfo.phone.replace(/\D/g, "") === req.user.phone.replace(/\D/g, ""))
    )
  );
  if (!isOwner && req.user?.role !== "admin") throw new ApiError(403, "Not authorized to view this order");

  const { calculateOrderFinancials } = require("../utils/paymentCalculator");
  const fin = calculateOrderFinancials(order);
  const orderObj = order.toObject ? order.toObject() : { ...order };

  if (orderObj.customer && typeof orderObj.customer === "object") {
    if (!orderObj.customer.phone && order.guestInfo?.phone) {
      orderObj.customer.phone = order.guestInfo.phone;
    }
  } else if (order.customer && mongoose.Types.ObjectId.isValid(String(order.customer))) {
    const User = require("../models/User");
    const userDoc = await User.findById(order.customer).select("name email phone role").lean();
    if (userDoc) {
      if (!userDoc.phone && order.guestInfo?.phone) {
        userDoc.phone = order.guestInfo.phone;
      }
      orderObj.customer = userDoc;
    }
  }

  Object.assign(orderObj, {
    totalAmount: fin.totalAmount,
    advanceRequired: fin.advanceRequired,
    totalPaid: fin.totalPaid,
    amountPaid: fin.totalPaid,
    advancePaid: fin.advancePaid,
    remainingBalance: fin.remainingBalance,
    amountDue: fin.remainingBalance,
    isAdvancePaid: fin.isAdvancePaid,
    isFullyPaid: fin.isFullyPaid,
    isPartiallyPaid: fin.isPartiallyPaid,
    isPendingAdvance: fin.isPendingAdvance,
    paymentStatus: fin.paymentStatus,
    paymentPercentage: fin.paymentPercentage,
  });

  sendResponse(res, 200, "Priority order fetched", orderObj);
});

// GET /api/priority-stitching/availability
const getPriorityAvailability = asyncHandler(async (req, res) => {
  const settings = await AdminSetting.getSingleton();
  const date = req.query.date ? new Date(req.query.date) : new Date();
  date.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const bookedCount = await PriorityOrder.countDocuments({
    scheduledDate: { $gte: date, $lte: dayEnd },
    status: { $nin: ["cancelled", "rejected"] },
  });

  sendResponse(res, 200, "Priority availability fetched", {
    date,
    enabled: settings.priorityStitchingEnabled,
    dailyCapacity: settings.dailyPriorityCapacity,
    booked: bookedCount,
    remaining: Math.max(settings.dailyPriorityCapacity - bookedCount, 0),
    isFull: bookedCount >= settings.dailyPriorityCapacity,
    surchargeRange: { min: settings.prioritySurchargeMin, max: settings.prioritySurchargeMax },
  });
});

// --- Admin ---

// GET /api/priority-stitching (admin)
const listAllPriorityOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const [items, total] = await Promise.all([
    PriorityOrder.find(filter).populate("customer", "name email phone").sort({ scheduledDate: 1 }).skip(skip).limit(limit),
    PriorityOrder.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Priority orders fetched", items, buildPaginationMeta(page, limit, total));
});

// PATCH /api/priority-stitching/:id/approve (admin)
const approvePriorityOrder = asyncHandler(async (req, res) => {
  const order = await PriorityOrder.findByIdAndUpdate(
    req.params.id,
    { status: "approved", finalPrice: req.body.finalPrice, assignedTailor: req.body.assignedTailor },
    { new: true }
  );
  if (!order) throw new ApiError(404, "Priority order not found");
  await notifyStatus(order, "approved");
  sendResponse(res, 200, "Priority order approved", order);
});

// PATCH /api/priority-stitching/:id/reject (admin)
const rejectPriorityOrder = asyncHandler(async (req, res) => {
  const order = await PriorityOrder.findByIdAndUpdate(
    req.params.id,
    { status: "rejected", adminNotes: req.body.reason },
    { new: true }
  );
  if (!order) throw new ApiError(404, "Priority order not found");
  await notifyStatus(order, "rejected");
  sendResponse(res, 200, "Priority order rejected", order);
});

// PATCH /api/priority-stitching/:id/status (admin) — general status/delivery updates
const updatePriorityOrder = asyncHandler(async (req, res) => {
  const { status, expectedDeliveryAt, adminNotes } = req.body;
  const order = await PriorityOrder.findByIdAndUpdate(
    req.params.id,
    { ...(status && { status }), ...(expectedDeliveryAt && { expectedDeliveryAt }), ...(adminNotes && { adminNotes }) },
    { new: true }
  );
  if (!order) throw new ApiError(404, "Priority order not found");
  if (status) await notifyStatus(order, status);
  sendResponse(res, 200, "Priority order updated", order);
});

async function notifyStatus(order, status) {
  if (!order.customer) return;
  await Notification.create({
    user: order.customer,
    type: "priority_status",
    title: "Priority Stitching update",
    message: `Your priority order ${order.orderNumber} is now ${status}.`,
    link: `/orders/priority/${order._id}`,
  });
}

module.exports = {
  createPriorityOrder,
  getMyPriorityOrders,
  getPriorityOrder,
  getPriorityAvailability,
  listAllPriorityOrders,
  approvePriorityOrder,
  rejectPriorityOrder,
  updatePriorityOrder,
};
