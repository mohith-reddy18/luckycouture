import { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Scissors,
  Zap,
  Truck,
  Clock,
  RotateCcw,
  Sparkles,
  Plus,
  Trash2,
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  Image as ImageIcon,
} from "lucide-react";
import api from "../../utils/api";
import { useApp } from "../../context/AppContext";

export default function AdminBusinessSettings() {
  const { notify } = useApp();

  const [activeTab, setActiveTab] = useState("rules");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    dailyTailoringCapacity: 4,
    dailyPriorityCapacity: 2,
    prioritySurchargeMin: 50,
    prioritySurchargeMax: 50,
    priorityStitchingEnabled: true,
    freeShippingThreshold: 2999,
    standardShippingFee: 149,
    businessHours: "Monday – Saturday, 9:00 AM – 8:00 PM (Sunday: Holiday)",
    homeBestWork: [],
    heroSlides: [],
    faqs: [],
    contactInfo: {
      phone: "+91 88017 90961",
      phoneHref: "+918801790961",
      whatsappHref: "https://wa.me/918801790961",
      email: "lakshmibade32@gmail.com",
      techSupportEmail: "mohithreddybade18@gmail.com",
      address: "Muthyalareddy Nagar Main Road, Amaravathi Road, Guntur 522007",
      mapsUrl: "https://maps.app.goo.gl/D947tqUz2d6ogiCn8",
    },
  });

  const fetchSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/admin/settings");
      if (res?.data) {
        setForm({
          dailyTailoringCapacity: res.data.dailyTailoringCapacity ?? 4,
          dailyPriorityCapacity: res.data.dailyPriorityCapacity ?? 2,
          prioritySurchargeMin: res.data.prioritySurchargeMin ?? 50,
          prioritySurchargeMax: res.data.prioritySurchargeMax ?? 50,
          priorityStitchingEnabled: res.data.priorityStitchingEnabled ?? true,
          freeShippingThreshold: res.data.freeShippingThreshold ?? 2999,
          standardShippingFee: res.data.standardShippingFee ?? 149,
          businessHours:
            res.data.businessHours ||
            "Monday – Saturday, 9:00 AM – 8:00 PM (Sunday: Holiday)",
          homeBestWork: Array.isArray(res.data.homeBestWork) ? res.data.homeBestWork : [],
          heroSlides: Array.isArray(res.data.heroSlides) ? res.data.heroSlides : [],
          faqs: Array.isArray(res.data.faqs) ? res.data.faqs : [],
          contactInfo: {
            phone: res.data.contactInfo?.phone || "+91 88017 90961",
            phoneHref: res.data.contactInfo?.phoneHref || "+918801790961",
            whatsappHref: res.data.contactInfo?.whatsappHref || "https://wa.me/918801790961",
            email: res.data.contactInfo?.email || "lakshmibade32@gmail.com",
            techSupportEmail: res.data.contactInfo?.techSupportEmail || "mohithreddybade18@gmail.com",
            address: res.data.contactInfo?.address || "Muthyalareddy Nagar Main Road, Amaravathi Road, Guntur 522007",
            mapsUrl: res.data.contactInfo?.mapsUrl || "https://maps.app.goo.gl/D947tqUz2d6ogiCn8",
          },
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load current business settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e?.preventDefault();
    setError("");
    setSuccess(false);

    const cap = Number(form.dailyTailoringCapacity);
    if (!Number.isInteger(cap) || cap <= 0) {
      setError("Daily Tailoring Capacity must be a positive integer (at least 1).");
      return;
    }

    const minSur = Number(form.prioritySurchargeMin);
    const maxSur = Number(form.prioritySurchargeMax);

    if (isNaN(minSur) || minSur < 0) {
      setError("Priority Surcharge Minimum must be greater than or equal to 0%.");
      return;
    }

    if (isNaN(maxSur) || maxSur < 0) {
      setError("Priority Surcharge Maximum must be greater than or equal to 0%.");
      return;
    }

    if (maxSur < minSur) {
      setError(`Priority Surcharge Maximum (${maxSur}%) cannot be less than Minimum (${minSur}%).`);
      return;
    }

    setSaving(true);
    try {
      await api.patch("/api/admin/settings", {
        dailyTailoringCapacity: cap,
        dailyPriorityCapacity: Number(form.dailyPriorityCapacity) || 2,
        prioritySurchargeMin: minSur,
        prioritySurchargeMax: maxSur,
        priorityStitchingEnabled: Boolean(form.priorityStitchingEnabled),
        freeShippingThreshold: Number(form.freeShippingThreshold) || 2999,
        standardShippingFee: Number(form.standardShippingFee) || 149,
        businessHours: form.businessHours,
        homeBestWork: form.homeBestWork,
        heroSlides: form.heroSlides,
        faqs: form.faqs,
        contactInfo: form.contactInfo,
      });

      setSuccess(true);
      notify("Business settings and site data saved successfully!");
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update business settings");
    } finally {
      setSaving(false);
    }
  };

  // Best Work Helpers
  const handleAddBestWork = () => {
    setForm((prev) => ({
      ...prev,
      homeBestWork: [
        ...prev.homeBestWork,
        {
          id: `bw-${Date.now()}`,
          title: "New Best Work Piece",
          subtitle: "Custom Stitching",
          image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
        },
      ],
    }));
  };

  const handleUpdateBestWork = (index, field, value) => {
    setForm((prev) => {
      const list = [...prev.homeBestWork];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, homeBestWork: list };
    });
  };

  const handleRemoveBestWork = (index) => {
    setForm((prev) => ({
      ...prev,
      homeBestWork: prev.homeBestWork.filter((_, i) => i !== index),
    }));
  };

  // Hero Slide Helpers
  const handleAddHeroSlide = () => {
    setForm((prev) => ({
      ...prev,
      heroSlides: [
        ...prev.heroSlides,
        {
          id: `h-${Date.now()}`,
          label: "New Collection",
          image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=80",
          srcSet: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80 600w, https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=80 1200w",
        },
      ],
    }));
  };

  const handleUpdateHeroSlide = (index, field, value) => {
    setForm((prev) => {
      const list = [...prev.heroSlides];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, heroSlides: list };
    });
  };

  const handleRemoveHeroSlide = (index) => {
    setForm((prev) => ({
      ...prev,
      heroSlides: prev.heroSlides.filter((_, i) => i !== index),
    }));
  };

  // FAQ Helpers
  const handleAddFaq = () => {
    setForm((prev) => ({
      ...prev,
      faqs: [
        ...prev.faqs,
        {
          id: `faq-${Date.now()}`,
          q: "New Frequently Asked Question?",
          a: "Write the detailed answer here.",
        },
      ],
    }));
  };

  const handleUpdateFaq = (index, field, value) => {
    setForm((prev) => {
      const list = [...prev.faqs];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, faqs: list };
    });
  };

  const handleRemoveFaq = (index) => {
    setForm((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-12 text-center">
        <Loader2 size={32} className="animate-spin text-accent mx-auto mb-3" />
        <p className="text-sm font-medium text-primary">Loading business settings & database parameters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-card p-6 md:p-8 border-l-4 border-accent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <SlidersHorizontal size={22} className="text-accent" />
              <h2 className="font-display text-2xl font-semibold text-primary">
                Business Settings & Site Management
              </h2>
            </div>
            <p className="text-xs text-ink/60 max-w-2xl">
              Manage workshop capacities, priority rules, Best Work showcase, Hero slides, FAQs, and studio contact details. All data is persisted directly in MongoDB.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchSettings}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-primary/20 text-primary hover:bg-bg transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw size={13} />
            Reload DB Data
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 border-b border-primary/10 overflow-x-auto pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "rules"
                ? "border-accent text-accent"
                : "border-transparent text-ink/60 hover:text-primary"
            }`}
          >
            Workshop & Rules
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bestWork")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === "bestWork"
                ? "border-accent text-accent"
                : "border-transparent text-ink/60 hover:text-primary"
            }`}
          >
            <Sparkles size={14} /> Best Work Showcase ({form.homeBestWork.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("hero")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === "hero"
                ? "border-accent text-accent"
                : "border-transparent text-ink/60 hover:text-primary"
            }`}
          >
            <ImageIcon size={14} /> Hero Banner Slides ({form.heroSlides.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("faqs")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === "faqs"
                ? "border-accent text-accent"
                : "border-transparent text-ink/60 hover:text-primary"
            }`}
          >
            <HelpCircle size={14} /> FAQs ({form.faqs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("contact")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === "contact"
                ? "border-accent text-accent"
                : "border-transparent text-ink/60 hover:text-primary"
            }`}
          >
            <Phone size={14} /> Contact Details
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-700 text-xs">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block mb-0.5">Validation Error</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-800 text-xs font-medium">
          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
          <span>Database updated successfully! Changes are live on the website.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: Rules & Operational Settings */}
        {activeTab === "rules" && (
          <div className="space-y-6">
            {/* Section 1: Tailoring Capacity */}
            <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/5 space-y-5">
              <div className="flex items-center gap-2 border-b border-primary/10 pb-3">
                <Scissors size={18} className="text-accent" />
                <h3 className="font-display text-base font-semibold text-primary">
                  Daily Tailoring Capacity
                </h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-primary mb-1.5">
                    Standard Tailoring Capacity (Slots / Day) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={form.dailyTailoringCapacity}
                    onChange={(e) =>
                      setForm({ ...form, dailyTailoringCapacity: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none bg-white font-mono"
                  />
                  <p className="text-[11px] text-ink/50 mt-1">
                    Maximum regular tailoring bookings allowed per calendar day.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-primary mb-1.5">
                    Priority Express Capacity (Slots / Day)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.dailyPriorityCapacity}
                    onChange={(e) =>
                      setForm({ ...form, dailyPriorityCapacity: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none bg-white font-mono"
                  />
                  <p className="text-[11px] text-ink/50 mt-1">
                    Maximum 24–30h rush orders allowed per day.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Priority Surcharges */}
            <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/5 space-y-5">
              <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-accent" />
                  <h3 className="font-display text-base font-semibold text-primary">
                    Priority Surcharge Rules
                  </h3>
                </div>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.priorityStitchingEnabled}
                    onChange={(e) =>
                      setForm({ ...form, priorityStitchingEnabled: e.target.checked })
                    }
                    className="rounded text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                  />
                  <span className="text-primary font-medium">Enable Priority Service</span>
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-primary mb-1.5">
                    Priority Surcharge Minimum (%) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.prioritySurchargeMin}
                    onChange={(e) =>
                      setForm({ ...form, prioritySurchargeMin: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-primary mb-1.5">
                    Priority Surcharge Maximum (%) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.prioritySurchargeMax}
                    onChange={(e) =>
                      setForm({ ...form, prioritySurchargeMax: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Shipping & Operations */}
            <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/5 space-y-5">
              <div className="flex items-center gap-2 border-b border-primary/10 pb-3">
                <Truck size={18} className="text-accent" />
                <h3 className="font-display text-base font-semibold text-primary">
                  Shipping &amp; Studio Hours
                </h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-primary mb-1.5">
                    Free Shipping Order Threshold (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.freeShippingThreshold}
                    onChange={(e) =>
                      setForm({ ...form, freeShippingThreshold: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-primary mb-1.5">
                    Standard Shipping Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.standardShippingFee}
                    onChange={(e) =>
                      setForm({ ...form, standardShippingFee: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none bg-white font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1.5">
                    <Clock size={13} className="text-accent" /> Studio Business Hours
                  </label>
                  <input
                    type="text"
                    value={form.businessHours}
                    onChange={(e) => setForm({ ...form, businessHours: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Best Work Showcase */}
        {activeTab === "bestWork" && (
          <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/5 space-y-6">
            <div className="flex items-center justify-between border-b border-primary/10 pb-4">
              <div>
                <h3 className="font-display text-base font-semibold text-primary flex items-center gap-2">
                  <Sparkles size={18} className="text-accent" /> Our Best Work Showcase Items
                </h3>
                <p className="text-xs text-ink/60 mt-0.5">
                  These cards appear on the Home page "Our Best Work" showcase. Managed live from MongoDB.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddBestWork}
                className="px-3.5 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={14} /> Add Work Card
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {form.homeBestWork.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-bg/40 border border-primary/15 rounded-2xl p-4 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-accent uppercase tracking-wider">
                      Card #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBestWork(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove card"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-primary mb-1">Title</label>
                      <input
                        type="text"
                        value={item.title || ""}
                        onChange={(e) => handleUpdateBestWork(idx, "title", e.target.value)}
                        placeholder="e.g. Birthday Special"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-primary/15 focus:border-accent bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-primary mb-1">Category Subtitle</label>
                      <input
                        type="text"
                        value={item.subtitle || ""}
                        onChange={(e) => handleUpdateBestWork(idx, "subtitle", e.target.value)}
                        placeholder="e.g. Party Wear"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-primary/15 focus:border-accent bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-primary mb-1">Image URL</label>
                    <input
                      type="text"
                      value={item.image || ""}
                      onChange={(e) => handleUpdateBestWork(idx, "image", e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-primary/15 focus:border-accent bg-white"
                    />
                  </div>

                  {item.image && (
                    <div className="w-full h-32 rounded-xl overflow-hidden bg-primary/5 mt-2 border border-primary/10">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Hero Banner Slides */}
        {activeTab === "hero" && (
          <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/5 space-y-6">
            <div className="flex items-center justify-between border-b border-primary/10 pb-4">
              <div>
                <h3 className="font-display text-base font-semibold text-primary flex items-center gap-2">
                  <ImageIcon size={18} className="text-accent" /> Hero Carousel Banner Slides
                </h3>
                <p className="text-xs text-ink/60 mt-0.5">
                  These high-resolution background slides animate on the Home page Hero banner.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddHeroSlide}
                className="px-3.5 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={14} /> Add Hero Slide
              </button>
            </div>

            <div className="space-y-4">
              {form.heroSlides.map((slide, idx) => (
                <div
                  key={slide.id || idx}
                  className="bg-bg/40 border border-primary/15 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-accent uppercase tracking-wider">
                      Slide #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveHeroSlide(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-primary mb-1">Slide Label / Title</label>
                      <input
                        type="text"
                        value={slide.label || ""}
                        onChange={(e) => handleUpdateHeroSlide(idx, "label", e.target.value)}
                        placeholder="e.g. Tailoring"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-primary/15 focus:border-accent bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-primary mb-1">Image URL</label>
                      <input
                        type="text"
                        value={slide.image || ""}
                        onChange={(e) => handleUpdateHeroSlide(idx, "image", e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-primary/15 focus:border-accent bg-white"
                      />
                    </div>
                  </div>

                  {slide.image && (
                    <div className="w-full h-28 rounded-xl overflow-hidden bg-primary/5 border border-primary/10">
                      <img src={slide.image} alt={slide.label} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Frequently Asked Questions (FAQs) */}
        {activeTab === "faqs" && (
          <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/5 space-y-6">
            <div className="flex items-center justify-between border-b border-primary/10 pb-4">
              <div>
                <h3 className="font-display text-base font-semibold text-primary flex items-center gap-2">
                  <HelpCircle size={18} className="text-accent" /> Frequently Asked Questions (FAQs)
                </h3>
                <p className="text-xs text-ink/60 mt-0.5">
                  Manage the official questions and answers displayed in the FAQ accordion on the Home page.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddFaq}
                className="px-3.5 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={14} /> Add FAQ
              </button>
            </div>

            <div className="space-y-4">
              {form.faqs.map((faq, idx) => (
                <div
                  key={faq.id || idx}
                  className="bg-bg/40 border border-primary/15 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-accent uppercase tracking-wider">
                      FAQ #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFaq(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-primary mb-1">Question</label>
                    <input
                      type="text"
                      value={faq.q || ""}
                      onChange={(e) => handleUpdateFaq(idx, "q", e.target.value)}
                      placeholder="Question..."
                      className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-primary/15 focus:border-accent bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-primary mb-1">Answer</label>
                    <textarea
                      rows={2}
                      value={faq.a || ""}
                      onChange={(e) => handleUpdateFaq(idx, "a", e.target.value)}
                      placeholder="Answer..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-primary/15 focus:border-accent bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: Contact Details */}
        {activeTab === "contact" && (
          <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/5 space-y-6">
            <div className="border-b border-primary/10 pb-4">
              <h3 className="font-display text-base font-semibold text-primary flex items-center gap-2">
                <Phone size={18} className="text-accent" /> Studio Contact Information
              </h3>
              <p className="text-xs text-ink/60 mt-0.5">
                Update store phone numbers, WhatsApp link, customer support email, technical support email, and store address.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1.5">
                  <Phone size={13} className="text-accent" /> Studio Phone Number
                </label>
                <input
                  type="text"
                  value={form.contactInfo.phone || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      contactInfo: { ...form.contactInfo, phone: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1.5">
                  <Phone size={13} className="text-emerald-600" /> WhatsApp Link / Number
                </label>
                <input
                  type="text"
                  value={form.contactInfo.whatsappHref || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      contactInfo: { ...form.contactInfo, whatsappHref: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1.5">
                  <Mail size={13} className="text-accent" /> Official Support Email
                </label>
                <input
                  type="email"
                  value={form.contactInfo.email || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      contactInfo: { ...form.contactInfo, email: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1.5">
                  <Mail size={13} className="text-blue-600" /> Technical Support Contact Email
                </label>
                <input
                  type="email"
                  value={form.contactInfo.techSupportEmail || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      contactInfo: { ...form.contactInfo, techSupportEmail: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1.5">
                  <MapPin size={13} className="text-accent" /> Studio Address
                </label>
                <input
                  type="text"
                  value={form.contactInfo.address || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      contactInfo: { ...form.contactInfo, address: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1.5">
                  <MapPin size={13} className="text-emerald-600" /> Google Maps Location URL
                </label>
                <input
                  type="text"
                  value={form.contactInfo.mapsUrl || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      contactInfo: { ...form.contactInfo, mapsUrl: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Global Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 bg-primary text-bg hover:bg-primary/90 px-8 py-3.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
