import { useNavigate } from "react-router-dom";
import { LogOut, Package, Heart, MapPin, Phone, Mail } from "lucide-react";
import { useApp } from "../context/AppContext";
import SectionHeading from "../components/SectionHeading";

export default function Profile() {
  const { user, authLoading, logout, wishlist, cart } = useApp();
  const navigate = useNavigate();

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
        <p className="text-ink/60 mb-8">Log in to view your profile, orders, and saved items.</p>
        <button onClick={() => navigate("/login")} className="bg-primary text-bg px-7 py-3 rounded-full font-medium hover:bg-primary/90">
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <div className="flex items-center gap-5 mb-10">
        <span className="w-16 h-16 rounded-full bg-primary text-highlight flex items-center justify-center text-2xl font-display font-semibold">
          {user.name?.[0]?.toUpperCase()}
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary">{user.name}</h1>
          <p className="text-sm text-ink/50">{user.email}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <button onClick={() => navigate("/orders")} className="bg-white rounded-2xl shadow-card p-5 text-left hover:shadow-soft transition-shadow">
          <Package size={20} className="text-accent mb-3" />
          <p className="font-medium text-primary">Orders</p>
          <p className="text-xs text-ink/50">View order history</p>
        </button>
        <button onClick={() => navigate("/wishlist")} className="bg-white rounded-2xl shadow-card p-5 text-left hover:shadow-soft transition-shadow">
          <Heart size={20} className="text-accent mb-3" />
          <p className="font-medium text-primary">Wishlist</p>
          <p className="text-xs text-ink/50">{wishlist.length} saved items</p>
        </button>
        <button onClick={() => navigate("/cart")} className="bg-white rounded-2xl shadow-card p-5 text-left hover:shadow-soft transition-shadow">
          <Package size={20} className="text-accent mb-3" />
          <p className="font-medium text-primary">Cart</p>
          <p className="text-xs text-ink/50">{cart.length} items in bag</p>
        </button>
      </div>

      <SectionHeading align="left" eyebrow="Details" title="Contact information" />
      <div className="bg-white rounded-2xl shadow-card p-6 space-y-4 mb-10">
        <div className="flex items-center gap-3 text-sm text-ink/70">
          <Mail size={16} className="text-accent" /> {user.email}
        </div>
        <div className="flex items-center gap-3 text-sm text-ink/70">
          <Phone size={16} className="text-accent" /> +91 98765 43210
        </div>
        <div className="flex items-center gap-3 text-sm text-ink/70">
          <MapPin size={16} className="text-accent" /> Guntur, Andhra Pradesh
        </div>
      </div>

      <button
        onClick={() => {
          logout();
          navigate("/");
        }}
        className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600"
      >
        <LogOut size={16} /> Sign out
      </button>
    </div>
  );
}
