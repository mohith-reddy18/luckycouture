import { motion } from "framer-motion";
import { Heart, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export function getCategoryStyle(category) {
  const cat = (category || "").toLowerCase().trim();
  if (cat.includes("wed")) return "bg-[#4A243B] text-[#F3E5C8]"; // Wedding - Deep Plum & Gold
  if (cat.includes("wom")) return "bg-[#6E2D3B] text-[#FDE8E9]"; // Women - Rich Rose
  if (cat.includes("saree")) return "bg-[#5B2A4A] text-[#F9E4F0]"; // Sarees - Royal Purple
  if (cat.includes("dress")) return "bg-[#1E3A4C] text-[#E0F2FE]"; // Dresses - Deep Slate Navy
  if (cat.includes("school")) return "bg-[#2D4A3E] text-[#E6F4EA]"; // School - Forest Emerald
  if (cat.includes("custom")) return "bg-[#5C3D22] text-[#FEF3C7]"; // Customised - Terracotta
  if (cat.includes("night")) return "bg-[#4C3B5C] text-[#EDE9FE]"; // Nighties - Dusk Lavender
  return "bg-primary text-white";
}

export default function DesignCard({ design }) {
  const { toggleWishlist, isWishlisted } = useApp();
  const navigate = useNavigate();
  const wishlisted = isWishlisted(design.id);

  const goToDetails = () => navigate(`/design-gallery/${design.id}`);

  const handleHeart = (e) => {
    e.stopPropagation();
    toggleWishlist(design);
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    goToDetails();
  };

  const categoryStyle = getCategoryStyle(design.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.25, ease: "easeOut" } }}
      onClick={goToDetails}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && goToDetails()}
      className="group relative rounded-2xl overflow-hidden bg-white shadow-card cursor-pointer h-full border border-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative overflow-hidden aspect-[4/5]">
        <img
          src={design.image}
          alt={design.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* dark gradient overlay */}
        <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Distinct Category Badge */}
        <span className={`absolute top-2.5 left-2.5 ${categoryStyle} text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm`}>
          {design.category}
        </span>

        {/* wishlist heart */}
        <button
          onClick={handleHeart}
          aria-label="Add to wishlist"
          className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-sm z-10 ${
            wishlisted ? "bg-accent text-white" : "bg-white/90 text-primary hover:bg-accent hover:text-white"
          }`}
        >
          <Heart size={13} fill={wishlisted ? "currentColor" : "none"} />
        </button>

        {/* bottom info bar — title + View Details */}
        <div className="absolute bottom-0 inset-x-0 p-3.5 flex items-center justify-between gap-2 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <h3 className="font-display text-xs sm:text-sm font-medium text-white leading-tight line-clamp-2">{design.title}</h3>
          <button
            onClick={handleViewDetails}
            className="shrink-0 inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-primary bg-highlight px-2.5 py-1 rounded-full hover:bg-accent hover:text-white transition-colors shadow-2xs"
          >
            View Details <ArrowRight size={10} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
