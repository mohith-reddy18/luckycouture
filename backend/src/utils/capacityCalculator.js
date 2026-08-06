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
      status: { $nin: ["cancelled", "rejected"] },
    });

    if (countForDay < dailyCapacity) {
      return dayStart;
    }
    candidate.setDate(candidate.getDate() + 1);
  }

  throw new Error("No available slots found in the next 60 days");
}

module.exports = { findNextAvailableDate };
