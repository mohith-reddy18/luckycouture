import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Lock, Check, Loader2, ChevronDown, Phone, Eye, EyeOff } from "lucide-react";
import GoogleLoginButton from "../components/GoogleLoginButton";
import logo from "../assets/logo.jpg";
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

const perks = [
  "4 curated stitching slots reserved daily",
  "Early access to seasonal collections",
  "Track orders & book fittings in one place",
];

export default function Signup() {
  const { signup, googleAuth } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectAfterAuth = (loggedInUser) => {
    if (loggedInUser?.role === "admin" && !location.state?.from) {
      navigate("/admin", { replace: true });
    } else {
      const from = location.state?.from || "/";
      const intendedState = location.state?.intendedState;
      navigate(from, { state: intendedState, replace: true });
    }
  };

  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fullPhone = form.phone ? `${countryCode.code} ${form.phone.trim()}` : "";

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleGoogleSuccess = async (tokenResponse) => {
    setError("");
    setLoading(true);
    try {
      let profile = null;
      const accessToken = tokenResponse?.access_token;
      const credential = tokenResponse?.credential;

      if (accessToken) {
        try {
          const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) profile = await res.json();
        } catch {
          // backend will perform server-side Google token verification
        }
      }

      const { error: errMsg, user: loggedInUser } = await googleAuth({
        access_token: accessToken,
        credential,
        profile,
      });

      if (errMsg) {
        setError(errMsg);
      } else {
        redirectAfterAuth(loggedInUser);
      }
    } catch {
      setError("Google sign-in failed — please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Please enter your full name");
      return;
    }

    const phoneCheck = validatePhoneNumber(fullPhone);
    if (!phoneCheck.isValid) {
      setError(phoneCheck.error || "Please enter a valid phone number");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error: errMsg, user: loggedInUser } = await signup(form.name.trim(), fullPhone, form.password);
    setLoading(false);

    if (errMsg) {
      setError(errMsg);
    } else {
      redirectAfterAuth(loggedInUser);
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-5 py-16 bg-primary bg-[radial-gradient(circle_at_20%_10%,rgba(237,217,163,0.12),transparent_45%),radial-gradient(circle_at_80%_90%,rgba(206,160,126,0.15),transparent_45%)]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="rounded-3xl overflow-hidden shadow-soft border border-highlight/20 glass-dark">
          <div className="flex flex-col items-center pt-9 pb-6 px-8">
            <span className="w-14 h-14 rounded-full ring-2 ring-highlight/60 overflow-hidden mb-3">
              <img src={logo} alt="Lucky Couture logo" className="w-full h-full object-cover" />
            </span>
            <h1 className="font-display text-2xl font-semibold text-bg">
              Create your account
            </h1>
            <p className="text-sm text-bg/60 mt-1 text-center">
              Join Lucky Couture for tailoring &amp; shop access
            </p>
          </div>

          <ul className="flex flex-col gap-2 px-8 pb-6">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-bg/80 text-xs">
                <span className="w-4 h-4 rounded-full bg-highlight/90 flex items-center justify-center shrink-0">
                  <Check size={10} className="text-primary" />
                </span>
                {p}
              </li>
            ))}
          </ul>

          <form onSubmit={handleSubmit} className="px-8 pb-8 flex flex-col gap-4">
            {/* Google OAuth Button */}
            <GoogleLoginButton
              onSuccess={handleGoogleSuccess}
              onError={(msg) => setError(msg)}
              disabled={loading}
              isDark
            />

            <div className="flex items-center gap-3 my-1">
              <div className="h-[1px] flex-1 bg-bg/15" />
              <span className="text-[11px] text-bg/40 uppercase tracking-widest font-mono">or</span>
              <div className="h-[1px] flex-1 bg-bg/15" />
            </div>

            {/* Error banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-red-900/30 border border-red-500/40 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </motion.div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-xs text-bg/60 mb-1.5 font-medium tracking-wide uppercase">
                Full name
              </label>
              <label className="flex items-center gap-2 bg-bg/5 border border-bg/15 rounded-xl px-3.5 py-2.5 focus-within:border-highlight transition-colors cursor-text">
                <User size={15} className="text-bg/50 shrink-0" />
                <input
                  required
                  value={form.name}
                  onChange={set("name")}
                  className="bg-transparent text-bg placeholder:text-bg/30 text-sm outline-none flex-1 w-full"
                  placeholder="Ananya Rao"
                />
              </label>
            </div>

            {/* Phone Number with Country Code */}
            <div>
              <label className="block text-xs text-bg/60 mb-1.5 font-medium tracking-wide uppercase">
                Phone number
              </label>
              <div className="flex gap-2">
                {/* Country code picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCodeDropdown((p) => !p)}
                    className="flex items-center gap-1.5 bg-bg/5 border border-bg/15 rounded-xl px-3 py-2.5 text-bg text-sm whitespace-nowrap focus:border-highlight outline-none transition-colors"
                  >
                    <span>{countryCode.flag}</span>
                    <span>{countryCode.code}</span>
                    <ChevronDown size={13} className="text-bg/50" />
                  </button>
                  {showCodeDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-primary border border-highlight/20 rounded-xl shadow-soft z-50 max-h-52 overflow-y-auto">
                      {COUNTRY_CODES.map((c) => (
                        <button
                          key={`${c.flag}${c.code}`}
                          type="button"
                          onClick={() => { setCountryCode(c); setShowCodeDropdown(false); }}
                          className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-bg hover:bg-highlight/10 transition-colors text-left"
                        >
                          <span>{c.flag}</span>
                          <span className="font-mono text-xs text-bg/60">{c.code}</span>
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Number input */}
                <label className="flex-1 flex items-center gap-2 bg-bg/5 border border-bg/15 rounded-xl px-3.5 py-2.5 focus-within:border-highlight transition-colors cursor-text">
                  <Phone size={15} className="text-bg/50 shrink-0" />
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d\s]/g, "") })}
                    className="bg-transparent text-bg placeholder:text-bg/30 text-sm outline-none flex-1 w-full"
                    placeholder="98765 43210"
                    maxLength={15}
                  />
                </label>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-bg/60 mb-1.5 font-medium tracking-wide uppercase">
                Password
              </label>
              <label className="flex items-center gap-2 bg-bg/5 border border-bg/15 rounded-xl px-3.5 py-2.5 focus-within:border-highlight transition-colors cursor-text">
                <Lock size={15} className="text-bg/50 shrink-0" />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  className="bg-transparent text-bg placeholder:text-bg/30 text-sm outline-none flex-1 w-full"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-bg/40 hover:text-bg/70 cursor-pointer z-10"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </label>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs text-bg/60 mb-1.5 font-medium tracking-wide uppercase">
                Confirm Password
              </label>
              <label className="flex items-center gap-2 bg-bg/5 border border-bg/15 rounded-xl px-3.5 py-2.5 focus-within:border-highlight transition-colors cursor-text">
                <Lock size={15} className="text-bg/50 shrink-0" />
                <input
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  className="bg-transparent text-bg placeholder:text-bg/30 text-sm outline-none flex-1 w-full"
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  className="text-bg/40 hover:text-bg/70 cursor-pointer z-10"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-highlight text-primary font-semibold py-3.5 rounded-full hover:bg-accent hover:text-white transition-colors shadow-card flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating account…
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-bg/60 mt-6">
          Already have an account?{" "}
          <Link to="/login" state={location.state} className="text-highlight font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
