import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  ChevronLeft,
  Save,
  Loader2,
  Check,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { validatePhoneNumber } from "../utils/phoneValidator";
import SEO from "../components/SEO";

const COUNTRY_CODES = [
  { flag: "🇮🇳", code: "+91", name: "India" },
  { flag: "🇺🇸", code: "+1",  name: "USA" },
  { flag: "🇬🇧", code: "+44", name: "UK" },
  { flag: "🇦🇪", code: "+971", name: "UAE" },
  { flag: "🇸🇬", code: "+65", name: "Singapore" },
  { flag: "🇦🇺", code: "+61", name: "Australia" },
  { flag: "🇨🇦", code: "+1",  name: "Canada" },
];

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm text-ink bg-white transition-colors";
const labelCls = "block text-xs font-semibold text-primary mb-1";

export default function ProfileEdit() {
  const { user, authLoading, updateProfile, notify } = useApp();
  const navigate = useNavigate();

  const isGoogleUser = Boolean(user?.googleId || user?.authProvider === "google");
  const isPhoneUser = !isGoogleUser && (user?.authProvider === "phone" || (user?.phone && !user?.email));
  const isEmailUser = !isGoogleUser && !isPhoneUser;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Initialize form from authenticated user profile
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");

      if (user.phone) {
        // Check if phone matches any known country code
        const matchedCode = COUNTRY_CODES.find((c) => user.phone.startsWith(c.code));
        if (matchedCode) {
          setCountryCode(matchedCode);
          setPhone(user.phone.slice(matchedCode.code.length).trim());
        } else if (user.phone.startsWith("+")) {
          // Keep raw or strip country code
          setPhone(user.phone);
        } else {
          setPhone(user.phone);
        }
      }
    }
  }, [user]);

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
        <p className="text-ink/60 mb-8">Please log in to edit your profile details.</p>
        <button
          onClick={() => navigate("/login")}
          className="bg-primary text-bg px-7 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Full name cannot be empty");
      return;
    }

    if (isEmailUser) {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        setError("Email address cannot be empty");
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        setError("Please enter a valid email address");
        return;
      }
    }

    let formattedPhone = undefined;
    if (!isPhoneUser && phone.trim()) {
      const fullPhone = phone.trim().startsWith("+")
        ? phone.trim()
        : `${countryCode.code} ${phone.trim()}`;

      const phoneCheck = validatePhoneNumber(fullPhone);
      if (!phoneCheck.isValid) {
        setError(phoneCheck.error || "Please enter a valid phone number");
        return;
      }
      formattedPhone = phoneCheck.normalized;
    }

    setSaving(true);
    const payload = {
      name: name.trim(),
      ...(isEmailUser ? { email: email.trim().toLowerCase() } : {}),
      ...(!isPhoneUser ? { phone: formattedPhone || "" } : {}),
    };

    const err = await updateProfile(payload);
    setSaving(false);

    if (err) {
      setError(err);
    } else {
      navigate("/profile");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-8 py-10 md:py-16">
      <SEO
        title="Edit Profile Details | Lucky Couture"
        canonical="/profile/edit"
        robots="noindex, nofollow"
      />

      {/* Back to profile breadcrumb link */}
      <div className="mb-6">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-primary transition-colors"
        >
          <ChevronLeft size={16} /> Back to Profile
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6 md:p-8 border border-primary/10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 pb-5 border-b border-primary/10">
          <span className="w-14 h-14 rounded-full bg-primary text-highlight flex items-center justify-center text-xl font-display font-semibold shrink-0">
            {user.name?.[0]?.toUpperCase() || "U"}
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-primary">Edit Profile Details</h1>
            <p className="text-xs text-ink/60 mt-0.5">
              Update your personal and contact details for Lucky Couture orders &amp; tailoring.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 font-medium bg-red-50 p-3 rounded-xl border border-red-200 mb-6">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* 1. Full Name */}
          <div>
            <label className={labelCls}>
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                required
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                className={inputCls}
                placeholder="Your full name"
              />
            </div>
          </div>

          {/* 2. Email Address */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>
                Email Address {isEmailUser && <span className="text-red-500">*</span>}
              </label>
              {isGoogleUser && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  Google Account (Read-only)
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="email"
                required={isEmailUser}
                disabled={isGoogleUser}
                value={isGoogleUser ? user.email || "" : email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className={`${inputCls} ${
                  isGoogleUser ? "opacity-60 cursor-not-allowed bg-primary/5 border-primary/10" : ""
                }`}
                placeholder="your.email@example.com"
              />
            </div>
            {isGoogleUser ? (
              <p className="text-[11px] text-ink/45 mt-1">
                Your email is linked directly to your Google authentication account.
              </p>
            ) : (
              <p className="text-[11px] text-ink/45 mt-1">
                Used for order confirmations, digital invoices, and account access.
              </p>
            )}
          </div>

          {/* 3. Phone Number */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>Phone Number</label>
              {isPhoneUser && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  Login Phone (Read-only)
                </span>
              )}
            </div>

            {isPhoneUser ? (
              <input
                type="tel"
                disabled
                value={user.phone || ""}
                className={`${inputCls} opacity-60 cursor-not-allowed bg-primary/5 border-primary/10`}
              />
            ) : (
              <div className="flex gap-2">
                {/* Country Code Dropdown */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCodeDropdown((prev) => !prev)}
                    className="h-full px-3 py-2.5 rounded-xl border border-primary/15 bg-white text-xs font-semibold text-ink flex items-center gap-1.5 hover:border-accent transition-colors"
                  >
                    <span>{countryCode.flag}</span>
                    <span>{countryCode.code}</span>
                    <ChevronDown size={12} className="text-ink/40" />
                  </button>

                  {showCodeDropdown && (
                    <div className="absolute left-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-card border border-primary/10 py-1.5 z-20 max-h-48 overflow-y-auto">
                      {COUNTRY_CODES.map((c) => (
                        <button
                          key={c.code + c.name}
                          type="button"
                          onClick={() => {
                            setCountryCode(c);
                            setShowCodeDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-bg transition-colors ${
                            countryCode.code === c.code && countryCode.name === c.name
                              ? "font-semibold text-primary bg-primary/5"
                              : "text-ink/75"
                          }`}
                        >
                          <span>{c.flag}</span>
                          <span>{c.name}</span>
                          <span className="text-ink/40 ml-auto font-mono text-[11px]">{c.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Phone Input */}
                <div className="flex-1">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setError("");
                    }}
                    className={inputCls}
                    placeholder="98765 43210"
                  />
                </div>
              </div>
            )}

            <p className="text-[11px] text-ink/45 mt-1">
              Used by our team and courier partners for delivery updates &amp; tailoring coordination.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-4 pt-5 border-t border-primary/10">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="flex-1 py-3 rounded-full text-xs font-semibold text-primary border border-primary/20 hover:bg-primary/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-full text-xs font-semibold bg-primary text-bg hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving Changes…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
