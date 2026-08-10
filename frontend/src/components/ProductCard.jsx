import { motion } from "framer-motion";
import { Heart, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { isDealActive } from "../data/mockData";

export default function ProductCard({ product }) {
  const { toggleWishlist, isWishlisted } = useApp();
  const navigate = useNavigate();
  const liked = isWishlisted(product.id);
  const discount = Math.round(100 - (product.price / product.mrp) * 100);
  const dealActive = isDealActive(product);
  const isBestseller = Boolean(product.bestseller || product.isBestseller);
  const isNew = Boolean(product.recent || product.isNewArrival || product.isNew);

  const handleHeart = (e) => {
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -4 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      onClick={() => navigate(`/shop/${product.id}`)}
      className="group bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-soft cursor-pointer transition-shadow duration-300"
    >
      <div className="relative overflow-hidden aspect-[4/5]">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start z-10">
          {isBestseller && (
            <span className="bg-highlight text-primary text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full">
              Bestseller
            </span>
          )}
          {isNew && (
            <span className="bg-accent text-white text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full">
              New
            </span>
          )}
        </div>

        <button
          onClick={handleHeart}
          aria-label="Toggle wishlist"
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
            liked ? "bg-accent text-white" : "bg-white/80 text-primary hover:bg-accent hover:text-white"
          }`}
        >
          <Heart size={15} fill={liked ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="p-4">
        <p className="text-[11px] uppercase tracking-wider text-secondary mb-1">{product.category}</p>
        <h3 className="font-display text-base font-medium text-primary leading-snug mb-1.5 line-clamp-1">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mb-2">
          <Star size={12} className="text-accent fill-accent" />
          <span className="text-xs text-ink/60">{product.rating}</span>
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-base font-bold text-primary">₹{product.price.toLocaleString("en-IN")}</span>
            <span className="text-xs text-ink/40 line-through">₹{product.mrp.toLocaleString("en-IN")}</span>
            {dealActive ? (
              <span className="bg-[#CC0C39] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                {discount}% off
              </span>
            ) : (
              <span className="text-xs text-green-700 font-medium">{discount}% off</span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/shop/${product.id}`);
            }}
            className="shrink-0 text-xs font-semibold text-accent hover:text-white bg-accent/10 hover:bg-accent px-2.5 py-1 rounded-lg transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    </motion.div>
  );
}
