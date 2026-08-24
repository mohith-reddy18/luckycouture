import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Star, Scissors, ChevronLeft, RefreshCw, Share2, MessageSquare, Sparkles, Ruler, Edit3, CheckCircle2, Check } from "lucide-react";
import { fabricCatalog, standardFabricRequirements, getReviews } from "../data/mockData";
import { useApp } from "../context/AppContext";
import SEO from "../components/SEO";
import api from "../utils/api";
import getImageUrl from "../utils/imageUrl";

export default function DesignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state: locationState } = useLocation();
  const { user, toggleWishlist, isWishlisted, notify, savePendingFavorite } = useApp();

  const [design, setDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeView, setActiveView] = useState(0);

  // Reviews & Eligibility state
  const [localReviews, setLocalReviews] = useState([]);
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

  const [selectedFabricName, setSelectedFabricName] = useState("");
  const [isPortrait, setIsPortrait] = useState(false);

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

  const loadReviewsAndEligibility = useCallback(async (designDoc) => {
    const dId = designDoc?._id || designDoc?.id || designDoc?.slug || id;
    if (!dId) return;

    try {
      const [revsRes, eligRes] = await Promise.all([
        api.get(`/api/reviews/design/${dId}`),
        user ? api.get(`/api/reviews/eligibility?designId=${dId}`) : Promise.resolve(null),
      ]);

      if (revsRes?.data && Array.isArray(revsRes.data)) {
        if (revsRes.data.length > 0) {
          setLocalReviews(revsRes.data.map(formatReview));
        } else {
          // Fallback to seeded reviews if empty
          setLocalReviews(getReviews(designDoc?._id || id));
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
      console.error("Error loading design reviews:", err);
      setEligibility((prev) => ({ ...prev, loading: false }));
    }
  }, [id, user]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    let mounted = true;
    setLoading(true);
    setNotFound(false);

    api.get(`/api/designs/${id}`)
      .then((res) => {
        if (!mounted) return;
        const d = res.data;
        setDesign(d);
        const firstFab = (d.availableFabrics || [])[0] || "Silk";
        setSelectedFabricName(firstFab);
        setActiveView(0);
        loadReviewsAndEligibility(d);
      })
      .catch(() => {
        if (mounted) setNotFound(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [id, loadReviewsAndEligibility]);

  // --- Build image gallery views ---
  // Use images array from API; fall back to thumbnail / image if no images
  const allImages = (
    design?.images?.length
      ? design.images
      : design?.thumbnail
        ? [design.thumbnail]
        : design?.image
          ? [design.image]
          : []
  ).filter(Boolean);

  // Views for the image strip — use the actual stored images
  const views = allImages.length > 0
    ? allImages
        .map((img, i) => ({
          label: `View ${i + 1}`,
          image: getImageUrl(img),
        }))
        .filter((v) => Boolean(v.image))
    : [];

  useEffect(() => {
    const currentImg = views[activeView]?.image;
    if (!currentImg) return;
    const img = new Image();
    img.src = currentImg;
    img.onload = () => {
      setIsPortrait(img.naturalHeight > img.naturalWidth);
    };
  }, [activeView, views]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !design) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold text-primary mb-3">Design not found</h1>
        <Link to="/design-gallery" className="text-accent font-medium hover:underline">Back to Design Gallery</Link>
      </div>
    );
  }

  const categoryName = design.category?.name || (typeof design.category === "string" ? design.category : "");

  // --- Fabric & pricing ---
  const availableFabricNames = design.availableFabrics?.length
    ? design.availableFabrics
    : ["Silk", "Cotton", "Premium Silk"];

  const selectedFabricObj = fabricCatalog.find(
    (f) => f.name.toLowerCase() === (selectedFabricName || "").toLowerCase()
  ) || { name: selectedFabricName || "Silk", pricePerMeter: 850 };

  const garmentName = design.garment || "Blouse";
  const stdFabricQty = design.standardFabricQty
    || standardFabricRequirements[garmentName]
    || 1;

  const designCost = design.designCost || design.estimatedPrice || 2000;
  const fabricCost = selectedFabricObj.pricePerMeter * stdFabricQty;
  const estimatedTotal = designCost + fabricCost;

  // --- Reviews summary ---
  const avgRating = localReviews.length > 0
    ? Math.round((localReviews.reduce((s, r) => s + r.rating, 0) / localReviews.length) * 10) / 10
    : 0;

  const wishlisted = isWishlisted(design._id || design.id);

  const ratingBuckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: localReviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  // --- Actions ---
  const handleBookThisDesign = () => {
    const bookingState = {
      ...locationState,
      design: {
        ...design,
        // Normalise id field so tailoring flow works regardless of _id vs id
        id: design._id || design.id,
      },
      isGalleryDesign: true,
      selectedFabric: {
        name: selectedFabricObj.name,
        pricePerMeter: selectedFabricObj.pricePerMeter,
        totalCost: fabricCost,
      },
      standardFabricQty: stdFabricQty,
      designCost,
      estimatedTotal,
      garment: garmentName,
      // designType from DB or fall back to the label based on difficultyLevel
      designType: design.designType || design.difficultyLevel || "other",
    };

    if (!user) {
      notify("Please sign in to book this design");
      navigate("/login", { state: { from: "/tailoring", intendedState: bookingState } });
      return;
    }

    notify("Redirecting to booking with this design as reference");
    navigate("/tailoring", { state: bookingState });
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${design.title} | Lucky Couture`,
          text: `Check out ${design.title} on Lucky Couture!`,
          url,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          await navigator.clipboard.writeText(url).catch(() => {});
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
      const dId = design?._id || design?.id || design?.slug || id;
      const res = await api.post("/api/reviews", {
        designId: dId,
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
        message: "You have reviewed this design.",
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

  const designSchema = design
    ? {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": design.title,
        "description": design.description || `Bespoke ${design.garment || "garment"} design tailored by Lucky Couture in Guntur.`,
        "image": views[0]?.image || "https://www.luckycouture.in/logo.jpg",
        "creator": {
          "@type": "Organization",
          "name": "Lucky Couture",
          "url": "https://www.luckycouture.in/"
        },
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
              "name": "Design Gallery",
              "item": "https://www.luckycouture.in/design-gallery"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": design.title,
              "item": `https://www.luckycouture.in/design-gallery/${design.slug || id}`
            }
          ]
        }
      }
    : null;

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16">
      <SEO
        title={design ? `${design.title} | Lucky Couture Design Gallery` : "Design Gallery | Lucky Couture"}
        description={design?.description || `Explore this bespoke ${design?.garment || "design"} tailored to measure by Lucky Couture in Guntur.`}
        canonical={`/design-gallery/${design?.slug || id}`}
        image={views[0]?.image || "https://www.luckycouture.in/logo.jpg"}
        schema={designSchema}
      />
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-accent mb-8 cursor-pointer transition-colors"
      >
        <ChevronLeft size={16} /> Back to gallery
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
                  alt={`${design.title} — view ${activeView + 1}`}
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
                      <img src={getImageUrl(v.image)} alt={v.label} loading="lazy" className="w-full h-full object-contain rounded-lg" />
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
        </div>

        {/* Details */}
        <div className="lg:col-span-7">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">{categoryName}</span>
            {design.designType && (
              <>
                <span className="text-ink/30">•</span>
                <span className="text-[11px] font-semibold text-accent">{design.designType}</span>
              </>
            )}
          </div>
          <h1 className="font-display text-3xl font-semibold text-primary mb-2">{design.title}</h1>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={15} className={i < Math.round(avgRating) ? "text-accent fill-accent" : "text-primary/20"} />
              ))}
            </div>
            <span className="text-sm font-medium text-primary/85">{avgRating} · {localReviews.length} reviews</span>
          </div>

          <p className="text-sm text-primary/90 font-normal leading-relaxed mb-6 max-w-md">
            {design.description ||
              `Hand-finished ${categoryName.toLowerCase()} piece from our design gallery — stitched in-house and available as a ready reference for your own custom order.`}
          </p>

          {/* DESIGN / WORK COST */}
          <div className="bg-bg/80 border border-primary/15 rounded-2xl p-4 mb-5 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">DESIGN / WORK COST</span>
              <span className="font-display text-2xl font-bold text-primary">₹{designCost.toLocaleString("en-IN")}</span>
            </div>
            <p className="text-xs text-ink/70">Includes the design work shown in this reference.</p>
          </div>

          {/* FABRIC REQUIREMENT */}
          <div className="mb-5 p-4 rounded-2xl bg-white border border-primary/15 shadow-card">
            <h3 className="text-xs font-bold uppercase tracking-wider text-secondary mb-2">FABRIC REQUIREMENT</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-primary font-medium">Garment: <strong>{garmentName}</strong></span>
              <span className="text-primary font-medium">
                Standard requirement: <strong>{stdFabricQty} {stdFabricQty === 1 ? "metre" : "metres"}</strong>
              </span>
            </div>
          </div>

          {/* AVAILABLE FABRICS */}
          <div className="mb-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2.5">AVAILABLE FABRICS</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {availableFabricNames.map((fabName) => {
                const fabObj = fabricCatalog.find((f) => f.name.toLowerCase() === fabName.toLowerCase()) || { pricePerMeter: 850 };
                const isSelected = (selectedFabricName || "").toLowerCase() === fabName.toLowerCase();
                return (
                  <button
                    key={fabName}
                    type="button"
                    onClick={() => setSelectedFabricName(fabName)}
                    className={`p-3 rounded-xl border text-left transition-colors flex flex-col justify-between ${
                      isSelected ? "bg-primary text-bg border-primary shadow-xs" : "border-primary/15 hover:border-primary/40 bg-white"
                    }`}
                  >
                    <span className="text-xs font-semibold">{fabName}</span>
                    <span className={`text-[11px] font-medium mt-1 ${isSelected ? "text-highlight" : "text-accent"}`}>
                      ₹{fabObj.pricePerMeter} / metre
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ESTIMATED DESIGN + FABRIC */}
          <div className="bg-highlight/30 border border-accent/30 rounded-2xl p-5 mb-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">ESTIMATED DESIGN + FABRIC</h3>
            <div className="space-y-2 text-sm border-b border-primary/15 pb-3 mb-3">
              <div className="flex justify-between text-ink/80">
                <span>Design / Work Cost</span>
                <span className="font-semibold text-primary">₹{designCost.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-ink/80">
                <span>{selectedFabricObj.name} — {stdFabricQty} {stdFabricQty === 1 ? "metre" : "metres"}</span>
                <span className="font-semibold text-primary">₹{fabricCost.toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between mb-3">
              <span className="font-display font-semibold text-base text-primary">Design + Fabric</span>
              <span className="font-display text-2xl font-bold text-accent">₹{estimatedTotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="space-y-1 pt-1 text-[11px] text-ink/75 border-t border-primary/15">
              <p>• Tailoring charges are calculated separately.</p>
              <p>• Delivery charges are added only if delivery is selected.</p>
              <p>• No GST.</p>
            </div>
          </div>

          {/* Primary Action */}
          <button
            onClick={handleBookThisDesign}
            className="w-full flex items-center justify-center gap-2.5 bg-highlight text-primary font-bold text-sm sm:text-base py-3.5 px-6 rounded-full hover:bg-accent hover:text-white transition-colors shadow-sm mb-4"
          >
            <Scissors size={18} /> Book This Design
          </button>

          {/* Favourites & Share */}
          <div className="flex gap-2.5 sm:gap-3 mb-8">
            <button
              onClick={() => {
                const designWithId = { ...design, id: design._id || design.id };
                if (!user) {
                  savePendingFavorite(designWithId);
                  notify("Please sign in to save items to your favorites");
                  navigate("/login");
                  return;
                }
                toggleWishlist(designWithId);
              }}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-full border font-medium text-xs sm:text-sm transition-colors cursor-pointer ${
                wishlisted ? "bg-accent text-white border-accent" : "border-primary/20 text-primary hover:border-accent"
              }`}
            >
              <Heart size={16} className="shrink-0" fill={wishlisted ? "currentColor" : "none"} />
              <span className="truncate">{wishlisted ? "Favourited" : "Save to Favourites"}</span>
            </button>
            <button
              onClick={handleShare}
              className="flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-full border border-primary/20 text-primary hover:border-accent font-medium text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <Share2 size={16} className="shrink-0" />
              <span className="truncate">Share</span>
            </button>
          </div>

          {/* Tailoring reference badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-4 pt-5 border-t border-primary/15">
            {[
              { icon: Scissors, label: "Custom Hand Stitching" },
              { icon: Ruler, label: "Made to Your Measurements" },
              { icon: Sparkles, label: "Bespoke Embroidery" },
              { icon: RefreshCw, label: "Free Alteration, 15 Days" },
            ].map((b) => (
              <div key={b.label} className="flex flex-col items-center text-center gap-2">
                <span className="w-10 h-10 rounded-full bg-primary text-highlight shadow-xs flex items-center justify-center shrink-0">
                  <b.icon size={18} className="text-highlight" />
                </span>
                <span className="text-xs font-semibold text-primary leading-tight">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews & Ratings */}
      <div className="border-t border-primary/15 pt-12">
        <h2 className="font-display text-2xl font-semibold text-primary mb-8">Customer Reviews &amp; Ratings</h2>

        {/* Write / Edit / Eligibility Review Section */}
        <div className="bg-white/80 rounded-2xl p-5 sm:p-6 border border-primary/15 shadow-card mb-10">
          {!user ? (
            <div>
              <h3 className="font-display text-base font-semibold text-primary mb-2">Write a Review</h3>
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5 text-center my-2">
                <p className="text-xs sm:text-sm text-primary/80 mb-3">
                  Have you ordered this design? Please sign in with your account to leave a review.
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
                <form onSubmit={handleReviewEditSave} className="flex flex-col gap-4 bg-white/90 p-4 rounded-xl border border-primary/10">
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1.5">Your Rating</label>
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
                      <span className="text-xs text-primary font-semibold ml-2">
                        {(editHoverRating || editRating)} of 5 stars
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1.5">Your Review</label>
                    <textarea
                      rows={3}
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      placeholder="Update your review details..."
                      className="w-full p-3.5 text-sm text-primary rounded-xl border border-primary/20 focus:border-accent outline-none bg-white placeholder:text-primary/40 resize-none shadow-2xs"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="bg-primary text-bg font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-full hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {savingEdit ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      disabled={savingEdit}
                      onClick={() => setIsEditing(false)}
                      className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium text-primary/70 hover:bg-primary/5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-white rounded-xl p-4 border border-primary/10">
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
                  <p className="text-sm text-ink leading-relaxed">{eligibility.existingReview.comment}</p>
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
                  <label className="block text-xs font-semibold text-primary mb-1.5">Your Rating</label>
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
                    <span className="text-xs text-primary font-semibold ml-2">
                      {(hoverRating || newRating)} of 5 stars
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1.5">Your Review</label>
                  <textarea
                    rows={3}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share details about design quality, embroidery, and fitting..."
                    className="w-full p-3.5 text-sm text-primary rounded-xl border border-primary/20 focus:border-accent outline-none bg-white placeholder:text-primary/40 resize-none shadow-2xs"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="self-start bg-primary text-bg font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-full hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReview ? "Submitting..." : "Submit Verified Review"}
                </button>
              </form>
            </div>
          ) : eligibility.status === "order_not_completed" ? (
            /* Tailoring order placed but not completed */
            <div>
              <h3 className="font-display text-base font-semibold text-primary mb-2">Write a Review</h3>
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 text-center my-2">
                <p className="text-xs sm:text-sm text-primary/80">
                  You can review this design after your order is completed.
                </p>
              </div>
            </div>
          ) : (
            /* Not ordered */
            <div>
              <h3 className="font-display text-base font-semibold text-primary mb-2">Write a Review</h3>
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 text-center my-2">
                <p className="text-xs sm:text-sm text-primary/80">
                  Order this design through custom tailoring and complete your order to leave a review.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-10">
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-display text-4xl font-bold text-primary">{avgRating}</span>
              <span className="text-primary/70 text-sm font-medium">out of 5</span>
            </div>
            <div className="flex items-center gap-0.5 mb-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} className={i < Math.round(avgRating) ? "text-accent fill-accent" : "text-primary/20"} />
              ))}
            </div>
            <p className="text-sm text-primary/80 font-medium mb-6">{localReviews.length} global ratings</p>
            <div className="flex flex-col gap-1.5">
              {ratingBuckets.map((b) => (
                <div key={b.star} className="flex items-center gap-2 text-xs font-medium text-primary">
                  <span className="w-10">{b.star} star</span>
                  <div className="flex-1 h-2.5 bg-primary/15 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full"
                      style={{ width: localReviews.length > 0 ? `${(b.count / localReviews.length) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="w-5 text-right font-semibold">{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {localReviews.length > 0 ? (
              localReviews.map((r) => (
                <div key={r.id} className="border-b border-primary/15 pb-6 last:border-none">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="w-8 h-8 rounded-full bg-primary text-highlight flex items-center justify-center text-xs font-semibold">
                      {r.name[0]}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-primary">{r.name}</p>
                        {r.isVerifiedPurchase && (
                          <span className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.2 rounded font-medium inline-flex items-center gap-0.5">
                            <Check size={10} /> Verified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={11} className={i < r.rating ? "text-accent fill-accent" : "text-primary/20"} />
                        ))}
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <span className="text-xs text-primary/70 font-medium block">{r.date}</span>
                      {r.isEdited && (
                        <span className="text-[10px] text-primary/50 font-medium italic block">Edited</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-ink leading-relaxed font-normal">{r.comment}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-white/60 rounded-2xl border border-primary/10">
                <MessageSquare size={32} className="mx-auto text-primary/40 mb-3" />
                <h4 className="font-display text-base font-semibold text-primary mb-1">No reviews yet</h4>
                <p className="text-xs sm:text-sm text-primary/80 font-medium">Be the first to leave a review for this design!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

