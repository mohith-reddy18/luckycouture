import { memo } from "react";
import { motion } from "framer-motion";
import { Heart, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

function DesignCard({ design }) {
  const { toggleWishlist, isWishlisted, user, notify, savePendingFavorite } = useApp();
  const navigate = useNavigate();

  // Support both API shape (_id + slug) and legacy mock shape (id)
  const cardId = design._id || design.id;
  const navTarget = design.slug || design._id || design.id;
  const imageUrl = design.thumbnail?.url || design.images?.[0]?.url || design.image;
  const categoryName = design.category?.name || design.category || "";

  const wishlisted = isWishlisted(cardId);

  const goToDetails = () => navigate(`/design-gallery/${navTarget}`);

  const handleHeart = (e) => {
    e.stopPropagation();
    if (!user) {
      savePendingFavorite({ ...design, id: cardId });
      notify("Please sign in to save items to your favorites");
      navigate("/login");
      return;
    }
    toggleWishlist({ ...design, id: cardId });
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
      <div className="relative overflow-hidden aspect-square sm:aspect-[4/5]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={design.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-bg/80 flex items-center justify-center text-ink/20 text-xs">No image</div>
        )}

        {/* dark gradient overlay on hover */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Category Tag */}
        <span className="absolute top-2.5 left-2.5 bg-white/85 backdrop-blur-md text-primary text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
          {categoryName}
        </span>

        {/* Wishlist Heart */}
        <button
          onClick={handleHeart}
          aria-label="Add to wishlist"
          className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-sm z-10 ${
            wishlisted ? "bg-accent text-white" : "bg-white/90 text-primary hover:bg-accent hover:text-white"
          }`}
        >
          <Heart size={13} fill={wishlisted ? "currentColor" : "none"} />
        </button>

        {/* bottom info bar — title + View Design */}
        <div className="absolute bottom-0 inset-x-0 p-3.5 flex items-center justify-between gap-2 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <h3 className="font-display text-xs sm:text-sm font-medium text-white leading-tight line-clamp-2">{design.title}</h3>
          <button
            onClick={handleViewDesign}
            className="shrink-0 inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-primary bg-highlight px-2.5 py-1 rounded-full hover:bg-accent hover:text-white transition-colors shadow-2xs"
          >
            View Design <ArrowRight size={10} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(DesignCard);
