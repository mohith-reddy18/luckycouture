import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Star, ShoppingBag, Zap, Scissors, ChevronLeft, Minus, Plus, MapPin, Truck, CheckCircle2, XCircle, Share2, MessageSquare, ShieldCheck, Edit3, Check } from "lucide-react";
import { isDealActive, getReviews } from "../data/mockData";
import { useApp } from "../context/AppContext";
import LocationModal from "../components/LocationModal";
import SEO from "../components/SEO";
import api from "../utils/api";
import getImageUrl from "../utils/imageUrl";
import { resolvePrimaryAddress } from "../utils/addressUtils";

const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state: locationState } = useLocation();
  const { user, addToCart, toggleWishlist, isWishlisted, notify, savePendingFavorite } = useApp();

  const [fetchedProduct, setFetchedProduct] = useState(null);
  const [productLoading, setProductLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    let isMounted = true;
    setProductLoading(true);
    api.get(`/api/products/${id}`)
      .then((res) => {
        if (isMounted && res?.data) {
          setFetchedProduct(res.data);
        }
      })
      .catch(() => {
        // ignore — will show not-found UI below
      })
      .finally(() => {
        if (isMounted) setProductLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const product = fetchedProduct;

  const [activeView, setActiveView] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [manualDelivery, setManualDelivery] = useState(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  // Review & Eligibility state
  const [localReviews, setLocalReviews] = useState(() => (product ? getReviews(product.id || product._id || id) : []));
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [eligibility, setEligibility] = useState({
    loading: true,
    canReview: false,
    status: "loading",
    message: "",
    existingReview: null,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState(5);
  const [editHoverRating, setEditHoverRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const formatReview = (r) => ({
    id: r._id || r.id,
    userId: r.user?._id || (typeof r.user === "string" ? r.user : r.user?.id),
    name: r.user?.name || r.name || "Customer",
    rating: r.rating,
    comment: r.comment,
    isVerifiedPurchase: r.isVerifiedPurchase !== false,
    isEdited: Boolean(r.isEdited || r.editedAt),
    date: r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : (r.date || "Recently"),
  });

  // Fetch reviews and eligibility from API
  const loadReviewsAndEligibility = useCallback(async () => {
    if (!product) return;
    const pId = product._id || product.id || product.slug;
    if (!pId) return;

    try {
      const [revsRes, eligRes] = await Promise.all([
        api.get(`/api/reviews/product/${pId}`),
        user ? api.get(`/api/reviews/eligibility?productId=${pId}`) : Promise.resolve(null),
      ]);

      if (revsRes?.data && Array.isArray(revsRes.data)) {
        if (revsRes.data.length > 0) {
          setLocalReviews(revsRes.data.map(formatReview));
        }
      }

      if (eligRes?.data) {
        setEligibility({
          loading: false,
          canReview: eligRes.data.canReview,
          status: eligRes.data.status,
          message: eligRes.data.message,
          existingReview: eligRes.data.existingReview,
        });
        if (eligRes.data.existingReview) {
          setEditRating(eligRes.data.existingReview.rating);
          setEditComment(eligRes.data.existingReview.comment);
        }
      } else if (!user) {
        setEligibility({
          loading: false,
          canReview: false,
          status: "unauthenticated",
          message: "Please sign in to leave a review.",
          existingReview: null,
        });
      }
    } catch (err) {
      console.error("Error loading reviews:", err);
      setEligibility((prev) => ({ ...prev, loading: false }));
    }
  }, [product, id, user]);

  useEffect(() => {
    loadReviewsAndEligibility();
  }, [loadReviewsAndEligibility]);  // Helper to safely match color names regardless of types or casing
  const matchesColor = (variant, targetColor) => {
    if (!variant || !targetColor) return false;
    const vColor = typeof variant === "object" ? variant?.color : variant;
    if (typeof vColor !== "string" || typeof targetColor !== "string") return false;
    return vColor.trim().toLowerCase() === targetColor.trim().toLowerCase();
  };

  // ── Color & Size Variant Management ──
  const colorList = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
      const fromVariants = product.colorVariants
        .map((v) => (typeof v === "string" ? v : v?.color))
        .filter((c) => typeof c === "string" && c.trim().length > 0)
        .map((c) => c.trim());
      if (fromVariants.length > 0) return fromVariants;
    }
    const fromColors = (Array.isArray(product.colors) ? product.colors : [])
      .map((c) => (typeof c === "string" ? c : c?.color || c?.name))
      .filter((c) => typeof c === "string" && c.trim().length > 0)
      .map((c) => c.trim());
    return Array.from(new Set(fromColors));
  }, [product]);

  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);

  useEffect(() => {
    if (colorList.length > 0) {
      setSelectedColor(colorList[0]);
    } else {
      setSelectedColor(null);
    }
  }, [colorList]);

  // Find variant object matching selectedColor
  const selectedVariant = useMemo(() => {
    if (!product || !selectedColor || !Array.isArray(product.colorVariants)) return null;
    return product.colorVariants.find((v) => matchesColor(v, selectedColor)) || null;
  }, [product, selectedColor]);

  // Available in-stock sizes derived strictly from the selected color variant's inventory (quantity > 0)
  const availableSizes = useMemo(() => {
    if (!product) return [];
    if (selectedVariant?.inventory && Array.isArray(selectedVariant.inventory) && selectedVariant.inventory.length > 0) {
      return selectedVariant.inventory
        .filter((inv) => Number(inv.quantity) > 0 && inv.size && String(inv.size).trim().length > 0)
        .map((inv) => String(inv.size).trim());
    }
    if (selectedVariant?.sizes && Array.isArray(selectedVariant.sizes) && selectedVariant.sizes.length > 0) {
      return (Number(product.stock) || 0) > 0 ? selectedVariant.sizes : [];
    }
    return (Number(product.stock) || 0) > 0 && Array.isArray(product.sizes) ? product.sizes : [];
  }, [product, selectedVariant]);

  useEffect(() => {
    if (availableSizes.length > 0) {
      setSelectedSize((prev) => (prev && availableSizes.includes(prev) ? prev : availableSizes[0]));
    } else {
      setSelectedSize(null);
    }
  }, [availableSizes]);

  // Current inventory for the selected (color, size) combination
  const currentSizeInventory = useMemo(() => {
    if (!selectedVariant || !selectedSize) return null;
    if (Array.isArray(selectedVariant.inventory) && selectedVariant.inventory.length > 0) {
      return selectedVariant.inventory.find(
        (inv) => String(inv.size).trim().toLowerCase() === String(selectedSize).trim().toLowerCase()
      ) || null;
    }
    return null;
  }, [selectedVariant, selectedSize]);

  // Authoritative stock for the active color + size variant
  const currentMaxStock = useMemo(() => {
    if (currentSizeInventory !== null && currentSizeInventory !== undefined) {
      return Number(currentSizeInventory.quantity) || 0;
    }
    if (selectedVariant && Array.isArray(selectedVariant.inventory) && selectedVariant.inventory.length > 0) {
      return 0; // Variant has inventory configured but size is missing
    }
    return Number(product?.stock) || 0;
  }, [currentSizeInventory, selectedVariant, product]);

  const inStock = currentMaxStock > 0;
  const lowStock = inStock && currentMaxStock <= 5;

  // Build image views: use selected variant images if available, otherwise fall back to main product images
  const views = useMemo(() => {
    if (!product) return [];
    const variantImgs = selectedVariant?.images && Array.isArray(selectedVariant.images) ? selectedVariant.images : [];
    const mainImgs = (
      Array.isArray(product.images) && product.images.length
        ? product.images
        : product.thumbnail
          ? [product.thumbnail]
          : product.image
            ? [product.image]
            : []
    ).filter(Boolean);

    const sourceImages = variantImgs.length > 0 ? variantImgs : mainImgs;

    return sourceImages
      .map((img, i) => ({
        label: ["Front", "Side", "Back", "Detail"][i] || `View ${i + 1}`,
        image: getImageUrl(img),
      }))
      .filter((v) => Boolean(v.image));
  }, [product, selectedVariant]);

  // Reset active gallery view to 0 when selected color changes
  useEffect(() => {
    setActiveView(0);
  }, [selectedColor]);

  useEffect(() => {
    const currentImg = views[activeView]?.image;
    if (!currentImg) return;
    const img = new Image();
    img.src = currentImg;
    img.onload = () => {
      setIsPortrait(img.naturalHeight > img.naturalWidth);
    };
  }, [activeView, views]);

  // Prefer a manually entered pincode/address; fall back to the profile's default saved address.
  const profileAddr = resolvePrimaryAddress(user?.addresses);
  const profileTarget = profileAddr ? { type: "address", address: profileAddr } : null;
  const deliveryTarget = manualDelivery ?? profileTarget;

  const setDeliveryTarget = (val) => setManualDelivery(val);

  if (productLoading) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <p className="text-sm text-ink/70">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold text-primary mb-3">Product not found</h1>
        <Link to="/shop" className="text-accent font-medium hover:underline">Back to Shop</Link>
      </div>
    );
  }

  const categoryName = product.category?.name || (typeof product.category === "string" ? product.category : "") || "Ready-to-wear";

  const productId = product._id || product.id;
  const priceNum = Number(product.price) || 0;
  const mrpNum = Number(product.mrp) || 0;
  const avgRating = localReviews.length > 0
    ? Math.round((localReviews.reduce((s, r) => s + (Number(r?.rating) || 0), 0) / localReviews.length) * 10) / 10
    : 0;
  const wishlisted = isWishlisted(productId);
  const discount = mrpNum > priceNum ? Math.round(100 - (priceNum / mrpNum) * 100) : 0;
  const dealActive = isDealActive(product);
  const isBestseller = Boolean(product.bestseller || product.isBestseller);
  const isNew = Boolean(product.recent || product.isNewArrival || product.isNew);

  const ratingBuckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: localReviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  const deliveryLabel = deliveryTarget
    ? deliveryTarget.type === "address"
      ? `${deliveryTarget.address.city} ${deliveryTarget.address.pincode}`
      : deliveryTarget.pincode
    : null;

  const handleAddToCart = () => {
    if (!inStock) return;
    const currentCover = views[0]?.image || getImageUrl(product.thumbnail || product.images?.[0]);
    addToCart(
      {
        ...product,
        size: selectedSize || "",
        color: selectedColor || "",
        maxStock: currentMaxStock,
        image: currentCover,
      },
      quantity
    );
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.name} | Lucky Couture`,
          text: `Check out ${product.name} on Lucky Couture!`,
          url: url,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          await navigator.clipboard.writeText(url);
          notify("Link copied to clipboard!");
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        notify("Link copied to clipboard!");
      } catch {
        notify("Failed to copy link");
      }
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submittingReview) return;

    setSubmittingReview(true);
    try {
      const pId = product?._id || product?.id || product?.slug || id;
      const res = await api.post("/api/reviews", {
        productId: pId,
        rating: newRating,
        comment: newComment.trim(),
      });

      const created = res.data;
      const formatted = formatReview(created);

      setLocalReviews((prev) => [formatted, ...prev.filter((r) => r.id !== formatted.id)]);
      setEligibility({
        loading: false,
        canReview: false,
        status: "already_reviewed",
        existingReview: created,
        message: "You have reviewed this product.",
      });
      setEditRating(created.rating || newRating);
      setEditComment(created.comment || newComment.trim());
      setIsEditing(false);
      setNewComment("");
      notify("Thank you! Your verified review has been published.");
    } catch (err) {
      console.error(err);
      notify(err.message || "Unable to submit your review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReviewEditSave = async (e) => {
    e.preventDefault();
    const reviewId = eligibility.existingReview?._id || eligibility.existingReview?.id;
    if (!editComment.trim() || savingEdit || !reviewId) return;

    setSavingEdit(true);
    try {
      const res = await api.patch(`/api/reviews/${reviewId}`, {
        rating: editRating,
        comment: editComment.trim(),
      });

      const updated = res.data;
      const formatted = formatReview(updated);

      setLocalReviews((prev) => prev.map((r) => (r.id === formatted.id ? formatted : r)));
      setEligibility((prev) => ({
        ...prev,
        existingReview: updated,
      }));
      setIsEditing(false);
      notify("Your review has been updated.");
    } catch (err) {
      console.error(err);
      notify(err.message || "Unable to update review. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const productSchema = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name,
        "description": product.description || `Hand-finished ${categoryName} ready-to-wear piece from Lucky Couture in Guntur.`,
        "image": views[0]?.image || "https://www.luckycouture.in/logo.jpg",
        "sku": product.sku || product._id || product.id,
        "brand": {
          "@type": "Brand",
          "name": "Lucky Couture"
        },
        "offers": {
          "@type": "Offer",
          "url": `https://www.luckycouture.in/shop/${product.slug || productId}`,
          "priceCurrency": "INR",
          "price": product.price,
          "itemCondition": "https://schema.org/NewCondition",
          "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "seller": {
            "@type": "Organization",
            "name": "Lucky Couture"
          }
        },
        ...(localReviews.length > 0 && {
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": avgRating,
            "reviewCount": localReviews.length,
            "bestRating": 5,
            "worstRating": 1
          }
        }),
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://www.luckycouture.in/"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Shop",
              "item": "https://www.luckycouture.in/shop"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": product.name,
              "item": `https://www.luckycouture.in/shop/${product.slug || productId}`
            }
          ]
        }
      }
    : null;

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16">
      <SEO
        title={product ? `${product.name} | Lucky Couture Shop` : "Shop | Lucky Couture"}
        description={product?.description || `Buy ${product?.name} from Lucky Couture. Hand-finished boutique piece with custom tailoring options.`}
        canonical={`/shop/${product?.slug || productId}`}
        image={views[0]?.image || "https://www.luckycouture.in/logo.jpg"}
        schema={productSchema}
      />
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-accent mb-8 cursor-pointer transition-colors"
      >
        <ChevronLeft size={16} /> Back to shop
      </button>

      <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 items-start mb-16">
        {/* Image gallery */}
        <div className="w-full max-w-[440px] mx-auto lg:col-span-5 lg:mx-0">
          <div className="w-full flex justify-center mb-4">
            <div className="rounded-2xl overflow-hidden shadow-card relative border border-primary/5 inline-flex items-center justify-center max-w-full bg-primary/5">
              {views[activeView]?.image ? (
                <motion.img
                  key={activeView}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  src={views[activeView].image}
                  alt={`${product.name} — view ${activeView + 1}`}
                  onLoad={(e) => {
                    const { naturalWidth, naturalHeight } = e.currentTarget;
                    setIsPortrait(naturalHeight > naturalWidth);
                  }}
                  className={`block rounded-2xl w-auto max-w-full object-contain ${
                    isPortrait
                      ? "max-h-[580px] sm:max-h-[640px] min-h-[400px]"
                      : "max-h-[340px] sm:max-h-[380px] w-full"
                  }`}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    if (e.currentTarget.nextElementSibling) {
                      e.currentTarget.nextElementSibling.style.display = "flex";
                    }
                  }}
                />
              ) : null}
              <div
                style={{ display: views[activeView]?.image ? "none" : "flex" }}
                className="w-full h-48 bg-bg/80 flex items-center justify-center text-ink/20 text-sm"
              >
                No image
              </div>
            </div>
          </div>
          {views.length > 1 && (
            <>
              <div className="grid grid-cols-4 gap-2.5">
                {views.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveView(i)}
                    className={`rounded-xl overflow-hidden aspect-[4/3] border-2 transition-all bg-white flex items-center justify-center p-1 shadow-2xs ${
                      activeView === i ? "border-accent shadow-xs scale-102" : "border-transparent hover:border-primary/30 opacity-75 hover:opacity-100"
                    }`}
                  >
                    {v.image ? (
                      <img
                        src={v.image}
                        alt={v.label}
                        loading="lazy"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full bg-bg/80 rounded-lg" />
                    )}
                    <span className="sr-only">{v.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2 justify-center">
                {views.map((v, i) => (
                  <span key={i} className={`text-[11px] ${activeView === i ? "text-accent font-semibold" : "text-primary/70 font-medium"}`}>
                    {v.label}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Shop Details — Positioned under the image/gallery column using original design */}
          <div className="mt-8 pt-6 border-t border-primary/10">
            <h3 className="font-display text-base font-semibold text-primary mb-3">Shop Details</h3>
            <dl className="flex flex-col gap-2.5">
              <div className="flex text-sm">
                <dt className="w-40 shrink-0 text-ink/50 font-medium">Product Dimensions</dt>
                <dd className="text-ink/80">{product.dimensions || "Standard"}</dd>
              </div>
              <div className="flex text-sm">
                <dt className="w-40 shrink-0 text-ink/50 font-medium">Category</dt>
                <dd className="text-primary font-medium">{categoryName || "Ready-to-wear"}</dd>
              </div>
              <div className="flex text-sm">
                <dt className="w-40 shrink-0 text-ink/50 font-medium">Net Quantity</dt>
                <dd className="text-ink/80">{product.netQuantity || "1 N"}</dd>
              </div>
              {Array.isArray(product.specifications) &&
                product.specifications.map((spec, idx) => (
                  <div key={idx} className="flex text-sm">
                    <dt className="w-40 shrink-0 text-ink/50 font-medium">{spec.label}</dt>
                    <dd className="text-ink/80">{spec.value}</dd>
                  </div>
                ))}
            </dl>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-7">
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
          <span className="text-[11px] uppercase tracking-wider text-secondary">{categoryName}</span>
          <h1 className="font-display text-3xl font-semibold text-primary mt-1 mb-3">{product.name}</h1>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={15} className={i < Math.round(avgRating) ? "text-accent fill-accent" : "text-primary/15"} />
              ))}
            </div>
            <span className="text-sm text-ink/60">{avgRating} · {localReviews.length} reviews</span>
          </div>

          {/* Stock status */}
          <div className="flex items-center gap-1.5 mb-5">
            {inStock ? (
              <>
                <CheckCircle2 size={15} className="text-green-700" />
                <span className="text-sm font-medium text-green-700">
                  In Stock{lowStock ? ` — only ${currentMaxStock} left` : ""}
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
            <span className="font-sans text-3xl font-bold text-primary tracking-tight">₹{priceNum.toLocaleString("en-IN")}</span>
            {mrpNum > priceNum && (
              <span className="font-sans text-base text-ink/40 line-through">₹{mrpNum.toLocaleString("en-IN")}</span>
            )}
            {discount > 0 && (
              dealActive ? (
                <span className="bg-[#CC0C39] text-white text-xs font-bold px-2 py-0.5 rounded">
                  {discount}% off
                </span>
              ) : (
                <span className="text-sm text-green-700 font-medium">{discount}% off</span>
              )
            )}
          </div>

          {product.description && (
            <p className="text-sm text-ink/75 leading-relaxed mb-6 max-w-md whitespace-pre-line">
              {product.description}
            </p>
          )}

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

          {/* Color Selector */}
          {colorList.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Color: <strong className="text-accent">{selectedColor}</strong>
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {colorList.map((color) => {
                  const isSelected = selectedColor === color;
                  const variantObj = Array.isArray(product.colorVariants)
                    ? product.colorVariants.find((v) => matchesColor(v, color))
                    : null;
                  const thumb = variantObj?.thumbnail || variantObj?.images?.[0];
                  const thumbUrl = thumb ? getImageUrl(thumb) : null;

                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                        isSelected
                          ? "border-accent bg-accent/10 text-primary shadow-xs ring-1 ring-accent font-semibold"
                          : "border-primary/15 bg-white text-ink/75 hover:border-accent/60 hover:text-primary"
                      }`}
                    >
                      {thumbUrl && (
                        <img
                          src={thumbUrl}
                          alt={color}
                          className="w-5 h-5 rounded-md object-cover shrink-0 border border-primary/10"
                        />
                      )}
                      <span>{color}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selector */}
          {availableSizes.length > 0 ? (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Size: <strong className="text-accent">{selectedSize}</strong>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((size) => {
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[42px] px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-primary text-bg border-primary shadow-xs"
                          : "border-primary/20 bg-white text-primary hover:border-accent hover:text-accent"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50/80 border border-red-200/80 text-xs font-medium text-red-700">
              All sizes are currently out of stock for {selectedColor ? `color "${selectedColor}"` : "this item"}.
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm text-ink/70">Quantity</span>
            <div className="flex items-center gap-3 border border-primary/15 rounded-full px-3 py-1.5">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={!inStock || quantity <= 1}
                className="w-6 h-6 flex items-center justify-center text-primary disabled:opacity-30"
                aria-label="Decrease quantity"
              >
                <Minus size={13} />
              </button>
              <span className="text-sm w-5 text-center">{inStock ? quantity : 0}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(currentMaxStock || 1, q + 1))}
                disabled={!inStock || quantity >= currentMaxStock}
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
                const currentCover = views[0]?.image || getImageUrl(product.thumbnail || product.images?.[0]);
                addToCart(
                  {
                    ...product,
                    size: selectedSize || "",
                    color: selectedColor || "",
                    maxStock: currentMaxStock,
                    image: currentCover,
                  },
                  quantity
                );
                navigate("/cart");
              }}
              disabled={!inStock}
              className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 bg-highlight text-primary text-sm sm:text-base font-semibold py-3 sm:py-3.5 px-2 rounded-full hover:bg-accent hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Zap size={16} className="shrink-0" /> <span className="truncate">Buy Now</span>
            </button>
          </div>

          {/* Favourites & Share Buttons */}
          <div className="flex gap-2.5 sm:gap-3 mb-3">
            <button
              onClick={() => {
                if (!user) {
                  savePendingFavorite(product);
                  notify("Please sign in to save items to your favorites");
                  navigate("/login");
                  return;
                }
                toggleWishlist(product);
              }}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-full border font-medium text-xs sm:text-sm transition-colors cursor-pointer ${
                wishlisted ? "bg-accent text-white border-accent" : "border-primary/15 text-primary hover:border-accent"
              }`}
            >
              <Heart size={16} className="shrink-0" fill={wishlisted ? "currentColor" : "none"} />
              <span className="truncate">{wishlisted ? "Favourited" : "Add to Favourites"}</span>
            </button>
            <button
              onClick={handleShare}
              className="flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-full border border-primary/15 text-primary hover:border-accent font-medium text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <Share2 size={16} className="shrink-0" />
              <span className="truncate">Share</span>
            </button>
          </div>

          <button
            onClick={() => {
              notify("Redirecting to booking with this cloth as reference");
              navigate("/tailoring", { state: { ...locationState, cloth: product } });
            }}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-accent border border-accent/40 py-3 rounded-full hover:bg-accent/5 transition-colors mt-3"
          >
            <Scissors size={15} /> Stitch This Cloth for Me
          </button>
        </div>
      </div>

      {/* Reviews & Ratings */}
      <div className="border-t border-primary/10 pt-12">
        <h2 className="font-display text-2xl font-semibold text-primary mb-8">Customer Reviews &amp; Ratings</h2>
        
        {/* Write / Edit / Eligibility Review Section */}
        <div className="bg-bg/60 rounded-2xl p-5 sm:p-6 border border-primary/10 mb-10">
          {!user ? (
            <div>
              <h3 className="font-display text-base font-semibold text-primary mb-2">Write a Review</h3>
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5 text-center my-2">
                <p className="text-xs sm:text-sm text-ink/70 mb-3">
                  Please sign in with your account to leave a review.
                </p>
                <Link to="/login" className="inline-flex items-center gap-1.5 bg-primary text-bg font-medium text-xs sm:text-sm px-5 py-2 rounded-full hover:bg-primary/90 transition-colors">
                  Sign In to Review
                </Link>
              </div>
            </div>
          ) : eligibility.existingReview ? (
            /* User already reviewed — Show existing review and Edit option */
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-semibold text-primary">Your Review</h3>
                  <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                    <CheckCircle2 size={13} /> Verified Buyer
                  </span>
                  {Boolean(eligibility.existingReview.isEdited || eligibility.existingReview.editedAt) && (
                    <span className="bg-primary/10 text-primary/70 text-[11px] font-medium px-2 py-0.5 rounded-md">
                      Edited
                    </span>
                  )}
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditRating(eligibility.existingReview.rating || 5);
                      setEditComment(eligibility.existingReview.comment || "");
                      setIsEditing(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline cursor-pointer"
                  >
                    <Edit3 size={14} /> Edit Review
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleReviewEditSave} className="flex flex-col gap-4 bg-white/80 p-4 rounded-xl border border-primary/10">
                  <div>
                    <label className="block text-xs font-medium text-ink/70 mb-1.5">Your Rating</label>
                    <div
                      className="flex items-center gap-1"
                      onMouseLeave={() => setEditHoverRating(0)}
                    >
                      {[1, 2, 3, 4, 5].map((star) => {
                        const activeRating = editHoverRating || editRating;
                        const isFilled = star <= activeRating;
                        return (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setEditHoverRating(star)}
                            onClick={() => setEditRating(star)}
                            className="p-1 text-accent hover:scale-110 transition-transform focus:outline-none cursor-pointer"
                            aria-label={`Rate ${star} out of 5 stars`}
                          >
                            <Star
                              size={24}
                              className={isFilled ? "text-accent fill-accent" : "text-primary/20"}
                            />
                          </button>
                        );
                      })}
                      <span className="text-xs text-ink/60 ml-2 font-medium">
                        {(editHoverRating || editRating)} of 5 stars
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink/70 mb-1.5">Your Review</label>
                    <textarea
                      rows={3}
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      placeholder="Update your review details..."
                      className="w-full p-3.5 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none bg-white placeholder:text-ink/35 resize-none shadow-2xs"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="bg-primary text-bg font-medium text-xs sm:text-sm px-6 py-2.5 rounded-full hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {savingEdit ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      disabled={savingEdit}
                      onClick={() => setIsEditing(false)}
                      className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium text-ink/70 hover:bg-primary/5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-white/70 rounded-xl p-4 border border-primary/10">
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={15}
                        className={i < eligibility.existingReview.rating ? "text-accent fill-accent" : "text-primary/15"}
                      />
                    ))}
                    <span className="text-xs font-semibold text-primary ml-1.5">
                      {eligibility.existingReview.rating} of 5 stars
                    </span>
                  </div>
                  <p className="text-sm text-ink/80 leading-relaxed">{eligibility.existingReview.comment}</p>
                </div>
              )}
            </div>
          ) : eligibility.status === "eligible" ? (
            /* Eligible to review */
            <div>
              <h3 className="font-display text-base font-semibold text-primary mb-2">Write a Review</h3>
              <form onSubmit={handleReviewSubmit} className="flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                    <CheckCircle2 size={13} /> Verified Buyer
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink/70 mb-1.5">Your Rating</label>
                  <div
                    className="flex items-center gap-1"
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    {[1, 2, 3, 4, 5].map((star) => {
                      const activeRating = hoverRating || newRating;
                      const isFilled = star <= activeRating;
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onClick={() => setNewRating(star)}
                          className="p-1 text-accent hover:scale-110 transition-transform focus:outline-none cursor-pointer"
                          aria-label={`Rate ${star} out of 5 stars`}
                        >
                          <Star
                            size={24}
                            className={isFilled ? "text-accent fill-accent" : "text-primary/20"}
                          />
                        </button>
                      );
                    })}
                    <span className="text-xs text-ink/60 ml-2 font-medium">
                      {(hoverRating || newRating)} of 5 stars
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink/70 mb-1.5">Your Review</label>
                  <textarea
                    rows={3}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share details about quality, fabric, and fitting..."
                    className="w-full p-3.5 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none bg-white placeholder:text-ink/35 resize-none shadow-2xs"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="self-start bg-primary text-bg font-medium text-xs sm:text-sm px-6 py-2.5 rounded-full hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReview ? "Submitting..." : "Submit Verified Review"}
                </button>
              </form>
            </div>
          ) : eligibility.status === "order_not_completed" ? (
            /* Order placed but not delivered */
            <div>
              <h3 className="font-display text-base font-semibold text-primary mb-2">Write a Review</h3>
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 text-center my-2">
                <p className="text-xs sm:text-sm text-ink/70">
                  You can review this item after your order is completed.
                </p>
              </div>
            </div>
          ) : (
            /* Not purchased */
            <div>
              <h3 className="font-display text-base font-semibold text-primary mb-2">Write a Review</h3>
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 text-center my-2">
                <p className="text-xs sm:text-sm text-ink/70">
                  Purchase this item and complete your order to leave a review.
                </p>
              </div>
            </div>
          )}
        </div>

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
            <p className="text-sm text-ink/50 mb-6">{localReviews.length} global ratings</p>
            <div className="flex flex-col gap-1.5">
              {ratingBuckets.map((b) => (
                <div key={b.star} className="flex items-center gap-2 text-xs text-ink/60">
                  <span className="w-10">{b.star} star</span>
                  <div className="flex-1 h-2 bg-primary/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full"
                      style={{ width: localReviews.length > 0 ? `${(b.count / localReviews.length) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="w-5 text-right">{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {localReviews.length > 0 ? (
              localReviews.map((r) => (
                <div key={r.id} className="border-b border-primary/10 pb-6 last:border-none">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="w-8 h-8 rounded-full bg-primary text-highlight flex items-center justify-center text-xs font-semibold">
                      {(r.name && r.name[0]) ? r.name[0] : "C"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-primary">{r.name}</p>
                        {r.isVerifiedPurchase && (
                          <span className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.2 rounded font-medium inline-flex items-center gap-0.5">
                            <Check size={10} /> Verified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={11} className={i < r.rating ? "text-accent fill-accent" : "text-primary/15"} />
                        ))}
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <span className="text-xs text-ink/40 block">{r.date}</span>
                      {r.isEdited && (
                        <span className="text-[10px] text-ink/40 font-medium italic block">Edited</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-ink/70 leading-relaxed">{r.comment}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-bg/40 rounded-2xl border border-primary/5">
                <MessageSquare size={32} className="mx-auto text-primary/25 mb-3" />
                <h4 className="font-display text-base font-semibold text-primary mb-1">No reviews yet</h4>
                <p className="text-xs sm:text-sm text-ink/60">Be the first to leave a review for this product!</p>
              </div>
            )}
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

