import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Scissors, Ruler, CalendarClock, ShieldCheck, Zap, Clock, Images, Upload, X, FileText, CheckCircle2, MessageCircle, Loader2, MapPin, Truck, Store } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import Measurements, { validateMeasurements, KEY_MAP, REVERSE_KEY_MAP, MEASUREMENT_FIELDS } from "../components/Measurements";
import ThankYouAnimation from "../components/ThankYouAnimation";
import SEO from "../components/SEO";
import { garmentTypes, materials, designs, contactInfo, fabricCatalog, standardFabricRequirements } from "../data/mockData";
import { useApp } from "../context/AppContext";
import api from "../utils/api";
import getImageUrl from "../utils/imageUrl";
import { resolvePrimaryAddress } from "../utils/addressUtils";

const steps = ["Garment", "Design & Fabric", "Measurements", "Delivery & Contact", "Review & Confirm"];

export const COMPLEXITY_PRICING = {
  simple: 600,
  embroidery: 2500,
  maggam: 6500,
  other: 1500,
};

export const complexityOptions = [
  { id: "simple", label: "Simple Design", cost: 600 },
  { id: "embroidery", label: "Heavy — Embroidery", cost: 2500 },
  { id: "maggam", label: "Heavy — Maggam Work", cost: 6500 },
  { id: "other", label: "Other / Custom Work", cost: 1500 },
];

export function mapComplexityToEnum(val) {
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

const GUNTUR_PINCODES = ["522001", "522002", "522003", "522004", "522005", "522006", "522007", "522019", "522034", "522509"];
const NEAR_GUNTUR_PINCODES = ["522212", "522009", "522236"];

const TOWN_DISTANCES = {
  "mangalagiri": 18,
  "chebrole": 16,
  "tenali": 25,
  "amaravathi": 28,
  "tadikonda": 14,
  "pedakakani": 10,
  "perecherla": 12,
  "narakoduru": 11,
  "vijayawada": 34,
  "gannavaram": 52,
  "guntur": 5,
  "hyderabad": 270,
  "ongole": 115,
  "vizag": 380,
  "visakhapatnam": 380
};

export function calculateDeliveryDetails({ deliveryMethod, city, pincode, address, gunturOption = "standard", nearbyOption = "standard" }) {
  if (deliveryMethod === "store_pickup") {
    return {
      method: "store_pickup",
      charge: 0,
      chargeText: "₹0",
      distanceText: "Store Pickup",
      category: "store_pickup",
      status: "not_applicable",
      isLongDistance: false,
      isConfirmRequired: false,
    };
  }

  const cleanCity = (city || "").trim().toLowerCase();
  const cleanPincode = (pincode || "").trim();

  // Rule 1: Guntur City
  const isGunturCity = cleanCity === "guntur" || GUNTUR_PINCODES.includes(cleanPincode);
  if (isGunturCity) {
    const isExtended = gunturOption === "extended";
    const charge = isExtended ? 50 : 40;
    const distKm = isExtended ? 8 : 5;
    const label = isExtended ? "Extended Guntur City Delivery — ₹50" : "Standard Guntur Delivery — ₹40";
    return {
      method: "home_delivery",
      charge,
      chargeText: `₹${charge}`,
      distanceText: `Approx. distance: ${distKm} km`,
      approxDistanceKm: distKm,
      label,
      category: "guntur_city",
      status: "fixed",
      isLongDistance: false,
      isConfirmRequired: false,
    };
  }

  // Rule 2: Near Guntur (~10 km from store)
  const isNearGunturPincode = NEAR_GUNTUR_PINCODES.includes(cleanPincode);
  const isNearGunturName = ["narakoduru", "perecherla", "pedakakani", "tadikonda", "ankireddypalem", "gorantla"].some(
    (n) => cleanCity.includes(n) || (address || "").toLowerCase().includes(n)
  );
  if (isNearGunturPincode || isNearGunturName) {
    const isExtended = nearbyOption === "extended";
    const charge = isExtended ? 100 : 80;
    const distKm = isExtended ? 12 : 10;
    const label = isExtended ? "Extended Nearby Delivery — ₹100" : "Nearby Delivery — ₹80";
    return {
      method: "home_delivery",
      charge,
      chargeText: `₹${charge}`,
      distanceText: `Approx. distance: ${distKm} km`,
      approxDistanceKm: distKm,
      label,
      category: "near_guntur",
      status: "fixed",
      isLongDistance: false,
      isConfirmRequired: false,
    };
  }

  // Rule 3: Outside Guntur distance lookup
  let knownDist = TOWN_DISTANCES[cleanCity];
  if (knownDist === undefined) {
    for (const [t, d] of Object.entries(TOWN_DISTANCES)) {
      if ((address || "").toLowerCase().includes(t)) {
        knownDist = d;
        break;
      }
    }
  }

  if (knownDist !== undefined) {
    if (knownDist > 30) {
      return {
        method: "home_delivery",
        charge: 0,
        chargeText: "To be confirmed",
        distanceText: "Distance: >30 km",
        approxDistanceKm: knownDist,
        category: "long_distance",
        status: "to_be_confirmed",
        isLongDistance: true,
        isConfirmRequired: true,
        notice: "Your location is more than 30 km from our store. Our team will check the delivery route and confirm the delivery charge shortly.",
      };
    } else {
      const charge = knownDist * 10;
      return {
        method: "home_delivery",
        charge,
        chargeText: `₹${charge}`,
        distanceText: `Approx. distance: ${knownDist} km`,
        approxDistanceKm: knownDist,
        category: "outside_guntur",
        status: "calculated",
        isLongDistance: false,
        isConfirmRequired: false,
      };
    }
  }

  // Rule 4: Unverifiable / Unknown location
  if (!cleanCity || !cleanPincode || cleanPincode.length !== 6) {
    return {
      method: "home_delivery",
      charge: 0,
      chargeText: "To be confirmed",
      distanceText: "Location pending verification",
      category: "distance_unavailable",
      status: "to_be_confirmed",
      isLongDistance: false,
      isConfirmRequired: true,
      notice: "If reliable distance cannot be determined immediately, our team will check the route and confirm your delivery charge shortly.",
    };
  }

  return {
    method: "home_delivery",
    charge: 0,
    chargeText: "To be confirmed",
    distanceText: "Location pending verification",
    category: "distance_unavailable",
    status: "to_be_confirmed",
    isLongDistance: false,
    isConfirmRequired: true,
    notice: "Our team will check the delivery route for your location and confirm the delivery charge shortly.",
  };
}

export default function Tailoring() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { notify, measurements: savedMeasurements, user, updateProfile } = useApp();
  const prefill = state?.design;       // from DesignDetail → /tailoring
  const prefillCloth = state?.cloth;   // from ProductDetail → /tailoring
  const prefillFabric = state?.selectedFabric;
  const isPriority = Boolean(state?.priority);

  const formRef = useRef(null);

  const initialGalleryDesign = state?.isGalleryDesign
    ? state.design
    : (prefill ? designs.find((d) => d.id === prefill.id || d.title === prefill.title) : null);

  const [selectedGalleryDesign, setSelectedGalleryDesign] = useState(() => initialGalleryDesign);

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eta, setEta] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [form, setForm] = useState({
    garment: state?.garment || initialGalleryDesign?.garment || "",
    customGarment: "",
    referenceDesign: prefill?.title || "",
    referenceImage: prefill?.image || "",
    clothTitle: prefillCloth?.name || "",
    clothImage: prefillCloth?.image || "",
    material: prefillFabric?.name || "",
    ownFabric: "no",
    fabricDropoffDate: "",
    hasReferencePic: (prefill || prefillCloth) ? "yes" : "no",
    complexity: initialGalleryDesign ? (initialGalleryDesign.designType || "simple") : "",
    customComplexity: "",
    measurements: Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f, ""])),
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    orderType: state?.priority ? "priority" : "standard",
    description: "",
    deliveryMethod: "store_pickup",
    address: "",
    city: "",
    pincode: "",
    gunturOption: "standard",
    nearbyOption: "standard",
  });

  // Auto-fill user contact details & primary address when user object is loaded
  useEffect(() => {
    if (user) {
      const primaryAddress = resolvePrimaryAddress(user.addresses);
      setForm((f) => ({
        ...f,
        name: f.name || user.name || "",
        email: f.email || user.email || "",
        phone: f.phone || user.phone || "",
        address: f.address || (primaryAddress ? [primaryAddress.line2, primaryAddress.line1].filter(Boolean).join(", ") : ""),
        city: f.city || primaryAddress?.city || "",
        pincode: f.pincode || primaryAddress?.pincode || "",
      }));
    }
  }, [user]);

  // Auto-populate saved measurements if available and form measurements are currently blank
  useEffect(() => {
    if (savedMeasurements && savedMeasurements.length > 0) {
      const defaultProfile = savedMeasurements.find((m) => m.isDefault) || savedMeasurements[0];
      if (defaultProfile && defaultProfile.measurements) {
        setForm((f) => {
          const isBlank = Object.values(f.measurements).every((v) => v === "");
          if (!isBlank) return f;

          const mapped = {};
          Object.entries(defaultProfile.measurements).forEach(([k, v]) => {
            const formKey = REVERSE_KEY_MAP[k] || k;
            if (MEASUREMENT_FIELDS.includes(formKey)) {
              mapped[formKey] = String(v);
            }
          });
          return { ...f, measurements: { ...f.measurements, ...mapped } };
        });
      }
    }
  }, [savedMeasurements]);

  const activeGalleryDesign = selectedGalleryDesign || designs.find((d) => d.title === form.referenceDesign);
  const isKnownGalleryDesign = Boolean(form.hasReferencePic === "yes" && activeGalleryDesign);

  const activeGarment = (form.garment === "Other" || form.garment === "Others") && form.customGarment
    ? form.customGarment
    : (form.garment || activeGalleryDesign?.garment || "Blouse");

  const stdFabricQty = activeGalleryDesign?.standardFabricQty || standardFabricRequirements[activeGarment] || 1;

  const fabricObj = fabricCatalog.find(
    (f) => f.name.toLowerCase() === (form.material || "").toLowerCase()
  ) || (prefillFabric ? { name: prefillFabric.name, pricePerMeter: prefillFabric.pricePerMeter } : null);

  const fabricCost = form.ownFabric === "no" && fabricObj ? fabricObj.pricePerMeter * stdFabricQty : 0;
  const designCost = isKnownGalleryDesign
    ? (activeGalleryDesign?.designCost || activeGalleryDesign?.price || COMPLEXITY_PRICING[mapComplexityToEnum(activeGalleryDesign?.designType || activeGalleryDesign?.designComplexity)] || 600)
    : (COMPLEXITY_PRICING[mapComplexityToEnum(form.complexity)] || 0);
  const prioritySurcharge = form.orderType === "priority" ? 500 : 0;

  const deliveryInfo = calculateDeliveryDetails({
    deliveryMethod: form.deliveryMethod,
    city: form.city,
    pincode: form.pincode,
    address: form.address,
    gunturOption: form.gunturOption,
    nearbyOption: form.nearbyOption,
  });

  const totalAmount = designCost + fabricCost + prioritySurcharge + deliveryInfo.charge;

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const updateMeasurement = (field, value) =>
    setForm((f) => ({ ...f, measurements: { ...f.measurements, [field]: value } }));

  const scrollToFormTop = () => {
    setTimeout(() => {
      if (formRef.current) {
        const yOffset = -90; // offset so the first input is clearly visible below sticky navbar
        const y = formRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 50);
  };

  const pickGalleryDesign = (design) => {
    setSelectedGalleryDesign(design);
    setForm((f) => ({
      ...f,
      referenceDesign: design.title,
      referenceImage: design.image,
      hasReferencePic: "yes",
      garment: f.garment || design.garment || f.garment,
      complexity: design.designType || "simple",
    }));
    setGalleryPickerOpen(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setSelectedGalleryDesign(null);
    setForm((f) => ({
      ...f,
      referenceDesign: file.name,
      referenceImage: previewUrl,
      hasReferencePic: "yes",
      complexity: "",
    }));
  };

  const clearReference = () => {
    setSelectedGalleryDesign(null);
    setForm((f) => ({ ...f, referenceDesign: "", referenceImage: "", complexity: "" }));
  };

  const clearCloth = () => setForm((f) => ({ ...f, clothTitle: "", clothImage: "" }));

  const next = () => {
    if (step === 0) {
      if (!form.garment) {
        notify("Please select a garment type to continue");
        return;
      }
      if ((form.garment === "Other" || form.garment === "Others") && !form.customGarment.trim()) {
        notify("Please specify what you want stitched to continue");
        return;
      }
    }
    if (step === 1) {
      if (form.hasReferencePic === "yes") {
        if (!form.referenceImage && !form.referenceDesign) {
          notify("Please upload a reference image or choose a design from the gallery");
          return;
        }
        if (!isKnownGalleryDesign) {
          if (!form.complexity) {
            notify("Please select what type of work your reference requires to continue");
            return;
          }
          if (form.complexity === "other" && !form.customComplexity.trim()) {
            notify("Please describe the custom work you want to continue");
            return;
          }
        }
      } else {
        if (!form.complexity) {
          notify("Please select what type of design you want to continue");
          return;
        }
        if (form.complexity === "other" && !form.customComplexity.trim()) {
          notify("Please describe the custom design you want to continue");
          return;
        }
      }
      if (form.ownFabric === "yes" && !form.fabricDropoffDate) {
        notify("Please choose a fabric drop-off date to continue");
        return;
      }
      if (form.ownFabric === "no" && !form.material) {
        notify("Please select a preferred material to continue");
        return;
      }
    }
    if (step === 2) {
      const { valid, missingField } = validateMeasurements(form.measurements);
      if (!valid) {
        notify(`Please enter your ${missingField} measurement to continue`);
        return;
      }
    }
    if (step === 3) {
      if (!form.name.trim()) {
        notify("Please enter your full name to continue");
        return;
      }
      if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
        notify("Please enter a valid email address to continue");
        return;
      }
      if (!form.phone.trim()) {
        notify("Your phone number is required so our tailoring team can contact you about your order.");
        return;
      }
      const phoneRegex = /^[+]?[0-9\s-]{7,15}$/;
      if (!phoneRegex.test(form.phone.trim())) {
        notify("Please enter a valid contact phone number (e.g. +91 98765 43210)");
        return;
      }

      // If user is authenticated and phone number is missing or updated, persist it to their account profile
      if (user && (!user.phone || !user.phone.trim() || user.phone !== form.phone.trim())) {
        updateProfile({ phone: form.phone.trim() });
      }

      if (form.deliveryMethod === "home_delivery") {
        if (!form.address.trim()) {
          notify("Please enter your delivery address/area to continue");
          return;
        }
        if (!form.city.trim()) {
          notify("Please enter your city to continue");
          return;
        }
        if (!/^\d{6}$/.test((form.pincode || "").trim())) {
          notify("Please enter a valid 6-digit pincode to continue");
          return;
        }
      }
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
    scrollToFormTop();
  };

  const back = () => {
    setStep((s) => Math.max(s - 1, 0));
    scrollToFormTop();
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (step !== steps.length - 1) return;
    if (isSubmitting) return;

    if (!user) {
      notify("Please sign in to place a tailoring order");
      navigate("/login", { state: { from: "/tailoring" } });
      return;
    }

    if (!form.name.trim()) {
      notify("Please enter your full name");
      return;
    }
    if (!form.email.trim()) {
      notify("Please enter your email address");
      return;
    }
    if (!form.phone.trim()) {
      notify("Your phone number is required so our tailoring team can contact you about your order.");
      return;
    }

    const phoneRegex = /^[+]?[0-9\s-]{7,15}$/;
    if (!phoneRegex.test(form.phone.trim())) {
      notify("Please enter a valid contact phone number");
      return;
    }

    // Persist phone to profile if authenticated and missing/changed
    if (user && (!user.phone || !user.phone.trim() || user.phone !== form.phone.trim())) {
      updateProfile({ phone: form.phone.trim() });
    }

    setIsSubmitting(true);
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });

    // Build measurements map
    const measurementsMap = {};
    Object.entries(form.measurements).forEach(([label, val]) => {
      const apiKey = KEY_MAP[label] || label.toLowerCase().replace(/[\s/]+/g, "_");
      if (val !== "" && !isNaN(Number(val))) measurementsMap[apiKey] = Number(val);
    });

    const rawComplexity = isKnownGalleryDesign
      ? (activeGalleryDesign?.designType || activeGalleryDesign?.designComplexity || "simple")
      : (form.complexity || "simple");

    const finalDesignComplexity = mapComplexityToEnum(rawComplexity);

    const payload = {
      garmentType: activeGarment,
      fabricSource: form.ownFabric === "yes" ? "customer_provided" : "shop_provided",
      ...(form.ownFabric === "yes" && form.fabricDropoffDate && { fabricDropoffDate: form.fabricDropoffDate }),
      ...(form.ownFabric === "no" && form.material && { preferredMaterial: form.material }),
      hasReferenceImages: form.hasReferencePic === "yes" && Boolean(form.referenceDesign),
      designComplexity: finalDesignComplexity,
      ...(form.complexity === "other" && form.customComplexity && { description: form.customComplexity }),
      measurements: measurementsMap,
      isFastDelivery: form.orderType === "priority",
      guestInfo: {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      },
      deliveryMethod: form.deliveryMethod,
      ...(form.deliveryMethod === "home_delivery" && {
        deliveryAddress: {
          address: form.address,
          city: form.city,
          pincode: form.pincode,
        },
      }),
      approxDistanceKm: deliveryInfo.approxDistanceKm || null,
      deliveryCategory: deliveryInfo.category,
      deliveryCharge: deliveryInfo.charge,
      deliveryChargeStatus: deliveryInfo.status,
      estimatedPrice: totalAmount,
    };

    try {
      const res = await api.post("/api/tailoring", payload);
      const saved = res.data;
      setOrderId(saved.orderId || saved._id);
      setEta(saved.expectedDeliveryDate
        ? new Date(saved.expectedDeliveryDate).toDateString()
        : "5–7 days");
      setSubmitted(true);
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      notify("Booking request received");
    } catch (err) {
      notify(err.message || "Could not place order — please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scroll to top when order is successfully submitted
  useEffect(() => {
    if (submitted) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [submitted]);

  if (submitted) {
    const finalGarment = (form.garment === "Other" || form.garment === "Others") && form.customGarment
      ? form.customGarment
      : form.garment || "garment";

    return (
      <div className="max-w-xl mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-16 text-center flex flex-col items-center justify-center">
        <ThankYouAnimation />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="w-full flex flex-col items-center"
        >
          <span className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold bg-green-100 text-green-800 border border-green-200 mb-3">
            <CheckCircle2 size={14} /> Booking Request Received
          </span>

          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-primary mb-2">
            Thank you, {form.name || "there"}!
          </h1>
          <p className="text-sm sm:text-base text-ink/70 max-w-md mx-auto mb-5 leading-relaxed">
            We've logged your <strong>{finalGarment}</strong> order.
          </p>

          {/* Customer 15-Digit Order ID Pill */}
          {orderId && (
            <div className="inline-flex items-center gap-2.5 bg-bg border border-primary/15 rounded-full px-5 py-2 mb-5 shadow-sm text-xs sm:text-sm font-medium">
              <span className="text-ink/50">Order ID:</span>
              <span className="font-mono font-bold text-primary text-sm sm:text-base tracking-widest select-all">{orderId}</span>
            </div>
          )}

          {/* Expected Delivery Date Only */}
          <div className="flex items-center justify-center gap-2.5 text-xs sm:text-sm font-medium text-primary mb-6 bg-highlight/20 py-3 sm:py-3.5 px-5 sm:px-6 rounded-2xl border border-accent/25 max-w-sm sm:max-w-md w-full mx-auto shadow-sm">
            <CalendarClock size={16} className="text-accent shrink-0" />
            <span>Expected Delivery:</span>
            <strong className="text-accent font-semibold text-sm sm:text-base">{eta}</strong>
          </div>

          {/* Short Query/Contact with Direct WhatsApp Link */}
          <div className="pt-6 border-t border-primary/10 w-full max-w-sm sm:max-w-md mx-auto space-y-3">
            <p className="text-xs sm:text-sm text-ink/65">
              Have questions or need to confirm custom details?
            </p>
            <a
              href={
                orderId
                  ? `${contactInfo.whatsappHref}?text=${encodeURIComponent(
                      `Hi Lucky Couture, I have placed an order. My Order ID is ${orderId}. I would like to discuss my order.`
                    )}`
                  : `${contactInfo.whatsappHref}?text=${encodeURIComponent(
                      "Hi Lucky Couture, I would like to discuss my order."
                    )}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3 rounded-full bg-[#25D366] text-white text-xs sm:text-sm font-semibold hover:bg-[#20bd5a] transition-all shadow-sm hover:shadow-md"
            >
              <MessageCircle size={17} className="fill-current" /> Chat with us on WhatsApp
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-24">
      <SEO
        title="Bespoke Tailoring in Guntur | Custom Stitching | Lucky Couture"
        description="Professional bespoke tailoring services in Guntur. From bridal blouses and maggam work to lehengas, kurtis, and dresses with door-step fitting."
        canonical="/tailoring"
        schema={{
          "@context": "https://schema.org",
          "@type": "Service",
          "name": "Bespoke Tailoring & Custom Stitching",
          "serviceType": "Custom Tailoring",
          "provider": {
            "@type": "ClothingStore",
            "name": "Lucky Couture",
            "url": "https://www.luckycouture.in/"
          },
          "areaServed": {
            "@type": "City",
            "name": "Guntur"
          },
          "description": "Professional bespoke tailoring services in Guntur for bridal blouses, maggam work, lehengas, kurtis, and dresses.",
          "url": "https://www.luckycouture.in/tailoring"
        }}
      />
      {isPriority && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 bg-highlight/40 border border-accent/30 text-primary text-sm px-4 py-3 rounded-xl mb-6"
        >
          <Zap size={16} className="text-accent shrink-0" />
          Priority Stitching selected — it's pre-selected in the Order Type step below.
        </motion.div>
      )}
      <SectionHeading
        eyebrow="Book Tailoring"
        title="Let's get your measurements"
        subtitle="We take on just 4 stitching orders a day so every piece gets full attention — fill this in and we'll confirm your delivery date."
      />

      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8 sm:mb-12 max-w-2xl mx-auto px-0.5 sm:px-1">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none min-w-0">
            <div className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0">
              <div
                className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium border-2 transition-colors leading-none shrink-0 ${
                  i === 0 ? "-mt-1 sm:mt-0" : ""
                } ${
                  i < step
                    ? "bg-accent border-accent text-white"
                    : i === step
                    ? "border-accent text-accent font-bold"
                    : "border-primary/15 text-primary/30"
                }`}
              >
                {i < step ? <Check size={14} className="sm:w-4 sm:h-4 shrink-0" /> : i + 1}
              </div>
              <span className={`text-[8px] sm:text-[10px] uppercase tracking-wider text-center max-w-[48px] sm:max-w-none leading-[1.15] break-words ${i <= step ? "text-primary font-semibold" : "text-primary/30"}`}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-[2px] flex-1 mx-0.5 sm:mx-2 mb-4 sm:mb-5 shrink ${i < step ? "bg-accent" : "bg-primary/10"}`} />
            )}
          </div>
        ))}
      </div>

      <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="bg-white rounded-2xl shadow-card p-5 sm:p-8 md:p-10">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <div className="flex items-center gap-2 mb-6 text-primary">
                <Scissors size={18} className="text-accent" />
                <h3 className="font-display text-lg font-semibold">What should we stitch?</h3>
              </div>
              <label className="block text-sm text-ink/70 mb-2">Garment type <span className="text-accent">*</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
                {garmentTypes.map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => update("garment", g)}
                    className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm font-medium border transition-colors ${form.garment === g ? "bg-primary text-bg border-primary shadow-sm" : "border-primary/15 hover:border-primary"
                      }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {(form.garment === "Other" || form.garment === "Others") && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 bg-highlight/20 p-4 rounded-xl border border-accent/30"
                >
                  <label className="block text-sm font-medium text-primary mb-2">
                    What would you like us to stitch? <span className="text-accent">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.customGarment}
                    onChange={(e) => update("customGarment", e.target.value)}
                    placeholder="e.g. Designer Anarkali Gown, Indo-Western Jacket, Kids Party Frock..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 focus:border-accent bg-white outline-none text-sm"
                  />
                </motion.div>
              )}

              {form.referenceDesign && (
                <div className="flex items-center gap-3 bg-highlight/30 px-4 py-3 rounded-xl mt-4">
                  {form.referenceImage && (
                    <img src={form.referenceImage} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  )}
                  <p className="text-sm text-secondary flex-1 min-w-0">
                    Design reference: <strong className="text-primary">{form.referenceDesign}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={clearReference}
                    className="text-ink/40 hover:text-red-500 shrink-0"
                    aria-label="Remove reference design"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {form.clothTitle && (
                <div className="flex items-center gap-3 bg-primary/5 border border-primary/15 px-4 py-3 rounded-xl mt-3">
                  {form.clothImage && (
                    <img src={form.clothImage} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  )}
                  <p className="text-sm text-secondary flex-1 min-w-0">
                    Shop cloth selected: <strong className="text-primary">{form.clothTitle}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={clearCloth}
                    className="text-ink/40 hover:text-red-500 shrink-0"
                    aria-label="Remove cloth selection"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <div className="flex items-center gap-2 mb-6 text-primary">
                <ShieldCheck size={18} className="text-accent" />
                <h3 className="font-display text-lg font-semibold">Design &amp; fabric details</h3>
              </div>

              <label className="block text-sm text-ink/70 mb-2">Will you provide the material?</label>
              <div className="flex gap-3 mb-4">
                {["yes", "no"].map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => update("ownFabric", opt)}
                    className={`px-5 py-2.5 rounded-full text-sm border capitalize transition-colors ${form.ownFabric === opt ? "bg-primary text-bg border-primary" : "border-primary/15 hover:border-primary"
                      }`}
                  >
                    {opt === "yes" ? "I'll bring my own" : "Source it for me"}
                  </button>
                ))}
              </div>

              {form.ownFabric === "yes" ? (
                <div className="mb-6">
                  <label className="block text-sm text-ink/70 mb-2">When can you drop off your fabric at the store? <span className="text-accent">*</span></label>
                  <input
                    type="date"
                    value={form.fabricDropoffDate}
                    onChange={(e) => update("fabricDropoffDate", e.target.value)}
                    className="w-full sm:w-64 px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                  />
                </div>
              ) : (
                <div className="mb-6">
                  <label className="block text-sm text-ink/70 mb-2">Preferred material <span className="text-accent">*</span></label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    {materials.map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => update("material", m)}
                        className={`px-3 py-2.5 rounded-xl text-sm border transition-colors ${form.material === m ? "bg-primary text-bg border-primary" : "border-primary/15 hover:border-primary"
                          }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="block text-sm text-ink/70 mb-2">Do you have a reference design for the stitching?</label>
              <div className="flex gap-3 mb-4">
                {["yes", "no"].map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => {
                      if (opt === "no") {
                        clearReference();
                        setForm((f) => ({ ...f, hasReferencePic: "no", referenceDesign: "", referenceImage: "" }));
                      } else {
                        setForm((f) => ({ ...f, hasReferencePic: "yes", complexity: "", customComplexity: "" }));
                      }
                    }}
                    className={`px-5 py-2.5 rounded-full text-sm border capitalize transition-colors cursor-pointer ${form.hasReferencePic === opt ? "bg-primary text-bg border-primary shadow-xs" : "border-primary/15 hover:border-primary bg-white"
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {/* BRANCH 1: User has a reference design (YES) */}
              {form.hasReferencePic === "yes" ? (
                <div className="mb-6">
                  {form.referenceImage || form.referenceDesign ? (
                    <div className="flex items-center gap-3 bg-highlight/30 px-4 py-3 rounded-xl">
                      {form.referenceImage && (
                        <img src={form.referenceImage} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-primary font-medium truncate">{form.referenceDesign || "Reference attached"}</p>
                        <p className="text-xs text-ink/50">Reference attached</p>
                      </div>
                      <button
                        type="button"
                        onClick={clearReference}
                        className="text-ink/40 hover:text-red-500 shrink-0 cursor-pointer"
                        aria-label="Remove reference"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setGalleryPickerOpen((v) => !v)}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm transition-colors cursor-pointer ${galleryPickerOpen ? "border-accent text-accent bg-highlight/20" : "border-primary/15 text-primary hover:border-accent bg-white"
                          }`}
                      >
                        <Images size={15} /> Choose from Design Gallery
                      </button>
                      <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-primary/15 text-sm text-primary hover:border-accent cursor-pointer transition-colors bg-white">
                        <Upload size={15} /> Upload from your device
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                      </label>
                    </div>
                  )}

                  <AnimatePresence>
                    {galleryPickerOpen && !form.referenceImage && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 border border-primary/10 rounded-xl p-3 bg-white">
                          <p className="text-xs text-ink/50 mb-2">Tap a design to attach it as your reference</p>
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                            {designs.map((d) => (
                              <button
                                type="button"
                                key={d.id}
                                onClick={() => pickGalleryDesign(d)}
                                className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-accent transition-colors"
                                title={d.title}
                              >
                                <img
                                  src={getImageUrl(d.thumbnail?.url || d.images?.[0]?.url || d.image)}
                                  alt={d.title}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* When custom reference is attached (not a gallery design), prompt for work complexity */}
                  {!isKnownGalleryDesign && (form.referenceImage || form.referenceDesign) && (
                    <div className="mt-4 pt-4 border-t border-primary/10 space-y-2.5">
                      <label className="block text-sm font-medium text-ink/70">
                        What type of work does your reference require? <span className="text-accent">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        {complexityOptions.map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                complexity: c.id,
                                ...(c.id !== "other" && { customComplexity: "" }),
                              }))
                            }
                            className={`px-4 py-2.5 sm:py-3 rounded-xl text-sm border font-medium leading-tight text-left transition-colors cursor-pointer flex items-center justify-between ${
                              form.complexity === c.id
                                ? "bg-primary text-bg border-primary shadow-sm"
                                : "border-primary/15 hover:border-primary bg-white"
                            }`}
                          >
                            <span>{c.label}</span>
                            <span className={`text-xs ${form.complexity === c.id ? "text-highlight" : "text-accent font-semibold"}`}>
                              ₹{c.cost.toLocaleString("en-IN")}
                            </span>
                          </button>
                        ))}
                      </div>

                      {form.complexity === "other" && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 bg-highlight/20 p-4 rounded-xl border border-accent/30"
                        >
                          <label className="block text-sm font-medium text-primary mb-2">
                            Please describe the custom work you want <span className="text-accent">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={form.customComplexity}
                            onChange={(e) => update("customComplexity", e.target.value)}
                            placeholder="e.g. Patchwork border with zari motifs, high-neck back keyhole..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 focus:border-accent bg-white outline-none text-sm"
                          />
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* BRANCH 2: User has NO reference design (NO) -> Ask what type of design do you want? */
                <div className="mb-6 space-y-3">
                  <label className="block text-sm text-ink/70">What type of design do you want? <span className="text-accent">*</span></label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    {complexityOptions.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            complexity: c.id,
                            ...(c.id !== "other" && { customComplexity: "" }),
                          }))
                        }
                        className={`px-4 py-2.5 sm:py-3 rounded-xl text-sm border font-medium leading-tight text-left transition-colors cursor-pointer flex items-center justify-between ${
                          form.complexity === c.id ? "bg-primary text-bg border-primary shadow-sm" : "border-primary/15 hover:border-primary bg-white"
                        }`}
                      >
                        <span>{c.label}</span>
                        <span className={`text-xs ${form.complexity === c.id ? "text-highlight" : "text-accent font-semibold"}`}>
                          ₹{c.cost.toLocaleString("en-IN")}
                        </span>
                      </button>
                    ))}
                  </div>

                  {form.complexity === "other" && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 bg-highlight/20 p-4 rounded-xl border border-accent/30"
                    >
                      <label className="block text-sm font-medium text-primary mb-2">
                        Please describe the design you want <span className="text-accent">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.customComplexity}
                        onChange={(e) => update("customComplexity", e.target.value)}
                        placeholder="e.g. Patchwork border with zari motifs, high-neck back keyhole..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 focus:border-accent bg-white outline-none text-sm"
                      />
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <Measurements
                values={form.measurements}
                onChange={updateMeasurement}
                onProfileLoad={(mapped) =>
                  setForm((f) => ({ ...f, measurements: { ...f.measurements, ...mapped } }))
                }
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <div className="flex items-center gap-2 mb-6 text-primary">
                <CalendarClock size={18} className="text-accent" />
                <h3 className="font-display text-lg font-semibold">Delivery &amp; Contact</h3>
              </div>

              {/* Contact Details */}
              <div className="bg-bg/50 p-4 sm:p-5 rounded-2xl border border-primary/10 mb-6 space-y-4">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-primary/70">Contact Details</h4>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink/70 mb-1.5">
                      Full Name <span className="text-accent">*</span>
                    </label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="Enter your name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-ink/70">
                        Email <span className="text-accent">*</span>
                      </label>
                      {user?.email && (
                        <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
                          Account Email
                        </span>
                      )}
                    </div>
                    <input
                      required
                      type="email"
                      value={form.email}
                      readOnly={Boolean(user?.email)}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="your.email@example.com"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${
                        user?.email
                          ? "border-primary/15 bg-primary/5 text-ink/80 cursor-not-allowed font-medium"
                          : "border-primary/15 focus:border-accent outline-none bg-white"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/70 mb-1.5">
                      Phone Number <span className="text-accent">*</span>
                    </label>
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="Enter your phone number"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white outline-none ${
                        !form.phone.trim() ? "border-amber-400 focus:border-accent shadow-xs" : "border-primary/15 focus:border-accent"
                      }`}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-ink/65 leading-tight pt-1">
                  Your phone number is required so our tailoring team can contact you about your order.
                </p>
              </div>

              {/* Delivery Method Selection */}
              <label className="block text-sm text-ink/70 mb-2 font-medium">Delivery Method <span className="text-accent">*</span></label>
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => update("deliveryMethod", "store_pickup")}
                  className={`text-left p-4 rounded-xl border-2 transition-colors flex items-start gap-3 ${
                    form.deliveryMethod === "store_pickup" ? "border-primary bg-primary/5 shadow-xs" : "border-primary/15 hover:border-primary/30"
                  }`}
                >
                  <Store size={20} className="text-accent shrink-0 mt-0.5" />
                  <div>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">Store Pickup</span>
                    <span className="text-xs text-accent font-bold block mt-0.5">₹0</span>
                    <span className="text-[11px] text-ink/60 block mt-1 leading-snug">Collect directly from our store in Guntur.</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => update("deliveryMethod", "home_delivery")}
                  className={`text-left p-4 rounded-xl border-2 transition-colors flex items-start gap-3 ${
                    form.deliveryMethod === "home_delivery" ? "border-accent bg-highlight/25 shadow-xs" : "border-primary/15 hover:border-accent/40"
                  }`}
                >
                  <Truck size={20} className="text-accent shrink-0 mt-0.5" />
                  <div>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">Home Delivery</span>
                    <span className="text-xs text-primary font-medium block mt-0.5">Delivery charge based on location</span>
                    <span className="text-[11px] text-ink/60 block mt-1 leading-snug">Calculated from Lucky Couture store distance.</span>
                  </div>
                </button>
              </div>

              {/* Delivery Location Section (when Home Delivery selected) */}
              {form.deliveryMethod === "home_delivery" && (
                <div className="mb-6 bg-white p-4 sm:p-5 rounded-2xl border border-primary/15 shadow-card space-y-4">
                  <div className="flex items-center gap-2 border-b border-primary/10 pb-2.5">
                    <MapPin size={16} className="text-accent" />
                    <h4 className="text-sm font-semibold text-primary">Delivery Location Details</h4>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink/70 mb-1.5">
                      Address / Area / Street <span className="text-accent">*</span>
                    </label>
                    <input
                      required
                      value={form.address}
                      onChange={(e) => update("address", e.target.value)}
                      placeholder="e.g. Door No 4-12, Muthyalareddy Nagar, Amaravathi Road..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-ink/70 mb-1.5">
                        City / Town <span className="text-accent">*</span>
                      </label>
                      <input
                        required
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                        placeholder="e.g. Guntur, Mangalagiri, Tenali..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink/70 mb-1.5">
                        6-Digit Pincode <span className="text-accent">*</span>
                      </label>
                      <input
                        required
                        inputMode="numeric"
                        value={form.pincode}
                        onChange={(e) => update("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="e.g. 522007"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                      />
                    </div>
                  </div>

                  {/* Sub-option selector for Guntur City */}
                  {deliveryInfo.category === "guntur_city" && (
                    <div className="pt-2 border-t border-primary/10">
                      <label className="block text-xs font-semibold text-primary mb-2">Guntur City Delivery Options</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => update("gunturOption", "standard")}
                          className={`p-3 rounded-xl border text-xs font-medium text-left transition-colors ${
                            form.gunturOption === "standard" ? "border-accent bg-highlight/30 text-primary font-bold" : "border-primary/15 text-ink/75"
                          }`}
                        >
                          <div>Standard Guntur Delivery</div>
                          <div className="text-accent font-semibold mt-0.5">₹40 (~5 km)</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => update("gunturOption", "extended")}
                          className={`p-3 rounded-xl border text-xs font-medium text-left transition-colors ${
                            form.gunturOption === "extended" ? "border-accent bg-highlight/30 text-primary font-bold" : "border-primary/15 text-ink/75"
                          }`}
                        >
                          <div>Extended Guntur City Delivery</div>
                          <div className="text-accent font-semibold mt-0.5">₹50 (~8 km)</div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sub-option selector for Near Guntur */}
                  {deliveryInfo.category === "near_guntur" && (
                    <div className="pt-2 border-t border-primary/10">
                      <label className="block text-xs font-semibold text-primary mb-2">Near Guntur Delivery Options</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => update("nearbyOption", "standard")}
                          className={`p-3 rounded-xl border text-xs font-medium text-left transition-colors ${
                            form.nearbyOption === "standard" ? "border-accent bg-highlight/30 text-primary font-bold" : "border-primary/15 text-ink/75"
                          }`}
                        >
                          <div>Nearby Delivery</div>
                          <div className="text-accent font-semibold mt-0.5">₹80 (~10 km)</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => update("nearbyOption", "extended")}
                          className={`p-3 rounded-xl border text-xs font-medium text-left transition-colors ${
                            form.nearbyOption === "extended" ? "border-accent bg-highlight/30 text-primary font-bold" : "border-primary/15 text-ink/75"
                          }`}
                        >
                          <div>Extended Nearby Delivery</div>
                          <div className="text-accent font-semibold mt-0.5">₹100 (~12 km)</div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Live Distance & Price Estimate Banner */}
                  <div className="bg-bg p-3.5 rounded-xl border border-primary/12 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-primary block">{deliveryInfo.distanceText}</span>
                      <span className="text-ink/60 text-[11px]">Calculated from store coordinates</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold uppercase tracking-wider text-ink/50 block">Delivery Charge</span>
                      <span className={`font-bold ${deliveryInfo.status === "to_be_confirmed" ? "text-amber-700" : "text-accent text-sm"}`}>
                        {deliveryInfo.chargeText}
                      </span>
                    </div>
                  </div>

                  {deliveryInfo.notice && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl leading-relaxed">
                      {deliveryInfo.notice}
                    </p>
                  )}
                </div>
              )}

              {/* Order Type */}
              <label className="block text-sm text-ink/70 mb-2 font-medium">Stitching Order Type</label>
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => update("orderType", "standard")}
                  className={`text-left p-4 rounded-xl border-2 transition-colors ${form.orderType === "standard" ? "border-primary bg-primary/5" : "border-primary/15 hover:border-primary/30"
                    }`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <Clock size={14} /> Standard Stitching
                  </span>
                  <span className="text-xs text-ink/55 block mt-1">Flexible delivery, no extra charge.</span>
                </button>
                <button
                  type="button"
                  onClick={() => update("orderType", "priority")}
                  className={`text-left p-4 rounded-xl border-2 transition-colors ${form.orderType === "priority" ? "border-accent bg-highlight/30" : "border-primary/15 hover:border-accent/40"
                    }`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <Zap size={14} className="text-accent" /> Priority Stitching
                  </span>
                  <span className="text-xs text-ink/55 block mt-1">24–30 hour turnaround, ₹500 surcharge. Subject to daily capacity.</span>
                </button>
              </div>

              <label className="block text-xs text-ink/60 mb-1.5">Describe more about the item (optional)</label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                placeholder="Colour preference, occasion, any special detail..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm mb-2"
              />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <div className="flex items-center gap-2 mb-6 text-primary">
                <FileText size={18} className="text-accent" />
                <h3 className="font-display text-lg font-semibold">Review your booking details</h3>
              </div>

              <p className="text-xs text-ink/65 mb-6">
                Please double-check your measurements and selections below before confirming your booking.
              </p>

              <div className="bg-bg rounded-2xl p-4 sm:p-5 border border-primary/10 space-y-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-primary/10 gap-1">
                  <span className="text-xs uppercase tracking-wider text-ink/50 font-medium">Garment &amp; Design</span>
                  <span className="text-sm font-semibold text-primary">
                    {activeGarment}
                  </span>
                </div>

                {form.hasReferencePic === "yes" ? (
                  form.referenceDesign && (
                    <div className="flex items-center justify-between pb-3 border-b border-primary/10 gap-2">
                      <span className="text-xs uppercase tracking-wider text-ink/50 font-medium">Design Reference</span>
                      <div className="flex items-center gap-2">
                        {form.referenceImage && (
                          <img src={form.referenceImage} alt="" className="w-7 h-7 rounded object-cover" />
                        )}
                        <span className="text-sm font-medium text-primary truncate max-w-[180px] sm:max-w-xs">{form.referenceDesign}</span>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-primary/10 gap-1">
                    <span className="text-xs uppercase tracking-wider text-ink/50 font-medium">Design Style</span>
                    <span className="text-sm font-medium text-primary">
                      {form.complexity === "other" && form.customComplexity
                        ? `Other (${form.customComplexity})`
                        : complexityOptions.find((c) => c.id === form.complexity)?.label || "Simple Design"}
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-primary/10 gap-1">
                  <span className="text-xs uppercase tracking-wider text-ink/50 font-medium">Fabric Material</span>
                  <span className="text-sm font-medium text-primary">
                    {form.ownFabric === "yes"
                      ? `Customer Provided (Drop-off date: ${form.fabricDropoffDate || "Not set"})`
                      : `Store Sourced — ${form.material || "Standard Fabric"}`}
                  </span>
                </div>

                {form.clothTitle && (
                  <div className="flex items-center justify-between pb-3 border-b border-primary/10 gap-2">
                    <span className="text-xs uppercase tracking-wider text-ink/50 font-medium">Shop Cloth Selected</span>
                    <div className="flex items-center gap-2">
                      {form.clothImage && (
                        <img src={form.clothImage} alt="" className="w-7 h-7 rounded object-cover" />
                      )}
                      <span className="text-sm font-medium text-primary truncate max-w-[180px] sm:max-w-xs">{form.clothTitle}</span>
                    </div>
                  </div>
                )}

                <div className="pb-3 border-b border-primary/10">
                  <span className="text-xs uppercase tracking-wider text-ink/50 font-medium block mb-2">Measurements (inches)</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white/70 p-3 rounded-xl border border-primary/10">
                    {MEASUREMENT_FIELDS.map((f) => (
                      <div key={f} className="text-xs whitespace-nowrap">
                        <span className="text-ink/60">{f}: </span>
                        <strong className="text-primary">{form.measurements[f]} in</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-primary/10 gap-1">
                  <span className="text-xs uppercase tracking-wider text-ink/50 font-medium">Contact Details</span>
                  <span className="text-sm font-medium text-primary">
                    {form.name} • {form.email} • {form.phone}
                  </span>
                </div>

                {/* Delivery Review Details */}
                <div className="pb-3 border-b border-primary/10 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="uppercase tracking-wider text-ink/50 font-medium">Delivery Method</span>
                    <span className="font-semibold text-primary">
                      {form.deliveryMethod === "store_pickup"
                        ? "Store Pickup"
                        : (deliveryInfo.category === "long_distance" ? "Long-distance delivery" : "Home Delivery")}
                    </span>
                  </div>
                  {form.deliveryMethod === "home_delivery" && (
                    <>
                      <div className="flex justify-between">
                        <span className="uppercase tracking-wider text-ink/50 font-medium">Delivery Location</span>
                        <span className="font-medium text-primary text-right max-w-[220px] truncate">
                          {[form.address, form.city, form.pincode].filter(Boolean).join(", ")}
                        </span>
                      </div>
                      {deliveryInfo.distanceText && (
                        <div className="flex justify-between">
                          <span className="uppercase tracking-wider text-ink/50 font-medium">Distance</span>
                          <span className="font-medium text-primary">{deliveryInfo.distanceText}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="uppercase tracking-wider text-ink/50 font-medium">Delivery Charge</span>
                    <span className="font-semibold text-primary">{deliveryInfo.chargeText}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-primary/10 gap-1">
                  <span className="text-xs uppercase tracking-wider text-ink/50 font-medium">Order Type</span>
                  <span className={`text-sm font-semibold ${form.orderType === "priority" ? "text-accent" : "text-primary"}`}>
                    {form.orderType === "priority" ? "Priority Stitching (24–30 hrs)" : "Standard Stitching (3–7 days)"}
                  </span>
                </div>

                {/* Price Calculation Breakdown — Absolutely NO GST */}
                <div className="pt-2 border-t border-primary/10">
                  <span className="text-xs uppercase tracking-wider text-ink/50 font-bold block mb-2">Estimated Order Breakdown</span>
                  <div className="bg-white/80 p-3.5 rounded-xl border border-primary/10 space-y-2 text-xs">
                    {designCost > 0 && (
                      <div className="flex justify-between text-ink/80">
                        <span>
                          Design / Work Cost (
                          {isKnownGalleryDesign
                            ? activeGalleryDesign?.title
                            : (complexityOptions.find((c) => c.id === form.complexity)?.label || "Custom Work")}
                          )
                        </span>
                        <span className="font-semibold text-primary">₹{designCost.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {form.ownFabric === "no" && fabricObj ? (
                      <div className="flex justify-between text-ink/80">
                        <span>Fabric ({fabricObj.name} — {stdFabricQty} {stdFabricQty === 1 ? "metre" : "metres"} @ ₹{fabricObj.pricePerMeter}/m)</span>
                        <span className="font-semibold text-primary">₹{fabricCost.toLocaleString("en-IN")}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-ink/80">
                        <span>Fabric Source</span>
                        <span className="font-semibold text-primary">Customer Provided (₹0)</span>
                      </div>
                    )}
                    {form.orderType === "priority" && (
                      <div className="flex justify-between text-ink/80">
                        <span>Priority Stitching Surcharge</span>
                        <span className="font-semibold text-primary">₹{prioritySurcharge.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-ink/80">
                      <span>Delivery ({form.deliveryMethod === "store_pickup" ? "Store Pickup" : form.city || "Home Delivery"})</span>
                      <span className="font-semibold text-primary">{deliveryInfo.chargeText}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-primary pt-2 border-t border-primary/10">
                      <span>Total Estimated Charge</span>
                      <span className="text-accent">
                        ₹{(designCost + fabricCost + prioritySurcharge + deliveryInfo.charge).toLocaleString("en-IN")}
                        {deliveryInfo.status === "to_be_confirmed" && " + Delivery to be confirmed"}
                      </span>
                    </div>
                  </div>
                  {deliveryInfo.notice && (
                    <p className="text-[11px] text-amber-800 font-medium mt-2 leading-relaxed">
                      * {deliveryInfo.notice}
                    </p>
                  )}
                </div>

                {form.description && (
                  <div className="pt-2 border-t border-primary/10 text-xs text-ink/70">
                    <span className="font-semibold text-primary">Special instructions: </span>
                    {form.description}
                  </div>
                )}
              </div>

              <div className="bg-highlight/30 border border-accent/30 rounded-xl p-4 text-xs text-primary flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />
                <span>
                  Ready to confirm your booking? Clicking <strong>Place Order</strong> below logs your request and our tailoring team will reach out shortly.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mt-8 sm:mt-10 gap-3">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="px-5 sm:px-6 py-2.5 rounded-full text-sm font-medium text-primary disabled:opacity-30 border border-primary/15 hover:bg-primary/5 transition-colors"
          >
            Back
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="px-6 sm:px-7 py-2.5 rounded-full text-sm font-semibold bg-primary text-bg hover:bg-primary/90 transition-colors"
            >
              {step === 3 ? "Submit" : "Continue"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 sm:px-8 py-2.5 rounded-full text-sm font-semibold bg-accent text-white hover:bg-accent/90 shadow-md shadow-accent/20 transition-all disabled:opacity-70 flex items-center gap-2"
            >
              {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Placing…</> : "Place Order"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

