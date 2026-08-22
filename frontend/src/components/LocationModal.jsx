import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, MapPin, Plus, LogIn, Loader2, AlertCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import IndianAddressForm from "./IndianAddressForm";
import { lookupIndianPincode, formatDisplayAddress } from "../utils/addressValidator";

export default function LocationModal({ isOpen, onClose, onConfirm }) {
  const { user, addAddress, notify } = useApp();
  const navigate = useNavigate();

  const [pincode, setPincode] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");

  const close = () => {
    setShowAddForm(false);
    setPincode("");
    setPinError("");
    onClose();
  };

  const selectSavedAddress = (address) => {
    onConfirm({ type: "address", address });
    close();
  };

  const applyPincode = async () => {
    if (pincode.length !== 6) {
      setPinError("Please enter a 6-digit Indian PIN code.");
      return;
    }

    setPinLoading(true);
    setPinError("");

    const res = await lookupIndianPincode(pincode);
    setPinLoading(false);

    if (res.valid) {
      onConfirm({
        type: "pincode",
        pincode: res.pincode,
        city: res.city,
        state: res.state,
      });
      close();
    } else {
      setPinError(res.error || "Please enter a valid Indian postal PIN code.");
    }
  };

  const handleSaveAddress = async (addressData) => {
    setSaving(true);
    const error = await addAddress(addressData);
    setSaving(false);
    if (!error) {
      onConfirm({ type: "address", address: addressData });
      setShowAddForm(false);
      close();
    } else {
      notify(error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 bg-primary/10 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-soft overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10">
              <h3 className="font-display text-lg font-semibold text-primary">Choose your location</h3>
              <button onClick={close} className="text-ink/40 hover:text-primary cursor-pointer" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              {!user ? (
                <>
                  <p className="text-sm text-ink/60 mb-4">
                    Select a delivery location to see accurate delivery estimates.
                  </p>
                  <button
                    onClick={() => {
                      close();
                      navigate("/login");
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-highlight text-primary font-semibold py-3 rounded-full hover:bg-accent hover:text-white transition-colors mb-4 cursor-pointer"
                  >
                    <LogIn size={15} /> Sign in to see your addresses
                  </button>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="h-px flex-1 bg-primary/10" />
                    <span className="text-xs text-ink/40">or enter an Indian PIN code</span>
                    <span className="h-px flex-1 bg-primary/10" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-2">
                      <input
                        value={pincode}
                        onChange={(e) => {
                          setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
                          setPinError("");
                        }}
                        placeholder="e.g. 522001, 110001"
                        inputMode="numeric"
                        maxLength={6}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm font-mono"
                      />
                      <button
                        onClick={applyPincode}
                        disabled={pincode.length !== 6 || pinLoading}
                        className="px-5 py-2.5 rounded-xl bg-primary text-bg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
              ) : !showAddForm ? (
                <>
                  {user.addresses?.length > 0 ? (
                    <div className="flex flex-col gap-2 mb-4 max-h-56 overflow-y-auto">
                      {user.addresses.map((a) => (
                        <button
                          key={a._id || `${a.line1}-${a.pincode}`}
                          onClick={() => selectSavedAddress(a)}
                          className="flex items-start gap-2.5 text-left p-3 rounded-xl border border-primary/15 hover:border-accent transition-colors cursor-pointer bg-white"
                        >
                          <MapPin size={15} className="text-accent shrink-0 mt-0.5" />
                          <span className="text-sm text-ink/75">
                            <span className="font-medium text-primary">{a.label || "Address"}</span>
                            {a.isDefault && <span className="text-[10px] text-accent font-semibold ml-1">(Primary)</span>} — {formatDisplayAddress(a)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-ink/60 mb-4">You don't have any saved addresses yet.</p>
                  )}
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center justify-center gap-2 border border-primary/20 text-primary text-sm font-medium py-3 rounded-full hover:border-accent transition-colors cursor-pointer"
                  >
                    <Plus size={15} /> Add a new address
                  </button>
                </>
              ) : (
                <div className="bg-bg/40 p-3.5 rounded-xl border border-primary/10">
                  <h4 className="text-sm font-semibold text-primary mb-2.5">Add Indian Delivery Address</h4>
                  <IndianAddressForm
                    onSave={handleSaveAddress}
                    onCancel={() => setShowAddForm(false)}
                    saving={saving}
                    submitLabel="Save & Use Address"
                  />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
