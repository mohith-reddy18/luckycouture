import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../utils/api";

const AppContext = createContext(null);

// ─── localStorage helpers ──────────────────────────────────────────────────
const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

// ─── Provider ─────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  // Cart & wishlist are kept in localStorage (client-side) until we wire
  // those endpoints too — only auth is going live in this iteration.
  const [cart, setCart]       = useState(() => load("lc_cart", []));
  const [wishlist, setWishlist] = useState(() => load("lc_wishlist", []));
  const [user, setUser]       = useState(null);   // populated from API
  const [toast, setToast]     = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // true while /api/auth/me is in-flight
  const [newSignup, setNewSignup] = useState(false); // true immediately after signup — used to trigger onboarding
  const [measurements, setMeasurements] = useState([]); // cached measurement profiles

  // Persist cart & wishlist locally
  useEffect(() => localStorage.setItem("lc_cart",     JSON.stringify(cart)),     [cart]);
  useEffect(() => localStorage.setItem("lc_wishlist", JSON.stringify(wishlist)), [wishlist]);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(notify._t);
    notify._t = window.setTimeout(() => setToast(null), 2800);
  }, []);

  // ── Session restore on page load ──────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        const token = api.getToken();
        // If no token in localStorage and no indication of cookie session, skip network call
        if (!token && !document.cookie.includes("token")) {
          setUser(null);
          setAuthLoading(false);
          return;
        }

        const json = await api.get("/api/auth/me");
        if (json?.data) {
          setUser(json.data);
          if (Array.isArray(json.data.measurementProfiles)) {
            setMeasurements(json.data.measurementProfiles);
          }
          if (json?.token) api.saveToken(json.token);
        } else {
          setUser(null);
        }
      } catch {
        api.saveToken(null);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    restore();
  }, []);

  // ── Sync measurements from user state ─────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setMeasurements([]);
      return;
    }
    if (Array.isArray(user.measurementProfiles)) {
      setMeasurements(user.measurementProfiles);
    }
  }, [user]);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const login = useCallback(async (email, password) => {
    try {
      const json = await api.post("/api/auth/login", { email, password });
      setUser(json.data);
      notify("Welcome back!");
      return { error: null, user: json.data };
    } catch (err) {
      return { error: err.message || "Login failed — please try again", user: null };
    }
  }, [notify]);

  const signup = useCallback(async (name, phone, password) => {
    try {
      const json = await api.post("/api/auth/register", { name, phone, password });
      if (json?.token) api.saveToken(json.token);
      setUser(json.data);
      setNewSignup(true); // triggers onboarding modal
      notify("Account created — welcome to Lucky Couture! 🎉");
      return { error: null, user: json.data };
    } catch (err) {
      return { error: err.message || "Signup failed — please try again", user: null };
    }
  }, [notify]);

  const googleAuth = useCallback(async (payload, legacyProfile) => {
    try {
      const body = typeof payload === "object" && payload !== null
        ? payload
        : { access_token: payload, credential: payload, profile: legacyProfile };
      const json = await api.post("/api/auth/google", body);
      if (json?.token) api.saveToken(json.token);
      setUser(json.data);
      if (json.isNewUser) setNewSignup(true);
      notify("Welcome to Lucky Couture! 🎉");
      return { error: null, user: json.data };
    } catch (err) {
      return { error: err.message || "Google login failed — please try again", user: null };
    }
  }, [notify]);

  const logout = useCallback(async () => {
    try { await api.post("/api/auth/logout"); } catch { /* ignore */ }
    api.saveToken(null);
    setUser(null);
    setMeasurements([]);
    setNewSignup(false);
    notify("Signed out");
  }, [notify]);

  const sendForgotPasswordOtp = useCallback(async (phone) => {
    try {
      const json = await api.post("/api/auth/forgot-password-otp", { phone });
      return { success: true, message: json.message, maskedPhone: json.data?.maskedPhone };
    } catch (err) {
      return { success: false, error: err.message || "Failed to send verification code" };
    }
  }, []);

  const verifyPasswordResetOtp = useCallback(async (phone, otp) => {
    try {
      const json = await api.post("/api/auth/verify-password-reset-otp", { phone, otp });
      return { success: true, resetToken: json.data?.resetToken };
    } catch (err) {
      return { success: false, error: err.message || "Invalid or expired verification code" };
    }
  }, []);

  const resetPasswordWithToken = useCallback(async (resetToken, newPassword) => {
    try {
      const json = await api.post("/api/auth/reset-password-otp", { resetToken, newPassword });
      if (json?.token) api.saveToken(json.token);
      if (json?.data) setUser(json.data);
      notify("Password reset successfully! 🎉");
      return { success: true, user: json.data };
    } catch (err) {
      return { success: false, error: err.message || "Failed to reset password" };
    }
  }, [notify]);

  const resetPasswordWithOtp = useCallback(async (phone, otp, newPassword) => {
    try {
      const json = await api.post("/api/auth/reset-password-otp", { phone, otp, newPassword });
      if (json?.token) api.saveToken(json.token);
      if (json?.data) setUser(json.data);
      notify("Password reset successfully! 🎉");
      return { success: true, user: json.data };
    } catch (err) {
      return { success: false, error: err.message || "Failed to reset password" };
    }
  }, [notify]);

  // ── Profile update ────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (data) => {
    try {
      const json = await api.patch("/api/users/me", data);
      setUser(json.data);
      notify("Profile updated");
      return null;
    } catch (err) {
      return err.message || "Could not update profile";
    }
  }, [notify]);

  // ── Address actions ───────────────────────────────────────────────────────
  const addAddress = useCallback(async (address) => {
    try {
      const json = await api.post("/api/users/me/addresses", address);
      setUser((prev) => (prev ? { ...prev, addresses: json.data } : prev));
      notify("Address saved");
      return null;
    } catch (err) {
      return err.message || "Could not save address — please try again";
    }
  }, [notify]);

  const updateAddress = useCallback(async (addressId, address) => {
    try {
      const json = await api.patch(`/api/users/me/addresses/${addressId}`, address);
      setUser((prev) => (prev ? { ...prev, addresses: json.data } : prev));
      notify("Address updated");
      return null;
    } catch (err) {
      return err.message || "Could not update address";
    }
  }, [notify]);

  const deleteAddress = useCallback(async (addressId) => {
    try {
      const json = await api.delete(`/api/users/me/addresses/${addressId}`);
      setUser((prev) => (prev ? { ...prev, addresses: json.data } : prev));
      notify("Address removed");
      return null;
    } catch (err) {
      return err.message || "Could not remove address";
    }
  }, [notify]);

  // ── Measurement profile actions ───────────────────────────────────────────
  const saveMeasurement = useCallback(async (data) => {
    try {
      const json = await api.post("/api/users/me/measurements", data);
      setMeasurements(json.data);
      notify("Measurements saved");
      return null;
    } catch (err) {
      return err.message || "Could not save measurements";
    }
  }, [notify]);

  const updateMeasurement = useCallback(async (profileId, data) => {
    try {
      const json = await api.patch(`/api/users/me/measurements/${profileId}`, data);
      setMeasurements(json.data);
      notify("Measurements updated");
      return null;
    } catch (err) {
      return err.message || "Could not update measurements";
    }
  }, [notify]);

  const deleteMeasurement = useCallback(async (profileId) => {
    try {
      const json = await api.delete(`/api/users/me/measurements/${profileId}`);
      setMeasurements(json.data);
      notify("Measurement profile deleted");
      return null;
    } catch (err) {
      return err.message || "Could not delete measurement profile";
    }
  }, [notify]);

  // ── Cart helpers ─────────────────────────────────────────────────────────
  const addToCart = useCallback((product, qty = 1) => {
    if (!product) return;
    const baseId = product._id || product.id;
    const itemKey = `${baseId}_${product.color || ""}_${product.size || ""}`;

    setCart((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const existingIdx = list.findIndex(
        (i) =>
          i.itemKey === itemKey ||
          ((i._id || i.id) === baseId && (i.color || "") === (product.color || "") && (i.size || "") === (product.size || ""))
      );

      const maxLimit = product.maxStock !== undefined ? Number(product.maxStock) : (Number(product.stock) || 99);

      if (existingIdx >= 0) {
        return list.map((item, idx) => {
          if (idx === existingIdx) {
            const nextQty = Math.min(maxLimit, (Number(item.qty) || 1) + qty);
            return { ...item, ...product, itemKey, qty: nextQty };
          }
          return item;
        });
      }
      return [...list, { ...product, itemKey, id: baseId, _id: baseId, qty: Math.min(maxLimit, qty) }];
    });
    notify(`${product.name || "Item"} added to cart`);
  }, [notify]);

  const removeFromCart = useCallback((keyOrId) => {
    setCart((prev) =>
      Array.isArray(prev)
        ? prev.filter((i) => i.itemKey !== keyOrId && (i._id || i.id) !== keyOrId)
        : []
    );
  }, []);

  const updateQty = useCallback((keyOrId, qty) => {
    setCart((prev) =>
      Array.isArray(prev)
        ? prev.map((i) => {
            if (i.itemKey === keyOrId || (i._id || i.id) === keyOrId) {
              const maxLimit = i.maxStock !== undefined ? Number(i.maxStock) : (Number(i.stock) || 99);
              return { ...i, qty: Math.min(maxLimit, Math.max(1, qty)) };
            }
            return i;
          })
        : []
    );
  }, []);

  // ── Pending Favorite web storage helpers ─────────────────────────────────
  const savePendingFavorite = useCallback((product) => {
    try {
      localStorage.setItem("lc_pending_favorite", JSON.stringify(product));
    } catch {
      /* ignore */
    }
  }, []);

  const applyPendingFavorite = useCallback(() => {
    try {
      const raw = localStorage.getItem("lc_pending_favorite");
      if (!raw) return;
      const item = JSON.parse(raw);
      if (item && (item.id || item._id)) {
        const targetId = item.id || item._id;
        setWishlist((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((i) => (i.id || i._id) === targetId)) return list;
          return [...list, item];
        });
        notify(`Added "${item.name || item.title || "Item"}" to your favorites! ❤️`);
      }
    } catch {
      /* ignore */
    } finally {
      localStorage.removeItem("lc_pending_favorite");
    }
  }, [notify]);

  // Automatically apply pending favorite after login/signup onboarding finishes
  useEffect(() => {
    if (user && !newSignup) {
      applyPendingFavorite();
    }
  }, [user, newSignup, applyPendingFavorite]);

  // ── Wishlist helpers (client-side for now) ───────────────────────────────
  const toggleWishlist = useCallback((product) => {
    if (!product) return false;
    const targetId = product._id || product.id;
    if (!user) {
      savePendingFavorite(product);
      notify("Please sign in to save items to your favorites");
      return false;
    }
    setWishlist((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const exists = list.find((i) => (i._id || i.id) === targetId);
      if (exists) {
        notify("Removed from wishlist");
        return list.filter((i) => (i._id || i.id) !== targetId);
      }
      notify("Added to wishlist");
      return [...list, product];
    });
    return true;
  }, [user, notify, savePendingFavorite]);

  const isWishlisted = useCallback(
    (id) => (Array.isArray(wishlist) ? wishlist.some((i) => (i._id || i.id) === id) : false),
    [wishlist]
  );

  // ── Derived values ────────────────────────────────────────────────────────
  const cartCount = useMemo(
    () => (Array.isArray(cart) ? cart.reduce((s, i) => s + (Number(i?.qty) || 1), 0) : 0),
    [cart]
  );
  const cartTotal = useMemo(
    () =>
      Array.isArray(cart)
        ? cart.reduce((s, i) => s + (Number(i?.qty) || 1) * (Number(i?.price) || 0), 0)
        : 0,
    [cart]
  );

  // ── Context value ─────────────────────────────────────────────────────────
  const value = {
    // auth
    user, authLoading, login, signup, logout, googleAuth, sendForgotPasswordOtp, verifyPasswordResetOtp, resetPasswordWithToken, resetPasswordWithOtp,
    // profile
    updateProfile, newSignup, setNewSignup,
    // addresses
    addAddress, updateAddress, deleteAddress,
    // measurements
    measurements, saveMeasurement, updateMeasurement, deleteMeasurement,
    // cart
    cart, setCart, addToCart, removeFromCart, updateQty, cartCount, cartTotal,
    // wishlist
    wishlist, toggleWishlist, isWishlisted, savePendingFavorite,
    // toast
    toast, notify,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
