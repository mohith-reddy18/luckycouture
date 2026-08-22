import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  ChevronLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import SEO from "../components/SEO";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm text-ink bg-white transition-colors";
const labelCls = "block text-xs font-semibold text-primary mb-1";

export default function ProfileChangePassword() {
  const { user, authLoading, changePassword, notify } = useApp();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isGoogleUser = Boolean(user?.googleId || user?.authProvider === "google");

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
        <p className="text-ink/60 mb-8">Please log in to change your password.</p>
        <button
          onClick={() => navigate("/login")}
          className="bg-primary text-bg px-7 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Go to Login
        </button>
      </div>
    );
  }

  // Google OAuth accounts without a password
  if (isGoogleUser && !user.hasPassword) {
    return (
      <div className="max-w-xl mx-auto px-5 md:px-8 py-10 md:py-16">
        <SEO
          title="Change Password | Lucky Couture"
          canonical="/profile/change-password"
          robots="noindex, nofollow"
        />
        <div className="mb-6">
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-primary transition-colors"
          >
            <ChevronLeft size={16} /> Back to Profile
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6 md:p-8 border border-primary/10 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={28} className="text-accent" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-primary mb-2">Google Account</h1>
          <p className="text-sm text-ink/70 max-w-md mx-auto mb-6">
            Your account is authenticated securely using Google Sign-In. Password changes and security settings are managed directly through your Google account.
          </p>
          <button
            onClick={() => navigate("/profile")}
            className="bg-primary text-bg px-7 py-3 rounded-full text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Return to Profile
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!currentPassword) {
      setError("Please enter your current password");
      return;
    }
    if (!newPassword) {
      setError("Please enter a new password");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match. Please re-enter.");
      return;
    }

    setSaving(true);
    const err = await changePassword({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setSaving(false);

    if (err) {
      setError(err);
    } else {
      navigate("/profile");
    }
  };

  return (
    <div className="max-w-xl mx-auto px-5 md:px-8 py-10 md:py-16">
      <SEO
        title="Change Password | Lucky Couture"
        canonical="/profile/change-password"
        robots="noindex, nofollow"
      />

      {/* Breadcrumb back link */}
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
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Lock size={22} className="text-accent" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-primary">Change Password</h1>
            <p className="text-xs text-ink/60 mt-0.5">
              Enter your current password and choose a strong new password.
            </p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 font-medium bg-red-50 p-3 rounded-xl border border-red-200 mb-6">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* 1. Current Password */}
          <div>
            <label className={labelCls}>
              Current Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                required
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setError("");
                }}
                placeholder="Enter your current password"
                className={`${inputCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-primary transition-colors p-1 cursor-pointer"
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError("");
                }}
                placeholder="At least 8 characters"
                className={`${inputCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-primary transition-colors p-1 cursor-pointer"
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span className="text-[11px] text-ink/45 mt-1 block">
              Must be at least 8 characters long for account security.
            </span>
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
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                placeholder="Re-enter new password"
                className={`${inputCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-primary transition-colors p-1 cursor-pointer"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
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
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
              {saving ? "Updating Password…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
