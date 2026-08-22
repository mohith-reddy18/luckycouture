import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Loader2,
  MapPin,
  MessageCircle,
  Check,
  AlertCircle,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import SectionHeading from "../components/SectionHeading";
import StarDivider from "../components/StarDivider";
import { contactInfo } from "../data/mockData";
import api from "../utils/api";
import getImageUrl from "../utils/imageUrl";
import { resolvePrimaryAddress } from "../utils/addressUtils";
import { lookupIndianPincode, isValidPincodeFormat, formatDisplayAddress } from "../utils/addressValidator";
import SEO from "../components/SEO";

export default function Cart() {
  const { cart, updateQty, removeFromCart, cartTotal, notify, user, setCart } = useApp();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const safeCart = Array.isArray(cart) ? cart.filter(Boolean) : [];

  // Delivery selection state
  const [needsDelivery, setNeedsDelivery] = useState(true);

  // Address state prefilled strictly from primary/default address if available
  const defaultAddr = resolvePrimaryAddress(user?.addresses);
  const [address, setAddress] = useState({
    country: "India",
    line1: defaultAddr?.line1 || "",
    line2: defaultAddr?.line2 || "",
    locality: defaultAddr?.locality || "",
    city: defaultAddr?.city || "",
    state: defaultAddr?.state || "",
    pincode: defaultAddr?.pincode || "",
    phone: user?.phone || "",
  });

  const [pinStatus, setPinStatus] = useState(defaultAddr?.pincode ? "valid" : "idle");
  const [pinError, setPinError] = useState("");
  const [localities, setLocalities] = useState([]);
  const [showSavedPicker, setShowSavedPicker] = useState(false);
  const debounceTimer = useRef(null);

  useEffect(() => {
    const primary = resolvePrimaryAddress(user?.addresses);
    if (primary) {
      setAddress({
        country: "India",
        line1: primary.line1 || "",
        line2: primary.line2 || "",
        locality: primary.locality || "",
        city: primary.city || "",
        state: primary.state || "",
        pincode: primary.pincode || "",
        phone: user?.phone || "",
      });
      setPinStatus("valid");
      setPinError("");
    }
  }, [user]);

  const handlePincodeChange = (e) => {
    const rawVal = (e.target?.value || "").replace(/\D/g, "").slice(0, 6);
    setAddress((prev) => ({
      ...prev,
      pincode: rawVal,
      city: rawVal.length === 6 ? prev.city : "",
      state: rawVal.length === 6 ? prev.state : "",
    }));

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (rawVal.length < 6) {
      setPinStatus(rawVal.length > 0 ? "typing" : "idle");
      setPinError("");
      setLocalities([]);
      return;
    }

    setPinStatus("loading");
    setPinError("");

    debounceTimer.current = setTimeout(async () => {
      const res = await lookupIndianPincode(rawVal);
      if (res?.valid) {
        setPinStatus("valid");
        setPinError("");
        setAddress((prev) => ({
          ...prev,
          city: res.city || "",
          state: res.state || "",
          locality: prev.locality || (res.localities && res.localities[0]) || "",
        }));
        setLocalities(res.localities || []);
      } else {
        setPinStatus("invalid");
        setPinError(res?.error || "Please enter a valid Indian PIN code.");
        setAddress((prev) => ({ ...prev, city: "", state: "" }));
        setLocalities([]);
      }
    }, 300);
  };

  const selectSavedAddress = (savedAddr) => {
    if (!savedAddr) return;
    setAddress({
      country: "India",
      line1: savedAddr.line1 || "",
      line2: savedAddr.line2 || "",
      locality: savedAddr.locality || "",
      city: savedAddr.city || "",
      state: savedAddr.state || "",
      pincode: savedAddr.pincode || "",
      phone: user?.phone || address.phone || "",
    });
    setPinStatus("valid");
    setPinError("");
    setShowSavedPicker(false);
  };

  if (safeCart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-24 text-center">
        <SEO title="Shopping Cart | Lucky Couture" canonical="/cart" robots="noindex, nofollow" />
        <ShoppingBag size={40} className="mx-auto text-primary/30 mb-5" />
        <h1 className="font-display text-2xl font-semibold text-primary mb-2">Your cart is empty</h1>
        <p className="text-ink/60 mb-8">Explore the shop and add pieces you love.</p>
        <Link to="/shop" className="inline-block bg-primary text-bg px-7 py-3 rounded-full font-medium hover:bg-primary/90">
          Browse Shop
        </Link>
      </div>
    );
  }

  // Delivery calculation logic
  const currentTotal = Number(cartTotal) || 0;
  const trimmedCity = String(address?.city || "").trim().toLowerCase();
  const isGuntur = trimmedCity === "guntur";
  const isLongDistance = Boolean(needsDelivery && trimmedCity && !isGuntur);

  // Local Guntur delivery fee: Free if >= 2999, otherwise 149
  const localShippingFee = currentTotal >= 2999 ? 0 : 149;
  const shippingFee = needsDelivery ? (isGuntur ? localShippingFee : 0) : 0;
  const finalTotal = currentTotal + shippingFee;

  const handleCheckout = async () => {
    if (!user) {
      notify("Please sign in to place an order");
      navigate("/login");
      return;
    }

    if (needsDelivery) {
      const pin = String(address?.pincode || "").trim();
      const city = String(address?.city || "").trim();
      const state = String(address?.state || "").trim();
      const line1 = String(address?.line1 || "").trim();
      const phone = String(address?.phone || "").trim();

      if (!pin || !isValidPincodeFormat(pin) || pinStatus === "invalid") {
        notify("Please enter a valid 6-digit Indian PIN code");
        return;
      }
      if (!city || !state) {
        notify("Please ensure your PIN code is verified with a valid city and state");
        return;
      }
      if (!line1) {
        notify("Please enter your street address / road");
        return;
      }
      if (!phone) {
        notify("Please enter a contact phone number for delivery");
        return;
      }
    }

    if (checking) return;
    setChecking(true);

    const items = safeCart.map((item) => {
      const rawImage =
        item.image ||
        item.thumbnail?.url ||
        item.images?.[0]?.url ||
        (typeof item.thumbnail === "string" ? item.thumbnail : "") ||
        (typeof item.images?.[0] === "string" ? item.images[0] : "") ||
        item.thumbnail ||
        item.images ||
        "";
      return {
        product: item._id || item.id || item.product,
        name: item.name || "Item",
        image: getImageUrl(rawImage) || (typeof item.image === "string" ? item.image : ""),
        price: Number(item.price) || 0,
        quantity: Number(item.qty || item.quantity) || 1,
        size: item.size || "",
        color: item.color || "",
      };
    });

    const shippingAddress = needsDelivery
      ? {
          country: "India",
          line1: String(address?.line1 || "").trim(),
          line2: String(address?.line2 || "").trim(),
          locality: String(address?.locality || "").trim(),
          city: String(address?.city || "").trim(),
          state: String(address?.state || "").trim(),
          pincode: String(address?.pincode || "").trim(),
          phone: String(address?.phone || "").trim(),
        }
      : {};

    try {
      const res = await api.post("/api/orders", {
        items,
        needsDelivery,
        shippingAddress,
        paymentMethod: "cod",
      });
      if (typeof setCart === "function") setCart([]);
      notify("Order placed — thank you! 🎉");
      navigate(`/orders/shopping/${res.data._id}`);
    } catch (err) {
      notify(err.message || "Checkout failed — please try again");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <SEO title="Shopping Cart | Lucky Couture" canonical="/cart" robots="noindex, nofollow" />
      <SectionHeading align="left" eyebrow="Your Bag" title="Shopping Cart" />
      <div className="grid lg:grid-cols-[1fr_360px] gap-10">
        <div className="flex flex-col gap-4">
          {safeCart.map((item, idx) => {
            if (!item) return null;
            const categoryName =
              typeof item.category === "object"
                ? (item.category?.name || "")
                : (typeof item.category === "string" ? item.category : "");
            const rawImage =
              item.image ||
              item.thumbnail?.url ||
              item.images?.[0]?.url ||
              (typeof item.thumbnail === "string" ? item.thumbnail : "") ||
              (typeof item.images?.[0] === "string" ? item.images[0] : "") ||
              item.thumbnail ||
              item.images ||
              "";
            const itemId = item.itemKey || item._id || item.id || `cart-item-${idx}`;
            const imageUrl = getImageUrl(rawImage) || (typeof item.image === "string" ? item.image : "") || "";
            const itemPrice = Number(item.price) || 0;
            const itemQty = Number(item.qty || item.quantity) || 1;
            const itemName = item.name || "Custom Piece";

            const maxStock = (function () {
              if (Array.isArray(item.colorVariants) && item.colorVariants.length > 0 && item.color) {
                const cv = item.colorVariants.find(
                  (v) => (v?.color || "").trim().toLowerCase() === String(item.color).trim().toLowerCase()
                );
                if (cv && Array.isArray(cv.inventory) && cv.inventory.length > 0 && item.size) {
                  const inv = cv.inventory.find(
                    (i) => (i?.size || "").trim().toLowerCase() === String(item.size).trim().toLowerCase()
                  );
                  if (inv && typeof inv.quantity === "number") {
                    return Math.max(0, Number(inv.quantity));
                  }
                }
              }
              if (item.maxStock !== undefined && item.maxStock !== null && !isNaN(Number(item.maxStock))) {
                return Math.max(0, Number(item.maxStock));
              }
              if (item.stock !== undefined && item.stock !== null && !isNaN(Number(item.stock))) {
                return Math.max(0, Number(item.stock));
              }
              return 99;
            })();

            const isAtMaxStock = maxStock > 0 ? itemQty >= maxStock : false;

            return (
              <motion.div
                layout
                key={itemId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4 bg-white rounded-2xl shadow-card p-4"
              >
                <img
                  src={imageUrl}
                  alt={itemName}
                  className="w-24 h-28 object-cover rounded-xl shrink-0 bg-primary/5"
                />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    {categoryName && (
                      <p className="text-[11px] uppercase tracking-wide text-secondary">{categoryName}</p>
                    )}
                    <h3 className="font-display text-base font-medium text-primary">{itemName}</h3>
                    <div className="flex flex-wrap gap-1.5 text-xs text-ink/60 mt-1">
                      {item.color && (
                        <span className="bg-bg px-2 py-0.5 rounded-md border border-primary/10">
                          Color: <strong className="text-primary">{item.color}</strong>
                        </span>
                      )}
                      {item.size && (
                        <span className="bg-bg px-2 py-0.5 rounded-md border border-primary/10">
                          Size: <strong className="text-primary">{item.size}</strong>
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-primary mt-1.5">₹{itemPrice.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3 border border-primary/15 rounded-full px-2 py-1">
                      <button
                        onClick={() => {
                          if (itemQty <= 1) {
                            removeFromCart(itemId);
                            notify("Removed from cart");
                          } else {
                            updateQty(itemId, itemQty - 1);
                          }
                        }}
                        className="w-6 h-6 flex items-center justify-center text-primary cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm w-4 text-center font-medium">{itemQty}</span>
                      <button
                        onClick={() => {
                          if (itemQty >= maxStock) {
                            const variantLabel = [item.color, item.size].filter(Boolean).join(" / ");
                            notify(`Only ${maxStock} ${maxStock === 1 ? "item is" : "items are"} available${variantLabel ? ` in ${variantLabel}` : ""}.`);
                            return;
                          }
                          updateQty(itemId, itemQty + 1);
                        }}
                        disabled={isAtMaxStock}
                        className="w-6 h-6 flex items-center justify-center text-primary cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        removeFromCart(itemId);
                        notify("Removed from cart");
                      }}
                      className="text-ink/40 hover:text-red-500 transition-colors cursor-pointer"
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6 h-fit lg:sticky lg:top-24">
          <h3 className="font-display text-lg font-semibold text-primary mb-5">Order Summary</h3>

          {/* Delivery Selection */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-2">
              Do you need delivery?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNeedsDelivery(false)}
                className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  !needsDelivery
                    ? "bg-primary text-bg border-primary shadow-sm"
                    : "border-primary/15 text-primary hover:border-primary/40"
                }`}
              >
                No (Store Pickup)
              </button>
              <button
                type="button"
                onClick={() => setNeedsDelivery(true)}
                className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  needsDelivery
                    ? "bg-primary text-bg border-primary shadow-sm"
                    : "border-primary/15 text-primary hover:border-primary/40"
                }`}
              >
                Yes (Delivery)
              </button>
            </div>
          </div>

          {/* Delivery Address Details */}
          {needsDelivery ? (
            <div className="mb-5 space-y-3 bg-bg/60 p-4 rounded-2xl border border-primary/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <MapPin size={13} className="text-accent" /> Delivery Address (India)
                </span>
                {user?.addresses?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSavedPicker((s) => !s)}
                    className="text-[11px] text-accent font-medium hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Saved Addresses <ChevronDown size={12} />
                  </button>
                )}
              </div>

              {/* Saved Address Quick Dropdown */}
              {showSavedPicker && user?.addresses?.length > 0 && (
                <div className="bg-white border border-primary/15 rounded-xl p-2 shadow-sm max-h-40 overflow-y-auto space-y-1.5">
                  {user.addresses.map((sa) => (
                    <button
                      key={sa._id}
                      type="button"
                      onClick={() => selectSavedAddress(sa)}
                      className="w-full text-left p-2 rounded-lg hover:bg-bg/80 text-xs text-ink transition-colors cursor-pointer border border-transparent hover:border-primary/10"
                    >
                      <span className="font-semibold text-primary block">
                        {sa.label || "Address"} {sa.isDefault && <span className="text-[10px] text-accent">(Primary)</span>}
                      </span>
                      <span className="text-ink/60 block truncate">{formatDisplayAddress(sa)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Form fields */}
              <div className="flex flex-col gap-2.5">
                {/* 1. Country & PIN Code */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="px-3 py-2 rounded-lg border border-primary/15 bg-primary/5 text-xs text-primary font-medium flex items-center justify-between">
                    <span>🇮🇳 India</span>
                    <span className="text-[10px] text-ink/40">Country</span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="6-Digit PIN Code *"
                      value={address.pincode}
                      onChange={handlePincodeChange}
                      className={`w-full px-3 py-2 rounded-lg border text-xs outline-none font-mono bg-white ${
                        pinStatus === "valid"
                          ? "border-green-400 focus:border-green-500"
                          : pinStatus === "invalid"
                          ? "border-red-400 focus:border-red-500"
                          : "border-primary/15 focus:border-accent"
                      }`}
                    />
                    {pinStatus === "loading" && (
                      <Loader2 size={12} className="animate-spin absolute right-2.5 top-2.5 text-accent" />
                    )}
                    {pinStatus === "valid" && (
                      <Check size={13} className="text-green-600 absolute right-2.5 top-2.5" />
                    )}
                  </div>
                </div>

                {pinError && (
                  <p className="flex items-center gap-1 text-[11px] text-red-600 font-medium">
                    <AlertCircle size={12} className="shrink-0" /> {pinError}
                  </p>
                )}

                {/* 2. City & State (Auto-filled from PIN) */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="City / District *"
                    readOnly={pinStatus === "valid"}
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className={`px-3 py-2 rounded-lg border border-primary/15 text-xs outline-none ${
                      pinStatus === "valid" ? "bg-primary/5 font-medium text-primary" : "bg-white"
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="State *"
                    readOnly={pinStatus === "valid"}
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className={`px-3 py-2 rounded-lg border border-primary/15 text-xs outline-none ${
                      pinStatus === "valid" ? "bg-primary/5 font-medium text-primary" : "bg-white"
                    }`}
                  />
                </div>

                {/* 3. Door/Flat No & Locality */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Flat / Door / House No."
                    value={address.line2}
                    onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-primary/15 text-xs outline-none focus:border-accent bg-white"
                  />
                  {localities.length > 0 ? (
                    <select
                      value={address.locality}
                      onChange={(e) => setAddress({ ...address, locality: e.target.value })}
                      className="px-2.5 py-2 rounded-lg border border-primary/15 text-xs outline-none focus:border-accent bg-white cursor-pointer"
                    >
                      <option value="">Locality (Optional)</option>
                      {localities.map((loc, i) => (
                        <option key={i} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Area / Locality"
                      value={address.locality}
                      onChange={(e) => setAddress({ ...address, locality: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-primary/15 text-xs outline-none focus:border-accent bg-white"
                    />
                  )}
                </div>

                {/* 4. Street Address */}
                <input
                  type="text"
                  placeholder="Street / Road / Landmark *"
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-primary/15 text-xs outline-none focus:border-accent bg-white"
                />

                {/* 5. Contact Phone */}
                <input
                  type="tel"
                  placeholder="Contact Phone Number *"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-primary/15 text-xs outline-none focus:border-accent bg-white"
                />
              </div>

              {trimmedCity && (
                <div className="pt-1">
                  {isGuntur ? (
                    <p className="text-[11px] text-green-800 bg-green-50 p-2 rounded-lg border border-green-200/60 leading-tight">
                      ✓ Local Guntur Delivery (24h / Same-day available)
                    </p>
                  ) : (
                    <div className="space-y-1.5 bg-amber-50 p-2.5 rounded-lg border border-amber-200/60 text-[11px] text-amber-900 leading-snug">
                      <p>
                        ⚠️ Long-distance delivery availability and charges require confirmation before dispatch.
                      </p>
                      <a
                        href={`${contactInfo.whatsappHref}?text=${encodeURIComponent(
                          `Hi Lucky Couture! I would like to confirm delivery availability for ${address.city || "my city"} (${address.pincode || "outstation"}).`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-semibold text-[#128C7E] hover:underline"
                      >
                        <MessageCircle size={13} /> Confirm Delivery via WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <a
              href={
                contactInfo.mapsUrl ||
                (contactInfo.lat && contactInfo.lng
                  ? `https://www.google.com/maps/search/?api=1&query=${contactInfo.lat},${contactInfo.lng}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      contactInfo.address
                    )}`)
              }
              target="_blank"
              rel="noopener noreferrer"
              className="mb-5 bg-bg/60 hover:bg-bg/90 p-3.5 rounded-xl border border-primary/15 hover:border-accent/40 text-xs text-ink/70 flex items-start gap-2.5 transition-all group cursor-pointer shadow-2xs block"
              aria-label="View Lucky Couture store location on Google Maps"
            >
              <MapPin
                size={15}
                className="text-accent shrink-0 mt-0.5 group-hover:text-primary group-hover:scale-110 transition-transform"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <strong className="text-primary font-semibold group-hover:text-accent transition-colors">
                    Store Pickup Location:
                  </strong>
                  <span className="text-[11px] font-medium text-accent inline-flex items-center gap-0.5 opacity-85 group-hover:opacity-100 group-hover:underline transition-all">
                    View on Maps <ExternalLink size={11} />
                  </span>
                </div>
                <span className="text-ink/75 group-hover:text-primary leading-relaxed block transition-colors">
                  {contactInfo.address}
                </span>
              </div>
            </a>
          )}

          {/* Breakdown */}
          <div className="space-y-2 text-sm text-ink/70 mb-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{currentTotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>
                {!needsDelivery
                  ? "Free (Store Pickup)"
                  : !trimmedCity
                  ? "Enter City"
                  : isLongDistance
                  ? "To be confirmed"
                  : localShippingFee === 0
                  ? "Free"
                  : `₹${localShippingFee}`}
              </span>
            </div>
          </div>

          <StarDivider className="mb-4" />

          <div className="flex justify-between font-semibold text-primary mb-4">
            <span>Total</span>
            <span>₹{finalTotal.toLocaleString("en-IN")}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={checking}
            className="w-full bg-highlight text-primary font-semibold py-3 rounded-full hover:bg-accent hover:text-white transition-colors disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
          >
            {checking ? <><Loader2 size={16} className="animate-spin" /> Placing order…</> : "Checkout"}
          </button>

          {!user && (
            <p className="text-xs text-center text-ink/50 mt-3">
              <Link to="/login" className="text-accent underline">Sign in</Link> to place your order
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
