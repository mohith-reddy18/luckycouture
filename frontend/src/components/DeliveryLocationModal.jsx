import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, MapPin, Plus } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function DeliveryLocationModal({ open, onClose, onSelect }) {
  const { user, addAddress, notify } = useApp();
  const [pincode, setPincode] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: "Home", line1: "", city: "", state: "", pincode: "" });

  const resetAndClose = () => {
    setShowAddForm(false);
    setPincode("");
    onClose();
  };

  const handlePickAddress = (address) => {
    onSelect({ type: "address", address });
    resetAndClose();
  };

  const handleApplyPincode = () => {
    if (pincode.length !== 6) return;
    onSelect({ type: "pincode", pincode });
    resetAndClose();
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!newAddress.line1 || !newAddress.city || !newAddress.state || newAddress.pincode.length !== 6) {
      notify("Please fill in all address fields");
      return;
    }
    setSaving(true);
    const error = await addAddress(newAddress);
    setSaving(false);
    if (error) {
      notify(error);
      return;
    }
    setShowAddForm(false);
    setNewAddress({ label: "Home", line1: "", city: "", state: "", pincode: "" });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Light backdrop — intentionally low opacity, not a heavy dark overlay */}
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
              <button onClick={resetAndClose} aria-label="Close" className="text-ink/40 hover:text-primary">
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
                  Sign in to see your addresses
                </Link>
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex-1 h-px bg-primary/10" />
                  <span className="text-xs text-ink/40">or enter an Indian pincode</span>
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
                        className="text-left border border-primary/15 rounded-xl p-3 hover:border-accent transition-colors flex items-start gap-2"
                      >
                        <MapPin size={15} className="text-accent mt-0.5 shrink-0" />
                        <span>
                          <span className="block text-sm font-medium text-primary">{a.label || "Address"}</span>
                          <span className="block text-xs text-ink/60">
                            {a.line1}, {a.city}, {a.state} – {a.pincode}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-accent border border-accent/40 py-2.5 rounded-full hover:bg-accent/5 transition-colors"
                >
                  <Plus size={14} /> Add a new address
                </button>
              </div>
            )}

            {user && showAddForm && (
              <form onSubmit={handleSaveAddress} className="flex flex-col gap-3 mb-4">
                <input
                  value={newAddress.line1}
                  onChange={(e) => setNewAddress((f) => ({ ...f, line1: e.target.value }))}
                  placeholder="Address line (house no., street, area)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={newAddress.city}
                    onChange={(e) => setNewAddress((f) => ({ ...f, city: e.target.value }))}
                    placeholder="City"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                  />
                  <input
                    value={newAddress.state}
                    onChange={(e) => setNewAddress((f) => ({ ...f, state: e.target.value }))}
                    placeholder="State"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                  />
                </div>
                <input
                  value={newAddress.pincode}
                  onChange={(e) => setNewAddress((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                  placeholder="6-digit pincode"
                  inputMode="numeric"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-2.5 rounded-full text-sm font-medium text-primary border border-primary/15 hover:border-primary/30"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-highlight text-primary hover:bg-accent hover:text-white transition-colors disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save address"}
                  </button>
                </div>
              </form>
            )}

            <div className="flex items-center gap-3 mb-3">
              <span className="flex-1 h-px bg-primary/10" />
              <span className="text-xs text-ink/40">{user ? "or just enter a pincode" : ""}</span>
              {user && <span className="flex-1 h-px bg-primary/10" />}
            </div>
            <div className="flex gap-2">
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter Indian pincode"
                inputMode="numeric"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
              />
              <button
                onClick={handleApplyPincode}
                disabled={pincode.length !== 6}
                className="px-5 py-2.5 rounded-full text-sm font-semibold bg-primary text-bg hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                Apply
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
