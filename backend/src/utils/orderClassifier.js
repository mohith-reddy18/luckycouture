/**
 * Centralized Order Lifecycle Classification and Normalization for Admin Portal.
 * Enforces unified semantic categories and guarantees that 'completed' is treated as a terminal state.
 */

// Terminal states: Never active, never pending, never overdue
const TERMINAL_STATUSES = ["completed", "delivered", "rejected", "cancelled", "returned"];

// Legitimate non-terminal active stages
const SHOPPING_ACTIVE_STATUSES = ["placed", "confirmed", "packed", "shipped"];
const TAILORING_ACTIVE_STATUSES = [
  "pending_payment",
  "pending",
  "confirmed",
  "fabric_received",
  "cutting",
  "stitching",
  "quality_check",
  "ready_for_pickup",
];
const PRIORITY_ACTIVE_STATUSES = ["pending", "approved", "in_progress", "ready_for_pickup"];

/**
 * Determines whether an order status is active / pending fulfillment.
 * Strictly returns false for 'completed', 'delivered', 'rejected', 'cancelled', 'returned'.
 */
function isOrderActive(status) {
  if (!status) return true;
  const s = String(status).trim().toLowerCase();
  return !TERMINAL_STATUSES.includes(s);
}

/**
 * Determines the category tab for an order: 'priority', 'regular', 'delivered', 'completed', 'rejected'.
 */
function getNormalizedCategory(order) {
  const status = String(order.status || "").trim().toLowerCase();

  if (status === "completed") return "completed";
  if (status === "delivered") return "delivered";
  if (status === "rejected" || status === "cancelled" || status === "returned") return "rejected";

  const isPriority = Boolean(
    order.isFastDelivery ||
    order.isPriority ||
    order.priority === true ||
    order.orderType === "priority" ||
    order.isPriorityOrder ||
    order.orderKind === "priority"
  );

  return isPriority ? "priority" : "regular";
}

/**
 * Normalizes a raw Mongoose order document (Shopping, Tailoring, or Priority)
 * into a standard unified Admin Order object.
 */
function normalizeAdminOrder(doc, orderKind = "shopping") {
  const isShopping = orderKind === "shopping";
  const isTailoring = orderKind === "tailoring";
  const isPriorityKind = orderKind === "priority";

  let displayId = "";
  let customerName = "Customer";
  let customerEmail = "-";
  let customerPhone = "-";
  let itemsSummary = "";
  let totalAmount = 0;
  let amountPaid = 0;
  let amountDue = 0;
  let paymentMethod = "COD";
  let isPriority = false;
  let targetDeliveryDate = null;
  let deliveryReviewed = false;
  let isGuntur = false;
  let detailsUrl = "";

  if (isShopping) {
    displayId = doc.orderId || (doc._id ? String(doc._id).slice(-8) : "");
    customerName = doc.user?.name || "Customer";
    customerEmail = doc.user?.email || "-";
    customerPhone = doc.shippingAddress?.phone || doc.user?.phone || "-";
    const itemCount = doc.items?.length || 0;
    const firstItemName = doc.items?.[0]?.name || "Shop Item";
    itemsSummary = itemCount > 0 ? `${itemCount} item${itemCount > 1 ? "s" : ""} • ${firstItemName}` : "Boutique Order";
    totalAmount = Number(doc.totalAmount ?? doc.total ?? 0);
    amountPaid = Number(doc.amountPaid ?? doc.advancePaid ?? (doc.paymentStatus === "paid" ? totalAmount : 0));
    amountDue = Math.max(0, totalAmount - amountPaid);
    paymentMethod = doc.paymentMethod ? doc.paymentMethod.toUpperCase() : "COD";
    isPriority = Boolean(doc.isFastDelivery || doc.isPriority || doc.priority);
    targetDeliveryDate = doc.estimatedDeliveryDate || null;
    deliveryReviewed = Boolean(doc.deliveryDateReviewed);
    isGuntur = String(doc.shippingAddress?.city || "").trim().toLowerCase() === "guntur";
    detailsUrl = `/admin/orders/shopping/${doc._id}`;
  } else if (isTailoring) {
    displayId = doc.orderId || (doc._id ? String(doc._id).slice(-8) : "");
    customerName = doc.customer?.name || doc.guestInfo?.name || "Customer";
    customerEmail = doc.customer?.email || doc.guestInfo?.email || "-";
    customerPhone = doc.customer?.phone || doc.guestInfo?.phone || "-";
    const garment = doc.garmentType || "Garment";
    const design = (doc.designComplexity || "Simple").replace(/_/g, " ");
    itemsSummary = `${garment} • ${design}`;
    totalAmount = Number(
      doc.totalAmount ??
      doc.finalPrice ??
      doc.estimatedPrice ??
      ((doc.stitchingCost || 0) + (doc.designCost || 0) + (doc.fabricCost || 0) + (doc.deliveryCharge || 0))
    );
    amountPaid = Number(doc.amountPaid ?? doc.advancePaid ?? (doc.paymentStatus === "paid" ? totalAmount : 0));
    amountDue = Math.max(0, totalAmount - amountPaid);
    paymentMethod = doc.paymentStatus === "paid" ? "Paid" : (doc.paymentStatus === "partially_paid" ? "Advance Paid" : "Pending");
    isPriority = Boolean(doc.isFastDelivery || doc.isPriority || doc.priority);
    targetDeliveryDate = doc.expectedDeliveryDate || null;
    deliveryReviewed = true;
    detailsUrl = `/admin/orders/tailoring/${doc._id}`;
  } else if (isPriorityKind) {
    displayId = doc.orderNumber || (doc._id ? String(doc._id).slice(-8) : "");
    customerName = doc.customer?.name || doc.guestInfo?.name || "Customer";
    customerEmail = doc.customer?.email || doc.guestInfo?.email || "-";
    customerPhone = doc.customer?.phone || doc.guestInfo?.phone || "-";
    itemsSummary = `Express Tailoring • ${doc.garmentType || "Garment"}`;
    totalAmount = Number(doc.finalPrice ?? doc.basePrice ?? 0);
    amountPaid = doc.paymentStatus === "paid" ? totalAmount : 0;
    amountDue = Math.max(0, totalAmount - amountPaid);
    paymentMethod = doc.paymentStatus === "paid" ? "Online Paid" : "Pending";
    isPriority = true;
    targetDeliveryDate = doc.expectedDeliveryAt || null;
    deliveryReviewed = true;
    detailsUrl = `/admin/orders/tailoring/${doc._id}`;
  }

  return {
    _id: doc._id,
    orderKind,
    kindLabel: isShopping ? "Shopping" : (isTailoring ? "Tailoring" : "Priority Stitching"),
    displayId,
    orderId: doc.orderId || doc.orderNumber || (doc._id ? String(doc._id) : ""),
    customer: {
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
    },
    itemsSummary,
    totalAmount,
    platformFee: Number(doc.platformFee || 0),
    amountPaid,
    amountDue,
    paymentMethod,
    paymentStatus: doc.paymentStatus || "pending",
    status: doc.status || "placed",
    isPriority,
    placedAt: doc.createdAt,
    targetDeliveryDate,
    deliveryReviewed,
    isGuntur,
    detailsUrl,
    rejectionReason: doc.rejectionReason,
    raw: doc,
  };
}

module.exports = {
  TERMINAL_STATUSES,
  SHOPPING_ACTIVE_STATUSES,
  TAILORING_ACTIVE_STATUSES,
  PRIORITY_ACTIVE_STATUSES,
  isOrderActive,
  getNormalizedCategory,
  normalizeAdminOrder,
};
