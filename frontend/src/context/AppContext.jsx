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
  // If a JWT is stored (from a previous login) we verify it with the backend
  // and restore the user object. This keeps the user "logged in" across
  // browser refreshes without storing sensitive data in localStorage.
  useEffect(() => {
    const restore = async () => {
      if (!api.getToken()) { setAuthLoading(false); return; }
      try {
        const json = await api.get("/api/auth/me");
        if (json?.data) setUser(json.data);
      } catch {
        // Token is stale / expired — clear it silently
        api.saveToken(null);
      } finally {
        setAuthLoading(false);
      }
    };
    restore();
  }, []);

  // ── Auth actions ──────────────────────────────────────────────────────────

  /**
   * Log in with email + password. Hits POST /api/auth/login.
   * Returns null on success, or an error message string on failure.
   */
  const login = useCallback(async (email, password) => {
    try {
      const json = await api.post("/api/auth/login", { email, password });
      setUser(json.data);
      notify("Welcome back!");
      return null; // success
    } catch (err) {
      return err.message || "Login failed — please try again";
    }
  }, [notify]);

  /**
   * Register a new account. Hits POST /api/auth/register.
   * Returns null on success, or an error message string on failure.
   */
  const signup = useCallback(async (name, email, phone, password) => {
    try {
      const json = await api.post("/api/auth/register", { name, email, phone, password });
      setUser(json.data);
      notify("Account created — welcome to Lucky Couture! 🎉");
      return null; // success
    } catch (err) {
      return err.message || "Signup failed — please try again";
    }
  }, [notify]);

  /**
   * Log out. Hits POST /api/auth/logout to clear the httpOnly cookie,
   * then wipes the local token and user state.
   */
  const logout = useCallback(async () => {
    try { await api.post("/api/auth/logout"); } catch { /* ignore */ }
    api.saveToken(null);
    setUser(null);
    notify("Signed out");
  }, [notify]);

  /**
   * Saves a new delivery address to the logged-in user's account.
   * Hits POST /api/users/me/addresses. Returns null on success, or an
   * error message string on failure. Updates `user.addresses` in place
   * from the server's response so callers don't need to re-fetch /me.
   */
  const addAddress = useCallback(async (address) => {
    try {
      const json = await api.post("/api/users/me/addresses", address);
      setUser((prev) => (prev ? { ...prev, addresses: json.data } : prev));
      notify("Address saved");
      return null; // success
    } catch (err) {
      return err.message || "Could not save address — please try again";
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

  // ── Wishlist helpers (client-side for now) ───────────────────────────────
  const toggleWishlist = useCallback((product) => {
    setWishlist((prev) => {
      const exists = prev.find((i) => i.id === product.id);
      if (exists) { notify("Removed from wishlist"); return prev.filter((i) => i.id !== product.id); }
      notify("Added to wishlist");
      return [...prev, product];
    });
  }, [notify]);

  const isWishlisted = useCallback((id) => wishlist.some((i) => i.id === id), [wishlist]);

  // ── Derived values ────────────────────────────────────────────────────────
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.qty * i.price, 0), [cart]);

  // ── Context value ─────────────────────────────────────────────────────────
  const value = {
    // auth
    user, authLoading, login, signup, logout, addAddress,
    // cart
    cart, addToCart, removeFromCart, updateQty, cartCount, cartTotal,
    // wishlist
    wishlist, toggleWishlist, isWishlisted,
    // toast
    toast, notify,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
