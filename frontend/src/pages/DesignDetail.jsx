import { useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Star, ShoppingBag, Zap, Scissors, ChevronLeft, Truck, ShieldCheck, RefreshCw, Banknote } from "lucide-react";
import { designs, designViews, getReviews } from "../data/mockData";
import { useApp } from "../context/AppContext";

export default function DesignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state: locationState } = useLocation();
  const { addToCart, toggleWishlist, isWishlisted, notify } = useApp();

  const design = designs.find((d) => d.id === id);
  const [activeView, setActiveView] = useState(0);

  if (!design) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold text-primary mb-3">Design not found</h1>
        <Link to="/design-gallery" className="text-accent font-medium hover:underline">Back to Design Gallery</Link>
      </div>
    );
  }

  const views = designViews(design);
  const reviews = getReviews(design.id);
  const avgRating =
    Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
  const wishlisted = isWishlisted(design.id);
  const discount = Math.round(100 - (design.price / design.mrp) * 100);

  const ratingBuckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-primary/70 hover:text-primary mb-8"
      >
        <ChevronLeft size={16} /> Back to gallery
      </button>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 mb-16">
        {/* Image gallery */}
        <div>
          <div className="rounded-2xl overflow-hidden bg-white shadow-card mb-4 aspect-[4/5]">
            <motion.img
              key={activeView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              src={views[activeView].image}
              alt={`${design.title} — ${views[activeView].label} view`}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {views.map((v, i) => (
              <button
                key={v.label}
                onClick={() => setActiveView(i)}
                className={`rounded-xl overflow-hidden aspect-[4/5] border-2 transition-colors ${
                  activeView === i ? "border-accent" : "border-transparent hover:border-primary/20"
                }`}
              >
                <img src={v.image} alt={v.label} loading="lazy" className="w-full h-full object-cover" />
                <span className="sr-only">{v.label} view</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2 justify-center">
            {views.map((v, i) => (
              <span key={v.label} className={`text-[11px] ${activeView === i ? "text-accent font-medium" : "text-ink/40"}`}>
                {v.label}
              </span>
            ))}
          </div>
        </div>

        {/* Details */}
        <div>
          <span className="text-[11px] uppercase tracking-wider text-secondary">{design.category}</span>
          <h1 className="font-display text-3xl font-semibold text-primary mt-1 mb-3">{design.title}</h1>

          <div className="flex items-center gap-2 mb-5">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={15} className={i < Math.round(avgRating) ? "text-accent fill-accent" : "text-primary/15"} />
              ))}
            </div>
            <span className="text-sm text-ink/60">{avgRating} · {reviews.length} reviews</span>
          </div>

          <div className="flex items-baseline gap-3 mb-6">
            <span className="font-display text-3xl font-semibold text-primary">₹{design.price.toLocaleString("en-IN")}</span>
            <span className="text-base text-ink/40 line-through">₹{design.mrp.toLocaleString("en-IN")}</span>
            <span className="text-sm text-green-700 font-medium">{discount}% off</span>
          </div>

          <p className="text-sm text-ink/65 leading-relaxed mb-8 max-w-md">
            Hand-finished {design.category.toLowerCase()} piece from our design gallery — stitched
            in-house and available as a ready reference for your own custom order, with the same
            embroidery and tailoring detail shown here.
          </p>

          <div className="flex gap-3 mb-3">
            <button
              onClick={() => addToCart(design)}
              className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 bg-primary text-bg text-sm sm:text-base font-medium py-3 sm:py-3.5 px-2 rounded-full hover:bg-primary/90 transition-colors"
            >
              <ShoppingBag size={16} className="shrink-0" /> <span className="truncate">Add to Cart</span>
            </button>
            <button
              onClick={() => {
                addToCart(design);
                navigate("/cart");
              }}
              className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 bg-highlight text-primary text-sm sm:text-base font-semibold py-3 sm:py-3.5 px-2 rounded-full hover:bg-accent hover:text-white transition-colors"
            >
              <Zap size={16} className="shrink-0" /> <span className="truncate">Buy Now</span>
            </button>
          </div>

          <button
            onClick={() => toggleWishlist(design)}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-full border font-medium text-sm mb-4 transition-colors ${
              wishlisted ? "bg-accent text-white border-accent" : "border-primary/15 text-primary hover:border-accent"
            }`}
          >
            <Heart size={16} fill={wishlisted ? "currentColor" : "none"} />
            {wishlisted ? "Added to Favourites" : "Add to Favourites"}
          </button>

          <button
            onClick={() => {
              notify("Redirecting to booking with this design as reference");
              // Preserve any existing cloth reference already in location state
              navigate("/tailoring", { state: { ...locationState, design } });
            }}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-accent border border-accent/40 py-3 rounded-full hover:bg-accent/5 transition-colors mb-6"
          >
            <Scissors size={15} /> Book This Design, Custom-Fit to You
          </button>

          {/* Trust badges — reflects Lucky Couture's actual policies (shipping
              threshold, payment methods, alteration policy) rather than
              generic placeholder claims */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-4 pt-5 border-t border-primary/10">
            {[
              { icon: Truck, label: "Free Delivery over ₹2,999" },
              { icon: Banknote, label: "Cash on Pickup Available" },
              { icon: ShieldCheck, label: "Secure Transaction" },
              { icon: RefreshCw, label: "Free Alteration, 15 Days" },
            ].map((b) => (
              <div key={b.label} className="flex flex-col items-center text-center gap-1.5">
                <span className="w-9 h-9 rounded-full bg-highlight/40 flex items-center justify-center">
                  <b.icon size={16} className="text-accent" />
                </span>
                <span className="text-[11px] text-ink/60 leading-tight">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews & Ratings — Amazon-style */}
      <div className="border-t border-primary/10 pt-12">
        <h2 className="font-display text-2xl font-semibold text-primary mb-8">Customer Reviews &amp; Ratings</h2>
        <div className="grid md:grid-cols-[280px_1fr] gap-10">
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-display text-4xl font-bold text-primary">{avgRating}</span>
              <span className="text-ink/50 text-sm">out of 5</span>
            </div>
            <div className="flex items-center gap-0.5 mb-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} className={i < Math.round(avgRating) ? "text-accent fill-accent" : "text-primary/15"} />
              ))}
            </div>
            <p className="text-sm text-ink/50 mb-6">{reviews.length} global ratings</p>
            <div className="flex flex-col gap-1.5">
              {ratingBuckets.map((b) => (
                <div key={b.star} className="flex items-center gap-2 text-xs text-ink/60">
                  <span className="w-10">{b.star} star</span>
                  <div className="flex-1 h-2 bg-primary/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full"
                      style={{ width: `${(b.count / reviews.length) * 100}%` }}
                    />
                  </div>
                  <span className="w-5 text-right">{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {reviews.map((r) => (
              <div key={r.id} className="border-b border-primary/10 pb-6 last:border-none">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="w-8 h-8 rounded-full bg-primary text-highlight flex items-center justify-center text-xs font-semibold">
                    {r.name[0]}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-primary">{r.name}</p>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={11} className={i < r.rating ? "text-accent fill-accent" : "text-primary/15"} />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-ink/40 ml-auto">{r.date}</span>
                </div>
                <p className="text-sm text-ink/70 leading-relaxed">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
