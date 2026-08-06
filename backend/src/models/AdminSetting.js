const mongoose = require("mongoose");

/**
 * Singleton document (findOne, no filter) holding site-wide operational
 * settings the admin panel can edit without a deployment: tailoring
 * capacity, priority stitching rules, coupon toggle, homepage carousel,
 * and business hours.
 */
const adminSettingSchema = new mongoose.Schema(
  {
    dailyTailoringCapacity: { type: Number, default: 4 },
    dailyPriorityCapacity: { type: Number, default: 2 },
    prioritySurchargeMin: { type: Number, default: 40 },
    prioritySurchargeMax: { type: Number, default: 50 },
    priorityStitchingEnabled: { type: Boolean, default: true },
    couponsEnabled: { type: Boolean, default: true },
    freeShippingThreshold: { type: Number, default: 2999 },
    standardShippingFee: { type: Number, default: 149 },
    businessHours: {
      type: String,
      default: "Monday – Saturday, 9:00 AM – 8:00 PM (Sunday: Holiday)",
    },
    homepageCarousel: [
      {
        label: String,
        image: { url: String, publicId: String },
        sortOrder: { type: Number, default: 0 },
      },
    ],
    blockedTailoringDates: [{ type: Date }],
  },
  { timestamps: true }
);

adminSettingSchema.statics.getSingleton = async function getSingleton() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      dailyTailoringCapacity: Number(process.env.DEFAULT_DAILY_TAILORING_CAPACITY) || 4,
      dailyPriorityCapacity: Number(process.env.DEFAULT_DAILY_PRIORITY_CAPACITY) || 2,
      prioritySurchargeMin: Number(process.env.DEFAULT_PRIORITY_SURCHARGE_MIN) || 40,
      prioritySurchargeMax: Number(process.env.DEFAULT_PRIORITY_SURCHARGE_MAX) || 50,
    });
  }
  return settings;
};

module.exports = mongoose.model("AdminSetting", adminSettingSchema);
