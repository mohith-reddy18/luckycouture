import { memo } from "react";
import { motion } from "framer-motion";
import { Heart, Star, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { isDealActive } from "../data/mockData";

function ProductCard({ product }) {
  const { toggleWishlist, isWishlisted, user, notify, savePendingFavorite } = useApp();
  const navigate = useNavigate();
  const liked = isWishlisted(product.id);
  const discount = Math.round(100 - (product.price / product.mrp) * 100);
  const dealActive = isDealActive(product);
  const isBestseller = Boolean(product.bestseller || product.isBestseller);
  const isNew = Boolean(product.recent || product.isNewArrival || product.isNew);

  const handleHeart = (e) => {
    e.stopPropagation();
    if (!user) {
      savePendingFavorite(product);
      notify("Please sign in to save items to your favorites");
      navigate("/login");
      return;
    }
    toggleWishlist(product);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -3 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      onClick={() => navigate(`/shop/${product.id}`)}
      className="group bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-soft cursor-pointer transition-all duration-300 flex flex-col h-full border border-primary/5"
    >
      {/* Image Thumbnail Container */}
      <div className="relative overflow-hidden aspect-square sm:aspect-[4/5] bg-bg/50">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Bestseller & New Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start z-10">
          {isBestseller && (
            <span className="bg-highlight text-primary text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full shadow-sm">
              Bestseller
            </span>
          )}
          {isNew && (
            <span className="bg-accent text-white text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full shadow-sm">
              New
            </span>
          )}
        </div>

        {/* Wishlist Heart Icon */}
        <button
          onClick={handleHeart}
          aria-label="Toggle wishlist"
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-sm z-10 ${
            liked ? "bg-accent text-white" : "bg-white/80 text-primary hover:bg-accent hover:text-white"
          }`}
        >
          <Heart size={14} fill={liked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Content Area */}
      <div className="p-2.5 min-[360px]:p-3 sm:p-3.5 flex flex-col flex-1">
        {/* Category & Rating Row */}
        <div className="flex items-center justify-between text-[10px] text-secondary font-medium mb-1">
          <span className="uppercase tracking-wider truncate font-semibold">{product.category}</span>
          <div className="flex items-center gap-1 text-ink/70 shrink-0">
            <Star size={11} className="text-accent fill-accent" />
            <span className="font-semibold">{product.rating}</span>
          </div>
        </div>

        {/* Product Title (Full Title Visible, 2 lines) */}
        <h3 className="font-display text-xs sm:text-sm font-medium text-primary leading-snug mb-2 line-clamp-2 group-hover:text-accent transition-colors">
          {product.name}
        </h3>

        {/* Pricing & Action Button */}
        <div className="mt-auto pt-1">
          {/* Discount ABOVE the price */}
          {discount > 0 && (
            <div className="mb-1">
              {dealActive ? (
                <span className="bg-[#CC0C39] text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase inline-block">
                  {discount}% OFF
                </span>
              ) : (
                <span className="text-xs font-bold text-green-700 inline-block">
                  {discount}% off
                </span>
              )}
            </div>
          )}

          {/* Price Line (Current price + Struck-through MRP) */}
          <div className="flex items-baseline gap-1.5 flex-wrap mb-2">
            <span className="text-sm sm:text-base font-bold text-primary">
              ₹{product.price.toLocaleString("en-IN")}
            </span>
            {product.mrp && product.mrp > product.price && (
              <span className="text-[11px] text-ink/40 line-through">
                ₹{product.mrp.toLocaleString("en-IN")}
              </span>
            )}
          </div>

          {/* View Details Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/shop/${product.id}`);
            }}
            className="w-full text-center text-[11px] font-semibold text-primary bg-bg hover:bg-primary hover:text-white border border-primary/15 py-1.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-1 group/btn"
          >
            View Details <ArrowRight size={11} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(ProductCard);
