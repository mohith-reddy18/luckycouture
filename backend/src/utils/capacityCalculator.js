const TailoringOrder = require("../models/TailoringOrder");
const PriorityOrder = require("../models/PriorityOrder");

/**
 * Business rule (Volume 2.5 / Volume 4):
 * Lucky Couture can only complete a limited number of tailoring orders
 * per day. When a given date is full, push the customer to the next
 * available working day. Priority orders use a separate, smaller daily
 * capacity and always take scheduling preference within their own pool.
 */
async function findNextAvailableDate({ isPriority, dailyCapacity, startDate = new Date() }) {
  const Model = isPriority ? PriorityOrder : TailoringOrder;
  const candidate = new Date(startDate);
  candidate.setHours(0, 0, 0, 0);

  // Look ahead up to 60 days to avoid an infinite loop if capacity is misconfigured.
  for (let i = 0; i < 60; i++) {
    const dayStart = new Date(candidate);
    const dayEnd = new Date(candidate);
    dayEnd.setHours(23, 59, 59, 999);

    const countForDay = await Model.countDocuments({
      scheduledDate: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ["cancelled", "rejected", "completed"] },
    });

    if (countForDay < dailyCapacity) {
      return dayStart;
    }
    candidate.setDate(candidate.getDate() + 1);
  }

  throw new Error("No available slots found in the next 60 days");
}

/**
 * Calculates Expected Delivery Date taking into account:
 * 1. Current tailoring workload queue (scheduledDate)
 * 2. Production/stitching time (1 day for priority, 5 days for standard)
 * 3. Delivery transit time (0 for store pickup, 1 for local, 7 for AP long distance, 10 for outside AP)
 *
 * @param {object} params
 * @param {Date} params.scheduledDate - Scheduled production start date based on capacity queue
 * @param {boolean} params.isFastDelivery - Priority / rush stitching flag (1 day vs 5 days)
 * @param {string} params.deliveryMethod - "store_pickup" or "home_delivery"
 * @param {object} params.deliveryDetails - Result from calculateDeliveryDetails
 * @returns {{ expectedDeliveryDate: Date, productionDays: number, transitDays: number, totalDays: number }}
 */
function calculateExpectedDeliveryDate({
  scheduledDate,
  isFastDelivery = false,
  deliveryMethod = "store_pickup",
  deliveryDetails = null,
}) {
  const productionDays = isFastDelivery ? 1 : 5;
  let transitDays = 0;

  if (deliveryMethod === "home_delivery" && deliveryDetails) {
    if (deliveryDetails.isShortDistance) {
      transitDays = 1;
    } else if (deliveryDetails.isAndhraPradesh) {
      transitDays = deliveryDetails.maxDays || 7;
    } else {
      transitDays = deliveryDetails.minDays || 10;
    }
  }

  const expectedDate = new Date(scheduledDate);
  expectedDate.setDate(expectedDate.getDate() + productionDays + transitDays);

  return {
    expectedDeliveryDate: expectedDate,
    productionDays,
    transitDays,
    totalDays: productionDays + transitDays,
  };
}

module.exports = {
  findNextAvailableDate,
  calculateExpectedDeliveryDate,
};
