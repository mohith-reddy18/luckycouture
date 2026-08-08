import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, MapPin, Plus, LogIn } from "lucide-react";
import { useApp } from "../context/AppContext";

const emptyAddress = { label: "Home", line2: "", line1: "", city: "", state: "", pincode: "" };

export default function LocationModal({ isOpen, onClose, onConfirm }) {
  const { user, addAddress, notify } = useApp();
  const navigate = useNavigate();

  const [pincode, setPincode] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState(emptyAddress);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setShowAddForm(false);
    onClose();
  };

  const selectSavedAddress = (address) => {
    onConfirm({ type: "address", address });
    close();
  };

  const applyPincode = () => {
    if (!/^\d{6}$/.test(pincode)) {
      notify("Please enter a valid 6-digit pincode");
      return;
    }
    onConfirm({ type: "pincode", pincode });
    close();
  };

  const saveNewAddress = async (e) => {
    e.preventDefault();
    if (!newAddress.line1 || !newAddress.city || !newAddress.state || !/^\d{6}$/.test(newAddress.pincode)) {
      notify("Please fill in the address fully, including a valid 6-digit pincode");
      return;
    }
    setSaving(true);
    const error = await addAddress(newAddress);
    setSaving(false);
    if (!error) {
      onConfirm({ type: "address", address: newAddress });
      setNewAddress(emptyAddress);
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
          {/* Deliberately light backdrop — not the usual heavy dark overlay */}
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
              <button onClick={close} className="text-ink/40 hover:text-primary" aria-label="Close">
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
                    className="w-full flex items-center justify-center gap-2 bg-highlight text-primary font-semibold py-3 rounded-full hover:bg-accent hover:text-white transition-colors mb-4"
                  >
                    <LogIn size={15} /> Sign in to see your addresses
                  </button>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="h-px flex-1 bg-primary/10" />
                    <span className="text-xs text-ink/40">or enter an Indian pincode</span>
                    <span className="h-px flex-1 bg-primary/10" />
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="e.g. 522007"
                      inputMode="numeric"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                    />
                    <button
                      onClick={applyPincode}
                      className="px-5 py-2.5 rounded-xl bg-primary text-bg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      Apply
                    </button>
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
                          className="flex items-start gap-2.5 text-left p-3 rounded-xl border border-primary/15 hover:border-accent transition-colors"
                        >
                          <MapPin size={15} className="text-accent shrink-0 mt-0.5" />
                          <span className="text-sm text-ink/75">
                            <span className="font-medium text-primary">{a.label || "Address"}</span> — {[a.line2, a.line1, a.city, a.state, a.pincode].filter(Boolean).join(", ")}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-ink/60 mb-4">You don't have any saved addresses yet.</p>
                  )}
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center justify-center gap-2 border border-primary/20 text-primary text-sm font-medium py-3 rounded-full hover:border-accent transition-colors"
                  >
                    <Plus size={15} /> Add a new address
                  </button>
                </>
              ) : (
                <form onSubmit={saveNewAddress} className="flex flex-col gap-3">
                  <input
                    value={newAddress.label}
                    onChange={(e) => setNewAddress((a) => ({ ...a, label: e.target.value }))}
                    placeholder="Label (e.g. Home, Work)"
                    className="px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                  />
                  <input
                    value={newAddress.line2}
                    onChange={(e) => setNewAddress((a) => ({ ...a, line2: e.target.value }))}
                    placeholder="Door / Flat number"
                    className="px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                  />
                  <input
                    required
                    value={newAddress.line1}
                    onChange={(e) => setNewAddress((a) => ({ ...a, line1: e.target.value }))}
                    placeholder="Street / Area / Locality"
                    className="px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      required
                      value={newAddress.city}
                      onChange={(e) => setNewAddress((a) => ({ ...a, city: e.target.value }))}
                      placeholder="City"
                      className="px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                    />
                    <input
                      required
                      value={newAddress.state}
                      onChange={(e) => setNewAddress((a) => ({ ...a, state: e.target.value }))}
                      placeholder="State"
                      className="px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                    />
                  </div>
                  <input
                    required
                    value={newAddress.pincode}
                    onChange={(e) => setNewAddress((a) => ({ ...a, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                    placeholder="Pincode"
                    inputMode="numeric"
                    className="px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                  />
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 py-2.5 rounded-full text-sm font-medium text-primary border border-primary/15"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-highlight text-primary hover:bg-accent hover:text-white transition-colors disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save & Use"}
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
