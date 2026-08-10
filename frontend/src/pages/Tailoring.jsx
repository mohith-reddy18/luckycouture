import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Scissors, Ruler, CalendarClock, ShieldCheck, Zap, Clock, Images, Upload, X, FileText, CheckCircle2, MessageCircle, Loader2 } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import MeasureGuide from "../components/MeasureGuide";
import ThankYouAnimation from "../components/ThankYouAnimation";
import { garmentTypes, materials, designs, contactInfo } from "../data/mockData";
import { useApp } from "../context/AppContext";
import api from "../utils/api";

const steps = ["Garment", "Design & Fabric", "Measurements", "Delivery & Contact", "Review & Confirm"];

const measurementFields = [
  "Chest/Bust",
  "Waist",
  "Hip",
  "Shoulder",
  "Armhole / Arm Round",
  "Sleeves Round",
  "Front Neck Deep",
  "Back Neck Deep",
  "Sleeve Length",
  "Length",
];

const complexityOptions = [
  { id: "simple", label: "Simple Design" },
  { id: "embroidery", label: "Heavy — Embroidery" },
  { id: "maggam", label: "Heavy — Maggam Work" },
  { id: "other", label: "Other" },
];

export default function Tailoring() {
  const { state } = useLocation();
  const { notify, measurements: savedMeasurements, user } = useApp();
  const prefill = state?.design;       // from DesignDetail → /tailoring
  const prefillCloth = state?.cloth;   // from ProductDetail → /tailoring
  const isPriority = Boolean(state?.priority);

  const formRef = useRef(null);

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eta, setEta] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [form, setForm] = useState({
    garment: "",
    customGarment: "",
    referenceDesign: prefill?.title || "",
    referenceImage: prefill?.image || "",
    clothTitle: prefillCloth?.name || "",
    clothImage: prefillCloth?.image || "",
    material: "",
    ownFabric: "no",
    fabricDropoffDate: "",
    hasReferencePic: (prefill || prefillCloth) ? "yes" : "no",
    complexity: "",
    customComplexity: "",
    measurements: Object.fromEntries(measurementFields.map((f) => [f, ""])),
    name: user?.name || "",
    phone: user?.phone || "",
    orderType: state?.priority ? "priority" : "standard",
    description: "",
  });

  // Auto-fill user contact details when user object is loaded
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: f.name || user.name || "",
        phone: f.phone || user.phone || "",
      }));
    }
  }, [user]);

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
    setForm((f) => ({ ...f, referenceDesign: design.title, referenceImage: design.image }));
    setGalleryPickerOpen(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setForm((f) => ({ ...f, referenceDesign: file.name, referenceImage: previewUrl }));
  };

  const clearReference = () => setForm((f) => ({ ...f, referenceDesign: "", referenceImage: "" }));
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
      if (!form.complexity) {
        notify("Please select a design type to continue");
        return;
      }
      if (form.complexity === "other" && !form.customComplexity.trim()) {
        notify("Please describe the custom design you want to continue");
        return;
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
      const missing = measurementFields.find((f) => !form.measurements[f] || !String(form.measurements[f]).trim());
      if (missing) {
        notify(`Please enter your ${missing} measurement to continue`);
        return;
      }
    }
    if (step === 3) {
      if (!form.name.trim()) {
        notify("Please enter your full name to continue");
        return;
      }
      if (!form.phone.trim()) {
        notify("Please enter your phone number to continue");
        return;
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
    setIsSubmitting(true);
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });

    // Build the payload expected by POST /api/tailoring
    const measurementsMap = {};
    const keyMap = {
      "Chest/Bust": "bust",
      "Waist": "waist",
      "Hip": "hips",
      "Shoulder": "shoulder",
      "Armhole / Arm Round": "armhole",
      "Sleeves Round": "sleeves_round",
      "Front Neck Deep": "front_neck_deep",
      "Back Neck Deep": "back_neck_deep",
      "Sleeve Length": "sleeve",
      "Length": "length",
    };
    Object.entries(form.measurements).forEach(([label, val]) => {
      const apiKey = keyMap[label] || label.toLowerCase().replace(/[\s/]+/g, "_");
      if (val !== "" && !isNaN(Number(val))) measurementsMap[apiKey] = Number(val);
    });

    const payload = {
      garmentType: (form.garment === "Other" || form.garment === "Others") && form.customGarment
        ? form.customGarment
        : form.garment,
      fabricSource: form.ownFabric === "yes" ? "customer_provided" : "shop_provided",
      ...(form.ownFabric === "yes" && form.fabricDropoffDate && { fabricDropoffDate: form.fabricDropoffDate }),
      ...(form.ownFabric === "no" && form.material && { preferredMaterial: form.material }),
      hasReferenceImages: form.hasReferencePic === "yes" && Boolean(form.referenceDesign),
      designComplexity: form.complexity || "simple",
      ...(form.complexity === "other" && form.customComplexity && { description: form.customComplexity }),
      measurements: measurementsMap,
      isFastDelivery: form.orderType === "priority",
      // Guest info — sent when the user is not logged in
      guestInfo: !user ? { name: form.name, phone: form.phone } : undefined,
    };

    try {
      const res = await api.post("/api/tailoring", payload);
      const saved = res.data;
      setOrderId(saved.orderId || saved._id);
      setEta(saved.expectedDeliveryDate
        ? new Date(saved.expectedDeliveryDate).toDateString()
        : "5–7 days");
      setSubmitted(true);
      notify("Booking request received");
    } catch (err) {
      notify(err.message || "Could not place order — please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    const finalGarment = (form.garment === "Other" || form.garment === "Others") && form.customGarment
      ? form.customGarment
      : form.garment || "garment";

    return (
      <div className="max-w-xl mx-auto px-5 sm:px-8 pt-4 sm:pt-6 pb-16 text-center flex flex-col items-center justify-center">
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
              href={contactInfo.whatsappHref}
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

      <form ref={formRef} onSubmit={(e) => { e.preventDefault(); if (step === steps.length - 1) handleSubmit(e); else next(); }} className="bg-white rounded-2xl shadow-card p-5 sm:p-8 md:p-10">
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
                    onClick={() => update("hasReferencePic", opt)}
                    className={`px-5 py-2.5 rounded-full text-sm border capitalize transition-colors ${form.hasReferencePic === opt ? "bg-primary text-bg border-primary" : "border-primary/15 hover:border-primary"
                      }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {form.hasReferencePic === "yes" && (
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
                        className="text-ink/40 hover:text-red-500 shrink-0"
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
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm transition-colors ${galleryPickerOpen ? "border-accent text-accent bg-highlight/20" : "border-primary/15 text-primary hover:border-accent"
                          }`}
                      >
                        <Images size={15} /> Choose from Design Gallery
                      </button>
                      <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-primary/15 text-sm text-primary hover:border-accent cursor-pointer transition-colors">
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
                        <div className="mt-3 border border-primary/10 rounded-xl p-3">
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
                                <img src={d.image} alt={d.title} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <label className="block text-sm text-ink/70 mb-2">What kind of design do you need? <span className="text-accent">*</span></label>
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
                    className={`px-4 py-2.5 sm:py-3 rounded-xl text-sm border font-medium leading-tight text-left transition-colors ${form.complexity === c.id ? "bg-primary text-bg border-primary shadow-sm" : "border-primary/15 hover:border-primary"
                      }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {form.complexity === "other" && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 mb-2 bg-highlight/20 p-4 rounded-xl border border-accent/30"
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
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <div className="flex items-center gap-2 mb-6 text-primary">
                <Ruler size={18} className="text-accent" />
                <h3 className="font-display text-lg font-semibold">Your measurements (inches)</h3>
              </div>

              {/* Load from saved profile — only shown when the user has profiles */}
              {user && savedMeasurements.length > 0 && (
                <div className="mb-5 flex items-center gap-3 bg-highlight/20 border border-highlight/40 rounded-xl px-4 py-3">
                  <Ruler size={15} className="text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-primary mb-1">Load from saved profile</p>
                    <select
                      onChange={(e) => {
                        const mp = savedMeasurements.find((m) => m._id === e.target.value);
                        if (!mp) return;
                        // Map profile keys to the form's measurementFields keys
                        const keyMap = {
                          bust: "Chest/Bust", waist: "Waist", hips: "Hip",
                          shoulder: "Shoulder", length: "Length", sleeve: "Sleeve Length",
                          armhole: "Armhole / Arm Round", sleeves_round: "Sleeves Round",
                          front_neck_deep: "Front Neck Deep", back_neck_deep: "Back Neck Deep",
                        };
                        const mapped = {};
                        Object.entries(mp.measurements || {}).forEach(([k, v]) => {
                          const formKey = keyMap[k] || k;
                          if (measurementFields.includes(formKey)) mapped[formKey] = String(v);
                        });
                        setForm((f) => ({ ...f, measurements: { ...f.measurements, ...mapped } }));
                        notify(`Loaded measurements from "${mp.profileName}"`);
                      }}
                      defaultValue=""
                      className="w-full bg-white border border-primary/15 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent"
                    >
                      <option value="" disabled>— Select a profile —</option>
                      {savedMeasurements.map((mp) => (
                        <option key={mp._id} value={mp._id}>{mp.profileName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <MeasureGuide />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4">
                {measurementFields.map((f) => (
                  <div key={f}>
                    <label className="block text-xs font-medium text-ink/70 mb-1.5">
                      {f} <span className="text-accent">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      value={form.measurements[f]}
                      onChange={(e) => updateMeasurement(f, e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                      placeholder="e.g. 36.5"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <div className="flex items-center gap-2 mb-6 text-primary">
                <CalendarClock size={18} className="text-accent" />
                <h3 className="font-display text-lg font-semibold">Delivery &amp; Contact</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-ink/70 mb-1.5">
                    Full name <span className="text-accent">*</span>
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink/70 mb-1.5">
                    Phone number <span className="text-accent">*</span>
                  </label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                  />
                </div>
              </div>

              <label className="block text-sm text-ink/70 mb-2">Order Type</label>
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
                  <span className="text-xs text-ink/55 block mt-1">24–30 hour delivery, ~40–50% surcharge. Subject to availability.</span>
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
                    {(form.garment === "Other" || form.garment === "Others") && form.customGarment
                      ? `Other (${form.customGarment})`
                      : form.garment}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-primary/10 gap-1">
                  <span className="text-xs uppercase tracking-wider text-ink/50 font-medium">Design Style</span>
                  <span className="text-sm font-medium text-primary">
                    {form.complexity === "other" && form.customComplexity
                      ? `Other (${form.customComplexity})`
                      : complexityOptions.find((c) => c.id === form.complexity)?.label || "—"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-primary/10 gap-1">
                  <span className="text-xs uppercase tracking-wider text-ink/50 font-medium">Fabric Material</span>
                  <span className="text-sm font-medium text-primary">
                    {form.ownFabric === "yes"
                      ? `Customer Provided (Drop-off date: ${form.fabricDropoffDate || "Not set"})`
                      : `Store Sourced — ${form.material || "Not set"}`}
                  </span>
                </div>

                {form.referenceDesign && (
                  <div className="flex items-center justify-between pb-3 border-b border-primary/10 gap-2">
                    <span className="text-xs uppercase tracking-wider text-ink/50 font-medium">Design Reference</span>
                    <div className="flex items-center gap-2">
                      {form.referenceImage && (
                        <img src={form.referenceImage} alt="" className="w-7 h-7 rounded object-cover" />
                      )}
                      <span className="text-sm font-medium text-primary truncate max-w-[180px] sm:max-w-xs">{form.referenceDesign}</span>
                    </div>
                  </div>
                )}

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
                  <span className="text-xs uppercase tracking-wider text-ink/50 font-medium block mb-2">Measurements (Inches)</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white/70 p-3 rounded-xl border border-primary/10">
                    {measurementFields.map((f) => (
                      <div key={f} className="text-xs">
                        <span className="text-ink/60">{f}: </span>
                        <strong className="text-primary">{form.measurements[f]}″</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-primary/10 gap-1">
                  <span className="text-xs uppercase tracking-wider text-ink/50 font-medium">Contact Details</span>
                  <span className="text-sm font-medium text-primary">
                    {form.name} ({form.phone})
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs uppercase tracking-wider text-ink/50 font-medium">Order Type</span>
                  <span className={`text-sm font-semibold ${form.orderType === "priority" ? "text-accent" : "text-primary"}`}>
                    {form.orderType === "priority" ? "Priority Stitching (24–30 hrs)" : "Standard Stitching (3–7 days)"}
                  </span>
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
              type="submit"
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

