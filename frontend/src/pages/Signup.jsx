import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, Check, Loader2, ChevronDown, KeyRound, ArrowLeft, RefreshCw } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { useApp } from "../context/AppContext";
import logo from "../assets/logo.jpg";

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
  const { signup, sendOtp, registerWithOtp, googleAuth } = useApp();
  const navigate = useNavigate();

  const [step, setStep] = useState("form"); // "form" | "otp"
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [otpCode, setOtpCode] = useState(new Array(6).fill(""));
  const inputRefs = useRef([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const fullPhone = form.phone ? `${countryCode.code} ${form.phone.trim()}` : "";

  // Resend OTP cooldown timer
  useEffect(() => {
    let interval;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // Handle Google OAuth login
  const handleGoogleSuccess = async (tokenResponse) => {
    setError("");
    setLoading(true);
    try {
      // Fetch user profile using access token
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const profile = await res.json();
      const errMsg = await googleAuth(tokenResponse.access_token, profile);
      if (errMsg) setError(errMsg);
      else navigate("/");
    } catch {
      setError("Google sign-in failed — please try again");
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setError("Google Sign-In failed or was cancelled"),
  });

  // Step 1 Submit: Initiate Signup or Request OTP
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (form.phone && !/^\d{6,12}$/.test(form.phone.replace(/\s/g, ""))) {
      setError("Please enter a valid phone number (digits only, 6–12 digits)");
      return;
    }

    setLoading(true);

    if (fullPhone) {
      // Phone provided -> send OTP and transition to OTP verification step
      const result = await sendOtp(fullPhone, form.email);
      setLoading(false);
      if (result.success) {
        setStep("otp");
        setTimer(30);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(result.error);
      }
    } else {
      // No phone provided -> standard signup
      const errMsg = await signup(form.name, form.email, "", form.password);
      setLoading(false);
      if (errMsg) setError(errMsg);
      else navigate("/");
    }
  };

  // Step 2 Submit: Verify OTP & Complete Signup
  const handleSubmitOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");

    const finalOtp = otpCode.join("");
    if (finalOtp.length < 6) {
      setError("Please enter the 6-digit verification code");
      return;
    }

    setLoading(true);
    const errMsg = await registerWithOtp(form.name, form.email, fullPhone, form.password, finalOtp);
    setLoading(false);

    if (errMsg) {
      setError(errMsg);
    } else {
      navigate("/");
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (timer > 0 || resending) return;
    setError("");
    setResending(true);

    const result = await sendOtp(fullPhone, form.email);
    setResending(false);

    if (result.success) {
      setTimer(30);
      setInfoMsg("A new verification code has been sent!");
    } else {
      setError(result.error);
    }
  };

  const handleChangeOtp = (e, index) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) return;
    const newOtp = [...otpCode];
    newOtp[index] = val.slice(-1);
    setOtpCode(newOtp);
    if (index < 5 && newOtp[index]) inputRefs.current[index + 1].focus();
  };

  const handleKeyDownOtp = (e, index) => {
    if (e.key === "Backspace") {
      const newOtp = [...otpCode];
      newOtp[index] = "";
      setOtpCode(newOtp);
      if (index > 0) inputRefs.current[index - 1].focus();
    }
  };

  const handlePasteOtp = (e) => {
    e.preventDefault();
    const data = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (data.length === 0) return;
    const newOtp = [...otpCode];
    data.forEach((val, i) => { newOtp[i] = val; });
    setOtpCode(newOtp);
    const focusIndex = Math.min(data.length, 5);
    inputRefs.current[focusIndex].focus();
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
              {step === "form" ? "Create your account" : "Verify Phone Number"}
            </h1>
            <p className="text-sm text-bg/60 mt-1 text-center">
              {step === "form"
                ? "Join Lucky Couture for tailoring & shop access"
                : `We've sent a 6-digit verification code to ${fullPhone}`}
            </p>
          </div>

          {step === "form" && (
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
          )}

          <AnimatePresence mode="wait">
            {step === "form" ? (
              <motion.form
                key="step-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSubmitForm}
                className="px-8 pb-8 flex flex-col gap-4"
              >
                {/* Google OAuth Button */}
                <button
                  type="button"
                  onClick={() => loginWithGoogle()}
                  className="w-full bg-bg/10 hover:bg-bg/20 text-bg border border-bg/20 rounded-full py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-3 shadow-sm mb-1"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"/>
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
                  </svg>
                  Continue with Google
                </button>

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

                {/* Name */}
                <div>
                  <label className="block text-xs text-bg/60 mb-1.5">Full name</label>
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

                {/* Email */}
                <div>
                  <label className="block text-xs text-bg/60 mb-1.5">Email</label>
                  <label className="flex items-center gap-2 bg-bg/5 border border-bg/15 rounded-xl px-3.5 py-2.5 focus-within:border-highlight transition-colors cursor-text">
                    <Mail size={15} className="text-bg/50 shrink-0" />
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      className="bg-transparent text-bg placeholder:text-bg/30 text-sm outline-none flex-1 w-full"
                      placeholder="you@example.com"
                    />
                  </label>
                </div>

                {/* Phone — split country code + number */}
                <div>
                  <label className="block text-xs text-bg/60 mb-1.5">
                    Phone <span className="text-bg/40">(verifies via OTP)</span>
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
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d\s]/g, "") })}
                        className="bg-transparent text-bg placeholder:text-bg/30 text-sm outline-none flex-1 w-full"
                        placeholder="98765 43210"
                        maxLength={12}
                      />
                    </label>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs text-bg/60 mb-1.5">Password</label>
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
                  </label>
                  <div className="flex items-center gap-2 mt-2.5 pl-1">
                    <input
                      type="checkbox"
                      id="show-password"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="accent-highlight w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="show-password" className="text-xs text-bg/60 cursor-pointer select-none">
                      Show password
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full bg-highlight text-primary font-semibold py-3.5 rounded-full hover:bg-accent hover:text-white transition-colors shadow-card flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Sending OTP code…
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="step-otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSubmitOtp}
                className="px-8 pb-8 flex flex-col gap-5"
              >
                {/* Info banner */}
                {infoMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-highlight/20 border border-highlight/30 px-4 py-3 text-xs text-highlight text-center"
                  >
                    {infoMsg}
                  </motion.div>
                )}

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

                <div>
                  <label className="block text-xs text-bg/60 mb-2 text-center">Enter 6-Digit OTP Code</label>
                  <div className="flex justify-between items-center gap-2 max-w-[320px] mx-auto" onPaste={handlePasteOtp}>
                    {otpCode.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChangeOtp(e, index)}
                        onKeyDown={(e) => handleKeyDownOtp(e, index)}
                        className="w-11 h-12 bg-bg/5 border border-highlight/40 rounded-xl text-center text-bg font-mono text-xl focus:border-highlight focus:ring-1 focus:ring-highlight outline-none transition-all"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => { setStep("form"); setError(""); setInfoMsg(""); setOtpCode(new Array(6).fill("")); }}
                    className="text-bg/60 hover:text-bg flex items-center gap-1 transition-colors"
                  >
                    <ArrowLeft size={13} /> Change phone
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={timer > 0 || resending}
                    className="text-highlight hover:underline disabled:opacity-50 flex items-center gap-1 transition-colors font-medium"
                  >
                    {resending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.join("").length < 6}
                  className="mt-1 w-full bg-highlight text-primary font-semibold py-3.5 rounded-full hover:bg-accent hover:text-white transition-colors shadow-card flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Verifying & creating account…
                    </>
                  ) : (
                    "Verify OTP & Complete Signup"
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-sm text-bg/60 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-highlight font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
