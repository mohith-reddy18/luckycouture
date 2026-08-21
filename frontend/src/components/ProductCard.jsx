import { memo } from "react";
import { motion } from "framer-motion";
import { Heart, Star, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { isDealActive } from "../data/mockData";
import getImageUrl from "../utils/imageUrl";



/**
 * ProductCard
 * Uses unified card scale hover animation (whileHover: scale 1.05, 0.28s easeOut)
 * with zero relative motion between card and image, matching Home & Design Gallery.
 */
function ProductCard({ product }) {
  const { toggleWishlist, isWishlisted, user, notify, savePendingFavorite } = useApp();
  const navigate = useNavigate();
  // Support both API shape (_id) and legacy mock shape (id)
  const productId = product._id || product.id;
  const firstVariant = Array.isArray(product.colorVariants) && product.colorVariants.length > 0
    ? product.colorVariants[0]
    : null;
  const firstVariantImg = firstVariant?.images?.[0] || firstVariant?.thumbnail;
  const rawImage =
    (firstVariantImg?.url && String(firstVariantImg.url).trim()) ||
    (typeof firstVariantImg === "string" && firstVariantImg.trim()) ||
    (firstVariant && getImageUrl(firstVariant)) ||
    (product.thumbnail?.url && String(product.thumbnail.url).trim()) ||
    (product.images?.[0]?.url && String(product.images[0].url).trim()) ||
    (typeof product.thumbnail === "string" && product.thumbnail.trim()) ||
    (typeof product.images?.[0] === "string" && product.images[0].trim()) ||
    firstVariantImg ||
    product.thumbnail ||
    product.images ||
    product.image;

  const categoryName = product.category?.name || (typeof product.category === "string" ? product.category : "") || "";
  const imageUrl = getImageUrl(rawImage);

  const ratingValue = Number(product.ratingAverage || product.rating) || 0;
  const liked = isWishlisted(productId);
  const priceNum = Number(product.price) || 0;
  const mrpNum = Number(product.mrp) || 0;
  const discount = mrpNum > priceNum ? Math.round(100 - (priceNum / mrpNum) * 100) : 0;
  const dealActive = isDealActive(product);
  const isBestseller = Boolean(product.bestseller || product.isBestseller);
  const isNew = Boolean(product.recent || product.isNewArrival || product.isNew);

  const handleHeart = (e) => {
    e.stopPropagation();
    if (!user) {
      savePendingFavorite({ ...product, id: productId });
      notify("Please sign in to save items to your favorites");
      navigate("/login");
      return;
    }
    toggleWishlist({ ...product, id: productId });
  };

  const navTarget = product.slug || productId;

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.2, ease: "easeOut" } }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={() => navigate(`/shop/${navTarget}`)}
      className="group bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-card hover:shadow-soft cursor-pointer flex flex-col h-full border border-primary/10 transition-shadow duration-200"
    >
      {/* Compact Image Container */}
      <div className="relative overflow-hidden aspect-square bg-bg/40 flex items-center justify-center w-full p-2">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
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

        {/* Compact Bestseller & New Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10 pointer-events-none">
          {isBestseller && (
            <span className="bg-highlight text-primary text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md shadow-xs">
              Bestseller
            </span>
          )}
          {isNew && (
            <span className="bg-accent text-white text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md shadow-xs">
              New
            </span>
          )}
        </div>

        {/* Compact Wishlist Heart Icon */}
        <button
          type="button"
          onClick={handleHeart}
          aria-label="Toggle wishlist"
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-xs z-10 ${
            liked ? "bg-accent text-white" : "bg-white/85 text-primary hover:bg-accent hover:text-white"
          }`}
        >
          <Heart size={13} fill={liked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Compact Content Area */}
      <div className="p-2.5 sm:p-3 flex flex-col flex-1 justify-between gap-1.5">
        <div>
          {/* Category & Rating Row */}
          <div className="flex items-center justify-between text-[10px] text-secondary font-medium mb-0.5">
            <span className="uppercase tracking-wider truncate font-semibold">{categoryName}</span>
            <div className="flex items-center gap-1 text-ink/70 shrink-0">
              <Star size={10} className="text-accent fill-accent" />
              <span className="font-semibold">{ratingValue}</span>
            </div>
          </div>

          {/* Product Title */}
          <h3 className="font-display text-xs sm:text-sm font-medium text-primary leading-tight line-clamp-1 sm:line-clamp-2 group-hover:text-accent transition-colors">
            {product.name}
          </h3>
        </div>

        {/* Compact Pricing & Action Button Block */}
        <div className="pt-0.5">
          {/* Price + MRP + Discount Inline */}
          <div className="flex items-baseline justify-between gap-1 flex-wrap mb-2">
            <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
              <span className="text-xs sm:text-sm font-bold text-primary whitespace-nowrap">
                ₹{priceNum.toLocaleString("en-IN")}
              </span>
              {mrpNum > priceNum && (
                <span className="text-[10px] sm:text-[11px] text-ink/40 line-through whitespace-nowrap">
                  ₹{mrpNum.toLocaleString("en-IN")}
                </span>
              )}
              {discount > 0 && (
                <span className={`text-[10px] sm:text-[11px] font-bold ${dealActive ? "text-[#CC0C39]" : "text-green-700"} whitespace-nowrap`}>
                  {discount}% off
                </span>
              )}
            </div>

            {dealActive && (
              <span className="bg-[#CC0C39] text-white text-[8px] sm:text-[9px] font-bold tracking-tight uppercase px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap leading-none">
                Deal
              </span>
            )}
          </div>

          {/* Compact View Details Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/shop/${navTarget}`);
            }}
            className="w-full text-center text-[10.5px] sm:text-[11px] font-semibold text-primary bg-bg/80 hover:bg-primary hover:text-white border border-primary/15 py-1 sm:py-1.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-1 group/btn"
          >
            View Details <ArrowRight size={11} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(ProductCard);
