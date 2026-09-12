/**
 * Authoritative Order Date & Delivery Range Calculator for Lucky Couture.
 *
 * Implements the Two-Tier Date Architecture:
 * 1. Admin Ready/Dispatch Deadline (adminReadyDate):
 *    Internal deadline when order must be prepared/ready for courier handover or store pickup.
 * 2. Customer-Facing Expected Delivery Range (expectedDeliveryMinDate, expectedDeliveryMaxDate):
 *    Final customer delivery window = Admin Ready Date + Transit Time Slabs.
 *
 * IST Timezone handling: UTC+5:30
 */

const { IST_OFFSET_MS } = require("./adminDateUtils");

/**
 * Returns current IST Date object.
 */
function getISTNow(ref = new Date()) {
  const t = ref.getTime();
  return new Date(t + IST_OFFSET_MS);
}

/**
 * Converts a UTC Date or ISO string into an IST calendar midnight Date (in UTC representation).
 * E.g., 2026-09-13 00:00:00 IST -> corresponding UTC Date object.
 */
function getISTMidnight(dateVal) {
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return new Date();

  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();
  const day = ist.getUTCDate();

  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - IST_OFFSET_MS);
}

/**
 * Calculates 10 AM IST Batching Date for Shopping Orders.
 *
 * Rules:
 * - Orders confirmed BEFORE 10:00 AM IST (up to 09:59:59.999 IST):
 *   Belong to current calendar day's processing/dispatch batch.
 * - Orders confirmed AT OR AFTER 10:00 AM IST (10:00:00.000 IST onwards):
 *   Belong to next calendar day's processing/dispatch batch.
 *
 * @param {Date|string} confirmationTime - Order placement or payment confirmation timestamp
 * @returns {Date} Dispatch batch date (at 00:00:00 IST in UTC)
 */
function getShoppingDispatchBatchDate(confirmationTime = new Date()) {
  const d = new Date(confirmationTime);
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const ist = new Date(validDate.getTime() + IST_OFFSET_MS);
  const hour = ist.getUTCHours();

  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();
  const day = ist.getUTCDate();

  // If order is placed at or after 10:00 AM IST, push to next day's batch
  const batchDay = hour >= 10 ? day + 1 : day;

  return new Date(Date.UTC(year, month, batchDay, 0, 0, 0, 0) - IST_OFFSET_MS);
}

/**
 * Determines exact transit slab based on delivery options & address.
 *
 * Slabs:
 * 1. Store Pickup: 0 days
 * 2. Guntur (<= 20 km): 1 day
 * 3. Within Andhra Pradesh: 3–6 days
 * 4. Outside Andhra Pradesh: 7–10 days
 */
function getTransitSlab({ deliveryMethod, isShortDistance, isAndhraPradesh, city }) {
  const normMethod = String(deliveryMethod || "").trim().toLowerCase();
  const normCity = String(city || "").trim().toLowerCase();

  if (normMethod === "store_pickup" || normMethod === "pickup") {
    return {
      minDays: 0,
      maxDays: 0,
      transitDaysText: "0 days (Store Pickup)",
      isStorePickup: true,
    };
  }

  // Short distance (<= 20 km) or Guntur city local
  if (isShortDistance || normCity === "guntur") {
    return {
      minDays: 1,
      maxDays: 1,
      transitDaysText: "1 day transit",
      isShortDistance: true,
    };
  }

  // Within Andhra Pradesh
  if (isAndhraPradesh) {
    return {
      minDays: 3,
      maxDays: 6,
      transitDaysText: "3–6 days transit",
      isAP: true,
    };
  }

  // Outside Andhra Pradesh
  return {
    minDays: 7,
    maxDays: 10,
    transitDaysText: "7–10 days transit",
    isOutsideAP: true,
  };
}

/**
 * Adds days to a Date safely.
 */
function addDays(date, days) {
  const res = new Date(date);
  res.setDate(res.getDate() + days);
  return res;
}

/**
 * Adds hours to a Date safely.
 */
function addHours(date, hours) {
  const res = new Date(date);
  res.setTime(res.getTime() + Math.round(hours * 60 * 60 * 1000));
  return res;
}

/**
 * Authoritative Date Calculation for Shopping Orders.
 */
function calculateShoppingOrderDates({
  confirmationTime = new Date(),
  deliveryMethod = "home_delivery",
  isShortDistance = false,
  isAndhraPradesh = true,
  city = "",
}) {
  const adminReadyDate = getShoppingDispatchBatchDate(confirmationTime);
  const transitSlab = getTransitSlab({ deliveryMethod, isShortDistance, isAndhraPradesh, city });

  const expectedDeliveryMinDate = addDays(adminReadyDate, transitSlab.minDays);
  const expectedDeliveryMaxDate = addDays(adminReadyDate, transitSlab.maxDays);

  return {
    adminReadyDate,
    expectedDeliveryMinDate,
    expectedDeliveryMaxDate,
    minDays: transitSlab.minDays,
    maxDays: transitSlab.maxDays,
    transitDaysText: transitSlab.transitDaysText,
    isStorePickup: Boolean(transitSlab.isStorePickup),
  };
}

/**
 * Authoritative Date Calculation for Standard Tailoring Orders.
 */
function calculateStandardTailoringDates({
  scheduledDate = new Date(),
  productionDays = 5,
  deliveryMethod = "store_pickup",
  isShortDistance = false,
  isAndhraPradesh = true,
  city = "",
}) {
  const sched = new Date(scheduledDate);
  const validSched = isNaN(sched.getTime()) ? new Date() : sched;

  // Making completion date = scheduled capacity slot date + production days
  const adminReadyDate = addDays(validSched, productionDays);

  const transitSlab = getTransitSlab({ deliveryMethod, isShortDistance, isAndhraPradesh, city });

  const expectedDeliveryMinDate = addDays(adminReadyDate, transitSlab.minDays);
  const expectedDeliveryMaxDate = addDays(adminReadyDate, transitSlab.maxDays);

  return {
    scheduledDate: validSched,
    adminReadyDate,
    expectedDeliveryMinDate,
    expectedDeliveryMaxDate,
    productionDays,
    minDays: transitSlab.minDays,
    maxDays: transitSlab.maxDays,
    transitDaysText: transitSlab.transitDaysText,
    isStorePickup: Boolean(transitSlab.isStorePickup),
  };
}

/**
 * Authoritative Date Calculation for Priority Tailoring Orders.
 * Priority tailoring making time: 24–36 hours (avg 30 hours).
 */
function calculatePriorityTailoringDates({
  scheduledDate = new Date(),
  productionHours = 30,
  deliveryMethod = "store_pickup",
  isShortDistance = false,
  isAndhraPradesh = true,
  city = "",
}) {
  const sched = new Date(scheduledDate);
  const validSched = isNaN(sched.getTime()) ? new Date() : sched;

  // Making completion date = scheduled start time + 30 hours
  const adminReadyDate = addHours(validSched, productionHours);

  const transitSlab = getTransitSlab({ deliveryMethod, isShortDistance, isAndhraPradesh, city });

  const expectedDeliveryMinDate = addDays(adminReadyDate, transitSlab.minDays);
  const expectedDeliveryMaxDate = addDays(adminReadyDate, transitSlab.maxDays);

  return {
    scheduledDate: validSched,
    adminReadyDate,
    expectedDeliveryMinDate,
    expectedDeliveryMaxDate,
    productionHours,
    minDays: transitSlab.minDays,
    maxDays: transitSlab.maxDays,
    transitDaysText: transitSlab.transitDaysText,
    isStorePickup: Boolean(transitSlab.isStorePickup),
  };
}

/**
 * Format date or date range string for display.
 * E.g., "14 Sep 2026" or "16 Sep – 19 Sep 2026".
 */
function formatDateRangeText(minDate, maxDate) {
  if (!minDate) return "Pending";
  const dMin = new Date(minDate);
  if (isNaN(dMin.getTime())) return "Pending";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const formatSingle = (d) => {
    const day = d.getDate();
    const m = months[d.getMonth()];
    const y = d.getFullYear();
    return `${day} ${m} ${y}`;
  };

  const formatShort = (d) => {
    const day = d.getDate();
    const m = months[d.getMonth()];
    return `${day} ${m}`;
  };

  if (!maxDate) return formatSingle(dMin);
  const dMax = new Date(maxDate);
  if (isNaN(dMax.getTime()) || dMin.toDateString() === dMax.toDateString()) {
    return formatSingle(dMin);
  }

  // Range display: e.g. "16 Sep – 19 Sep 2026"
  return `${formatShort(dMin)} – ${formatSingle(dMax)}`;
}

/**
 * Fallback date resolver for legacy orders missing new fields.
 */
function resolveLegacyOrderDates(doc, orderKind = "shopping") {
  if (doc?.adminReadyDate) {
    return {
      adminReadyDate: new Date(doc.adminReadyDate),
      expectedDeliveryMinDate: doc.expectedDeliveryMinDate ? new Date(doc.expectedDeliveryMinDate) : new Date(doc.estimatedDeliveryDate || doc.expectedDeliveryDate || doc.expectedDeliveryAt || doc.adminReadyDate),
      expectedDeliveryMaxDate: doc.expectedDeliveryMaxDate ? new Date(doc.expectedDeliveryMaxDate) : new Date(doc.estimatedDeliveryDate || doc.expectedDeliveryDate || doc.expectedDeliveryAt || doc.adminReadyDate),
    };
  }

  // Fallback calculation for legacy records
  if (orderKind === "shopping") {
    const confTime = doc.orderConfirmedAt || doc.createdAt || new Date();
    const isGuntur = String(doc.shippingAddress?.city || "").trim().toLowerCase() === "guntur";
    const isShortDistance = Boolean(doc.deliverySnapshot?.isShortDistance || isGuntur);
    const isAP = Boolean(doc.deliverySnapshot?.isLongDistance ? doc.deliverySnapshot?.deliveryZone === "long_distance_ap" : true);
    const deliveryMethod = doc.needsDelivery === false ? "store_pickup" : "home_delivery";

    return calculateShoppingOrderDates({
      confirmationTime: confTime,
      deliveryMethod,
      isShortDistance,
      isAndhraPradesh: isAP,
      city: doc.shippingAddress?.city,
    });
  } else if (orderKind === "tailoring") {
    const isPriority = Boolean(doc.isFastDelivery || doc.isPriority || doc.priority);
    const isGuntur = String(doc.deliveryAddress?.city || "").trim().toLowerCase() === "guntur";
    const isShortDistance = Boolean(doc.deliverySnapshot?.isShortDistance || isGuntur);
    const isAP = Boolean(doc.deliverySnapshot?.isLongDistance ? doc.deliverySnapshot?.deliveryZone === "long_distance_ap" : true);

    if (isPriority) {
      return calculatePriorityTailoringDates({
        scheduledDate: doc.scheduledDate || doc.createdAt,
        deliveryMethod: doc.deliveryMethod,
        isShortDistance,
        isAndhraPradesh: isAP,
        city: doc.deliveryAddress?.city,
      });
    }

    return calculateStandardTailoringDates({
      scheduledDate: doc.scheduledDate || doc.createdAt,
      productionDays: 5,
      deliveryMethod: doc.deliveryMethod,
      isShortDistance,
      isAndhraPradesh: isAP,
      city: doc.deliveryAddress?.city,
    });
  } else {
    // Priority order
    const isGuntur = String(doc.deliveryAddress?.city || "").trim().toLowerCase() === "guntur";
    const isShortDistance = Boolean(doc.deliverySnapshot?.isShortDistance || isGuntur);
    const isAP = Boolean(doc.deliverySnapshot?.isLongDistance ? doc.deliverySnapshot?.deliveryZone === "long_distance_ap" : true);

    return calculatePriorityTailoringDates({
      scheduledDate: doc.scheduledDate || doc.createdAt,
      productionHours: 30,
      deliveryMethod: doc.deliveryMethod || "store_pickup",
      isShortDistance,
      isAndhraPradesh: isAP,
      city: doc.deliveryAddress?.city,
    });
  }
}

module.exports = {
  getISTNow,
  getISTMidnight,
  getShoppingDispatchBatchDate,
  getTransitSlab,
  calculateShoppingOrderDates,
  calculateStandardTailoringDates,
  calculatePriorityTailoringDates,
  formatDateRangeText,
  resolveLegacyOrderDates,
};
