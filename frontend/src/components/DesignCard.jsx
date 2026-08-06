import { motion } from "framer-motion";
import { Heart, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.05, transition: { duration: 0.28, ease: "easeOut" } }}
      onClick={goToDetails}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && goToDetails()}
      className="group relative rounded-2xl overflow-hidden bg-white shadow-card cursor-pointer h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative overflow-hidden aspect-[4/5]">
        <img
          src={design.image}
          alt={design.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />

        {/* dark gradient — constrained to just the text zone at the bottom,
            not the whole image, fading smoothly rather than a hard block */}
        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/85 via-black/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* category badge — always visible */}
        <span className="absolute top-3 left-3 bg-white/85 backdrop-blur text-primary text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">
          {design.category}
        </span>

        {/* wishlist heart — always visible */}
        <button
          onClick={handleHeart}
          aria-label="Add to wishlist"
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-colors z-10 ${
            wishlisted ? "bg-accent text-white" : "bg-white/85 text-primary hover:bg-accent hover:text-white"
          }`}
        >
          <Heart size={15} fill={wishlisted ? "currentColor" : "none"} />
        </button>

        {/* bottom info bar — title + View Details, revealed on hover */}
        <div className="absolute bottom-0 inset-x-0 p-4 flex items-center justify-between gap-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400">
          <h3 className="font-display text-sm font-medium text-white line-clamp-1">{design.title}</h3>
          <button
            onClick={handleViewDetails}
            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-highlight px-3 py-1.5 rounded-full hover:bg-accent hover:text-white transition-colors"
          >
            View Details <ArrowRight size={11} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
