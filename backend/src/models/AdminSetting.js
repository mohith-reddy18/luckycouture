const mongoose = require("mongoose");

/**
 * Singleton document holding site-wide operational
 * settings the admin portal can edit dynamically without redeployment:
 * - dailyTailoringCapacity
 * - prioritySurchargeMin
 * - prioritySurchargeMax
 * - dailyPriorityCapacity
 * - priorityStitchingEnabled
 * - freeShippingThreshold & standardShippingFee
 * - businessHours
 * - heroSlides, homeBestWork, faqs, contactInfo
 */
const adminSettingSchema = new mongoose.Schema(
  {
    dailyTailoringCapacity: { type: Number, default: 4 },
    dailyPriorityCapacity: { type: Number, default: 2 },
    prioritySurchargeMin: { type: Number, default: 50 },
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
    heroSlides: [
      {
        id: String,
        label: String,
        image: String,
        srcSet: String,
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
    faqs: [
      {
        id: String,
        q: String,
        a: String,
      },
    ],
    contactInfo: {
      phone: { type: String, default: "+91 88017 90961" },
      phoneHref: { type: String, default: "+918801790961" },
      whatsappHref: { type: String, default: "https://wa.me/918801790961" },
      email: { type: String, default: "lakshmibade32@gmail.com" },
      techSupportEmail: { type: String, default: "mohithreddybade18@gmail.com" },
      address: {
        type: String,
        default: "Muthyalareddy Nagar Main Road, Amaravathi Road, Guntur 522007",
      },
      lat: { type: Number, default: 16.3218581 },
      lng: { type: Number, default: 80.4362961 },
      mapsUrl: { type: String, default: "https://maps.app.goo.gl/D947tqUz2d6ogiCn8" },
    },
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
    image: "https://res.cloudinary.com/hqmvffcs/image/upload/f_auto,q_auto/v1787336368/lucky-couture/home/design_gallery_women.jpg",
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

const defaultHeroSlides = [
  {
    id: "h1",
    label: "Clothes",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=80",
    srcSet: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80 600w, https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=80 1200w",
  },
  {
    id: "h2",
    label: "Tailoring",
    image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80",
    srcSet: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80 600w, https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80 1200w",
  },
  {
    id: "h3",
    label: "Shopping",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
    srcSet: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80 600w, https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80 1200w",
  },
  {
    id: "h4",
    label: "Designs",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
    srcSet: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80 600w, https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80 1200w",
  },
];

const defaultFaqs = [
  {
    id: "faq-1",
    q: "How long does custom stitching usually take?",
    a: "Most single garments are ready in 5–7 working days. Since we can only take on a limited number of stitching orders per day to protect quality, your exact delivery date is confirmed right after you submit the tailoring form.",
  },
  {
    id: "faq-2",
    q: "Can I provide my own fabric?",
    a: "Yes. On the tailoring form you can choose to bring your own material, or select from our in-house fabric options and we'll source it for you.",
  },
  {
    id: "faq-3",
    q: "How do I share my measurements?",
    a: "You can enter measurements directly in the booking form using our at-home measuring guide, or book a store visit and our tailor will take them for you.",
  },
  {
    id: "faq-4",
    q: "What if I need alterations after delivery?",
    a: "Every order includes one free alteration within 15 days of delivery. Just reach out from your Orders page or contact us directly.",
  },
  {
    id: "faq-5",
    q: "Do you offer fast delivery?",
    a: "Yes — select the fast delivery option on the tailoring form for a 1-day turnaround. A small extra charge applies for rush orders.",
  },
  {
    id: "faq-6",
    q: "What payment methods are accepted?",
    a: "UPI, major debit/credit cards, and cash on pickup at our store.",
  },
];

const defaultContactInfo = {
  phone: "+91 88017 90961",
  phoneHref: "+918801790961",
  whatsappHref: "https://wa.me/918801790961",
  email: "lakshmibade32@gmail.com",
  techSupportEmail: "mohithreddybade18@gmail.com",
  address: "Muthyalareddy Nagar Main Road, Amaravathi Road, Guntur 522007",
  lat: 16.3218581,
  lng: 80.4362961,
  mapsUrl: "https://maps.app.goo.gl/D947tqUz2d6ogiCn8",
};

adminSettingSchema.statics.getSingleton = async function getSingleton() {
  let settings = await this.findOne();
  const envTailoringCap = Number(process.env.DEFAULT_DAILY_TAILORING_CAPACITY) || 4;
  const envPriorityCap = Number(process.env.DEFAULT_DAILY_PRIORITY_CAPACITY) || 2;
  const envSurchargeMin = Number(process.env.DEFAULT_DAILY_PRIORITY_SURCHARGE_MIN || process.env.DEFAULT_PRIORITY_SURCHARGE_MIN) || 50;
  const envSurchargeMax = Number(process.env.DEFAULT_DAILY_PRIORITY_SURCHARGE_MAX || process.env.DEFAULT_PRIORITY_SURCHARGE_MAX) || 50;

  if (!settings) {
    settings = await this.create({
      dailyTailoringCapacity: envTailoringCap,
      dailyPriorityCapacity: envPriorityCap,
      prioritySurchargeMin: envSurchargeMin,
      prioritySurchargeMax: envSurchargeMax,
      homeOfferings: defaultHomeOfferings,
      homeBestWork: defaultHomeBestWork,
      heroSlides: defaultHeroSlides,
      faqs: defaultFaqs,
      contactInfo: defaultContactInfo,
    });
  } else {
    let modified = false;
    if (settings.dailyTailoringCapacity === undefined || settings.dailyTailoringCapacity === null) {
      settings.dailyTailoringCapacity = envTailoringCap;
      modified = true;
    }
    if (settings.prioritySurchargeMin === undefined || settings.prioritySurchargeMin === null) {
      settings.prioritySurchargeMin = envSurchargeMin;
      modified = true;
    }
    if (settings.prioritySurchargeMax === undefined || settings.prioritySurchargeMax === null) {
      settings.prioritySurchargeMax = envSurchargeMax;
      modified = true;
    }
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
    if (!settings.heroSlides || !settings.heroSlides.length) {
      settings.heroSlides = defaultHeroSlides;
      modified = true;
    }
    if (!settings.faqs || !settings.faqs.length) {
      settings.faqs = defaultFaqs;
      modified = true;
    }
    if (!settings.contactInfo || !settings.contactInfo.phone) {
      settings.contactInfo = defaultContactInfo;
      modified = true;
    }
    if (modified) {
      await settings.save();
    }
  }
  return settings;
};

module.exports = mongoose.model("AdminSetting", adminSettingSchema);
