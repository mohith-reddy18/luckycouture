const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const sendResponse = require("../utils/ApiResponse");
const TailoringOrder = require("../models/TailoringOrder");
const Design = require("../models/Design");
const AdminSetting = require("../models/AdminSetting");
const Notification = require("../models/Notification");
const { findNextAvailableDate } = require("../utils/capacityCalculator");
const { getPagination, buildPaginationMeta } = require("../utils/paginate");
const { generateOrderId } = require("../utils/generateOrderId");
const User = require("../models/User");

const COMPLEXITY_PRICING = {
  simple: 600,
  embroidery: 2500,
  maggam: 6500,
  other: 1500,
};

const FABRIC_PRICING = {
  cotton: 350,
  silk: 850,
  "premium silk": 1450,
  georgette: 450,
  chiffon: 400,
  velvet: 950,
  satin: 500,
  net: 300,
  linen: 600,
};

const STANDARD_FABRIC_REQUIREMENTS = {
  Blouse: 1,
  "Saree Blouse": 1,
  Kurti: 2.5,
  Lehenga: 4,
  Frock: 3,
  Nightie: 3,
  "School Uniform": 2.5,
  Other: 2,
};

function mapComplexityToEnum(val) {
  if (!val) return "simple";
  const str = String(val).trim();
  if (str === "simple" || str === "Simple Design") return "simple";
  if (str === "embroidery" || str === "Heavy — Embroidery") return "embroidery";
  if (str === "maggam" || str === "Heavy — Maggam Work") return "maggam";
  if (str === "other" || str === "Other") return "other";

  const lower = str.toLowerCase();
  if (lower.includes("maggam")) return "maggam";
  if (lower.includes("embroidery")) return "embroidery";
  if (lower.includes("simple")) return "simple";
  return "other";
}

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

  // --- Backend verified price calculation based on design complexity and fabric ---
  let refDesignDoc = null;
  if (req.body.referenceDesign) {
    const ref = String(req.body.referenceDesign).trim();
    if (mongoose.Types.ObjectId.isValid(ref)) {
      refDesignDoc = await Design.findById(ref);
    }
    if (!refDesignDoc) {
      refDesignDoc = await Design.findOne({
        $or: [{ slug: ref.toLowerCase() }, { title: ref }],
      });
    }
  }

  let finalComplexity = "simple";
  if (refDesignDoc) {
    finalComplexity = mapComplexityToEnum(
      refDesignDoc.designType || refDesignDoc.difficultyLevel || req.body.designComplexity || "simple"
    );
  } else if (req.body.designComplexity) {
    finalComplexity = mapComplexityToEnum(req.body.designComplexity);
  }

  let calculatedDesignCost = 0;
  if (refDesignDoc && refDesignDoc.designCost != null && refDesignDoc.designCost > 0) {
    calculatedDesignCost = Number(refDesignDoc.designCost);
  } else if (refDesignDoc && refDesignDoc.price != null && refDesignDoc.price > 0) {
    calculatedDesignCost = Number(refDesignDoc.price);
  } else {
    calculatedDesignCost = COMPLEXITY_PRICING[finalComplexity] || 600;
  }

  let calculatedFabricCost = 0;
  if (req.body.fabricSource === "shop_provided") {
    const matKey = (req.body.preferredMaterial || "").toLowerCase().trim();
    const pricePerM = FABRIC_PRICING[matKey] || 400;
    const garment = req.body.garmentType || "Blouse";
    const reqMeters = (refDesignDoc && refDesignDoc.standardFabricQty) || STANDARD_FABRIC_REQUIREMENTS[garment] || 1;
    calculatedFabricCost = pricePerM * reqMeters;
  }

  const prioritySurcharge = req.body.isFastDelivery ? 500 : 0;
  const deliveryCharge = req.body.deliveryMethod === "store_pickup"
    ? 0
    : Math.max(0, Number(req.body.deliveryCharge) || 0);

  // Strictly NO GST
  const estimatedPrice = calculatedDesignCost + calculatedFabricCost + prioritySurcharge + deliveryCharge;

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
        referenceDesign: refDesignDoc ? refDesignDoc._id : (mongoose.Types.ObjectId.isValid(req.body.referenceDesign) ? req.body.referenceDesign : undefined),
        designComplexity: finalComplexity,
        designCost: calculatedDesignCost,
        fabricCost: calculatedFabricCost,
        stitchingCost: 0,
        deliveryCharge,
        estimatedPrice,
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
