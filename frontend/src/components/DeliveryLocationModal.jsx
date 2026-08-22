import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, MapPin, Plus, Loader2, AlertCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import IndianAddressForm from "./IndianAddressForm";
import { lookupIndianPincode, formatDisplayAddress } from "../utils/addressValidator";

export default function DeliveryLocationModal({ open, onClose, onSelect }) {
  const { user, addAddress, notify } = useApp();
  const [pincode, setPincode] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");

  const resetAndClose = () => {
    setShowAddForm(false);
    setPincode("");
    setPinError("");
    onClose();
  };

  const handlePickAddress = (address) => {
    onSelect({ type: "address", address });
    resetAndClose();
  };

  const handleApplyPincode = async () => {
    if (pincode.length !== 6) {
      setPinError("Please enter a 6-digit Indian PIN code.");
      return;
    }

    setPinLoading(true);
    setPinError("");

    const res = await lookupIndianPincode(pincode);
    setPinLoading(false);

    if (res.valid) {
      onSelect({
        type: "pincode",
        pincode: res.pincode,
        city: res.city,
        state: res.state,
      });
      resetAndClose();
    } else {
      setPinError(res.error || "Please enter a valid Indian postal PIN code.");
    }
  };

  const handleSaveAddress = async (addressData) => {
    setSaving(true);
    const error = await addAddress(addressData);
    setSaving(false);
    if (error) {
      notify(error);
      return;
    }
    setShowAddForm(false);
    onSelect({ type: "address", address: addressData });
    resetAndClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="absolute inset-0 bg-primary/15 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white rounded-2xl shadow-soft w-full max-w-md max-h-[85vh] overflow-y-auto p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg font-semibold text-primary">Choose your location</h3>
              <button onClick={resetAndClose} aria-label="Close" className="text-ink/40 hover:text-primary cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-ink/60 mb-5">
              Select a delivery location to see accurate delivery estimates for this item.
            </p>

            {!user && (
              <>
                <Link
                  to="/login"
                  onClick={resetAndClose}
                  className="w-full block text-center bg-highlight text-primary font-semibold py-3 rounded-full hover:bg-accent hover:text-white transition-colors mb-4"
                >
                  Sign in to see your saved addresses
                </Link>
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex-1 h-px bg-primary/10" />
                  <span className="text-xs text-ink/40">or enter an Indian PIN code</span>
                  <span className="flex-1 h-px bg-primary/10" />
                </div>
              </>
            )}

            {user && !showAddForm && (
              <div className="mb-4">
                {user.addresses?.length > 0 && (
                  <div className="flex flex-col gap-2 mb-3 max-h-48 overflow-y-auto">
                    {user.addresses.map((a) => (
                      <button
                        key={a._id}
                        onClick={() => handlePickAddress(a)}
                        className="text-left border border-primary/15 rounded-xl p-3 hover:border-accent transition-colors flex items-start gap-2 cursor-pointer bg-white"
                      >
                        <MapPin size={15} className="text-accent mt-0.5 shrink-0" />
                        <span>
                          <span className="block text-sm font-medium text-primary">
                            {a.label || "Address"} {a.isDefault && <span className="text-[10px] text-accent font-semibold ml-1">(Primary)</span>}
                          </span>
                          <span className="block text-xs text-ink/60">
                            {formatDisplayAddress(a)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-accent border border-accent/40 py-2.5 rounded-full hover:bg-accent/5 transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Add a new address
                </button>
              </div>
            )}

            {user && showAddForm && (
              <div className="mb-4 bg-bg/40 p-4 rounded-xl border border-primary/10">
                <h4 className="text-sm font-semibold text-primary mb-3">Add New Indian Delivery Address</h4>
                <IndianAddressForm
                  onSave={handleSaveAddress}
                  onCancel={() => setShowAddForm(false)}
                  saving={saving}
                  submitLabel="Save & Use Address"
                />
              </div>
            )}

            {!showAddForm && (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex-1 h-px bg-primary/10" />
                  <span className="text-xs text-ink/40">{user ? "or enter an Indian PIN code" : ""}</span>
                  {user && <span className="flex-1 h-px bg-primary/10" />}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-2">
                    <input
                      value={pincode}
                      onChange={(e) => {
                        setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
                        setPinError("");
                      }}
                      placeholder="Enter 6-digit Indian PIN code"
                      inputMode="numeric"
                      maxLength={6}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm font-mono"
                    />
                    <button
                      onClick={handleApplyPincode}
                      disabled={pincode.length !== 6 || pinLoading}
                      className="px-5 py-2.5 rounded-full text-sm font-semibold bg-primary text-bg hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {pinLoading ? <Loader2 size={13} className="animate-spin" /> : null}
                      Apply
                    </button>
                  </div>
                  {pinError && (
                    <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
                      <AlertCircle size={12} className="shrink-0" /> {pinError}
                    </p>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
