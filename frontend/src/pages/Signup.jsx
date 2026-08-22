import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Lock, Loader2, ChevronDown, Phone, Eye, EyeOff, Info } from "lucide-react";
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
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-5 py-16 bg-[radial-gradient(circle_at_top,_#F8F6F2,_#EFE6D8)]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-soft border border-accent/15 overflow-hidden">
          <div className="bg-primary py-8 flex flex-col items-center">
            <span className="w-14 h-14 rounded-full ring-2 ring-highlight/60 overflow-hidden mb-3">
              <img src={logo} alt="Lucky Couture logo" className="w-full h-full object-cover" />
            </span>
            <h1 className="font-display text-2xl font-semibold text-bg">Create your account</h1>
            <p className="text-sm text-bg/60 mt-1">Join Lucky Couture</p>
          </div>

          {location.state?.from === "/tailoring" && (
            <div className="bg-highlight/30 border-b border-accent/20 px-6 py-2.5 text-xs text-primary flex items-center gap-2 justify-center font-medium">
              <Info size={14} className="text-accent shrink-0" />
              Please create an account or sign in to book your tailoring order.
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-8">
            {/* Google OAuth Button */}
            <GoogleLoginButton
              onSuccess={handleGoogleSuccess}
              onError={(msg) => setError(msg)}
              disabled={loading}
            />

            <div className="flex items-center gap-3 my-4">
              <div className="h-[1px] flex-1 bg-primary/10" />
              <span className="text-[11px] text-ink/40 uppercase tracking-widest font-mono">or</span>
              <div className="h-[1px] flex-1 bg-primary/10" />
            </div>

            {/* Error banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </motion.div>
            )}

            {/* Full Name */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-secondary mb-1.5 tracking-wide uppercase">
                Full Name
              </label>
              <label className="flex items-center gap-2 bg-bg border border-primary/12 rounded-xl px-3.5 py-3 focus-within:border-accent transition-colors cursor-text">
                <User size={16} className="text-secondary shrink-0" />
                <input
                  required
                  value={form.name}
                  onChange={set("name")}
                  className="bg-transparent text-ink placeholder:text-ink/30 text-sm outline-none flex-1 w-full"
                  placeholder="Ananya Rao"
                />
              </label>
            </div>

            {/* Phone Number with Country Code */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-secondary mb-1.5 tracking-wide uppercase">
                Phone Number
              </label>
              <div className="flex gap-2">
                {/* Country code picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCodeDropdown((p) => !p)}
                    className="flex items-center gap-1.5 bg-bg border border-primary/12 rounded-xl px-3 py-3 text-primary text-sm whitespace-nowrap focus:border-accent outline-none transition-colors cursor-pointer"
                  >
                    <span>{countryCode.flag}</span>
                    <span>{countryCode.code}</span>
                    <ChevronDown size={14} className="text-secondary" />
                  </button>
                  {showCodeDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-primary/15 rounded-xl shadow-card z-50 max-h-52 overflow-y-auto">
                      {COUNTRY_CODES.map((c) => (
                        <button
                          key={`${c.flag}${c.code}`}
                          type="button"
                          onClick={() => { setCountryCode(c); setShowCodeDropdown(false); }}
                          className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-primary hover:bg-primary/5 transition-colors text-left cursor-pointer"
                        >
                          <span>{c.flag}</span>
                          <span className="font-mono text-xs text-ink/60">{c.code}</span>
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Number input */}
                <label className="flex-1 flex items-center gap-2 bg-bg border border-primary/12 rounded-xl px-3.5 py-3 focus-within:border-accent transition-colors cursor-text">
                  <Phone size={16} className="text-secondary shrink-0" />
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d\s]/g, "") })}
                    className="bg-transparent text-ink placeholder:text-ink/30 text-sm outline-none flex-1 w-full"
                    placeholder="98765 43210"
                    maxLength={15}
                  />
                </label>
              </div>
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-secondary mb-1.5 tracking-wide uppercase">
                Password
              </label>
              <label className="flex items-center gap-2 bg-bg border border-primary/12 rounded-xl px-3.5 py-3 focus-within:border-accent transition-colors cursor-text">
                <Lock size={16} className="text-secondary shrink-0" />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  className="bg-transparent text-ink placeholder:text-ink/30 text-sm outline-none flex-1 w-full"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-ink/35 cursor-pointer z-10"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </label>
            </div>

            {/* Confirm Password */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-secondary mb-1.5 tracking-wide uppercase">
                Confirm Password
              </label>
              <label className="flex items-center gap-2 bg-bg border border-primary/12 rounded-xl px-3.5 py-3 focus-within:border-accent transition-colors cursor-text">
                <Lock size={16} className="text-secondary shrink-0" />
                <input
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  className="bg-transparent text-ink placeholder:text-ink/30 text-sm outline-none flex-1 w-full"
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  className="text-ink/35 cursor-pointer z-10"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-bg font-semibold py-3.5 rounded-full hover:bg-primary/90 transition-colors shadow-card flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
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

        <p className="text-center text-sm text-ink/60 mt-6">
          Already have an account?{" "}
          <Link to="/login" state={location.state} className="text-accent font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
