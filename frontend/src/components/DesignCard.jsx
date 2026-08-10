import { motion } from "framer-motion";
import { Heart, ArrowRight, Sparkles, Star } from "lucide-react";
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

  const handleViewDesign = (e) => {
    e.stopPropagation();
    goToDetails();
  };

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
      <div className="relative overflow-hidden aspect-[4/5] bg-bg/50">
        <img
          src={design.image}
          alt={design.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Gradient overlay for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 opacity-90 group-hover:opacity-95 transition-opacity duration-300" />

        {/* Top Badges: Category & Reference Only */}
        <div className="absolute top-2.5 left-2.5 right-12 flex flex-wrap gap-1.5 items-center z-10">
          <span className="bg-white/90 backdrop-blur-md text-primary text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs">
            {design.category}
          </span>
          <span className="bg-primary/90 backdrop-blur-md text-highlight text-[10px] font-medium tracking-wider uppercase px-2 py-1 rounded-full shadow-xs flex items-center gap-1 border border-highlight/20">
            <Sparkles size={10} className="text-accent shrink-0" /> Reference Only
          </span>
        </div>

        {/* Wishlist / Save Heart Button */}
        <button
          onClick={handleHeart}
          aria-label="Save design to favourites"
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-xs z-10 ${
            wishlisted ? "bg-accent text-white" : "bg-white/90 text-primary hover:bg-accent hover:text-white"
          }`}
        >
          <Heart size={14} fill={wishlisted ? "currentColor" : "none"} />
        </button>

        {/* Bottom Info Section: Title, Rating, Reference Note & View Design Button */}
        <div className="absolute bottom-0 inset-x-0 p-3.5 sm:p-4 flex flex-col gap-2 z-10">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-xs sm:text-sm font-semibold text-white leading-tight line-clamp-2 drop-shadow-xs">
              {design.title}
            </h3>
            {design.rating && (
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full shrink-0 text-white text-[10px] font-medium border border-white/10">
                <Star size={10} className="text-accent fill-accent" />
                <span>{design.rating}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/15">
            <span className="text-[10px] text-white/75 font-medium tracking-wide">
              Design Reference
            </span>
            <button
              onClick={handleViewDesign}
              className="shrink-0 inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-primary bg-highlight px-3 py-1.5 rounded-full hover:bg-accent hover:text-white transition-colors shadow-2xs group/btn"
            >
              <span>View Design</span>
              <ArrowRight size={11} className="group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
