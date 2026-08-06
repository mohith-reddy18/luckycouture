import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Mail, Lock, Phone, Check, Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import logo from "../assets/logo.jpg";

const perks = [
  "4 curated stitching slots reserved daily",
  "Early access to seasonal collections",
  "Track orders & book fittings in one place",
];

export default function Signup() {
  const { signup } = useApp();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic client-side password length guard (backend enforces it too)
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const errMsg = await signup(form.name, form.email, form.phone, form.password);
    setLoading(false);

    if (errMsg) {
      setError(errMsg);
    } else {
      navigate("/");
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
            <h1 className="font-display text-2xl font-semibold text-bg">Create your account</h1>
            <p className="text-sm text-bg/60 mt-1 text-center">Join Lucky Couture for tailoring &amp; shop access</p>
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

          <form onSubmit={submit} className="px-8 pb-8 flex flex-col gap-4">
            {/* Error banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-red-900/20 border border-red-500/30 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </motion.div>
            )}

            {/* Name */}
            <div>
              <label className="block text-xs text-bg/60 mb-1.5">Full name</label>
              <div className="flex items-center gap-2 bg-bg/5 border border-bg/15 rounded-xl px-3.5 py-2.5 focus-within:border-highlight transition-colors">
                <User size={15} className="text-bg/50 shrink-0" />
                <input
                  required
                  value={form.name}
                  onChange={set("name")}
                  className="bg-transparent text-bg placeholder:text-bg/30 text-sm outline-none w-full"
                  placeholder="Ananya Rao"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs text-bg/60 mb-1.5">Email</label>
              <div className="flex items-center gap-2 bg-bg/5 border border-bg/15 rounded-xl px-3.5 py-2.5 focus-within:border-highlight transition-colors">
                <Mail size={15} className="text-bg/50 shrink-0" />
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  className="bg-transparent text-bg placeholder:text-bg/30 text-sm outline-none w-full"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs text-bg/60 mb-1.5">Phone</label>
              <div className="flex items-center gap-2 bg-bg/5 border border-bg/15 rounded-xl px-3.5 py-2.5 focus-within:border-highlight transition-colors">
                <Phone size={15} className="text-bg/50 shrink-0" />
                <input
                  value={form.phone}
                  onChange={set("phone")}
                  className="bg-transparent text-bg placeholder:text-bg/30 text-sm outline-none w-full"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-bg/60 mb-1.5">Password</label>
              <div className="flex items-center gap-2 bg-bg/5 border border-bg/15 rounded-xl px-3.5 py-2.5 focus-within:border-highlight transition-colors">
                <Lock size={15} className="text-bg/50 shrink-0" />
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  className="bg-transparent text-bg placeholder:text-bg/30 text-sm outline-none w-full"
                  placeholder="Min. 8 characters"
                />
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
          <Link to="/login" className="text-highlight font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
