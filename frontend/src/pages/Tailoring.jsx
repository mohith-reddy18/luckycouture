import { useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Scissors, Ruler, CalendarClock, ShieldCheck, Zap, Clock, Images, Upload, X } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import MeasureGuide from "../components/MeasureGuide";
import ThankYouAnimation from "../components/ThankYouAnimation";
import { garmentTypes, materials, designs } from "../data/mockData";
import { useApp } from "../context/AppContext";

const steps = ["Garment", "Design & Fabric", "Measurements", "Delivery & Contact"];

const measurementFields = ["Chest/Bust", "Waist", "Hip", "Shoulder", "Sleeve Length", "Length"];

const complexityOptions = [
  { id: "simple", label: "Simple Design" },
  { id: "embroidery", label: "Heavy — Embroidery" },
  { id: "maggam", label: "Heavy — Maggam Work" },
  { id: "other", label: "Other" },
];

export default function Tailoring() {
  const { state } = useLocation();
  const { notify } = useApp();
  const prefill = state?.design;
  const isPriority = Boolean(state?.priority);

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [eta, setEta] = useState(null);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [form, setForm] = useState({
    garment: "",
    referenceDesign: prefill?.title || "",
    referenceImage: prefill?.image || "",
    material: "",
    ownFabric: "no",
    fabricDropoffDate: "",
    hasReferencePic: prefill ? "yes" : "no",
    complexity: "",
    measurements: Object.fromEntries(measurementFields.map((f) => [f, ""])),
    name: "",
    phone: "",
    orderType: state?.priority ? "priority" : "standard",
    description: "",
  });

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const updateMeasurement = (field, value) =>
    setForm((f) => ({ ...f, measurements: { ...f.measurements, [field]: value } }));

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

  const next = () => {
    if (step === 0 && !form.garment) {
      notify("Please select a garment type to continue");
      return;
    }
    if (step === 1) {
      if (!form.complexity) {
        notify("Please select a design type to continue");
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
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate the "4 orders/day" capacity logic your Express API would run —
    // POST /api/tailoring-orders would return the real computed ETA.
    if (form.orderType === "priority") {
      const date = new Date();
      date.setHours(date.getHours() + 30);
      setEta(date.toDateString());
    } else {
      const daysAhead = 3 + Math.floor(Math.random() * 4);
      const date = new Date();
      date.setDate(date.getDate() + daysAhead);
      setEta(date.toDateString());
    }
    setSubmitted(true);
    notify("Booking request received");
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <ThankYouAnimation />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.5 }}>
          <h1 className="font-display text-3xl font-semibold text-primary mb-3">Thank you, {form.name || "there"}!</h1>
          <p className="text-ink/65 mb-6">
            We've logged your {form.garment || "garment"} order.
            {form.orderType === "priority"
              ? " Since you chose Priority Stitching, here's your expected delivery window:"
              : " Since we only take four stitching slots a day, your expected delivery date is:"}
          </p>
          <p className="font-display text-2xl text-accent font-semibold mb-2">{eta}</p>
          {form.orderType === "priority" && (
            <p className="text-xs text-ink/50 mb-6">A priority surcharge (~40–50%) applies and will be confirmed on call.</p>
          )}
          <p className="text-sm text-ink/50">We'll confirm over WhatsApp/call at {form.phone || "the number you provided"}.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24">
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
      <div className="flex items-center justify-between mb-12 max-w-xl mx-auto">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                  i < step
                    ? "bg-accent border-accent text-white"
                    : i === step
                    ? "border-accent text-accent"
                    : "border-primary/15 text-primary/30"
                }`}
              >
                {i < step ? <Check size={16} /> : i + 1}
              </div>
              <span className={`text-[10px] uppercase tracking-wide text-center ${i <= step ? "text-primary" : "text-primary/30"}`}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-[2px] flex-1 mx-2 mb-5 ${i < step ? "bg-accent" : "bg-primary/10"}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-6 md:p-10">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <div className="flex items-center gap-2 mb-6 text-primary">
                <Scissors size={18} className="text-accent" />
                <h3 className="font-display text-lg font-semibold">What should we stitch?</h3>
              </div>
              <label className="block text-sm text-ink/70 mb-2">Garment type <span className="text-accent">*</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {garmentTypes.map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => update("garment", g)}
                    className={`px-4 py-3 rounded-xl text-sm border transition-colors ${
                      form.garment === g ? "bg-primary text-bg border-primary" : "border-primary/15 hover:border-primary"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {form.referenceDesign && (
                <div className="flex items-center gap-3 bg-highlight/30 px-4 py-3 rounded-xl">
                  {form.referenceImage && (
                    <img src={form.referenceImage} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  )}
                  <p className="text-sm text-secondary flex-1 min-w-0">
                    Referencing design: <strong className="text-primary">{form.referenceDesign}</strong>
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
                    className={`px-5 py-2.5 rounded-full text-sm border capitalize transition-colors ${
                      form.ownFabric === opt ? "bg-primary text-bg border-primary" : "border-primary/15 hover:border-primary"
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {materials.map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => update("material", m)}
                        className={`px-3 py-2.5 rounded-xl text-sm border transition-colors ${
                          form.material === m ? "bg-primary text-bg border-primary" : "border-primary/15 hover:border-primary"
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
                    className={`px-5 py-2.5 rounded-full text-sm border capitalize transition-colors ${
                      form.hasReferencePic === opt ? "bg-primary text-bg border-primary" : "border-primary/15 hover:border-primary"
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
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm transition-colors ${
                          galleryPickerOpen ? "border-accent text-accent bg-highlight/20" : "border-primary/15 text-primary hover:border-accent"
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
              <div className="grid grid-cols-2 gap-3">
                {complexityOptions.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => update("complexity", c.id)}
                    className={`px-4 py-2.5 rounded-xl text-sm border transition-colors ${
                      form.complexity === c.id ? "bg-primary text-bg border-primary" : "border-primary/15 hover:border-primary"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <div className="flex items-center gap-2 mb-6 text-primary">
                <Ruler size={18} className="text-accent" />
                <h3 className="font-display text-lg font-semibold">Your measurements (inches)</h3>
              </div>
              <MeasureGuide />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {measurementFields.map((f) => (
                  <div key={f}>
                    <label className="block text-xs text-ink/60 mb-1.5">{f}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.measurements[f]}
                      onChange={(e) => updateMeasurement(f, e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                      placeholder="0.0"
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
                <h3 className="font-display text-lg font-semibold">Delivery &amp; contact</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-ink/60 mb-1.5">Full name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink/60 mb-1.5">Phone number</label>
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
                  className={`text-left p-4 rounded-xl border-2 transition-colors ${
                    form.orderType === "standard" ? "border-primary bg-primary/5" : "border-primary/15 hover:border-primary/30"
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
                  className={`text-left p-4 rounded-xl border-2 transition-colors ${
                    form.orderType === "priority" ? "border-accent bg-highlight/30" : "border-primary/15 hover:border-accent/40"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm mb-6"
              />

              <div className="bg-bg rounded-xl p-4 text-sm text-ink/70 space-y-1">
                <p><strong className="text-primary">Garment:</strong> {form.garment || "—"}</p>
                <p><strong className="text-primary">Fabric:</strong> {form.ownFabric === "yes" ? "Customer provided" : form.material || "—"}</p>
                <p><strong className="text-primary">Design:</strong> {complexityOptions.find((c) => c.id === form.complexity)?.label || "—"}</p>
                <p><strong className="text-primary">Reference:</strong> {form.referenceDesign || "None attached"}</p>
                <p><strong className="text-primary">Order Type:</strong> {form.orderType === "priority" ? "Priority Stitching (extra charge)" : "Standard Stitching"}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mt-10">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="px-6 py-2.5 rounded-full text-sm font-medium text-primary disabled:opacity-30"
          >
            Back
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="px-7 py-2.5 rounded-full text-sm font-semibold bg-primary text-bg hover:bg-primary/90"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              className="px-7 py-2.5 rounded-full text-sm font-semibold bg-highlight text-primary hover:bg-accent hover:text-white transition-colors"
            >
              Submit Booking
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
