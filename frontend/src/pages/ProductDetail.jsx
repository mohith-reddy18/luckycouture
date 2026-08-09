import { useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Star, ShoppingBag, Zap, Scissors, ChevronLeft, Minus, Plus, MapPin, Truck, CheckCircle2, XCircle } from "lucide-react";
import { products, productViews, getReviews, isDealActive } from "../data/mockData";
import { useApp } from "../context/AppContext";
import LocationModal from "../components/LocationModal";

const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state: locationState } = useLocation();
  const { user, addToCart, toggleWishlist, isWishlisted, notify } = useApp();

  const product = products.find((p) => p.id === id);
  const [activeView, setActiveView] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [manualDelivery, setManualDelivery] = useState(null);
  const [locationOpen, setLocationOpen] = useState(false);

  // Prefer a manually entered pincode/address; fall back to the profile's default saved address.
  const profileAddr = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0];
  const profileTarget = profileAddr ? { type: "address", address: profileAddr } : null;
  const deliveryTarget = manualDelivery ?? profileTarget;

  // Expose a setter that LocationModal can call to store a manual override
  const setDeliveryTarget = (val) => setManualDelivery(val);


  if (!product) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold text-primary mb-3">Product not found</h1>
        <Link to="/shop" className="text-accent font-medium hover:underline">Back to Shop</Link>
      </div>
    );
  }

  const views = productViews(product);
  const reviews = getReviews(product.id);
  const avgRating =
    Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
  const wishlisted = isWishlisted(product.id);
  const discount = Math.round(100 - (product.price / product.mrp) * 100);
  const inStock = (product.stock ?? 0) > 0;
  const lowStock = inStock && product.stock <= 5;
  const dealActive = isDealActive(product);
  const isBestseller = Boolean(product.bestseller || product.isBestseller);
  const isNew = Boolean(product.recent || product.isNewArrival || product.isNew);

  const ratingBuckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  const deliveryLabel = deliveryTarget
    ? deliveryTarget.type === "address"
      ? `${deliveryTarget.address.city} ${deliveryTarget.address.pincode}`
      : deliveryTarget.pincode
    : null;

  const handleAddToCart = () => {
    if (!inStock) return;
    addToCart(product, quantity);
  };

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-primary/70 hover:text-primary mb-8"
      >
        <ChevronLeft size={16} /> Back to shop
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
              alt={`${product.name} — ${views[activeView].label} view`}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {views.map((v, i) => (
              <button
                key={v.label}
                onClick={() => setActiveView(i)}
                className={`rounded-xl overflow-hidden aspect-[4/5] border-2 transition-colors ${activeView === i ? "border-accent" : "border-transparent hover:border-primary/20"
                  }`}
              >
                <img src={v.image} alt={v.label} loading="lazy" className="w-full h-full object-cover" />
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
          <div className="flex items-center flex-wrap gap-2 mb-2">
            {dealActive && (
              <span className="bg-[#CC0C39] text-white text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded shadow-sm">
                Limited Time Deal
              </span>
            )}
            {isBestseller && (
              <span className="bg-highlight text-primary text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full">Bestseller</span>
            )}
            {isNew && (
              <span className="bg-accent text-white text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full">New</span>
            )}
          </div>
          <span className="text-[11px] uppercase tracking-wider text-secondary">{product.category}</span>
          <h1 className="font-display text-3xl font-semibold text-primary mt-1 mb-3">{product.name}</h1>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={15} className={i < Math.round(avgRating) ? "text-accent fill-accent" : "text-primary/15"} />
              ))}
            </div>
            <span className="text-sm text-ink/60">{avgRating} · {reviews.length} reviews</span>
          </div>

          {/* Stock status */}
          <div className="flex items-center gap-1.5 mb-5">
            {inStock ? (
              <>
                <CheckCircle2 size={15} className="text-green-700" />
                <span className="text-sm font-medium text-green-700">
                  In Stock{lowStock ? ` — only ${product.stock} left` : ""}
                </span>
              </>
            ) : (
              <>
                <XCircle size={15} className="text-red-500" />
                <span className="text-sm font-medium text-red-500">Out of Stock</span>
              </>
            )}
          </div>

          <div className="flex items-baseline gap-3 mb-6">
            <span className="font-display text-3xl font-semibold text-primary">₹{product.price.toLocaleString("en-IN")}</span>
            <span className="text-base text-ink/40 line-through">₹{product.mrp.toLocaleString("en-IN")}</span>
            {dealActive ? (
              <span className="bg-[#CC0C39] text-white text-xs font-bold px-2 py-0.5 rounded">
                {discount}% off
              </span>
            ) : (
              <span className="text-sm text-green-700 font-medium">{discount}% off</span>
            )}
          </div>

          <p className="text-sm text-ink/65 leading-relaxed mb-6 max-w-md">
            Hand-finished {product.category.toLowerCase()} piece from our ready-to-wear collection —
            same tailoring detail and quality checks as our custom stitching line.
          </p>

          {/* Delivery estimate + location */}
          <div className="flex items-start gap-2.5 bg-bg rounded-xl p-4 mb-6">
            <Truck size={16} className="text-accent shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-ink/75">
                FREE delivery <strong className="text-primary">{addDays(5)}</strong> on orders over ₹2,999
              </p>
              <p className="text-ink/75">
                Or fastest delivery <strong className="text-primary">{addDays(2)}</strong>
              </p>
              <button
                onClick={() => setLocationOpen(true)}
                className="flex items-center gap-1 text-accent hover:underline mt-1.5"
              >
                <MapPin size={13} />
                {deliveryLabel ? `Delivering to ${deliveryLabel}` : "Enter pincode"} — Change Location
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm text-ink/70">Quantity</span>
            <div className="flex items-center gap-3 border border-primary/15 rounded-full px-3 py-1.5">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={!inStock}
                className="w-6 h-6 flex items-center justify-center text-primary disabled:opacity-30"
                aria-label="Decrease quantity"
              >
                <Minus size={13} />
              </button>
              <span className="text-sm w-5 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock || 1, q + 1))}
                disabled={!inStock || quantity >= product.stock}
                className="w-6 h-6 flex items-center justify-center text-primary disabled:opacity-30"
                aria-label="Increase quantity"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          <div className="flex gap-3 mb-3">
            <button
              onClick={handleAddToCart}
              disabled={!inStock}
              className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 bg-primary text-bg text-sm sm:text-base font-medium py-3 sm:py-3.5 px-2 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingBag size={16} className="shrink-0" /> <span className="truncate">Add to Cart</span>
            </button>
            <button
              onClick={() => {
                if (!inStock) return;
                addToCart(product, quantity);
                navigate("/cart");
              }}
              disabled={!inStock}
              className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 bg-highlight text-primary text-sm sm:text-base font-semibold py-3 sm:py-3.5 px-2 rounded-full hover:bg-accent hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Zap size={16} className="shrink-0" /> <span className="truncate">Buy Now</span>
            </button>
          </div>

          <button
            onClick={() => toggleWishlist(product)}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-full border font-medium text-sm transition-colors ${wishlisted ? "bg-accent text-white border-accent" : "border-primary/15 text-primary hover:border-accent"
              }`}
          >
            <Heart size={16} fill={wishlisted ? "currentColor" : "none"} />
            {wishlisted ? "Added to Favourites" : "Add to Favourites"}
          </button>

          <button
            onClick={() => {
              notify("Redirecting to booking with this cloth as reference");
              // Preserve any existing design reference already in location state
              navigate("/tailoring", { state: { ...locationState, cloth: product } });
            }}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-accent border border-accent/40 py-3 rounded-full hover:bg-accent/5 transition-colors mt-3"
          >
            <Scissors size={15} /> Stitch This Cloth for Me
          </button>

          {/* Specifications */}
          {product.specifications?.length > 0 && (
            <div className="mt-8 pt-6 border-t border-primary/10">
              <h3 className="font-display text-base font-semibold text-primary mb-3">Product Details</h3>
              <dl className="flex flex-col gap-2">
                {product.specifications.map((spec) => (
                  <div key={spec.label} className="flex text-sm">
                    <dt className="w-36 shrink-0 text-ink/50">{spec.label}</dt>
                    <dd className="text-ink/75">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
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

      <LocationModal
        isOpen={locationOpen}
        onClose={() => setLocationOpen(false)}
        onConfirm={(target) => setDeliveryTarget(target)}
      />
    </div>
  );
}
