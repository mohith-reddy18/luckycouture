import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, Loader2, MapPin, MessageCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import SectionHeading from "../components/SectionHeading";
import StarDivider from "../components/StarDivider";
import { contactInfo } from "../data/mockData";
import api from "../utils/api";
import getImageUrl from "../utils/imageUrl";
import { resolvePrimaryAddress } from "../utils/addressUtils";

export default function Cart() {
  const { cart, updateQty, removeFromCart, cartTotal, notify, user, setCart } = useApp();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const safeCart = Array.isArray(cart) ? cart : [];

  // Delivery selection state
  const [needsDelivery, setNeedsDelivery] = useState(true);

  // Address state prefilled strictly from primary/default address if available
  const defaultAddr = resolvePrimaryAddress(user?.addresses);
  const [address, setAddress] = useState({
    line1: defaultAddr?.line1 || "",
    line2: defaultAddr?.line2 || "",
    city: defaultAddr?.city || "",
    state: defaultAddr?.state || "Andhra Pradesh",
    pincode: defaultAddr?.pincode || "",
    phone: user?.phone || "",
  });

  useEffect(() => {
    const primary = resolvePrimaryAddress(user?.addresses);
    if (primary) {
      setAddress((prev) => ({
        ...prev,
        line1: prev.line1 || primary.line1 || "",
        line2: prev.line2 || primary.line2 || "",
        city: prev.city || primary.city || "",
        state: prev.state || primary.state || "Andhra Pradesh",
        pincode: prev.pincode || primary.pincode || "",
        phone: prev.phone || user?.phone || "",
      }));
    }
  }, [user]);

  if (safeCart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-24 text-center">
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
  const trimmedCity = (address.city || "").trim().toLowerCase();
  const isGuntur = trimmedCity === "guntur";
  const isLongDistance = needsDelivery && trimmedCity !== "" && !isGuntur;

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
      if (!address.city.trim()) {
        notify("Please enter your delivery city");
        return;
      }
      if (!address.line1.trim()) {
        notify("Please enter your street address");
        return;
      }
      if (!address.pincode.trim() || !/^\d{6}$/.test(address.pincode.trim())) {
        notify("Please enter a valid 6-digit delivery pincode");
        return;
      }
      if (!address.phone.trim()) {
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
        name: item.name || "Item",
        image: getImageUrl(rawImage) || (typeof item.image === "string" ? item.image : ""),
        price: Number(item.price) || 0,
        quantity: Number(item.qty) || 1,
        size: item.size || "",
        color: item.color || "",
      };
    });

    const shippingAddress = needsDelivery
      ? {
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          phone: address.phone,
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
      <SectionHeading align="left" eyebrow="Your Bag" title="Shopping Cart" />
      <div className="grid lg:grid-cols-[1fr_360px] gap-10">
        <div className="flex flex-col gap-4">
          {safeCart.map((item, idx) => {
            const itemId = item._id || item.id || `cart-item-${idx}`;
            const categoryName =
              typeof item.category === "object"
                ? (item.category?.name || "")
                : (item.category || "");
            const rawImage =
              item.image ||
              item.thumbnail?.url ||
              item.images?.[0]?.url ||
              (typeof item.thumbnail === "string" ? item.thumbnail : "") ||
              (typeof item.images?.[0] === "string" ? item.images[0] : "") ||
              item.thumbnail ||
              item.images ||
              "";
            const imageUrl = getImageUrl(rawImage) || item.image || "";
            const itemPrice = Number(item.price) || 0;
            const itemQty = Number(item.qty) || 1;

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
                  alt={item.name || "Product image"}
                  className="w-24 h-28 object-cover rounded-xl shrink-0 bg-primary/5"
                />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    {categoryName && (
                      <p className="text-[11px] uppercase tracking-wide text-secondary">{categoryName}</p>
                    )}
                    <h3 className="font-display text-base font-medium text-primary">{item.name}</h3>
                    <p className="text-sm text-ink/60 mt-1">₹{itemPrice.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="flex items-center justify-between">
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
                        className="w-6 h-6 flex items-center justify-center text-primary"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm w-4 text-center">{itemQty}</span>
                      <button
                        onClick={() => updateQty(itemId, itemQty + 1)}
                        className="w-6 h-6 flex items-center justify-center text-primary"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        removeFromCart(itemId);
                        notify("Removed from cart");
                      }}
                      className="text-ink/40 hover:text-red-500 transition-colors"
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
                className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-colors ${
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
                className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-colors ${
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
            <div className="mb-5 space-y-2.5 bg-bg/60 p-3.5 rounded-xl border border-primary/10">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5 mb-1">
                <MapPin size={13} className="text-accent" /> Delivery Address
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="City / Town (e.g. Guntur, Tenali)"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="col-span-2 px-3 py-2 rounded-lg border border-primary/15 text-xs outline-none focus:border-accent bg-white"
                />
                <input
                  type="text"
                  placeholder="Street Address / Area"
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  className="col-span-2 px-3 py-2 rounded-lg border border-primary/15 text-xs outline-none focus:border-accent bg-white"
                />
                <input
                  type="text"
                  placeholder="State (e.g. Andhra Pradesh)"
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-primary/15 text-xs outline-none focus:border-accent bg-white"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="6-Digit Pincode"
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                  className="px-3 py-2 rounded-lg border border-primary/15 text-xs outline-none focus:border-accent bg-white"
                />
                <input
                  type="tel"
                  placeholder="Contact Phone Number"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  className="col-span-2 px-3 py-2 rounded-lg border border-primary/15 text-xs outline-none focus:border-accent bg-white"
                />
              </div>

              {address.city.trim() && (
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
                          `Hi Lucky Couture! I would like to confirm delivery availability for ${address.city} (${address.pincode || "outstation"}).`
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
            <div className="mb-5 bg-bg/60 p-3 rounded-xl border border-primary/10 text-xs text-ink/70 flex items-start gap-2">
              <MapPin size={14} className="text-accent shrink-0 mt-0.5" />
              <div>
                <strong className="text-primary block">Store Pickup Location:</strong>
                <span>{contactInfo.address}</span>
              </div>
            </div>
          )}

          {/* Breakdown */}
          <div className="space-y-2 text-sm text-ink/70 mb-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{cartTotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>
                {!needsDelivery
                  ? "Free (Store Pickup)"
                  : !address.city.trim()
                  ? "Enter City"
                  : isLongDistance
                  ? "To be confirmed"
                  : localShippingFee === 0
                  ? "Free"
                  : `₹${localShippingFee}`}
              </span>
            </div>
          </div>

          <StarDivider className="!justify-start mb-4 scale-90 origin-left" />

          <div className="flex justify-between font-semibold text-primary mb-4">
            <span>Total</span>
            <span>₹{finalTotal.toLocaleString("en-IN")}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={checking}
            className="w-full bg-highlight text-primary font-semibold py-3 rounded-full hover:bg-accent hover:text-white transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
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
