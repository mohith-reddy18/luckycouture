import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../utils/api";

const AppContext = createContext(null);

// ─── localStorage helpers ──────────────────────────────────────────────────
const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
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

  // ── Fetch measurements when user is loaded ────────────────────────────────
  useEffect(() => {
    if (!user) { setMeasurements([]); return; }
    api.get("/api/users/me/measurements")
      .then((res) => { if (res?.data) setMeasurements(res.data); })
      .catch(() => {});
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
      return { success: true, message: json.message };
    } catch (err) {
      return { success: false, error: err.message || "Failed to send verification code" };
    }
  }, []);

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

  // ── Cart helpers (client-side for now) ───────────────────────────────────
  const addToCart = useCallback((product, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { ...product, qty }];
    });
    notify(`${product.name} added to cart`);
  }, [notify]);

  const removeFromCart = useCallback((id) => setCart((prev) => prev.filter((i) => i.id !== id)), []);
  const updateQty = useCallback((id, qty) =>
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty: Math.max(1, qty) } : i)), []);

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
      if (item && item.id) {
        setWishlist((prev) => {
          if (prev.some((i) => i.id === item.id)) return prev;
          return [...prev, item];
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
    if (!user) {
      savePendingFavorite(product);
      notify("Please sign in to save items to your favorites");
      return false;
    }
    setWishlist((prev) => {
      const exists = prev.find((i) => i.id === product.id);
      if (exists) { notify("Removed from wishlist"); return prev.filter((i) => i.id !== product.id); }
      notify("Added to wishlist");
      return [...prev, product];
    });
    return true;
  }, [user, notify, savePendingFavorite]);

  const isWishlisted = useCallback((id) => wishlist.some((i) => i.id === id), [wishlist]);

  // ── Derived values ────────────────────────────────────────────────────────
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.qty * i.price, 0), [cart]);

  // ── Context value ─────────────────────────────────────────────────────────
  const value = {
    // auth
    user, authLoading, login, signup, logout, googleAuth, sendForgotPasswordOtp, resetPasswordWithOtp,
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
