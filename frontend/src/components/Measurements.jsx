import { useState, useEffect } from "react";
import { Ruler, Plus, Check, Save, Loader2 } from "lucide-react";
import MeasureGuide from "./MeasureGuide";
import { useApp } from "../context/AppContext";

export const MEASUREMENT_FIELDS = [
  "Chest/Bust",
  "Waist",
  "Hip",
  "Shoulder",
  "Armhole / Arm Round",
  "Sleeves Round",
  "Front Neck Deep",
  "Back Neck Deep",
  "Sleeve Length",
  "Body Length",
];

export const KEY_MAP = {
  "Chest/Bust": "bust",
  "Waist": "waist",
  "Hip": "hips",
  "Shoulder": "shoulder",
  "Armhole / Arm Round": "armhole",
  "Sleeves Round": "sleeves_round",
  "Front Neck Deep": "front_neck_deep",
  "Back Neck Deep": "back_neck_deep",
  "Sleeve Length": "sleeve",
  "Body Length": "length",
  "Length": "length",
};

export const REVERSE_KEY_MAP = {
  bust: "Chest/Bust",
  waist: "Waist",
  hips: "Hip",
  shoulder: "Shoulder",
  length: "Body Length",
  sleeve: "Sleeve Length",
  armhole: "Armhole / Arm Round",
  sleeves_round: "Sleeves Round",
  front_neck_deep: "Front Neck Deep",
  back_neck_deep: "Back Neck Deep",
};

export const validateMeasurements = (measurementsObj) => {
  const missing = MEASUREMENT_FIELDS.find(
    (f) => !measurementsObj[f] || !String(measurementsObj[f]).trim()
  );
  if (missing) {
    return { valid: false, missingField: missing };
  }
  return { valid: true, missingField: null };
};

export default function Measurements({
  values,
  onChange,
  onProfileLoad,
  showGuide = true,
  className = "",
  compact = false,
}) {
  const { user, measurements: savedMeasurements, saveMeasurement, notify } = useApp();

  const hasSavedSets = Boolean(savedMeasurements && savedMeasurements.length > 0);

  // Initialize selectedSetId to default profile ID if available, otherwise "new"
  const [selectedSetId, setSelectedSetId] = useState(() => {
    if (savedMeasurements && savedMeasurements.length > 0) {
      const def = savedMeasurements.find((m) => m.isDefault) || savedMeasurements[0];
      return def?._id || "new";
    }
    return "new";
  });

  const [newSetName, setNewSetName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Sync selectedSetId when savedMeasurements change from initial load
  useEffect(() => {
    if (hasSavedSets && selectedSetId === "new" && !newSetName) {
      const def = savedMeasurements.find((m) => m.isDefault) || savedMeasurements[0];
      if (def) {
        setSelectedSetId(def._id);
        loadProfileData(def);
      }
    }
  }, [savedMeasurements]);

  const loadProfileData = (mp) => {
    if (!mp) return;
    const mapped = {};
    Object.entries(mp.measurements || {}).forEach(([k, v]) => {
      const formKey = REVERSE_KEY_MAP[k] || k;
      if (MEASUREMENT_FIELDS.includes(formKey)) {
        mapped[formKey] = String(v);
      }
    });

    if (onProfileLoad) {
      onProfileLoad(mapped);
    } else if (onChange) {
      Object.entries(mapped).forEach(([field, val]) => {
        onChange(field, val);
      });
    }
  };

  const handleSelectSet = (id) => {
    setSelectedSetId(id);

    if (id === "new") {
      setIsSaved(false);
      return;
    }

    const mp = savedMeasurements.find((m) => m._id === id);
    if (mp) {
      loadProfileData(mp);
      notify(`Loaded "${mp.profileName}" measurements`);
    }
  };

  const handleSaveToProfile = async () => {
    if (!newSetName.trim()) {
      notify("Please enter a name for your measurement set (e.g. My Measurements)");
      return;
    }
    const { valid, missingField } = validateMeasurements(values);
    if (!valid) {
      notify(`Please enter ${missingField} before saving`);
      return;
    }

    setSavingProfile(true);
    const measurementsMap = {};
    Object.entries(values).forEach(([label, val]) => {
      const apiKey = KEY_MAP[label] || label.toLowerCase().replace(/[\s/]+/g, "_");
      if (val !== "" && !isNaN(Number(val))) measurementsMap[apiKey] = Number(val);
    });

    const payload = {
      profileName: newSetName.trim(),
      category: "General",
      measurements: measurementsMap,
      isDefault: false,
    };

    const err = await saveMeasurement(payload);
    setSavingProfile(false);
    if (err) {
      notify(err);
    } else {
      setIsSaved(true);
      notify(`Measurement set "${newSetName.trim()}" saved to your profile!`);
    }
  };

  const activeSavedProfile = hasSavedSets && selectedSetId !== "new"
    ? savedMeasurements.find((m) => m._id === selectedSetId)
    : null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ── Select Measurement Set Section ── */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Ruler size={18} className="text-accent shrink-0" />
            <h3 className="font-display text-lg font-semibold">Select Measurement Set</h3>
          </div>
          <p className="text-xs text-ink/60 mt-0.5">
            Choose an existing measurement set or add a new one for this order.
          </p>
        </div>

        {/* Selectable Sets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {savedMeasurements && savedMeasurements.map((mp) => {
            const isSelected = selectedSetId === mp._id;
            return (
              <button
                type="button"
                key={mp._id}
                onClick={() => handleSelectSet(mp._id)}
                className={`p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                  isSelected
                    ? "border-accent bg-accent/5 ring-2 ring-accent/25 shadow-xs"
                    : "border-primary/15 bg-white hover:border-primary/35 hover:bg-bg/40"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? "bg-accent text-white" : "bg-primary/5 text-primary"}`}>
                    <Ruler size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary truncate">{mp.profileName}</p>
                    <p className="text-[11px] text-ink/50">
                      {Object.keys(mp.measurements || {}).length} measurements {mp.isDefault && "· Default"}
                    </p>
                  </div>
                </div>
                {isSelected && <Check size={16} className="text-accent shrink-0" />}
              </button>
            );
          })}

          {/* + Add New Measurement Set Option Card */}
          <button
            type="button"
            onClick={() => handleSelectSet("new")}
            className={`p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
              selectedSetId === "new"
                ? "border-accent bg-accent/5 ring-2 ring-accent/25 shadow-xs"
                : "border-dashed border-primary/25 bg-white/60 hover:bg-white hover:border-primary/45"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${selectedSetId === "new" ? "bg-accent text-white" : "bg-primary/10 text-primary"}`}>
                <Plus size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate">+ Add New Measurement Set</p>
                <p className="text-[11px] text-ink/50">Enter new name &amp; measurements</p>
              </div>
            </div>
            {selectedSetId === "new" && <Check size={16} className="text-accent shrink-0" />}
          </button>
        </div>
      </div>

      {/* ── Active Saved Profile Notice ── */}
      {selectedSetId !== "new" && activeSavedProfile && (
        <div className="bg-highlight/20 border border-highlight/40 rounded-2xl p-3.5 sm:px-4 flex items-center gap-2.5">
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Check size={13} />
          </span>
          <span className="text-xs sm:text-sm text-primary">
            Loaded measurements from <strong className="text-primary font-bold">{activeSavedProfile.profileName}</strong>. You can edit any measurement below for this order without altering your saved set.
          </span>
        </div>
      )}

      {/* ── Measurement Set Name Input (when Add New is selected) ── */}
      {selectedSetId === "new" && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-primary/15 shadow-xs space-y-2">
          <label className="block text-xs font-semibold text-primary">
            Measurement Set Name <span className="text-accent">*</span>
          </label>
          <input
            type="text"
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            placeholder="e.g. My Measurements, Dad's Measurements, Sister"
            className="w-full sm:max-w-md px-3.5 py-2.5 rounded-xl border border-primary/20 focus:border-accent bg-bg/40 outline-none text-sm font-medium text-primary shadow-xs"
          />
          <p className="text-[11px] text-ink/55">
            Enter a name to easily identify and reuse this measurement set.
          </p>
        </div>
      )}

      {/* ── Technical Guide Diagrams ── */}
      {showGuide && (
        <div>
          <MeasureGuide />
        </div>
      )}

      {/* ── Editable Measurements Form Inputs Grid ── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-primary/15 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-primary/10">
          <span className="text-xs font-semibold text-primary">Measurements (inches)</span>
          <span className="text-[11px] text-ink/50">All values in inches (in)</span>
        </div>

        <div className={`grid grid-cols-2 ${compact ? "sm:grid-cols-2 md:grid-cols-3" : "sm:grid-cols-3 md:grid-cols-5"} gap-3 sm:gap-4`}>
          {MEASUREMENT_FIELDS.map((f) => (
            <div key={f} className="flex flex-col min-w-0">
              <label className="block text-[9px] min-[360px]:text-[10px] sm:text-[11px] md:text-xs font-medium text-ink/70 mb-1.5 whitespace-nowrap leading-tight tracking-tighter sm:tracking-tight">
                {f} <span className="text-accent">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={values[f] || ""}
                  onChange={(e) => onChange(f, e.target.value)}
                  className="w-full pl-3 pr-8 py-2 sm:pl-3.5 sm:pr-8 sm:py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
                  placeholder="e.g. 36.5"
                />
                <span className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink/40 pointer-events-none select-none">
                  in
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Save to Profile Action Banner (when adding new set) */}
        {selectedSetId === "new" && user && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-primary/10">
            <p className="text-xs text-ink/65">
              Save this measurement set to your profile for 1-click reuse on future tailoring bookings.
            </p>
            <button
              type="button"
              onClick={handleSaveToProfile}
              disabled={savingProfile}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-bg hover:bg-primary/90 text-xs font-semibold transition-colors shrink-0 shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {savingProfile ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {isSaved ? "Saved to Profile ✓" : "Save Set to Profile"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
