const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/ApiResponse");
const Order = require("../models/Order");
const TailoringOrder = require("../models/TailoringOrder");
const PriorityOrder = require("../models/PriorityOrder");
const { getISTDateBoundaries, isISTToday, isISTTomorrow, isISTOverdue } = require("../utils/adminDateUtils");
const {
  TERMINAL_STATUSES,
  isOrderActive,
  getNormalizedCategory,
  normalizeAdminOrder,
} = require("../utils/orderClassifier");

/**
 * Checks whether a normalized order matches a given schedule filter.
 */
function matchesSchedule(order, schedule) {
  if (!schedule || schedule === "all") return true;

  const isActive = isOrderActive(order.status, order.paymentMethod, order.paymentStatus, order.amountPaid);

  if (schedule === "pending") {
    return isActive;
  }

  // Overdue, today, tomorrow apply strictly to active orders with a target delivery deadline
  if (!isActive) return false;

  const targetDate = order.targetDeliveryDate;
  if (!targetDate) return false;

  if (schedule === "overdue") {
    return isISTOverdue(targetDate);
  }

  if (schedule === "today") {
    return isISTToday(targetDate);
  }

  if (schedule === "tomorrow") {
    return isISTTomorrow(targetDate);
  }

  return true;
}

/**
 * GET /api/admin/orders
 * Authoritative unified orders endpoint for Admin Portal.
 * Combines Shopping, Tailoring, and Priority orders with full filtering,
 * server-side pagination, search, and accurate dataset-wide counters.
 */
const listAdminOrders = asyncHandler(async (req, res) => {
  const {
    orderType = "all", // "all" | "shopping" | "tailoring" | "priority"
    schedule = "all",  // "all" | "today" | "tomorrow" | "overdue" | "pending"
    category = "all",  // "all" | "priority" | "regular" | "delivered" | "completed" | "rejected"
    status = "",
    search = "",
    page = 1,
    limit = 20,
    sortBy = "placedAt",
    sortOrder = "desc",
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  // Determine which collections to query based on orderType
  const fetchShopping = orderType === "all" || orderType === "shopping";
  const fetchTailoring = orderType === "all" || orderType === "tailoring";
  const fetchPriority = orderType === "all" || orderType === "priority";

  const queries = [];

  if (fetchShopping) {
    queries.push(
      Order.find({
        // Payment gate: Exclude uncompleted/abandoned Razorpay checkout attempts
        $nor: [
          {
            paymentMethod: "razorpay",
            paymentStatus: "pending",
            amountPaid: 0,
            status: "placed",
            stockDeducted: false,
          },
        ],
      })
        .populate("user", "name email phone")
        .sort({ createdAt: -1 })
        .lean()
        .then((docs) => docs.map((d) => normalizeAdminOrder(d, "shopping")))
    );
  } else {
    queries.push(Promise.resolve([]));
  }

  if (fetchTailoring) {
    queries.push(
      TailoringOrder.find({
        // Payment gate: Exclude uncompleted tailoring attempts if any exists
        $nor: [
          {
            paymentStatus: "pending",
            amountPaid: 0,
            status: "pending_payment",
          },
        ],
      })
        .populate("customer", "name email phone")
        .populate("referenceDesign", "title slug thumbnail image price")
        .sort({ createdAt: -1 })
        .lean()
        .then((docs) => docs.map((d) => normalizeAdminOrder(d, "tailoring")))
    );
  } else {
    queries.push(Promise.resolve([]));
  }

  if (fetchPriority) {
    queries.push(
      PriorityOrder.find()
        .populate("customer", "name email phone")
        .sort({ createdAt: -1 })
        .lean()
        .then((docs) => docs.map((d) => normalizeAdminOrder(d, "priority")))
    );
  } else {
    queries.push(Promise.resolve([]));
  }

  const [shoppingOrders, tailoringOrders, priorityOrders] = await Promise.all(queries);

  // Combine raw list
  const combined = [...shoppingOrders, ...tailoringOrders, ...priorityOrders];

  // ── 1. Compute Dataset-wide counts across current orderType selection ──
  const scheduleCounts = { all: 0, overdue: 0, today: 0, tomorrow: 0, pending: 0 };
  const typeCounts = {
    all: combined.length,
    shopping: shoppingOrders.length,
    tailoring: tailoringOrders.length,
    priority: priorityOrders.length,
  };

  combined.forEach((o) => {
    scheduleCounts.all++;
    if (matchesSchedule(o, "overdue")) scheduleCounts.overdue++;
    if (matchesSchedule(o, "today")) scheduleCounts.today++;
    if (matchesSchedule(o, "tomorrow")) scheduleCounts.tomorrow++;
    if (matchesSchedule(o, "pending")) scheduleCounts.pending++;
  });

  // Compute category counts within active schedule filter
  const categoryCounts = { all: 0, priority: 0, regular: 0, delivered: 0, completed: 0, rejected: 0 };
  combined.forEach((o) => {
    if (schedule !== "all" && !matchesSchedule(o, schedule)) return;
    categoryCounts.all++;
    const cat = getNormalizedCategory(o);
    if (categoryCounts[cat] !== undefined) {
      categoryCounts[cat]++;
    }
  });

  // ── 2. Filter records by schedule, category, status, and search ──
  const filtered = combined.filter((order) => {
    // 1. Schedule Filter
    if (schedule !== "all") {
      if (!matchesSchedule(order, schedule)) return false;
    }

    // 2. Category Tab Filter
    if (category !== "all") {
      const cat = getNormalizedCategory(order);
      if (cat !== category) return false;
    }

    // 3. Status Filter
    if (status && status.trim()) {
      const targetStatus = status.trim().toLowerCase();
      const orderStatus = String(order.status || "").trim().toLowerCase();
      if (orderStatus !== targetStatus) return false;
    }

    // 4. Search Filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const orderId = String(order.displayId || "").toLowerCase();
      const fullId = String(order.orderId || "").toLowerCase();
      const custName = String(order.customer?.name || "").toLowerCase();
      const custEmail = String(order.customer?.email || "").toLowerCase();
      const custPhone = String(order.customer?.phone || "").toLowerCase();
      const items = String(order.itemsSummary || "").toLowerCase();

      const matches =
        orderId.includes(q) ||
        fullId.includes(q) ||
        custName.includes(q) ||
        custEmail.includes(q) ||
        custPhone.includes(q) ||
        items.includes(q);

      if (!matches) return false;
    }

    return true;
  });

  // ── 3. Sort Records ──
  filtered.sort((a, b) => {
    const timeA = new Date(a.placedAt || 0).getTime();
    const timeB = new Date(b.placedAt || 0).getTime();
    return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
  });

  // ── 4. Server-side Pagination ──
  const total = filtered.length;
  const totalPages = Math.ceil(total / limitNum) || 1;
  const skip = (pageNum - 1) * limitNum;
  const paginatedItems = filtered.slice(skip, skip + limitNum);

  sendResponse(res, 200, "Admin orders fetched successfully", paginatedItems, {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
    scheduleCounts,
    categoryCounts,
    typeCounts,
  });
});

/**
 * GET /api/admin/payments
 * Unified Financial Reconciliation & Payments endpoint.
 * Combines payment transactions across Shopping and Tailoring orders.
 */
const listAdminPayments = asyncHandler(async (req, res) => {
  const {
    filter = "all", // "all" | "paid" | "pending" | "refunded" | "disputes"
    search = "",
    page = 1,
    limit = 20,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const [shoppingOrders, tailoringOrders] = await Promise.all([
    Order.find().populate("user", "name email phone").sort({ createdAt: -1 }).lean(),
    TailoringOrder.find().populate("customer", "name email phone").sort({ createdAt: -1 }).lean(),
  ]);

  // Aggregate financial metrics across all orders
  let totalAdvanceCollected = 0;
  let totalBalanceDue = 0;
  let totalRevenue = 0;
  let totalRefunded = 0;

  const allTransactions = [];

  // 1. Process Shopping Orders
  shoppingOrders.forEach((o) => {
    const total = Number(o.totalAmount ?? o.total ?? 0);
    const paid = Number(o.amountPaid ?? o.advancePaid ?? (o.paymentStatus === "paid" ? total : 0));
    const due = Math.max(0, total - paid);
    const isActive = isOrderActive(o.status);

    totalRevenue += total;
    totalAdvanceCollected += paid;
    if (isActive) totalBalanceDue += due;

    if (Array.isArray(o.refunds)) {
      o.refunds.forEach((r) => {
        if (r.status === "processed") totalRefunded += Number(r.amount || 0);
      });
    }

    allTransactions.push({
      _id: o._id,
      orderKind: "shopping",
      kindLabel: "Shopping",
      displayId: o.orderId || String(o._id).slice(-8),
      orderId: o.orderId,
      customerName: o.user?.name || "Customer",
      customerEmail: o.user?.email || "-",
      customerPhone: o.shippingAddress?.phone || o.user?.phone || "-",
      createdAt: o.createdAt,
      paymentMethod: o.paymentMethod ? o.paymentMethod.toUpperCase() : "COD",
      paymentStatus: o.paymentStatus || "pending",
      refundStatus: o.refundStatus || "none",
      totalAmount: total,
      advancePaid: paid,
      balanceDue: due,
      razorpayOrderId: o.razorpayOrderId,
      razorpayPaymentId: o.razorpayPaymentId,
      disputes: o.disputes || [],
      payments: o.payments || [],
      refunds: o.refunds || [],
      status: o.status,
    });
  });

  // 2. Process Tailoring Orders
  tailoringOrders.forEach((t) => {
    const total = Number(
      t.totalAmount ??
      t.finalPrice ??
      t.estimatedPrice ??
      ((t.stitchingCost || 0) + (t.designCost || 0) + (t.fabricCost || 0) + (t.deliveryCharge || 0))
    );
    const paid = Number(t.amountPaid ?? t.advancePaid ?? (t.paymentStatus === "paid" ? total : 0));
    const due = Math.max(0, total - paid);
    const isActive = isOrderActive(t.status);

    totalRevenue += total;
    totalAdvanceCollected += paid;
    if (isActive) totalBalanceDue += due;

    if (Array.isArray(t.refunds)) {
      t.refunds.forEach((r) => {
        if (r.status === "processed") totalRefunded += Number(r.amount || 0);
      });
    }

    // Capture latest Razorpay info from payments ledger if present
    const capturedOnline = (t.payments || []).find((p) => p.paymentMethod === "razorpay" && p.status === "captured");

    allTransactions.push({
      _id: t._id,
      orderKind: "tailoring",
      kindLabel: "Tailoring",
      displayId: t.orderId || String(t._id).slice(-8),
      orderId: t.orderId,
      customerName: t.customer?.name || t.guestInfo?.name || "Customer",
      customerEmail: t.customer?.email || t.guestInfo?.email || "-",
      customerPhone: t.customer?.phone || t.guestInfo?.phone || "-",
      createdAt: t.createdAt,
      paymentMethod: t.paymentStatus === "paid" ? "PAID" : (paid > 0 ? "ADVANCE PAID" : "PENDING"),
      paymentStatus: t.paymentStatus || "pending",
      refundStatus: t.paymentStatus === "refunded" ? "processed" : (t.paymentStatus === "partially_refunded" ? "partial" : "none"),
      totalAmount: total,
      advancePaid: paid,
      balanceDue: due,
      razorpayOrderId: capturedOnline?.razorpayOrderId || t.razorpayOrderId,
      razorpayPaymentId: capturedOnline?.razorpayPaymentId || t.razorpayPaymentId,
      disputes: [],
      payments: t.payments || [],
      refunds: t.refunds || [],
      status: t.status,
    });
  });

  // Sort by createdAt descending
  allTransactions.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  // Filter
  const filtered = allTransactions.filter((tx) => {
    if (filter === "paid") return tx.paymentStatus === "paid" || tx.advancePaid > 0;
    if (filter === "pending") return tx.paymentStatus === "pending" && tx.advancePaid === 0;
    if (filter === "refunded") return tx.paymentStatus === "refunded" || tx.paymentStatus === "partially_refunded" || tx.refundStatus === "processed";
    if (filter === "disputes") return Array.isArray(tx.disputes) && tx.disputes.length > 0;
    return true;
  });

  // Search
  const searched = filtered.filter((tx) => {
    if (!search || !search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      String(tx.displayId || "").toLowerCase().includes(q) ||
      String(tx.orderId || "").toLowerCase().includes(q) ||
      String(tx.customerName || "").toLowerCase().includes(q) ||
      String(tx.customerEmail || "").toLowerCase().includes(q) ||
      String(tx.customerPhone || "").toLowerCase().includes(q) ||
      String(tx.razorpayOrderId || "").toLowerCase().includes(q) ||
      String(tx.razorpayPaymentId || "").toLowerCase().includes(q)
    );
  });

  const total = searched.length;
  const totalPages = Math.ceil(total / limitNum) || 1;
  const skip = (pageNum - 1) * limitNum;
  const paginatedItems = searched.slice(skip, skip + limitNum);

  sendResponse(res, 200, "Admin payments fetched successfully", {
    transactions: paginatedItems,
    summary: {
      totalAdvanceCollected,
      totalBalanceDue,
      totalOrderVolume: allTransactions.length,
      totalRevenue,
      totalRefunded,
    },
  }, {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
  });
});

module.exports = {
  listAdminOrders,
  listAdminPayments,
};
