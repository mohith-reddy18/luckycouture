import { memo } from "react";
import { motion } from "framer-motion";
import { Heart, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import getImageUrl from "../utils/imageUrl";

/**
 * DesignCard
 * Exactly mirrors the Home page card hover architecture:
 * Single unified card scale (whileHover: scale 1.05, 0.28s easeOut) with zero relative motion.
 */
function DesignCard({ design }) {
  const { toggleWishlist, isWishlisted, user, notify, savePendingFavorite } = useApp();
  const navigate = useNavigate();

  // Support both API shape (_id + slug) and legacy mock shape (id)
  const cardId = design._id || design.id;
  const navTarget = design.slug || design._id || design.id;
  const rawImage =
    (design.thumbnail?.url && String(design.thumbnail.url).trim()) ||
    (design.images?.[0]?.url && String(design.images[0].url).trim()) ||
    (typeof design.thumbnail === "string" && design.thumbnail.trim()) ||
    (typeof design.images?.[0] === "string" && design.images[0].trim()) ||
    design.thumbnail ||
    design.images ||
    design.image;

  const categoryName = design.category?.name || (typeof design.category === "string" ? design.category : "");
  const imageUrl = getImageUrl(rawImage);

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
      whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
      viewport={{ once: true, margin: "-40px" }}
      whileHover={{ scale: 1.05, transition: { duration: 0.28, ease: "easeOut" } }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      onClick={goToDetails}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && goToDetails()}
      className="group relative rounded-2xl overflow-hidden bg-white shadow-card hover:shadow-soft cursor-pointer h-full border border-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative overflow-hidden aspect-square sm:aspect-[4/5] bg-bg flex items-center justify-center w-full h-full">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={design.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              if (e.currentTarget.nextElementSibling) {
                e.currentTarget.nextElementSibling.style.display = "flex";
              }
            }}
          />
        ) : null}

        <div
          style={{ display: imageUrl ? "none" : "flex" }}
          className="w-full h-full flex items-center justify-center text-ink/30 text-xs bg-bg"
        >
          No image
        </div>

        {/* dark gradient overlay on hover */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Category Tag */}
        {categoryName && (
          <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-md text-primary text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm z-10 pointer-events-none">
            {categoryName}
          </span>
        )}

        {/* Wishlist Heart */}
        <button
          type="button"
          onClick={handleHeart}
          aria-label="Add to wishlist"
          className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-sm z-10 ${
            wishlisted ? "bg-accent text-white" : "bg-white/90 text-primary hover:bg-accent hover:text-white"
          }`}
        >
          <Heart size={13} fill={wishlisted ? "currentColor" : "none"} />
        </button>

        {/* bottom info bar — title + View Design */}
        <div className="absolute bottom-0 inset-x-0 p-3.5 flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <h3 className="font-display text-xs sm:text-sm font-medium text-white leading-tight line-clamp-2">{design.title}</h3>
          <button
            type="button"
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
