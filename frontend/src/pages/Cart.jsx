import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, Loader2, MapPin } from "lucide-react";
import { useApp } from "../context/AppContext";
import SectionHeading from "../components/SectionHeading";
import StarDivider from "../components/StarDivider";
import api from "../utils/api";

export default function Cart() {
  const { cart, updateQty, removeFromCart, cartTotal, notify, user, setCart } = useApp();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  if (cart.length === 0) {
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

  const shipping = cartTotal > 2999 ? 0 : 149;

  const handleCheckout = async () => {
    if (!user) {
      notify("Please sign in to place an order");
      navigate("/login");
      return;
    }
    if (checking) return;
    setChecking(true);

    // Build the items snapshot from the client-side cart
    const items = cart.map((item) => ({
      name:     item.name,
      image:    item.image || "",
      price:    item.price,
      quantity: item.qty,
      size:     item.size  || "",
      color:    item.color || "",
    }));

    // Use the user's default address for shipping, or a blank object
    const defaultAddr = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0];
    const shippingAddress = defaultAddr
      ? { line1: defaultAddr.line1, line2: defaultAddr.line2, city: defaultAddr.city, state: defaultAddr.state, pincode: defaultAddr.pincode, phone: user.phone || "" }
      : {};

    try {
      const res = await api.post("/api/orders", {
        items,
        shippingAddress,
        paymentMethod: "cod",
      });
      // Clear the local cart on success
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
      <div className="grid lg:grid-cols-[1fr_320px] gap-10">
        <div className="flex flex-col gap-4">
          {cart.map((item) => (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 bg-white rounded-2xl shadow-card p-4"
            >
              <img src={item.image} alt={item.name} className="w-24 h-28 object-cover rounded-xl" />
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-secondary">{item.category}</p>
                  <h3 className="font-display text-base font-medium text-primary">{item.name}</h3>
                  <p className="text-sm text-ink/60 mt-1">₹{item.price.toLocaleString("en-IN")}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 border border-primary/15 rounded-full px-2 py-1">
                    <button
                      onClick={() => {
                        if (item.qty === 1) {
                          removeFromCart(item.id);
                          notify("Removed from cart");
                        } else {
                          updateQty(item.id, item.qty - 1);
                        }
                      }}
                      className="w-6 h-6 flex items-center justify-center text-primary"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 flex items-center justify-center text-primary">
                      <Plus size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => { removeFromCart(item.id); notify("Removed from cart"); }}
                    className="text-ink/40 hover:text-red-500 transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6 h-fit lg:sticky lg:top-24">
          <h3 className="font-display text-lg font-semibold text-primary mb-5">Order Summary</h3>
          <div className="flex justify-between text-sm text-ink/70 mb-2">
            <span>Subtotal</span>
            <span>₹{cartTotal.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-sm text-ink/70 mb-4">
            <span>Shipping</span>
            <span>{shipping === 0 ? "Free" : `₹${shipping}`}</span>
          </div>
          <StarDivider className="!justify-start mb-4 scale-90 origin-left" />
          <div className="flex justify-between font-semibold text-primary mb-4">
            <span>Total</span>
            <span>₹{(cartTotal + shipping).toLocaleString("en-IN")}</span>
          </div>

          {/* Delivery address preview */}
          {user?.addresses?.length > 0 && (
            <div className="flex items-start gap-2 text-xs text-ink/60 mb-4 bg-bg rounded-xl p-3 border border-primary/10">
              <MapPin size={13} className="text-accent shrink-0 mt-0.5" />
              <span>
                Delivering to: {[user.addresses.find((a) => a.isDefault) || user.addresses[0]].map((a) =>
                  `${a.city}, ${a.state} – ${a.pincode}`
                )}
              </span>
            </div>
          )}

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
