import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, Eye, EyeOff, Loader2, Info } from "lucide-react";
import GoogleLoginButton from "../components/GoogleLoginButton";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import logo from "../assets/logo.jpg";
import { useApp } from "../context/AppContext";

export default function Login() {
  const { login, googleAuth } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [show, setShow]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);

  const redirectAfterAuth = (loggedInUser) => {
    if (loggedInUser?.role === "admin" && !location.state?.from) {
      navigate("/admin", { replace: true });
    } else {
      const from = location.state?.from || "/";
      const intendedState = location.state?.intendedState;
      navigate(from, { state: intendedState, replace: true });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: errMsg, user: loggedInUser } = await login(email, password);

    setLoading(false);
    if (errMsg) {
      setError(errMsg);
    } else {
      redirectAfterAuth(loggedInUser);
    }
  };

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
            <h1 className="font-display text-2xl font-semibold text-bg">Welcome back</h1>
            <p className="text-sm text-bg/60 mt-1">Log in to Lucky Couture</p>
          </div>

          {location.state?.from === "/tailoring" && (
            <div className="bg-highlight/30 border-b border-accent/20 px-6 py-2.5 text-xs text-primary flex items-center gap-2 justify-center font-medium">
              <Info size={14} className="text-accent shrink-0" />
              Please sign in or create an account to book your tailoring order.
            </div>
          )}

          <form onSubmit={submit} className="p-8">
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

            {/* Email */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-secondary mb-1.5 tracking-wide uppercase">Email or Phone</label>
              <label className="flex items-center gap-2 bg-bg border border-primary/12 rounded-xl px-3.5 py-3 focus-within:border-accent transition-colors cursor-text">
                <Mail size={16} className="text-secondary shrink-0" />
                <input
                  required
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com or +91..."
                  className="bg-transparent text-ink placeholder:text-ink/30 text-sm outline-none flex-1 w-full"
                />
              </label>
            </div>

            {/* Password */}
            <div className="mb-2">
              <label className="block text-xs font-medium text-secondary mb-1.5 tracking-wide uppercase">Password</label>
              <label className="flex items-center gap-2 bg-bg border border-primary/12 rounded-xl px-3.5 py-3 focus-within:border-accent transition-colors cursor-text">
                <Lock size={16} className="text-secondary shrink-0" />
                <input
                  required
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent text-ink placeholder:text-ink/30 text-sm outline-none flex-1 w-full"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="text-ink/35 cursor-pointer z-10"
                  aria-label="Toggle password visibility"
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </label>
            </div>

            <div className="flex justify-end mb-6">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-accent hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-bg font-semibold py-3.5 rounded-full hover:bg-primary/90 transition-colors shadow-card flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Logging in…
                </>
              ) : (
                "Log In"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink/60 mt-6">
          New to Lucky Couture?{" "}
          <Link to="/signup" state={location.state} className="text-accent font-semibold hover:underline">
            Create an account
          </Link>
        </p>

        {/* Forgot Password OTP Modal */}
        <ForgotPasswordModal
          isOpen={showForgotModal}
          onClose={() => setShowForgotModal(false)}
          onSuccess={(loggedInUser) => redirectAfterAuth(loggedInUser)}
        />
      </motion.div>
    </div>
  );
}
