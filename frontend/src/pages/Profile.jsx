import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, Package, Heart, MapPin, Phone, Mail, Edit2, Check, X,
  Plus, Trash2, Ruler, ChevronDown, ChevronUp, Star, Save, Loader2, User,
  Lock, Eye, EyeOff, ShieldCheck, AlertCircle, MessageSquare,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import SectionHeading from "../components/SectionHeading";
import IndianAddressForm from "../components/IndianAddressForm";
import { formatDisplayAddress } from "../utils/addressValidator";
import { products } from "../data/mockData";
import SEO from "../components/SEO";

// ─── helpers ──────────────────────────────────────────────────────────────
const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm text-ink bg-white transition-colors";
const labelCls = "block text-xs font-medium text-ink/70 mb-1";

const MEASUREMENT_FIELDS = [
  { key: "bust",             label: "Chest / Bust",        unit: "in" },
  { key: "waist",            label: "Waist",               unit: "in" },
  { key: "hips",             label: "Hip",                 unit: "in" },
  { key: "shoulder",         label: "Shoulder",            unit: "in" },
  { key: "armhole",          label: "Armhole / Arm Round", unit: "in" },
  { key: "sleeves_round",    label: "Sleeves Round",       unit: "in" },
  { key: "front_neck_deep",  label: "Front Neck Deep",     unit: "in" },
  { key: "back_neck_deep",   label: "Back Neck Deep",      unit: "in" },
  { key: "sleeve",           label: "Sleeve Length",       unit: "in" },
  { key: "length",           label: "Body Length",         unit: "in" },
];

// ─── helpers ──────────────────────────────────────────────────────────────

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
      <div>
        <span className="text-xs font-semibold text-primary block mb-1.5">Measurements (inches)</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {MEASUREMENT_FIELDS.map((f) => (
            <div key={f.key}>
              <label className={labelCls}>{f.label} <span className="text-ink/40 font-medium">({f.unit})</span></label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={vals[f.key]}
                  onChange={(e) => setVals((m) => ({ ...m, [f.key]: e.target.value }))}
                  placeholder="e.g. 36.5"
                  className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm text-ink transition-colors bg-white"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink/40 pointer-events-none select-none">
                  in
                </span>
              </div>
            </div>
          ))}
        </div>
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

export default function Profile() {
  const {
    user, authLoading, logout, wishlist, cart,
    updateProfile, changePassword,
    addAddress, updateAddress, deleteAddress,
    measurements, saveMeasurement, updateMeasurement, deleteMeasurement,
    notify,
  } = useApp();
  const navigate = useNavigate();

  // ── Profile Tabs ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("details"); // "details" | "locations" | "measurements"

  // ── Edit contact info ──────────────────────────────────────────────────
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "" });
  const [contactSaving, setContactSaving] = useState(false);

  // ── Password change ────────────────────────────────────────────────────
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const isGoogleUser = Boolean(user?.googleId || user?.authProvider === "google");
  const isPhoneUser = !isGoogleUser && (user?.authProvider === "phone" || (user?.phone && !user?.email));
  const isEmailUser = !isGoogleUser && !isPhoneUser;

  const startEditContact = () => {
    setContactForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
    setEditingContact(true);
  };
  const saveContact = async (e) => {
    e.preventDefault();
    if (!contactForm.name.trim()) {
      notify("Name cannot be empty");
      return;
    }
    setContactSaving(true);
    const payload = {
      name: contactForm.name.trim(),
      ...(isEmailUser ? { email: contactForm.email.trim() } : {}),
      ...(!isPhoneUser ? { phone: contactForm.phone.trim() } : {}),
    };
    const err = await updateProfile(payload);
    setContactSaving(false);
    if (err) {
      notify(err);
    } else {
      setEditingContact(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (!passwordForm.currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError("New password is required");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    const err = await changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword,
    });
    setPasswordSaving(false);

    if (!err) {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordChange(false);
    } else {
      setPasswordError(err);
    }
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
      <SEO title="User Profile | Lucky Couture" canonical="/profile" robots="noindex, nofollow" />

      {/* ── Avatar + name ── */}
      <div className="flex items-center gap-5 mb-8">
        <span className="w-16 h-16 rounded-full bg-primary text-highlight flex items-center justify-center text-2xl font-display font-semibold shrink-0">
          {user.name?.[0]?.toUpperCase()}
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary">{user.name}</h1>
          <p className="text-sm text-ink/50">{user.email || user.phone}</p>
        </div>
      </div>

      {/* ── Quick links ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
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
        <button onClick={() => navigate("/support")}
          className="bg-white rounded-2xl shadow-card p-5 text-left hover:shadow-soft transition-shadow">
          <MessageSquare size={20} className="text-accent mb-3" />
          <p className="font-medium text-primary">Help & Support</p>
          <p className="text-xs text-ink/50">Human chat & inquiries</p>
        </button>
      </div>

      {/* ── Section / Tab Navigation (Details, Locations, Measurements) ── */}
      <div className="flex items-center gap-2 mb-6 border-b border-primary/10 pb-3 overflow-x-auto no-scrollbar">
        {[
          { key: "details", label: "Details", icon: <User size={15} /> },
          { key: "locations", label: "Locations", icon: <MapPin size={15} />, count: user.addresses?.length || 0 },
          { key: "measurements", label: "Measurements", icon: <Ruler size={15} />, count: measurements?.length || 0 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-primary text-bg shadow-sm"
                : "bg-white/80 text-ink/70 hover:text-primary hover:bg-primary/5 border border-primary/10"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab 1: DETAILS (Contact Information & Password) ── */}
      {activeTab === "details" && (
        <div className="bg-white rounded-2xl shadow-card p-6 mb-8 border border-primary/10">
          {!editingContact && !showPasswordChange ? (
            <>
              <div className="space-y-3.5">
                {/* 1. Name */}
                <div className="flex items-center gap-3 text-sm text-ink/70">
                  <User size={16} className="text-accent shrink-0" />
                  <span className="font-semibold text-primary">{user.name || "Customer"}</span>
                </div>

                {/* 2. Email */}
                <div className="flex items-center gap-3 text-sm text-ink/70">
                  <Mail size={16} className="text-accent shrink-0" />
                  {user.email || <span className="text-ink/40 italic">No email address added</span>}
                </div>

                {/* 3. Phone */}
                <div className="flex items-center gap-3 text-sm text-ink/70">
                  <Phone size={16} className="text-accent shrink-0" />
                  {user.phone || <span className="text-ink/40 italic">No phone number added</span>}
                </div>

                {/* 4. Password */}
                <div className="flex items-center gap-3 text-sm text-ink/70">
                  <Lock size={16} className="text-accent shrink-0" />
                  {isGoogleUser && !user.hasPassword ? (
                    <span className="text-xs text-ink/60">
                      Google Sign-In Account (Managed via Google)
                    </span>
                  ) : (
                    <span className="font-mono tracking-widest text-ink/60 text-xs">••••••••••••</span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-primary/5 flex-wrap">
                <button
                  onClick={() => navigate("/profile/edit")}
                  className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-primary transition-colors cursor-pointer"
                >
                  <Edit2 size={13} /> Edit Details
                </button>
                {(!isGoogleUser || user.hasPassword) && (
                  <button
                    onClick={() => navigate("/profile/change-password")}
                    className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-primary transition-colors cursor-pointer"
                  >
                    <Lock size={13} /> Change password
                  </button>
                )}
              </div>
            </>
          ) : editingContact ? (
            <form onSubmit={saveContact} className="flex flex-col gap-3">
              <div>
                <label className={labelCls}>Full name <span className="text-red-400">*</span></label>
                <input
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                  placeholder="Your name"
                />
              </div>

              {/* Email field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelCls}>Email address {isEmailUser && <span className="text-red-400">*</span>}</label>
                  {isGoogleUser && <span className="text-[10px] text-ink/40 font-medium">Google Account (Read-only)</span>}
                </div>
                <input
                  type="email"
                  required={isEmailUser}
                  disabled={isGoogleUser}
                  value={isGoogleUser ? user.email || "" : contactForm.email}
                  onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                  className={`${inputCls} ${isGoogleUser ? "opacity-60 cursor-not-allowed bg-primary/5" : ""}`}
                  placeholder="your.email@example.com"
                />
              </div>

              {/* Phone field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelCls}>Phone number</label>
                  {isPhoneUser && <span className="text-[10px] text-ink/40 font-medium">Login Phone (Read-only)</span>}
                </div>
                <input
                  type="tel"
                  disabled={isPhoneUser}
                  value={isPhoneUser ? user.phone || "" : contactForm.phone}
                  onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
                  className={`${inputCls} ${isPhoneUser ? "opacity-60 cursor-not-allowed bg-primary/5" : ""}`}
                  placeholder="+91 98765 43210"
                />
                {isGoogleUser && (
                  <p className="text-[11px] text-ink/45 mt-1">Add or update your phone number for orders &amp; delivery updates.</p>
                )}
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingContact(false)}
                  className="flex-1 py-2.5 rounded-full text-sm font-medium text-primary border border-primary/20 hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={contactSaving}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-primary text-bg hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {contactSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {contactSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-primary mb-1">Change Account Password</h4>

              {passwordError && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium bg-red-50 p-2.5 rounded-lg border border-red-200">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {/* 1. Current Password */}
              <div>
                <label className={labelCls}>
                  Current Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    required
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => {
                      setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }));
                      setPasswordError("");
                    }}
                    placeholder="Enter your current password"
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-primary transition-colors cursor-pointer"
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* 2. New Password */}
              <div>
                <label className={labelCls}>
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    required
                    minLength={8}
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => {
                      setPasswordForm((p) => ({ ...p, newPassword: e.target.value }));
                      setPasswordError("");
                    }}
                    placeholder="At least 8 characters"
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-primary transition-colors cursor-pointer"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <span className="text-[10px] text-ink/40 mt-1 block">Must be at least 8 characters long</span>
              </div>

              {/* 3. Confirm New Password */}
              <div>
                <label className={labelCls}>
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    required
                    minLength={8}
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => {
                      setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }));
                      setPasswordError("");
                    }}
                    placeholder="Re-enter new password"
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-primary transition-colors cursor-pointer"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordChange(false);
                    setPasswordError("");
                    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  }}
                  className="flex-1 py-2.5 rounded-full text-xs font-semibold text-primary border border-primary/20 hover:bg-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="flex-1 py-2.5 rounded-full text-xs font-semibold bg-primary text-bg hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {passwordSaving ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
                  {passwordSaving ? "Updating Password…" : "Change Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Tab 2: LOCATIONS (Saved Addresses) ── */}
      {activeTab === "locations" && (
        <div className="bg-white rounded-2xl shadow-card p-6 mb-8 border border-primary/10">
          {(!user.addresses || user.addresses.length === 0) && !showAddAddr && (
            <p className="text-sm text-ink/50 mb-3">No delivery locations saved yet.</p>
          )}

          <div className="flex flex-col gap-3">
            {(user.addresses || []).map((a) => (
              <div key={a._id} className="border border-primary/10 rounded-xl p-4 bg-white shadow-xs">
                {editAddrId === a._id ? (
                  <IndianAddressForm
                    initial={a}
                    onSave={(data) => handleUpdateAddress(a._id, data)}
                    onCancel={() => setEditAddrId(null)}
                    saving={addrSaving}
                    submitLabel="Update Address"
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <MapPin size={16} className="text-accent shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-primary">{a.label || "Address"}</p>
                          {a.isDefault && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink/70 mt-0.5">
                          {formatDisplayAddress(a)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setEditAddrId(a._id)}
                        className="text-ink/40 hover:text-accent transition-colors cursor-pointer p-1"
                        aria-label="Edit address"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(a._id)}
                        className="text-ink/40 hover:text-red-500 transition-colors cursor-pointer p-1"
                        aria-label="Delete address"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {showAddAddr ? (
            <div className="mt-4 p-4 rounded-2xl bg-bg/40 border border-primary/10">
              <h4 className="text-sm font-semibold text-primary mb-3">Add New Indian Delivery Address</h4>
              <IndianAddressForm
                onSave={handleAddAddress}
                onCancel={() => setShowAddAddr(false)}
                saving={addrSaving}
                submitLabel="Save Address"
              />
            </div>
          ) : (
            <button
              onClick={() => setShowAddAddr(true)}
              className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-primary transition-colors cursor-pointer"
            >
              <Plus size={14} /> Add a new address
            </button>
          )}
        </div>
      )}

      {/* ── Tab 3: MEASUREMENTS (Saved Measurement Profiles) ── */}
      {activeTab === "measurements" && (
        <div className="bg-white rounded-2xl shadow-card p-6 mb-8 border border-primary/10">
          {(!measurements || measurements.length === 0) && !showAddMeasure && (
            <p className="text-sm text-ink/50 mb-3">No measurement profiles saved yet. Add one to easily book custom tailoring orders.</p>
          )}

          <div className="flex flex-col gap-3">
            {(measurements || []).map((mp) => {
              const entries = Object.entries(mp.measurements || {}).filter(([, v]) => v);
              const isExpanded = expandedMeasure === mp._id;
              const isEditing  = editMeasureId === mp._id;
              return (
                <div key={mp._id} className="border border-primary/10 rounded-xl overflow-hidden bg-white shadow-xs">
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
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-bg/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Ruler size={15} className="text-accent" />
                          <div>
                            <p className="text-sm font-semibold text-primary">{mp.profileName}</p>
                            <p className="text-xs text-ink/50">{mp.category} · {entries.length} measurements</p>
                          </div>
                          {mp.isDefault && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">Default</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditMeasureId(mp._id); }}
                            className="text-ink/40 hover:text-accent transition-colors p-1 cursor-pointer"
                            aria-label="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteMeasure(mp._id); }}
                            className="text-ink/40 hover:text-red-500 transition-colors p-1 cursor-pointer"
                            aria-label="Delete"
                          >
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
                                const label = field?.label || (key === "length" ? "Body Length" : key.replace(/_/g, " "));
                                return (
                                  <div key={key} className="bg-bg rounded-xl p-2.5 text-center">
                                    <p className="text-[10px] text-ink/50 mb-0.5 capitalize">{label}</p>
                                    <p className="text-sm font-semibold text-primary">{val} <span className="text-xs font-normal text-ink/40">in</span></p>
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
            <div className="mt-4 p-4 rounded-2xl bg-bg/40 border border-primary/10">
              <h4 className="text-sm font-semibold text-primary mb-2">New Measurement Set</h4>
              <MeasurementForm
                onSave={handleSaveMeasure}
                onCancel={() => setShowAddMeasure(false)}
                saving={measureSaving}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowAddMeasure(true)}
              className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-primary transition-colors cursor-pointer"
            >
              <Plus size={14} /> Add measurement set
            </button>
          )}
        </div>
      )}

      {/* ── Sign out ── */}
      <button
        onClick={async () => { await logout(); navigate("/"); }}
        className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 cursor-pointer"
      >
        <LogOut size={16} /> Sign out
      </button>
    </div>
  );
}
