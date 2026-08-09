import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, Package, Heart, MapPin, Phone, Mail, Edit2, Check, X,
  Plus, Trash2, Ruler, ChevronDown, ChevronUp, Star, Save, Loader2,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import SectionHeading from "../components/SectionHeading";

// ─── helpers ──────────────────────────────────────────────────────────────
const MEASUREMENT_FIELDS = [
  { key: "bust",     label: "Bust / Chest",    unit: "cm" },
  { key: "waist",    label: "Waist",            unit: "cm" },
  { key: "hips",     label: "Hips",             unit: "cm" },
  { key: "shoulder", label: "Shoulder width",   unit: "cm" },
  { key: "length",   label: "Length",           unit: "cm" },
  { key: "sleeve",   label: "Sleeve length",    unit: "cm" },
];

const emptyAddress = { label: "Home", line2: "", line1: "", city: "", state: "", pincode: "" };

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm text-ink transition-colors";
const labelCls = "block text-xs text-ink/50 mb-1";

function AddressForm({ initial = emptyAddress, onSave, onCancel, saving }) {
  const [addr, setAddr] = useState(initial);
  const { notify } = useApp();

  const submit = (e) => {
    e.preventDefault();
    if (!addr.line1 || !addr.city || !addr.state || !/^\d{6}$/.test(addr.pincode)) {
      notify("Please fill in all fields with a valid 6-digit pincode");
      return;
    }
    onSave(addr);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5 mt-3">
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className={labelCls}>Label</label>
          <input value={addr.label} onChange={(e) => setAddr((a) => ({ ...a, label: e.target.value }))}
            placeholder="Home / Work" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Door / Flat no.</label>
          <input value={addr.line2} onChange={(e) => setAddr((a) => ({ ...a, line2: e.target.value }))}
            placeholder="Optional" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Street / Area <span className="text-red-400">*</span></label>
        <input required value={addr.line1} onChange={(e) => setAddr((a) => ({ ...a, line1: e.target.value }))}
          placeholder="Street / Area / Locality" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className={labelCls}>City <span className="text-red-400">*</span></label>
          <input required value={addr.city} onChange={(e) => setAddr((a) => ({ ...a, city: e.target.value }))}
            placeholder="City" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>State <span className="text-red-400">*</span></label>
          <input required value={addr.state} onChange={(e) => setAddr((a) => ({ ...a, state: e.target.value }))}
            placeholder="State" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Pincode <span className="text-red-400">*</span></label>
        <input required value={addr.pincode}
          onChange={(e) => setAddr((a) => ({ ...a, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
          placeholder="6-digit pincode" inputMode="numeric" className={inputCls} />
      </div>
      <div className="flex gap-2 mt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-full text-sm font-medium text-primary border border-primary/20 hover:border-primary/40 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-primary text-bg hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving…" : "Save address"}
        </button>
      </div>
    </form>
  );
}

function MeasurementForm({ initial = {}, initialName = "", onSave, onCancel, saving }) {
  const [name, setName] = useState(initialName || "");
  const [vals, setVals] = useState(
    Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f.key, initial[f.key] ?? ""]))
  );

  const submit = (e) => {
    e.preventDefault();
    const measurements = Object.fromEntries(
      Object.entries(vals).filter(([, v]) => v !== "" && !isNaN(Number(v))).map(([k, v]) => [k, Number(v)])
    );
    onSave({ profileName: name.trim() || "My Measurements", category: "General", measurements, isDefault: false });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 mt-3">
      <div>
        <label className={labelCls}>Profile name <span className="text-red-400">*</span></label>
        <input required value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Myself, Daughter" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {MEASUREMENT_FIELDS.map((f) => (
          <div key={f.key}>
            <label className={labelCls}>{f.label} <span className="text-ink/30">({f.unit})</span></label>
            <input type="number" min="0" step="0.5" value={vals[f.key]}
              onChange={(e) => setVals((m) => ({ ...m, [f.key]: e.target.value }))}
              placeholder="—" className={inputCls} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-full text-sm font-medium text-primary border border-primary/20 hover:border-primary/40 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-primary text-bg hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function Profile() {
  const {
    user, authLoading, logout, wishlist, cart,
    updateProfile,
    addAddress, updateAddress, deleteAddress,
    measurements, saveMeasurement, updateMeasurement, deleteMeasurement,
    notify,
  } = useApp();
  const navigate = useNavigate();

  // ── Edit contact info ──────────────────────────────────────────────────
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", phone: "" });
  const [contactSaving, setContactSaving] = useState(false);

  const startEditContact = () => {
    setContactForm({ name: user?.name || "", phone: user?.phone || "" });
    setEditingContact(true);
  };
  const saveContact = async (e) => {
    e.preventDefault();
    if (!contactForm.name.trim()) { notify("Name cannot be empty"); return; }
    setContactSaving(true);
    const err = await updateProfile({ name: contactForm.name.trim(), phone: contactForm.phone.trim() });
    setContactSaving(false);
    if (!err) setEditingContact(false);
  };

  // ── Addresses ─────────────────────────────────────────────────────────
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [editAddrId, setEditAddrId]   = useState(null);
  const [addrSaving, setAddrSaving]   = useState(false);

  const handleAddAddress = async (data) => {
    setAddrSaving(true);
    const err = await addAddress(data);
    setAddrSaving(false);
    if (!err) setShowAddAddr(false);
  };

  const handleUpdateAddress = async (id, data) => {
    setAddrSaving(true);
    const err = await updateAddress(id, data);
    setAddrSaving(false);
    if (!err) setEditAddrId(null);
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm("Remove this address?")) return;
    await deleteAddress(id);
  };

  // ── Measurements ──────────────────────────────────────────────────────
  const [showAddMeasure, setShowAddMeasure]   = useState(false);
  const [editMeasureId, setEditMeasureId]     = useState(null);
  const [expandedMeasure, setExpandedMeasure] = useState(null);
  const [measureSaving, setMeasureSaving]     = useState(false);

  const handleSaveMeasure = async (data) => {
    setMeasureSaving(true);
    const err = await saveMeasurement(data);
    setMeasureSaving(false);
    if (!err) setShowAddMeasure(false);
  };

  const handleUpdateMeasure = async (id, data) => {
    setMeasureSaving(true);
    const err = await updateMeasurement(id, data);
    setMeasureSaving(false);
    if (!err) setEditMeasureId(null);
  };

  const handleDeleteMeasure = async (id) => {
    if (!window.confirm("Delete this measurement profile?")) return;
    await deleteMeasurement(id);
    if (expandedMeasure === id) setExpandedMeasure(null);
  };

  // ── Guards ─────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 animate-pulse mx-auto mb-6" />
        <div className="h-4 w-40 bg-primary/10 rounded animate-pulse mx-auto" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold text-primary mb-3">You're not signed in</h1>
        <p className="text-ink/60 mb-8">Log in to view your profile, orders, and saved items.</p>
        <button onClick={() => navigate("/login")} className="bg-primary text-bg px-7 py-3 rounded-full font-medium hover:bg-primary/90">
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-12 md:py-20">

      {/* ── Avatar + name ── */}
      <div className="flex items-center gap-5 mb-8">
        <span className="w-16 h-16 rounded-full bg-primary text-highlight flex items-center justify-center text-2xl font-display font-semibold shrink-0">
          {user.name?.[0]?.toUpperCase()}
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary">{user.name}</h1>
          <p className="text-sm text-ink/50">{user.email}</p>
        </div>
      </div>

      {/* ── Quick links ── */}
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <button onClick={() => navigate("/orders")}
          className="bg-white rounded-2xl shadow-card p-5 text-left hover:shadow-soft transition-shadow">
          <Package size={20} className="text-accent mb-3" />
          <p className="font-medium text-primary">Orders</p>
          <p className="text-xs text-ink/50">View order history</p>
        </button>
        <button onClick={() => navigate("/wishlist")}
          className="bg-white rounded-2xl shadow-card p-5 text-left hover:shadow-soft transition-shadow">
          <Heart size={20} className="text-accent mb-3" />
          <p className="font-medium text-primary">Wishlist</p>
          <p className="text-xs text-ink/50">{wishlist.length} saved items</p>
        </button>
        <button onClick={() => navigate("/cart")}
          className="bg-white rounded-2xl shadow-card p-5 text-left hover:shadow-soft transition-shadow">
          <Package size={20} className="text-accent mb-3" />
          <p className="font-medium text-primary">Cart</p>
          <p className="text-xs text-ink/50">{cart.length} items in bag</p>
        </button>
      </div>

      {/* ── Contact information ── */}
      <SectionHeading align="left" eyebrow="Details" title="Contact information" />
      <div className="bg-white rounded-2xl shadow-card p-6 mb-8">
        {!editingContact ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-ink/70">
                <Mail size={16} className="text-accent shrink-0" /> {user.email}
              </div>
              <div className="flex items-center gap-3 text-sm text-ink/70">
                <Phone size={16} className="text-accent shrink-0" />
                {user.phone || <span className="text-ink/40 italic">No phone number added</span>}
              </div>
            </div>
            <button onClick={startEditContact}
              className="mt-4 flex items-center gap-1.5 text-xs font-medium text-accent hover:text-primary transition-colors">
              <Edit2 size={13} /> Edit name &amp; phone
            </button>
          </>
        ) : (
          <form onSubmit={saveContact} className="flex flex-col gap-3">
            <div>
              <label className={labelCls}>Full name <span className="text-red-400">*</span></label>
              <input required value={contactForm.name}
                onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                className={inputCls} placeholder="Your name" />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input value={contactForm.phone}
                onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputCls} placeholder="+91 98765 43210" />
            </div>
            <p className="text-xs text-ink/40">Email cannot be changed here.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditingContact(false)}
                className="flex-1 py-2.5 rounded-full text-sm font-medium text-primary border border-primary/20">Cancel</button>
              <button type="submit" disabled={contactSaving}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-primary text-bg hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                {contactSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {contactSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Addresses ── */}
      <SectionHeading align="left" eyebrow="Delivery" title="Saved Addresses" />
      <div className="bg-white rounded-2xl shadow-card p-6 mb-8">
        {user.addresses?.length === 0 && !showAddAddr && (
          <p className="text-sm text-ink/50 mb-3">No addresses saved yet.</p>
        )}

        <div className="flex flex-col gap-3">
          {(user.addresses || []).map((a) => (
            <div key={a._id} className="border border-primary/10 rounded-xl p-4">
              {editAddrId === a._id ? (
                <AddressForm
                  initial={a}
                  onSave={(data) => handleUpdateAddress(a._id, data)}
                  onCancel={() => setEditAddrId(null)}
                  saving={addrSaving}
                />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={15} className="text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-primary">{a.label || "Address"}</p>
                      <p className="text-xs text-ink/60 mt-0.5">
                        {[a.line2, a.line1, a.city, a.state].filter(Boolean).join(", ")} – {a.pincode}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setEditAddrId(a._id)}
                      className="text-ink/40 hover:text-accent transition-colors" aria-label="Edit address">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDeleteAddress(a._id)}
                      className="text-ink/40 hover:text-red-500 transition-colors" aria-label="Delete address">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {showAddAddr ? (
          <AddressForm
            onSave={handleAddAddress}
            onCancel={() => setShowAddAddr(false)}
            saving={addrSaving}
          />
        ) : (
          <button onClick={() => setShowAddAddr(true)}
            className="mt-4 flex items-center gap-1.5 text-xs font-medium text-accent hover:text-primary transition-colors">
            <Plus size={14} /> Add a new address
          </button>
        )}
      </div>

      {/* ── Measurement profiles ── */}
      <SectionHeading align="left" eyebrow="Tailoring" title="Measurement Profiles" />
      <div className="bg-white rounded-2xl shadow-card p-6 mb-10">
        {measurements.length === 0 && !showAddMeasure && (
          <p className="text-sm text-ink/50 mb-3">No measurement profiles yet. Add one to reuse measurements when placing tailoring orders.</p>
        )}

        <div className="flex flex-col gap-3">
          {measurements.map((mp) => {
            const entries = Object.entries(mp.measurements || {}).filter(([, v]) => v);
            const isExpanded = expandedMeasure === mp._id;
            const isEditing  = editMeasureId === mp._id;
            return (
              <div key={mp._id} className="border border-primary/10 rounded-xl overflow-hidden">
                {isEditing ? (
                  <div className="p-4">
                    <MeasurementForm
                      initialName={mp.profileName}
                      initial={Object.fromEntries(Object.entries(mp.measurements || {}))}
                      onSave={(data) => handleUpdateMeasure(mp._id, data)}
                      onCancel={() => setEditMeasureId(null)}
                      saving={measureSaving}
                    />
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setExpandedMeasure(isExpanded ? null : mp._id)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-bg/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Ruler size={15} className="text-accent" />
                        <div>
                          <p className="text-sm font-medium text-primary">{mp.profileName}</p>
                          <p className="text-xs text-ink/50">{mp.category} · {entries.length} measurements</p>
                        </div>
                        {mp.isDefault && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Default</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setEditMeasureId(mp._id); }}
                          className="text-ink/40 hover:text-accent transition-colors p-1" aria-label="Edit">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteMeasure(mp._id); }}
                          className="text-ink/40 hover:text-red-500 transition-colors p-1" aria-label="Delete">
                          <Trash2 size={13} />
                        </button>
                        {isExpanded ? <ChevronUp size={14} className="text-ink/40" /> : <ChevronDown size={14} className="text-ink/40" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-4 pb-4 pt-1">
                            {entries.map(([key, val]) => {
                              const field = MEASUREMENT_FIELDS.find((f) => f.key === key);
                              return (
                                <div key={key} className="bg-bg rounded-xl p-2.5 text-center">
                                  <p className="text-[10px] text-ink/50 mb-0.5">{field?.label || key}</p>
                                  <p className="text-sm font-semibold text-primary">{val} <span className="text-xs font-normal text-ink/40">cm</span></p>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {showAddMeasure ? (
          <MeasurementForm
            onSave={handleSaveMeasure}
            onCancel={() => setShowAddMeasure(false)}
            saving={measureSaving}
          />
        ) : (
          <button onClick={() => setShowAddMeasure(true)}
            className="mt-4 flex items-center gap-1.5 text-xs font-medium text-accent hover:text-primary transition-colors">
            <Plus size={14} /> Add measurement profile
          </button>
        )}
      </div>

      {/* ── Sign out ── */}
      <button
        onClick={async () => { await logout(); navigate("/"); }}
        className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600"
      >
        <LogOut size={16} /> Sign out
      </button>
    </div>
  );
}
