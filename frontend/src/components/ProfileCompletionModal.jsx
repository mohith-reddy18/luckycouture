import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { User, Phone, Lock, ChevronDown, Check, Loader2, Sparkles, Eye, EyeOff } from "lucide-react";
import { useApp } from "../context/AppContext";
import { validatePhoneNumber } from "../utils/phoneValidator";

const COUNTRY_CODES = [
  { flag: "🇮🇳", code: "+91", name: "India" },
  { flag: "🇺🇸", code: "+1",  name: "USA" },
  { flag: "🇬🇧", code: "+44", name: "UK" },
  { flag: "🇦🇪", code: "+971", name: "UAE" },
  { flag: "🇸🇬", code: "+65", name: "Singapore" },
  { flag: "🇦🇺", code: "+61", name: "Australia" },
  { flag: "🇨🇦", code: "+1",  name: "Canada" },
];

export default function ProfileCompletionModal() {
  const { user, updateProfile, notify } = useApp();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Needs profile completion if missing name, phone, or password
  const isProfileIncomplete = Boolean(
    user && (!user.phone || !user.phone.trim() || !user.name || !user.name.trim() || !user.hasPassword)
  );

  // Prevent background page scrolling when modal is open
  useEffect(() => {
    if (isProfileIncomplete) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isProfileIncomplete]);

  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.phone) {
        const cleaned = user.phone.replace(/^[+]?\d{1,4}\s?/, "");
        setPhone(cleaned);
      }
    }
  }, [user]);

  if (!isProfileIncomplete) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your full name");
      return;
    }

    const fullPhone = `${countryCode.code} ${phone.trim()}`;
    const phoneCheck = validatePhoneNumber(fullPhone);
    if (!phoneCheck.isValid) {
      setError(phoneCheck.error || "Please enter a valid phone number");
      return;
    }

    if (!user?.hasPassword) {
      if (!password || password.length < 8) {
        setError("Please enter a password with at least 8 characters");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setLoading(true);
    const err = await updateProfile({
      name: name.trim(),
      phone: fullPhone,
      ...(password ? { password } : {}),
    });
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      notify("Profile setup completed! You can now log in with Google or Phone + Password. 🎉");
    }
  };

  return (
    <AnimatePresence>
      {isProfileIncomplete && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-primary/60 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-soft overflow-hidden flex flex-col z-10 border border-primary/10 max-h-[min(92vh,680px)]"
          >
            {/* Compact Header */}
            <div className="bg-primary px-5 py-3.5 sm:px-6 sm:py-4 text-center text-bg flex flex-col items-center shrink-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-7 h-7 rounded-full bg-highlight/20 flex items-center justify-center text-highlight shrink-0">
                  <Sparkles size={14} />
                </span>
                <h2 className="font-display text-lg sm:text-xl font-semibold text-bg">Complete Your Profile</h2>
              </div>
              <p className="text-[11px] sm:text-xs text-bg/70 max-w-xs">
                {!user?.hasPassword
                  ? "Set your phone & password to sign in with Google or Phone."
                  : "Please provide your contact details to finish setting up."}
              </p>
              {user?.email && (
                <span className="mt-1.5 inline-block px-2.5 py-0.5 bg-white/10 rounded-full text-[10px] sm:text-[11px] text-bg/90 font-mono">
                  {user.email}
                </span>
              )}
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-3">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2 text-xs text-red-700"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-medium text-secondary mb-1 uppercase tracking-wider">
                    Full Name
                  </label>
                  <label className="flex items-center gap-2 bg-bg border border-primary/12 rounded-xl px-3 py-2 sm:py-2.5 focus-within:border-accent transition-colors cursor-text">
                    <User size={14} className="text-secondary shrink-0" />
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ananya Rao"
                      className="bg-transparent text-ink placeholder:text-ink/30 text-sm outline-none flex-1 w-full"
                    />
                  </label>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-[11px] font-medium text-secondary mb-1 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <div className="flex gap-2">
                    {/* Country code selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCodeDropdown((p) => !p)}
                        className="flex items-center gap-1 bg-bg border border-primary/12 rounded-xl px-2.5 py-2 sm:py-2.5 text-ink text-sm whitespace-nowrap focus:border-accent outline-none transition-colors"
                      >
                        <span>{countryCode.flag}</span>
                        <span>{countryCode.code}</span>
                        <ChevronDown size={12} className="text-secondary" />
                      </button>
                      {showCodeDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-primary/15 rounded-xl shadow-soft z-50 max-h-48 overflow-y-auto">
                          {COUNTRY_CODES.map((c) => (
                            <button
                              key={`${c.flag}${c.code}`}
                              type="button"
                              onClick={() => {
                                setCountryCode(c);
                                setShowCodeDropdown(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-ink hover:bg-bg transition-colors text-left"
                            >
                              <span>{c.flag}</span>
                              <span className="font-mono text-xs text-secondary">{c.code}</span>
                              <span>{c.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Phone input */}
                    <label className="flex-1 flex items-center gap-2 bg-bg border border-primary/12 rounded-xl px-3 py-2 sm:py-2.5 focus-within:border-accent transition-colors cursor-text">
                      <Phone size={14} className="text-secondary shrink-0" />
                      <input
                        required
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                        placeholder="98765 43210"
                        maxLength={15}
                        className="bg-transparent text-ink placeholder:text-ink/30 text-sm outline-none flex-1 w-full"
                      />
                    </label>
                  </div>
                </div>

                {/* Password fields only if user has no password yet */}
                {!user?.hasPassword && (
                  <>
                    {/* Set Password */}
                    <div>
                      <label className="block text-[11px] font-medium text-secondary mb-1 uppercase tracking-wider">
                        Set Password
                      </label>
                      <label className="flex items-center gap-2 bg-bg border border-primary/12 rounded-xl px-3 py-2 sm:py-2.5 focus-within:border-accent transition-colors cursor-text">
                        <Lock size={14} className="text-secondary shrink-0" />
                        <input
                          required
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min. 8 characters"
                          className="bg-transparent text-ink placeholder:text-ink/30 text-sm outline-none flex-1 w-full"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="text-secondary hover:text-primary cursor-pointer z-10"
                          aria-label="Toggle password visibility"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </label>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-[11px] font-medium text-secondary mb-1 uppercase tracking-wider">
                        Confirm Password
                      </label>
                      <label className="flex items-center gap-2 bg-bg border border-primary/12 rounded-xl px-3 py-2 sm:py-2.5 focus-within:border-accent transition-colors cursor-text">
                        <Lock size={14} className="text-secondary shrink-0" />
                        <input
                          required
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="bg-transparent text-ink placeholder:text-ink/30 text-sm outline-none flex-1 w-full"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((s) => !s)}
                          className="text-secondary hover:text-primary cursor-pointer z-10"
                          aria-label="Toggle confirm password visibility"
                        >
                          {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </label>
                    </div>
                  </>
                )}
              </div>

              {/* Sticky / Always Visible Submit Footer */}
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-primary/10 bg-white shrink-0">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-bg font-semibold py-3 sm:py-3.5 rounded-full hover:bg-primary/90 transition-colors shadow-card flex items-center justify-center gap-2 disabled:opacity-70 text-sm cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving profile…
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Save &amp; Complete Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
