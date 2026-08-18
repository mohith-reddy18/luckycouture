import { Ruler } from "lucide-react";
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
  const { user, measurements: savedMeasurements, notify } = useApp();

  const handleSelectProfile = (e) => {
    const mp = savedMeasurements.find((m) => m._id === e.target.value);
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
    notify(`Loaded measurements from "${mp.profileName}"`);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header & Optional Profile Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Ruler size={18} className="text-accent shrink-0" />
            <h3 className="font-display text-lg font-semibold">Measurements (inches)</h3>
          </div>
          <p className="text-xs text-ink/60 mt-0.5">
            Please provide all body measurements in <strong>inches (in)</strong>.
          </p>
        </div>

        {user && savedMeasurements && savedMeasurements.length > 0 && (
          <div className="flex items-center gap-2 bg-highlight/20 border border-highlight/40 rounded-xl px-3 py-1.5 shrink-0">
            <span className="text-xs font-medium text-primary whitespace-nowrap">Load profile:</span>
            <select
              onChange={handleSelectProfile}
              defaultValue=""
              className="bg-white border border-primary/15 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-accent font-medium"
            >
              <option value="" disabled>— Select profile —</option>
              {savedMeasurements.map((mp) => (
                <option key={mp._id} value={mp._id}>
                  {mp.profileName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Content Layout: Reference Image / Diagrams + Inputs */}
      <div className={showGuide ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" : ""}>
        {/* Visual Technical Diagram / Reference Images */}
        {showGuide && (
          <div className="lg:col-span-12">
            <MeasureGuide />
          </div>
        )}

        {/* Form Inputs Grid */}
        <div className={showGuide ? "lg:col-span-12" : "w-full"}>
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
        </div>
      </div>
    </div>
  );
}
