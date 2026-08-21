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
    homeOfferings: [
      {
        id: String,
        title: String,
        desc: String,
        cta: String,
        to: String,
        image: String,
      },
    ],
    homeBestWork: [
      {
        id: String,
        title: String,
        subtitle: String,
        image: String,
      },
    ],
    blockedTailoringDates: [{ type: Date }],
  },
  { timestamps: true }
);

const defaultHomeOfferings = [
  {
    id: "offering-tailoring",
    title: "Custom Tailoring",
    desc: "Bring your own fabric or choose ours — every garment cut and stitched to your exact measurements.",
    cta: "Book Tailoring Now",
    to: "/tailoring",
    image: "https://res.cloudinary.com/hqmvffcs/image/upload/f_auto,q_auto/v1787335639/lucky-couture/home/custom_tailoring_women.jpg",
  },
  {
    id: "offering-shopping",
    title: "Curated Shopping",
    desc: "Ready-to-wear sarees, dresses and boutique collections. Buy as-is or have any piece professionally tailored to your perfect fit.",
    cta: "Shop The Edit",
    to: "/shop",
    image: "https://res.cloudinary.com/hqmvffcs/image/upload/f_auto,q_auto/v1787335643/lucky-couture/home/curated_shopping_women.jpg",
  },
  {
    id: "offering-priority",
    title: "Priority Stitching",
    desc: "Need it sooner? Choose Priority Stitching and receive your custom outfit in approximately 24–30 hours (subject to availability).",
    cta: "Book Priority",
    to: "/priority-stitching",
    image: "https://res.cloudinary.com/hqmvffcs/image/upload/f_auto,q_auto/v1787335644/lucky-couture/home/priority_stitching_women.jpg",
  },
  {
    id: "offering-gallery",
    title: "Design Gallery",
    desc: "Browse past work by category and book a similar design, custom-fit to your measurements.",
    cta: "Browse Designs",
    to: "/design-gallery",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
  },
];

const defaultHomeBestWork = [
  {
    id: "b1",
    title: "Birthday Special",
    subtitle: "Party Wear",
    image: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "b2",
    title: "Wedding Season",
    subtitle: "Bridal Couture",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "b3",
    title: "Festive Edit",
    subtitle: "Ethnic Wear",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "b4",
    title: "Saree Season",
    subtitle: "Handloom Picks",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "b5",
    title: "Reception Night",
    subtitle: "Statement Gowns",
    image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "b6",
    title: "Back to School",
    subtitle: "Uniforms",
    image: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=800&q=80",
  },
];

adminSettingSchema.statics.getSingleton = async function getSingleton() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      dailyTailoringCapacity: Number(process.env.DEFAULT_DAILY_TAILORING_CAPACITY) || 4,
      dailyPriorityCapacity: Number(process.env.DEFAULT_DAILY_PRIORITY_CAPACITY) || 2,
      prioritySurchargeMin: Number(process.env.DEFAULT_PRIORITY_SURCHARGE_MIN) || 40,
      prioritySurchargeMax: Number(process.env.DEFAULT_PRIORITY_SURCHARGE_MAX) || 50,
      homeOfferings: defaultHomeOfferings,
      homeBestWork: defaultHomeBestWork,
    });
  } else {
    let modified = false;
    if (
      !settings.homeOfferings ||
      !settings.homeOfferings.length ||
      !settings.homeOfferings[0]?.image?.includes("custom_tailoring_women")
    ) {
      settings.homeOfferings = defaultHomeOfferings;
      modified = true;
    }
    if (!settings.homeBestWork || !settings.homeBestWork.length) {
      settings.homeBestWork = defaultHomeBestWork;
      modified = true;
    }
    if (modified) {
      await settings.save();
    }
  }
  return settings;
};

module.exports = {
  default: mongoose.model("AdminSetting", adminSettingSchema),
  AdminSetting: mongoose.model("AdminSetting", adminSettingSchema),
  defaultHomeOfferings,
  defaultHomeBestWork,
};
module.exports = mongoose.model("AdminSetting", adminSettingSchema);
