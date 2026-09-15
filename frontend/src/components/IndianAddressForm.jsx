import { useState, useEffect, useRef } from "react";
import { Loader2, Check, AlertCircle, MapPin, Save, X } from "lucide-react";
import { lookupIndianPincode, isValidPincodeFormat, verifyDeliveryAddress } from "../utils/addressValidator";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm text-ink bg-white transition-colors";
const labelCls = "block text-xs font-medium text-ink/70 mb-1";

export default function IndianAddressForm({
  initial = {},
  onSave,
  onCancel,
  saving = false,
  submitLabel = "Save Address",
}) {
  const [formData, setFormData] = useState({
    country: "India",
    label: initial.label || "Home",
    line2: initial.line2 || "", // House / Flat / Door No
    line1: initial.line1 || "", // Street / Road
    locality: initial.locality || "", // Area / Locality
    city: initial.city || "",
    state: initial.state || "",
    pincode: initial.pincode || "",
    isDefault: initial.isDefault || false,
  });

  const [pinStatus, setPinStatus] = useState("idle"); // idle | loading | valid | invalid
  const [pinError, setPinError] = useState("");
  const [validatingLocation, setValidatingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [localitiesList, setLocalitiesList] = useState([]);
  const debounceTimer = useRef(null);

  // When initial pincode is provided (e.g. edit mode), verify it once on mount
  useEffect(() => {
    if (initial.pincode && isValidPincodeFormat(initial.pincode)) {
      lookupIndianPincode(initial.pincode).then((res) => {
        if (res.valid) {
          setPinStatus("valid");
          setLocalitiesList(res.localities || []);
        }
      });
    }
  }, [initial.pincode]);

  const handlePincodeChange = (e) => {
    const rawVal = e.target.value.replace(/\D/g, "").slice(0, 6);
    setFormData((prev) => ({
      ...prev,
      pincode: rawVal,
      // Clear city and state if user modifies PIN
      city: rawVal.length === 6 ? prev.city : "",
      state: rawVal.length === 6 ? prev.state : "",
    }));

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setLocationError("");

    if (rawVal.length < 6) {
      setPinStatus(rawVal.length > 0 ? "typing" : "idle");
      setPinError("");
      setLocalitiesList([]);
      return;
    }

    // Trigger verification when all 6 digits are entered
    setPinStatus("loading");
    setPinError("");

    debounceTimer.current = setTimeout(async () => {
      const res = await lookupIndianPincode(rawVal);
      if (res.valid) {
        setPinStatus("valid");
        setPinError("");
        setFormData((prev) => ({
          ...prev,
          city: res.city,
          state: res.state,
          locality: prev.locality || (res.localities && res.localities[0]) || "",
        }));
        setLocalitiesList(res.localities || []);
      } else {
        setPinStatus("invalid");
        setPinError(res.error || "Please enter a valid Indian PIN code.");
        setFormData((prev) => ({ ...prev, city: "", state: "" }));
        setLocalitiesList([]);
      }
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocationError("");

    if (pinStatus !== "valid" || !formData.city || !formData.state) {
      setPinError("Please enter and verify a valid 6-digit Indian PIN code first.");
      return;
    }

    if (!formData.line1.trim()) {
      return;
    }

    setValidatingLocation(true);
    try {
      const verifyRes = await verifyDeliveryAddress(formData);
      if (!verifyRes.valid) {
        setLocationError(
          verifyRes.error ||
            "The entered address does not match the PIN code. Please enter the correct address/location or PIN code."
        );
        setValidatingLocation(false);
        return;
      }

      setValidatingLocation(false);
      onSave({
        ...formData,
        ...verifyRes.data,
      });
    } catch (err) {
      setValidatingLocation(false);
      setLocationError(err.message || "Failed to verify delivery address. Please check your address and retry.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {/* 1. Country */}
      <div>
        <label className={labelCls}>Country</label>
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-primary/15 bg-primary/5 text-sm text-primary font-medium">
          <span>🇮🇳 India</span>
          <span className="text-[11px] text-ink/40">Default</span>
        </div>
      </div>

      {/* 2. PIN Code */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelCls}>
            PIN Code <span className="text-red-500">*</span>
          </label>
          {pinStatus === "loading" && (
            <span className="flex items-center gap-1 text-xs text-accent">
              <Loader2 size={12} className="animate-spin" /> Verifying postal PIN…
            </span>
          )}
          {pinStatus === "valid" && (
            <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
              <Check size={13} className="text-green-600" /> Valid Indian PIN
            </span>
          )}
        </div>

        <div className="relative">
          <input
            required
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={formData.pincode}
            onChange={handlePincodeChange}
            placeholder="e.g. 522001, 110001, 560001"
            className={`${inputCls} font-mono ${
              pinStatus === "valid"
                ? "border-green-400 bg-green-50/20"
                : pinStatus === "invalid"
                ? "border-red-400 bg-red-50/30"
                : ""
            }`}
          />
        </div>

        {pinError && (
          <p className="flex items-center gap-1 text-xs text-red-600 mt-1.5 font-medium">
            <AlertCircle size={13} className="shrink-0" /> {pinError}
          </p>
        )}
      </div>

      {/* 3. Verified City & State (Auto-filled) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>
            City <span className="text-red-500">*</span>
          </label>
          <input
            required
            readOnly={pinStatus === "valid"}
            value={formData.city}
            onChange={(e) => setFormData((f) => ({ ...f, city: e.target.value }))}
            placeholder={pinStatus === "valid" ? formData.city : "Auto-filled from PIN"}
            className={`${inputCls} ${
              pinStatus === "valid" ? "bg-primary/5 text-primary font-medium" : "bg-bg/40 text-ink/60"
            }`}
          />
        </div>
        <div>
          <label className={labelCls}>
            State <span className="text-red-500">*</span>
          </label>
          <input
            required
            readOnly={pinStatus === "valid"}
            value={formData.state}
            onChange={(e) => setFormData((f) => ({ ...f, state: e.target.value }))}
            placeholder={pinStatus === "valid" ? formData.state : "Auto-filled from PIN"}
            className={`${inputCls} ${
              pinStatus === "valid" ? "bg-primary/5 text-primary font-medium" : "bg-bg/40 text-ink/60"
            }`}
          />
        </div>
      </div>

      {/* 4. Locality / Area Selection (if post offices found) */}
      {localitiesList.length > 0 && (
        <div>
          <label className={labelCls}>Locality / Landmark</label>
          <select
            value={formData.locality}
            onChange={(e) => setFormData((f) => ({ ...f, locality: e.target.value }))}
            className={`${inputCls} cursor-pointer`}
          >
            <option value="">Select area / landmark (Optional)</option>
            {localitiesList.map((loc, idx) => (
              <option key={idx} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 5. House / Flat / Door No & Label */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>House / Flat No.</label>
          <input
            value={formData.line2}
            onChange={(e) => setFormData((f) => ({ ...f, line2: e.target.value }))}
            placeholder="e.g. Flat 402, Door 4-12"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Address Type</label>
          <select
            value={formData.label}
            onChange={(e) => setFormData((f) => ({ ...f, label: e.target.value }))}
            className={`${inputCls} cursor-pointer`}
          >
            <option value="Home">Home</option>
            <option value="Work">Work</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* 6. Street / Road */}
      <div>
        <label className={labelCls}>
          Street / Area / Landmark <span className="text-red-500">*</span>
        </label>
        <input
          required
          value={formData.line1}
          onChange={(e) => setFormData((f) => ({ ...f, line1: e.target.value }))}
          placeholder="e.g. Brodipet 4th Line, Main Road, near Apollo"
          className={inputCls}
        />
      </div>

      {/* 7. Set as Default Checkbox */}
      <label className="flex items-center gap-2 text-xs text-ink/70 cursor-pointer select-none mt-1">
        <input
          type="checkbox"
          checked={formData.isDefault}
          onChange={(e) => setFormData((f) => ({ ...f, isDefault: e.target.checked }))}
          className="rounded border-primary/20 text-primary focus:ring-accent accent-primary"
        />
        <span>Make this my primary delivery address</span>
      </label>

      {/* Location mismatch validation error */}
      {locationError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <strong>Address &amp; PIN Mismatch:</strong> {locationError}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2.5 mt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving || validatingLocation}
            className="flex-1 py-2.5 rounded-full text-sm font-medium text-primary border border-primary/20 hover:border-primary/40 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving || validatingLocation || pinStatus !== "valid"}
          className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-primary text-bg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer shadow-card"
        >
          {validatingLocation ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Verifying location…
            </>
          ) : saving ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save size={14} /> {submitLabel}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
