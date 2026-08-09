import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, MapPin, Ruler, ChevronRight, Check } from "lucide-react";
import { useApp } from "../context/AppContext";

const MEASUREMENT_FIELDS = [
  { key: "bust", label: "Bust / Chest", unit: "cm" },
  { key: "waist", label: "Waist", unit: "cm" },
  { key: "hips", label: "Hips", unit: "cm" },
  { key: "shoulder", label: "Shoulder width", unit: "cm" },
  { key: "length", label: "Length", unit: "cm" },
  { key: "sleeve", label: "Sleeve length", unit: "cm" },
];

const emptyAddress = { label: "Home", line2: "", line1: "", city: "", state: "", pincode: "" };
const emptyMeasurements = Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f.key, ""]));

export default function OnboardingModal() {
  const { newSignup, setNewSignup, addAddress, saveMeasurement, notify } = useApp();

  const [step, setStep] = useState(1); // 1 = address, 2 = measurements
  const [address, setAddress] = useState(emptyAddress);
  const [measurements, setMeasurements] = useState(emptyMeasurements);
  const [profileName, setProfileName] = useState("My Measurements");
  const [saving, setSaving] = useState(false);

  if (!newSignup) return null;

  const dismiss = () => setNewSignup(false);

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!address.line1 || !address.city || !address.state || !/^\d{6}$/.test(address.pincode)) {
      notify("Please fill in the address fully, including a valid 6-digit pincode");
      return;
    }
    setSaving(true);
    const err = await addAddress(address);
    setSaving(false);
    if (err) { notify(err); return; }
    setStep(2);
  };

  const handleSaveMeasurements = async (e) => {
    e.preventDefault();
    const name = profileName.trim() || "My Measurements";
    const filled = Object.fromEntries(
      Object.entries(measurements).filter(([, v]) => v !== "" && !isNaN(Number(v)))
    );
    setSaving(true);
    const err = await saveMeasurement({
      profileName: name,
      category: "General",
      measurements: Object.fromEntries(Object.entries(filled).map(([k, v]) => [k, Number(v)])),
      isDefault: true,
    });
    setSaving(false);
    if (err) { notify(err); return; }
    dismiss();
  };

  return (
    <AnimatePresence>
      {newSignup && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-primary/30 backdrop-blur-sm"
            onClick={dismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-soft overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-ink/40 font-medium">
                  Step {step} of 2 — {step === 1 ? "Delivery location" : "Measurements"}
                </p>
                <h3 className="font-display text-lg font-semibold text-primary mt-0.5">
                  {step === 1 ? "Where should we deliver?" : "Share your measurements"}
                </h3>
              </div>
              <button onClick={dismiss} className="text-ink/40 hover:text-primary ml-3 shrink-0" aria-label="Skip for now">
                <X size={18} />
              </button>
            </div>

            {/* Step dots */}
            <div className="flex items-center gap-2 px-5 pt-3">
              {[1, 2].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    n === step ? "w-6 bg-accent" : n < step ? "w-3 bg-accent/40" : "w-3 bg-primary/15"
                  }`}
                />
              ))}
            </div>

            <div className="p-5">
              {step === 1 ? (
                <form onSubmit={handleSaveAddress} className="flex flex-col gap-3">
                  <p className="text-xs text-ink/60 -mt-1 mb-1">
                    Add your delivery address so we can show accurate estimates. You can change this later.
                  </p>
                  <input
                    value={address.label}
                    onChange={(e) => setAddress((a) => ({ ...a, label: e.target.value }))}
                    placeholder="Label (e.g. Home, Work)"
                    className="px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                  />
                  <input
                    value={address.line2}
                    onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))}
                    placeholder="Door / Flat number"
                    className="px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                  />
                  <input
                    required
                    value={address.line1}
                    onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
                    placeholder="Street / Area / Locality"
                    className="px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      required
                      value={address.city}
                      onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                      placeholder="City"
                      className="px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                    />
                    <input
                      required
                      value={address.state}
                      onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                      placeholder="State"
                      className="px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                    />
                  </div>
                  <input
                    required
                    value={address.pincode}
                    onChange={(e) => setAddress((a) => ({ ...a, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                    placeholder="6-digit pincode"
                    inputMode="numeric"
                    className="px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                  />
                  <div className="flex gap-2 mt-1">
                    <button type="button" onClick={dismiss} className="flex-1 py-2.5 rounded-full text-sm font-medium text-primary border border-primary/15">
                      Skip for now
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-highlight text-primary hover:bg-accent hover:text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      {saving ? "Saving…" : <><span>Save & continue</span><ChevronRight size={14} /></>}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSaveMeasurements} className="flex flex-col gap-3">
                  <p className="text-xs text-ink/60 -mt-1 mb-1">
                    These will be saved to your profile so you can reuse them when placing tailoring orders.
                  </p>
                  <input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Profile name (e.g. Myself)"
                    className="px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-0.5">
                    {MEASUREMENT_FIELDS.map((f) => (
                      <div key={f.key}>
                        <label className="block text-[10px] text-ink/50 mb-1">{f.label} ({f.unit})</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={measurements[f.key]}
                          onChange={(e) => setMeasurements((m) => ({ ...m, [f.key]: e.target.value }))}
                          placeholder="—"
                          className="w-full px-3 py-2 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button type="button" onClick={dismiss} className="flex-1 py-2.5 rounded-full text-sm font-medium text-primary border border-primary/15">
                      Skip for now
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-highlight text-primary hover:bg-accent hover:text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      {saving ? "Saving…" : <><Check size={14} /><span>Save & finish</span></>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
