import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useApp } from "../context/AppContext";
import SectionHeading from "../components/SectionHeading";
import StarDivider from "../components/StarDivider";

export default function Cart() {
  const { cart, updateQty, removeFromCart, cartTotal, notify } = useApp();
  const navigate = useNavigate();

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
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-6 h-6 flex items-center justify-center text-primary">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 flex items-center justify-center text-primary">
                      <Plus size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      removeFromCart(item.id);
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
          <div className="flex justify-between font-semibold text-primary mb-6">
            <span>Total</span>
            <span>₹{(cartTotal + shipping).toLocaleString("en-IN")}</span>
          </div>
          <button
            onClick={() => {
              notify("Order placed — thank you!");
              navigate("/orders");
            }}
            className="w-full bg-highlight text-primary font-semibold py-3 rounded-full hover:bg-accent hover:text-white transition-colors"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
