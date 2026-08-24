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
} from "lucide-react";
import api from "../../utils/api";
import { useApp } from "../../context/AppContext";

export default function AdminBusinessSettings() {
  const { notify } = useApp();

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
    e.preventDefault();
    setError("");
    setSuccess(false);

    // ── Client-side Validation ──
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
      setError(
        `Priority Surcharge Maximum (${maxSur}%) cannot be less than Minimum (${minSur}%).`
      );
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
      });

      setSuccess(true);
      notify("Business settings saved successfully!");
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update business settings");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setForm({
      dailyTailoringCapacity: 4,
      dailyPriorityCapacity: 2,
      prioritySurchargeMin: 50,
      prioritySurchargeMax: 50,
      priorityStitchingEnabled: true,
      freeShippingThreshold: 2999,
      standardShippingFee: 149,
      businessHours: "Monday – Saturday, 9:00 AM – 8:00 PM (Sunday: Holiday)",
    });
    setError("");
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-12 text-center">
        <Loader2 size={32} className="animate-spin text-accent mx-auto mb-3" />
        <p className="text-sm font-medium text-primary">Loading business settings...</p>
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
                Business Settings & Rules
              </h2>
            </div>
            <p className="text-xs text-ink/60 max-w-xl">
              Dynamically configure live workshop tailoring capacities, express priority surcharges,
              and operational parameters. Changes apply immediately to new customer bookings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-primary/20 text-primary hover:bg-bg transition-colors"
            >
              <RotateCcw size={13} />
              Reset Defaults
            </button>
          </div>
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
          <span>Business settings have been successfully updated in the database.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
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
                Maximum regular tailoring bookings allowed per calendar day. (Default: 4)
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
                Maximum 24–30h rush orders allowed per day. (Default: 2)
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Priority Surcharge Rules */}
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
              <span className="text-primary font-medium">Enable Priority Stitching Service</span>
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
              <p className="text-[11px] text-ink/50 mt-1">
                Lower bound surcharge percentage for 24-hour rush delivery. (Default: 50%)
              </p>
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
              <p className="text-[11px] text-ink/50 mt-1">
                Upper bound surcharge percentage for 24-hour rush delivery. (Default: 50%)
              </p>
            </div>
          </div>

          <div className="bg-bg/60 p-3.5 rounded-xl border border-primary/10 text-xs text-ink/70 flex items-center justify-between">
            <span>
              Configured Surcharge Window: <strong>{form.prioritySurchargeMin}% – {form.prioritySurchargeMax}%</strong>
            </span>
            <span className="text-accent font-semibold">
              Midpoint applied to requests:{" "}
              {Math.round(
                ((Number(form.prioritySurchargeMin) || 0) +
                  (Number(form.prioritySurchargeMax) || 0)) /
                  2
              )}
              %
            </span>
          </div>
        </div>

        {/* Section 3: Delivery & Operations */}
        <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/5 space-y-5">
          <div className="flex items-center gap-2 border-b border-primary/10 pb-3">
            <Truck size={18} className="text-accent" />
            <h3 className="font-display text-base font-semibold text-primary">
              Shipping & Operations
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
              <p className="text-[11px] text-ink/50 mt-1">Orders at or above this amount get free delivery. (Default: ₹2999)</p>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-primary mb-1.5">
                Standard Local Shipping Fee (₹)
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
              <p className="text-[11px] text-ink/50 mt-1">Standard local delivery fee for orders below threshold. (Default: ₹149)</p>
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

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 bg-primary text-bg hover:bg-primary/90 px-7 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
