const Notification = require("../models/Notification");

/**
 * Creates a notification with deduplication (avoids sending duplicate notifications within 2 minutes)
 */
async function notifyUserOnce({ user, type, title, message, link }) {
  if (!user) return null;
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const existing = await Notification.findOne({
    user,
    type,
    title,
    link,
    createdAt: { $gte: twoMinutesAgo },
  });
  if (existing) return existing;

  return await Notification.create({
    user,
    type,
    title,
    message,
    link,
  });
}

/**
 * Checks for updates in Tailoring Orders (e.g. delivery charge confirmation,
 * expected delivery date confirmation, final price quote, status change)
 */
async function handleTailoringOrderNotifications(oldOrder, newOrder) {
  if (!newOrder || !newOrder.customer) return;
  const user = newOrder.customer._id || newOrder.customer;
  const orderId = newOrder.orderId || newOrder._id;
  const link = `/orders/tailoring/${newOrder._id}`;

  const notificationsToSend = [];

  // 1. Delivery Charge Confirmed (previously to_be_confirmed, not_applicable, 0, or changed)
  const oldCharge = Number(oldOrder?.deliveryCharge) || 0;
  const newCharge = Number(newOrder?.deliveryCharge) || 0;
  const oldChargeStatus = oldOrder?.deliveryChargeStatus;
  const newChargeStatus = newOrder?.deliveryChargeStatus;

  const wasPendingDeliveryCharge =
    oldChargeStatus === "to_be_confirmed" ||
    oldOrder?.deliveryCategory === "long_distance" ||
    oldCharge === 0;

  if (
    (wasPendingDeliveryCharge && newCharge > 0 && newChargeStatus !== "to_be_confirmed") ||
    (newCharge > 0 && oldCharge !== newCharge && newChargeStatus === "fixed") ||
    (oldChargeStatus === "to_be_confirmed" && newChargeStatus === "fixed")
  ) {
    notificationsToSend.push({
      user,
      type: "delivery_confirmed",
      title: "Delivery Charge Confirmed",
      message: `Your long-distance delivery charge for tailoring order ${orderId} has been confirmed at ₹${newCharge.toLocaleString("en-IN")}.`,
      link,
    });
  }

  // 2. Expected Delivery Date Confirmed / Updated
  const oldDateStr = oldOrder?.expectedDeliveryDate ? new Date(oldOrder.expectedDeliveryDate).toISOString().slice(0, 10) : "";
  const newDateStr = newOrder?.expectedDeliveryDate ? new Date(newOrder.expectedDeliveryDate).toISOString().slice(0, 10) : "";

  if (newDateStr && (!oldDateStr || oldDateStr !== newDateStr)) {
    const formattedDate = new Date(newOrder.expectedDeliveryDate).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    notificationsToSend.push({
      user,
      type: "delivery_confirmed",
      title: "Delivery Date Confirmed",
      message: `The delivery date for your tailoring order ${orderId} has been confirmed for ${formattedDate}.`,
      link,
    });
  }

  // 3. Final Price Confirmed / Updated (e.g. custom work or design quote)
  const oldPrice = Number(oldOrder?.finalPrice) || 0;
  const newPrice = Number(newOrder?.finalPrice) || 0;
  if (newPrice > 0 && (!oldPrice || oldPrice !== newPrice)) {
    notificationsToSend.push({
      user,
      type: "price_confirmed",
      title: "Order Price Confirmed",
      message: `The final price for your tailoring order ${orderId} has been confirmed at ₹${newPrice.toLocaleString("en-IN")}.`,
      link,
    });
  }

  // 4. Status Changed
  if (oldOrder?.status && newOrder?.status && oldOrder.status !== newOrder.status) {
    notificationsToSend.push({
      user,
      type: "tailoring_status",
      title: "Tailoring Order Update",
      message: `Your tailoring order ${orderId} is now ${newOrder.status.replace(/_/g, " ")}.`,
      link,
    });
  }

  for (const notif of notificationsToSend) {
    await notifyUserOnce(notif);
  }
}

/**
 * Checks for updates in Shopping Orders (e.g. shipping fee confirmation for long-distance,
 * delivery date confirmation, status change)
 */
async function handleShoppingOrderNotifications(oldOrder, newOrder) {
  if (!newOrder || !newOrder.user) return;
  const user = newOrder.user._id || newOrder.user;
  const orderId = newOrder.orderId || newOrder._id;
  const link = `/orders/shopping/${newOrder._id}`;

  const notificationsToSend = [];

  // 1. Long-distance delivery fee confirmed/updated
  const oldFee = Number(oldOrder?.shippingFee) || 0;
  const newFee = Number(newOrder?.shippingFee) || 0;
  const wasPendingFee = oldOrder?.isLongDistance && (!oldFee || oldFee === 0);

  if ((wasPendingFee && newFee > 0) || (oldOrder?.isLongDistance && newFee > 0 && oldFee !== newFee)) {
    notificationsToSend.push({
      user,
      type: "delivery_confirmed",
      title: "Delivery Fee Confirmed",
      message: `The delivery fee for your long-distance order #${orderId} has been confirmed at ₹${newFee.toLocaleString("en-IN")}.`,
      link,
    });
  }

  // 2. Estimated Delivery Date Confirmed / Reviewed
  const oldDateStr = oldOrder?.estimatedDeliveryDate ? new Date(oldOrder.estimatedDeliveryDate).toISOString().slice(0, 10) : "";
  const newDateStr = newOrder?.estimatedDeliveryDate ? new Date(newOrder.estimatedDeliveryDate).toISOString().slice(0, 10) : "";

  if (newDateStr && (!oldDateStr || oldDateStr !== newDateStr)) {
    const formattedDate = new Date(newOrder.estimatedDeliveryDate).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    notificationsToSend.push({
      user,
      type: "delivery_confirmed",
      title: "Delivery Date Confirmed",
      message: `The delivery date for your order #${orderId} has been confirmed for ${formattedDate}.`,
      link,
    });
  }

  // 3. Status Changed
  if (oldOrder?.status && newOrder?.status && oldOrder.status !== newOrder.status) {
    notificationsToSend.push({
      user,
      type: "order_status",
      title: "Order Status Update",
      message: `Your order #${orderId} is now ${newOrder.status.replace(/_/g, " ")}.`,
      link,
    });
  }

  for (const notif of notificationsToSend) {
    await notifyUserOnce(notif);
  }
}

module.exports = {
  notifyUserOnce,
  handleTailoringOrderNotifications,
  handleShoppingOrderNotifications,
};
