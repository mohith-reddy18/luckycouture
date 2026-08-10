import { useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Star, Scissors, ChevronLeft, ShieldCheck, RefreshCw, Share2, MessageSquare, Sparkles, Ruler } from "lucide-react";
import { designs, designViews, getReviews } from "../data/mockData";
import { useApp } from "../context/AppContext";

export default function DesignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state: locationState } = useLocation();
  const { user, toggleWishlist, isWishlisted, notify, savePendingFavorite } = useApp();

  const design = designs.find((d) => d.id === id);
  const [activeView, setActiveView] = useState(0);

  // Local state for reviews (API not implemented yet)
  const [localReviews, setLocalReviews] = useState(() => (design ? getReviews(design.id) : []));
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");

  if (!design) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold text-primary mb-3">Design not found</h1>
        <Link to="/design-gallery" className="text-accent font-medium hover:underline">Back to Design Gallery</Link>
      </div>
    );
  }

  const views = designViews(design);
  const avgRating = localReviews.length > 0
    ? Math.round((localReviews.reduce((s, r) => s + r.rating, 0) / localReviews.length) * 10) / 10
    : 0;
  const wishlisted = isWishlisted(design.id);

  const ratingBuckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: localReviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${design.title} | Lucky Couture`,
          text: `Check out ${design.title} on Lucky Couture!`,
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

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const reviewObj = {
      id: "rev_" + Date.now(),
      name: user?.name || "Verified Client",
      rating: newRating,
      comment: newComment.trim(),
      date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    };

    setLocalReviews([reviewObj, ...localReviews]);
    setNewComment("");
    setNewRating(5);
    notify("Thank you! Your review has been submitted.");
  };

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-accent mb-8 transition-colors"
      >
        <ChevronLeft size={16} /> Back to gallery
      </button>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 mb-16">
        {/* Image gallery */}
        <div>
          <div className="rounded-2xl overflow-hidden bg-white shadow-card mb-4 aspect-[4/5]">
            <motion.img
              key={activeView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              src={views[activeView].image}
              alt={`${design.title} — ${views[activeView].label} view`}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {views.map((v, i) => (
              <button
                key={v.label}
                onClick={() => setActiveView(i)}
                className={`rounded-xl overflow-hidden aspect-[4/5] border-2 transition-colors ${
                  activeView === i ? "border-accent" : "border-transparent hover:border-primary/30"
                }`}
              >
                <img src={v.image} alt={v.label} loading="lazy" className="w-full h-full object-cover" />
                <span className="sr-only">{v.label} view</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2 justify-center">
            {views.map((v, i) => (
              <span key={v.label} className={`text-[11px] ${activeView === i ? "text-accent font-semibold" : "text-primary/70 font-medium"}`}>
                {v.label}
              </span>
            ))}
          </div>
        </div>

        {/* Details */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">{design.category}</span>
          <h1 className="font-display text-3xl font-semibold text-primary mt-1 mb-3">{design.title}</h1>

          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={15} className={i < Math.round(avgRating) ? "text-accent fill-accent" : "text-primary/20"} />
              ))}
            </div>
            <span className="text-sm font-medium text-primary/85">{avgRating} · {localReviews.length} reviews</span>
          </div>

          <p className="text-sm text-primary/90 font-normal leading-relaxed mb-8 max-w-md">
            Hand-finished {design.category.toLowerCase()} piece from our design gallery — stitched
            in-house and available as a ready reference for your own custom order, with the same
            embroidery and tailoring detail shown here.
          </p>

          {/* Primary Action: Book This Design */}
          <button
            onClick={() => {
              notify("Redirecting to booking with this design as reference");
              navigate("/tailoring", { state: { ...locationState, design } });
            }}
            className="w-full flex items-center justify-center gap-2.5 bg-highlight text-primary font-bold text-sm sm:text-base py-3.5 px-6 rounded-full hover:bg-accent hover:text-white transition-colors shadow-sm mb-4"
          >
            <Scissors size={18} /> Book This Design, Custom-Fit to You
          </button>

          {/* Favourites & Share Buttons */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => {
                if (!user) {
                  savePendingFavorite(design);
                  notify("Please sign in to save items to your favorites");
                  navigate("/login");
                  return;
                }
                toggleWishlist(design);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full border font-medium text-sm transition-colors ${
                wishlisted ? "bg-accent text-white border-accent" : "border-primary/20 text-primary hover:border-accent"
              }`}
            >
              <Heart size={16} fill={wishlisted ? "currentColor" : "none"} />
              {wishlisted ? "Favourited" : "Save to Favourites"}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full border border-primary/20 text-primary hover:border-accent font-medium text-sm transition-colors"
            >
              <Share2 size={16} /> Share
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

        {/* Write Review Section */}
        <div className="bg-white/80 rounded-2xl p-5 sm:p-6 border border-primary/15 shadow-card mb-10">
          <h3 className="font-display text-base font-semibold text-primary mb-2">Write a Review</h3>
          {user ? (
            <form onSubmit={handleReviewSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">Your Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className="p-1 text-accent hover:scale-110 transition-transform"
                    >
                      <Star
                        size={22}
                        className={star <= newRating ? "text-accent fill-accent" : "text-primary/25"}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-primary font-semibold ml-2">{newRating} of 5 stars</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">Your Review</label>
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share details about design quality, embroidery, and fitting..."
                  className="w-full p-3.5 text-sm text-primary rounded-xl border border-primary/20 focus:border-accent outline-none bg-white placeholder:text-primary/50 resize-none shadow-2xs"
                  required
                />
              </div>

              <button
                type="submit"
                className="self-start bg-primary text-bg font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-full hover:bg-primary/90 transition-colors shadow-sm"
              >
                Submit Review
              </button>
            </form>
          ) : (
            <p className="text-xs sm:text-sm text-primary/85 font-medium">
              Have you ordered this design?{" "}
              <Link to="/login" className="text-accent font-bold hover:underline">
                Sign in to submit your review
              </Link>
            </p>
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
                      <p className="text-sm font-semibold text-primary">{r.name}</p>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={11} className={i < r.rating ? "text-accent fill-accent" : "text-primary/20"} />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-primary/70 font-medium ml-auto">{r.date}</span>
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
