import { useState, useEffect } from "react";
import { Star, Trash2, Eye, EyeOff, Search } from "lucide-react";
import api from "../../utils/api";
import { useApp } from "../../context/AppContext";

export default function AdminReviews() {
  const { notify } = useApp();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/reviews");
      setReviews(res.data);
    } catch (err) {
      console.error(err);
      notify("Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleToggleStatus = async (review) => {
    const newStatus = review.status === "visible" ? "hidden" : "visible";
    try {
      await api.patch(`/api/reviews/${review._id}/status`, { status: newStatus });
      notify(`Review marked as ${newStatus}`);
      setReviews(reviews.map(r => r._id === review._id ? { ...r, status: newStatus } : r));
    } catch (err) {
      console.error(err);
      notify("Failed to update review status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this review?")) return;
    try {
      await api.delete(`/api/reviews/${id}`);
      notify("Review deleted successfully");
      setReviews(reviews.filter(r => r._id !== id));
    } catch (err) {
      console.error(err);
      notify("Failed to delete review");
    }
  };

  const filteredReviews = reviews.filter(r => 
    r.comment?.toLowerCase().includes(search.toLowerCase()) || 
    r.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.product?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 md:p-8 border-l-4 border-accent space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Star size={20} className="text-accent" />
            <h3 className="font-display text-xl font-semibold text-primary">
              Reviews Moderation
            </h3>
          </div>
          <p className="text-xs text-ink/60">
            Monitor customer feedback, moderate inappropriate content, and manage ratings.
          </p>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            type="text"
            placeholder="Search reviews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none w-full sm:w-64"
          />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10 text-ink/50 text-sm">Loading reviews...</div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-10 text-ink/50 text-sm">No reviews found.</div>
        ) : (
          filteredReviews.map((review) => (
            <div key={review._id} className={`p-5 rounded-2xl border ${review.status === 'hidden' ? 'bg-bg/40 border-primary/5' : 'bg-white border-primary/10'} shadow-sm flex flex-col md:flex-row gap-5`}>
              {/* Product Info */}
              <div className="shrink-0 w-full md:w-32">
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-bg/50 mb-2">
                  {review.product?.images?.[0]?.url && (
                    <img src={review.product.images[0].url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <p className="text-xs font-semibold text-primary truncate" title={review.product?.name}>
                  {review.product?.name || "Unknown Product"}
                </p>
              </div>

              {/* Review Content */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex text-accent">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} className={i < review.rating ? "fill-accent" : "text-primary/20"} />
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-primary">
                        {review.user?.name || "Anonymous User"}
                      </span>
                      {review.status === "hidden" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
                          Hidden
                        </span>
                      )}
                    </div>
                    {review.title && <h4 className="font-semibold text-sm text-primary mb-1">{review.title}</h4>}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => handleToggleStatus(review)} 
                      className={`p-1.5 rounded-lg transition-colors ${review.status === 'visible' ? 'text-primary/50 hover:bg-bg hover:text-primary' : 'text-accent hover:bg-accent/10'}`}
                      title={review.status === "visible" ? "Hide Review" : "Make Visible"}
                    >
                      {review.status === "visible" ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button 
                      onClick={() => handleDelete(review._id)} 
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Review"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <p className={`text-sm ${review.status === 'hidden' ? 'text-ink/40' : 'text-ink/80'} whitespace-pre-wrap leading-relaxed`}>
                  {review.comment}
                </p>
                
                <div className="mt-auto pt-3 text-[11px] text-ink/40">
                  Posted on {new Date(review.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
