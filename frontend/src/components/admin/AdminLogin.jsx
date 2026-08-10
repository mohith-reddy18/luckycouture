import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { useApp } from "../../context/AppContext";
import logo from "../../assets/logo.jpg";

export default function AdminLogin({ onAuthenticated }) {
  const { login, logout, notify } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: errMsg, user: loggedInUser } = await login(email, password);
    setLoading(false);

    if (errMsg) {
      setError(errMsg);
    } else if (loggedInUser?.role !== "admin") {
      setError("This account does not have administrator access.");
    } else {
      notify("Admin credentials authenticated");
      if (onAuthenticated) onAuthenticated();
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-primary bg-[radial-gradient(circle_at_20%_20%,rgba(237,217,163,0.12),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(193,121,31,0.15),transparent_40%)] rounded-3xl my-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="rounded-3xl overflow-hidden shadow-soft border border-highlight/20 glass-dark p-8 md:p-10 text-bg">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4">
              <span className="w-16 h-16 rounded-full ring-2 ring-highlight/60 overflow-hidden block shadow-md">
                <img src={logo} alt="Lucky Couture logo" className="w-full h-full object-cover" />
              </span>
              <span className="absolute -bottom-1 -right-1 bg-accent text-white p-1 rounded-full shadow-sm">
                <ShieldCheck size={14} />
              </span>
            </div>
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-highlight mb-1">
              Management Portal
            </span>
            <h1 className="font-display text-2xl font-semibold text-bg">
              Admin Authentication
            </h1>
            <p className="text-xs text-bg/65 mt-1.5 max-w-xs">
              Sign in with your Lucky Couture administrator account credentials.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-xl bg-red-900/40 border border-red-500/50 p-3.5 text-xs text-red-200 text-center leading-relaxed"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-bg/70 mb-1.5 font-medium">
                Admin Email
              </label>
              <label className="flex items-center gap-2.5 bg-bg/5 border border-bg/15 rounded-xl px-4 py-3 focus-within:border-highlight transition-colors cursor-text">
                <Mail size={16} className="text-bg/50 shrink-0" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent text-bg placeholder:text-bg/30 text-sm outline-none flex-1 w-full"
                  placeholder="admin@luckycouture.com"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs text-bg/70 mb-1.5 font-medium">
                Password
              </label>
              <label className="flex items-center gap-2.5 bg-bg/5 border border-bg/15 rounded-xl px-4 py-3 focus-within:border-highlight transition-colors cursor-text">
                <Lock size={16} className="text-bg/50 shrink-0" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent text-bg placeholder:text-bg/30 text-sm outline-none flex-1 w-full"
                  placeholder="••••••••••••"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full bg-highlight text-primary font-semibold py-3.5 rounded-full hover:bg-accent hover:text-white transition-colors shadow-card flex items-center justify-center gap-2 disabled:opacity-60 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Authenticating…
                </>
              ) : (
                <>
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-center text-bg/40 mt-6 pt-4 border-t border-bg/10">
            Protected area · Authorized personnel only
          </p>
        </div>
      </motion.div>
    </div>
  );
}
