import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  Tag,
  Scissors,
  ChevronRight,
  TrendingUp,
  Share2,
  CheckCircle2,
} from "lucide-react";
import SEO from "../components/SEO";
import api from "../utils/api";
import getImageUrl from "../utils/imageUrl";
import { BLOG_CATEGORIES, CATEGORY_STYLES, initialBlogPosts } from "../data/blogData";

const FALLBACK_BLOG_IMAGE =
  "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1200&auto=format&fit=crop&q=80";

export default function Blog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "All";
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [posts, setPosts] = useState(initialBlogPosts);
  const [loading, setLoading] = useState(false);

  // Fetch blogs from API, fallback seamlessly to initialBlogPosts
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .get("/api/blogs?limit=50")
      .then((res) => {
        if (isMounted && res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setPosts(res.data);
        }
      })
      .catch((err) => {
        // Silently use initialBlogPosts fallback
        console.warn("Using offline blog dataset:", err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCategoryChange = (category) => {
    const nextParams = new URLSearchParams(searchParams);
    if (category === "All") {
      nextParams.delete("category");
    } else {
      nextParams.set("category", category);
    }
    setSearchParams(nextParams);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    const nextParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      nextParams.set("q", val);
    } else {
      nextParams.delete("q");
    }
    setSearchParams(nextParams);
  };

  // Filtered list
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchCategory =
        activeCategory === "All" ||
        (post.category || "").toLowerCase() === activeCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (post.title || "").toLowerCase().includes(q) ||
        (post.excerpt || "").toLowerCase().includes(q) ||
        (post.category || "").toLowerCase().includes(q) ||
        (post.tags || []).some((t) => t.toLowerCase().includes(q));

      return matchCategory && matchSearch;
    });
  }, [posts, activeCategory, searchQuery]);

  // Featured article is the first article or top viewed
  const featuredPost = useMemo(() => {
    if (filteredPosts.length > 0) return filteredPosts[0];
    return posts[0] || null;
  }, [filteredPosts, posts]);

  const gridPosts = useMemo(() => {
    if (filteredPosts.length <= 1) return filteredPosts;
    return filteredPosts.slice(1);
  }, [filteredPosts]);

  return (
    <div className="min-h-screen bg-bg/50 pb-20">
      <SEO
        title="Fashion, Tailoring & Styling Tips | Lucky Couture"
        description="Read expert guides on saree blouse measurements, 2026 bridal blouse designs, neckline styling tips, fabric selection, and custom tailoring from Lucky Couture."
        canonical="/blog"
      />

      {/* Hero Header */}
      <section className="relative overflow-hidden pt-12 pb-14 md:pt-16 md:pb-20 bg-gradient-to-b from-primary/5 via-bg to-bg border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-semibold uppercase tracking-widest mb-4 shadow-2xs">
            <Sparkles size={13} /> The Couture Journal
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary tracking-tight mb-4">
            Stories, Styling &amp; <span className="text-accent italic">Craftsmanship</span>
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-ink/70 leading-relaxed">
            Expert tailoring tips, master measurement guides, bridal blouse trend forecasts, and the art of bespoke Indian couture from the Lucky Couture studio.
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto mt-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search articles, designs, measurements, fabrics..."
              className="w-full pl-11 pr-4 py-3.5 rounded-full bg-white border border-primary/15 shadow-sm text-sm text-primary placeholder:text-ink/40 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  const nextParams = new URLSearchParams(searchParams);
                  nextParams.delete("q");
                  setSearchParams(nextParams);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink/50 hover:text-accent bg-bg/80 px-2 py-1 rounded-md cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-5 md:px-8 pt-8">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-primary/10 mb-10">
          {BLOG_CATEGORIES.map((category) => {
            const isSelected = activeCategory === category;
            return (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-primary text-bg shadow-sm"
                    : "bg-white text-primary/75 hover:text-primary hover:bg-primary/5 border border-primary/10"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Lead Featured Article Spotlight (shown on initial view or when matches exist) */}
        {!searchQuery && activeCategory === "All" && featuredPost && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-14"
          >
            <div className="bg-white rounded-3xl overflow-hidden border border-primary/10 shadow-card hover:shadow-xl hover:scale-[1.02] transition-all duration-300 ease-out grid lg:grid-cols-12 gap-0">
              <div className="lg:col-span-7 relative h-72 sm:h-96 lg:h-auto overflow-hidden bg-primary/5">
                <img
                  src={getImageUrl(featuredPost.featuredImage?.url || featuredPost.featuredImage || featuredPost.image) || FALLBACK_BLOG_IMAGE}
                  alt={featuredPost.featuredImage?.alt || featuredPost.title || "Featured Blog Article"}
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_BLOG_IMAGE;
                  }}
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-accent text-white uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                    <Sparkles size={12} /> Featured Lead
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 text-xs text-ink/60 mb-3">
                    <span className="font-semibold text-accent uppercase tracking-wider">
                      {featuredPost.category}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} /> {featuredPost.readTime || "6 min read"}
                    </span>
                  </div>

                  <Link to={`/blog/${featuredPost.slug}`}>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary leading-tight mb-3">
                      {featuredPost.title}
                    </h2>
                  </Link>

                  <p className="text-xs sm:text-sm text-ink/70 leading-relaxed line-clamp-3 sm:line-clamp-4 mb-6">
                    {featuredPost.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-primary/10 flex items-center justify-between">
                  <span className="text-xs text-ink/50 flex items-center gap-1.5 font-medium">
                    <Calendar size={13} />
                    {new Date(featuredPost.publishedAt || Date.now()).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>

                  <Link
                    to={`/blog/${featuredPost.slug}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-bg font-semibold text-xs hover:bg-primary/90 transition-colors shadow-xs"
                  >
                    <span>Read Full Article</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Section Heading */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-primary">
              {activeCategory === "All" ? "Latest Articles" : `${activeCategory} Articles`}
            </h2>
            <p className="text-xs text-ink/60 mt-0.5">
              Showing {filteredPosts.length} article{filteredPosts.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Blog Cards Grid */}
        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {(!searchQuery && activeCategory === "All" ? gridPosts : filteredPosts).map((post, idx) => {
              const categoryBadgeClass =
                CATEGORY_STYLES[post.category]?.badge || "bg-primary/10 text-primary border-primary/15";
              const cardImage =
                getImageUrl(post.featuredImage?.url || post.featuredImage || post.image) || FALLBACK_BLOG_IMAGE;

              return (
                <motion.article
                  key={post.id || post.slug || idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="bg-white rounded-2xl border border-primary/10 shadow-card hover:shadow-xl hover:scale-[1.025] transition-all duration-300 ease-out flex flex-col overflow-hidden"
                >
                  {/* Thumbnail Image Container */}
                  <Link
                    to={`/blog/${post.slug}`}
                    className="relative block h-52 sm:h-56 overflow-hidden bg-primary/5 shrink-0"
                  >
                    <img
                      src={cardImage}
                      alt={post.featuredImage?.alt || post.title || "Lucky Couture Blog"}
                      className="w-full h-full object-cover object-center"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_BLOG_IMAGE;
                      }}
                    />
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border backdrop-blur-md bg-white/90 shadow-2xs ${categoryBadgeClass}`}>
                        {post.category}
                      </span>
                    </div>
                  </Link>

                  {/* Body Content */}
                  <div className="p-5 sm:p-6 flex flex-col flex-1 justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] text-ink/50 mb-2.5">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar size={12} />
                          {new Date(post.publishedAt || Date.now()).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-medium">
                          <Clock size={12} /> {post.readTime || "5 min read"}
                        </span>
                      </div>

                      <Link to={`/blog/${post.slug}`}>
                        <h3 className="font-display text-lg font-bold text-primary leading-snug line-clamp-2 mb-2">
                          {post.title}
                        </h3>
                      </Link>

                      <p className="text-xs text-ink/70 leading-relaxed line-clamp-3 mb-4">
                        {post.excerpt}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-primary/5 flex items-center justify-between mt-auto">
                      <span className="text-[11px] font-medium text-ink/50 truncate max-w-[130px]">
                        {post.author ? post.author.split("&")[0] : "Lucky Couture"}
                      </span>

                      <Link
                        to={`/blog/${post.slug}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline transition-colors"
                      >
                        <span>Read Article</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-primary/10 p-12 text-center max-w-md mx-auto my-12 shadow-card">
            <BookOpen size={40} className="mx-auto text-primary/30 mb-4" />
            <h3 className="font-display text-lg font-bold text-primary mb-2">No articles found</h3>
            <p className="text-xs text-ink/60 mb-6">
              We couldn't find any articles matching your search or selected category.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                handleCategoryChange("All");
              }}
              className="px-5 py-2.5 rounded-full bg-primary text-bg text-xs font-semibold hover:bg-accent transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Studio Tailoring Banner CTA */}
        <section className="mt-16 sm:mt-20 bg-gradient-to-r from-primary via-[#3B2D3A] to-primary text-bg rounded-3xl p-8 sm:p-12 md:p-14 relative overflow-hidden shadow-xl border border-highlight/20 flex items-center justify-center text-center">
          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 text-highlight text-xs font-semibold uppercase tracking-wider mb-4 shadow-2xs">
              <Scissors size={13} /> Bespoke Tailoring Atelier
            </span>
            <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-bg mb-3 max-w-xl mx-auto leading-tight">
              Have a Dream Blouse or Saree Outfit in Mind?
            </h3>
            <p className="text-xs sm:text-sm text-bg/85 leading-relaxed mb-7 max-w-lg mx-auto">
              Our master craftsmen in Guntur bring your custom designs to life with single-needle pattern cutting, 3D Maggam embroidery, and guaranteed fit accuracy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
              <Link
                to="/tailoring"
                className="w-full sm:w-auto px-7 py-3 rounded-full bg-highlight text-primary font-semibold text-xs sm:text-sm hover:bg-white transition-colors shadow-sm text-center"
              >
                Book Custom Tailoring
              </Link>
              <Link
                to="/design-gallery"
                className="w-full sm:w-auto px-7 py-3 rounded-full border border-bg/30 text-bg font-semibold text-xs sm:text-sm hover:bg-bg/10 transition-colors text-center"
              >
                Explore Design Gallery
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
