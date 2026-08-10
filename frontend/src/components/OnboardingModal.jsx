import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronRight, Check } from "lucide-react";
import { useApp } from "../context/AppContext";
import Measurements, { MEASUREMENT_FIELDS, KEY_MAP } from "./Measurements";

const emptyAddress = { label: "Home", line2: "", line1: "", city: "", state: "", pincode: "" };
const emptyMeasurements = Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f, ""]));

export default function OnboardingModal() {
  const { newSignup, setNewSignup, addAddress, saveMeasurement, measurements: savedMeasurements, user, notify } = useApp();

  const [step, setStep] = useState(1); // 1 = address, 2 = measurements
  const [address, setAddress] = useState(emptyAddress);
  const [measurements, setMeasurements] = useState(emptyMeasurements);
  const [profileName, setProfileName] = useState("Myself");
  const [saving, setSaving] = useState(false);

  // If user already has saved measurement profiles or setup was completed in this session, skip modal
  useEffect(() => {
    if (newSignup && user) {
      const hasProfiles = user.measurementProfiles?.length > 0 || savedMeasurements?.length > 0;
      const alreadyCompleted = sessionStorage.getItem(`lc_onboarding_done_${user._id || user.id}`);
      if (hasProfiles || alreadyCompleted) {
        setNewSignup(false);
      }
    }
  }, [newSignup, user, savedMeasurements, setNewSignup]);

  if (!newSignup || !user) return null;

  const dismiss = () => {
    if (user) {
      sessionStorage.setItem(`lc_onboarding_done_${user._id || user.id}`, "true");
    }
    setNewSignup(false);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!address.line1 || !address.city || !address.state || !/^\d{6}$/.test(address.pincode)) {
      notify("Please fill in the address fully, including a valid 6-digit pincode");
      return;
    }
    setSaving(true);
    const err = await addAddress(address);
    setSaving(false);
    if (err) {
      notify(err);
      return;
    }
    setStep(2);
  };

  const handleSaveMeasurements = async (e) => {
    e.preventDefault();
    const name = profileName.trim() || "Myself";

    const measurementsMap = {};
    Object.entries(measurements).forEach(([label, val]) => {
      const apiKey = KEY_MAP[label] || label.toLowerCase().replace(/[\s/]+/g, "_");
      if (val !== "" && !isNaN(Number(val))) {
        measurementsMap[apiKey] = Number(val);
      }
    });

    setSaving(true);
    const err = await saveMeasurement({
      profileName: name,
      category: "General",
      gender: "female",
      measurements: measurementsMap,
      isDefault: true,
    });
    setSaving(false);

    if (err) {
      notify(err);
      return;
    }
    dismiss();
  };

  const updateMeasurement = (field, value) => {
    setMeasurements((m) => ({ ...m, [field]: value }));
  };

  return (
    <AnimatePresence>
      {newSignup && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={dismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-soft overflow-hidden my-8 max-h-[90vh] flex flex-col z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary/10 bg-bg/50 shrink-0">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-ink/50 font-semibold">
                  Step {step} of 2 — {step === 1 ? "Delivery location" : "Initial Measurements"}
                </p>
                <h3 className="font-display text-xl font-semibold text-primary mt-0.5">
                  {step === 1 ? "Where should we deliver?" : "Save your measurements"}
                </h3>
              </div>
              <button onClick={dismiss} className="text-ink/40 hover:text-primary p-1 rounded-full transition-colors ml-3 shrink-0" aria-label="Skip for now">
                <X size={20} />
              </button>
            </div>

            {/* Step dots */}
            <div className="flex items-center gap-2 px-6 pt-4 shrink-0">
              {[1, 2].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    n === step ? "w-8 bg-accent" : n < step ? "w-3 bg-accent/40" : "w-3 bg-primary/15"
                  }`}
                />
              ))}
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {step === 1 ? (
                <form onSubmit={handleSaveAddress} className="flex flex-col gap-4 max-w-lg mx-auto">
                  <p className="text-xs text-ink/70">
                    Add your default delivery address so we can provide accurate tailoring delivery dates and shipping estimates.
                  </p>
                  <input
                    value={address.label}
                    onChange={(e) => setAddress((a) => ({ ...a, label: e.target.value }))}
                    placeholder="Label (e.g. Home, Work)"
                    className="px-4 py-3 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
                  />
                  <input
                    value={address.line2}
                    onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))}
                    placeholder="Door / Flat number"
                    className="px-4 py-3 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
                  />
                  <input
                    required
                    value={address.line1}
                    onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
                    placeholder="Street / Area / Locality"
                    className="px-4 py-3 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      required
                      value={address.city}
                      onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                      placeholder="City"
                      className="px-4 py-3 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
                    />
                    <input
                      required
                      value={address.state}
                      onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                      placeholder="State"
                      className="px-4 py-3 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
                    />
                  </div>
                  <input
                    required
                    value={address.pincode}
                    onChange={(e) => setAddress((a) => ({ ...a, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                    placeholder="6-digit pincode"
                    inputMode="numeric"
                    className="px-4 py-3 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
                  />
                  <div className="flex gap-3 mt-2">
                    <button type="button" onClick={dismiss} className="flex-1 py-3 rounded-full text-sm font-medium text-primary border border-primary/15 hover:bg-bg transition-colors">
                      Skip for now
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-3 rounded-full text-sm font-semibold bg-highlight text-primary hover:bg-accent hover:text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {saving ? "Saving…" : <><span>Save & continue</span><ChevronRight size={15} /></>}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSaveMeasurements} className="flex flex-col gap-5">
                  <p className="text-xs text-ink/70">
                    Your measurements will be saved securely to your Lucky Couture account profile so you can seamlessly use them for future tailoring orders.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1.5">Profile Label</label>
                    <input
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Profile name (e.g. Myself)"
                      className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
                    />
                  </div>

                  {/* Shared Measurements Component */}
                  <Measurements
                    values={measurements}
                    onChange={updateMeasurement}
                    compact
                  />

                  <div className="flex gap-3 mt-3 pt-3 border-t border-primary/10">
                    <button type="button" onClick={dismiss} className="flex-1 py-3 rounded-full text-sm font-medium text-primary border border-primary/15 hover:bg-bg transition-colors">
                      Skip for now
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-3 rounded-full text-sm font-semibold bg-highlight text-primary hover:bg-accent hover:text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {saving ? "Saving…" : <><Check size={15} /><span>Save & finish setup</span></>}
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
