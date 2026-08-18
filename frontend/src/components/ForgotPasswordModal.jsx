import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Phone, Lock, ChevronDown, Check, Loader2, ArrowLeft, RefreshCw, Eye, EyeOff, KeyRound } from "lucide-react";
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

export default function ForgotPasswordModal({ isOpen, onClose, onSuccess }) {
  const { sendForgotPasswordOtp, resetPasswordWithOtp } = useApp();

  const [step, setStep] = useState(1); // 1 = phone, 2 = otp + new password
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [otpCode, setOtpCode] = useState(new Array(6).fill(""));
  const inputRefs = useRef([]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const fullPhone = phone ? `${countryCode.code} ${phone.trim()}` : "";

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPhone("");
      setOtpCode(new Array(6).fill(""));
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setInfoMsg("");
    }
  }, [isOpen]);

  // Resend OTP countdown timer
  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  if (!isOpen) return null;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");

    const phoneCheck = validatePhoneNumber(fullPhone);
    if (!phoneCheck.isValid) {
      setError(phoneCheck.error || "Please enter a valid phone number");
      return;
    }

    setLoading(true);
    const result = await sendForgotPasswordOtp(fullPhone);
    setLoading(false);

    if (result.success) {
      setStep(2);
      setTimer(30);
      setInfoMsg(`We've sent a 6-digit verification code to ${fullPhone}`);
    } else {
      setError(result.error);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0 || resending) return;
    setError("");
    setResending(true);

    const result = await sendForgotPasswordOtp(fullPhone);
    setResending(false);

    if (result.success) {
      setTimer(30);
      setInfoMsg("A new verification code has been sent!");
    } else {
      setError(result.error);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");

    const finalOtp = otpCode.join("");
    if (finalOtp.length < 6) {
      setError("Please enter the complete 6-digit verification code");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const result = await resetPasswordWithOtp(fullPhone, finalOtp, newPassword);
    setLoading(false);

    if (result.success) {
      if (onSuccess) onSuccess(result.user);
      onClose();
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
    if (inputRefs.current[focusIndex]) inputRefs.current[focusIndex].focus();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-primary/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-soft overflow-hidden my-8 flex flex-col z-10 border border-primary/10 max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-primary px-6 py-6 text-center text-bg flex flex-col items-center relative shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-bg/60 hover:text-bg transition-colors p-1 rounded-full"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
            <span className="w-12 h-12 rounded-full bg-highlight/20 flex items-center justify-center text-highlight mb-2">
              <KeyRound size={22} />
            </span>
            <h2 className="font-display text-xl font-semibold text-bg">
              {step === 1 ? "Reset Password" : "Enter Verification Code"}
            </h2>
            <p className="text-xs text-bg/70 mt-1 max-w-xs">
              {step === 1
                ? "Enter your registered phone number to receive a verification OTP."
                : `Enter the 6-digit OTP code sent to ${fullPhone} and set a new password.`}
            </p>
          </div>

          <div className="p-6 overflow-y-auto flex flex-col gap-4">
            {infoMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-highlight/20 border border-highlight/30 px-4 py-2.5 text-xs text-highlight text-center font-medium"
              >
                {infoMsg}
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-700"
              >
                {error}
              </motion.div>
            )}

            {step === 1 ? (
              <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                {/* Phone Number Input */}
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5 uppercase tracking-wide">
                    Registered Phone Number
                  </label>
                  <div className="flex gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCodeDropdown((p) => !p)}
                        className="flex items-center gap-1.5 bg-bg border border-primary/12 rounded-xl px-3 py-2.5 text-ink text-sm whitespace-nowrap focus:border-accent outline-none transition-colors"
                      >
                        <span>{countryCode.flag}</span>
                        <span>{countryCode.code}</span>
                        <ChevronDown size={13} className="text-secondary" />
                      </button>
                      {showCodeDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-primary/15 rounded-xl shadow-soft z-50 max-h-52 overflow-y-auto">
                          {COUNTRY_CODES.map((c) => (
                            <button
                              key={`${c.flag}${c.code}`}
                              type="button"
                              onClick={() => {
                                setCountryCode(c);
                                setShowCodeDropdown(false);
                              }}
                              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-ink hover:bg-bg transition-colors text-left"
                            >
                              <span>{c.flag}</span>
                              <span className="font-mono text-xs text-secondary">{c.code}</span>
                              <span>{c.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <label className="flex-1 flex items-center gap-2 bg-bg border border-primary/12 rounded-xl px-3.5 py-2.5 focus-within:border-accent transition-colors cursor-text">
                      <Phone size={15} className="text-secondary shrink-0" />
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

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full bg-primary text-bg font-semibold py-3.5 rounded-full hover:bg-primary/90 transition-colors shadow-card flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending OTP…
                    </>
                  ) : (
                    "Send Verification Code"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                {/* 6-Digit OTP */}
                <div>
                  <label className="block text-xs font-medium text-secondary mb-2 text-center uppercase tracking-wide">
                    Enter 6-Digit OTP Code
                  </label>
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
                        className="w-11 h-12 bg-bg border border-primary/20 rounded-xl text-center text-primary font-mono text-xl focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs px-1">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(""); setInfoMsg(""); setOtpCode(new Array(6).fill("")); }}
                    className="text-secondary hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <ArrowLeft size={13} /> Change phone
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={timer > 0 || resending}
                    className="text-accent hover:underline disabled:opacity-50 flex items-center gap-1 transition-colors font-medium"
                  >
                    {resending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
                  </button>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5 uppercase tracking-wide">
                    New Password
                  </label>
                  <label className="flex items-center gap-2 bg-bg border border-primary/12 rounded-xl px-3.5 py-2.5 focus-within:border-accent transition-colors cursor-text">
                    <Lock size={15} className="text-secondary shrink-0" />
                    <input
                      required
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="bg-transparent text-ink placeholder:text-ink/30 text-sm outline-none flex-1 w-full"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((s) => !s)}
                      className="text-secondary hover:text-primary cursor-pointer z-10"
                      aria-label="Toggle password visibility"
                    >
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </label>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5 uppercase tracking-wide">
                    Confirm New Password
                  </label>
                  <label className="flex items-center gap-2 bg-bg border border-primary/12 rounded-xl px-3.5 py-2.5 focus-within:border-accent transition-colors cursor-text">
                    <Lock size={15} className="text-secondary shrink-0" />
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
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.join("").length < 6}
                  className="mt-2 w-full bg-primary text-bg font-semibold py-3.5 rounded-full hover:bg-primary/90 transition-colors shadow-card flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Resetting password…
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Reset Password &amp; Log In
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
