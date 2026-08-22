import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Calendar,
  Clock,
  User,
  Share2,
  Bookmark,
  Sparkles,
  ArrowRight,
  Scissors,
  ShoppingBag,
  Palette,
  MessageCircle,
  Check,
  Tag,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import SEO from "../components/SEO";
import api from "../utils/api";
import getImageUrl from "../utils/imageUrl";
import { useApp } from "../context/AppContext";
import {
  CATEGORY_STYLES,
  getLocalBlogPostBySlug,
  getLocalRelatedPosts,
  contactInfo,
} from "../data/blogData";

const FALLBACK_BLOG_IMAGE =
  "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1200&auto=format&fit=crop&q=80";

/**
 * Custom lightweight renderer for structured Markdown-like article content.
 * Converts H2, H3, bold, bullet points, blockquotes, and tables into beautiful styled elements.
 */
function ArticleContentRenderer({ rawContent }) {
  if (!rawContent) return null;

  const lines = rawContent.split("\n");
  const blocks = [];
  let currentTable = null;
  let currentList = null;

  const flushTable = () => {
    if (currentTable && currentTable.length > 0) {
      blocks.push({ type: "table", rows: currentTable });
      currentTable = null;
    }
  };

  const flushList = () => {
    if (currentList && currentList.length > 0) {
      blocks.push({ type: "list", items: currentList });
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Table rows: | Col 1 | Col 2 |
    if (line.startsWith("|") && line.endsWith("|")) {
      flushList();
      if (line.includes("---")) continue; // Skip separator line
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      if (!currentTable) currentTable = [];
      currentTable.push(cells);
      continue;
    } else {
      flushTable();
    }

    // Unordered lists: - Item or * Item
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!currentList) currentList = [];
      currentList.push(line.replace(/^[-*]\s+/, ""));
      continue;
    } else {
      flushList();
    }

    if (!line) {
      continue;
    }

    // Heading 3: ### Title
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.replace(/^###\s+/, "") });
    }
    // Heading 4: #### Title
    else if (line.startsWith("#### ")) {
      blocks.push({ type: "h4", text: line.replace(/^####\s+/, "") });
    }
    // Horizontal Rule: ---
    else if (line === "---" || line === "***") {
      blocks.push({ type: "hr" });
    }
    // Callout Quote: > Text
    else if (line.startsWith("> ")) {
      blocks.push({ type: "quote", text: line.replace(/^>\s+/, "") });
    }
    // Standard Paragraph
    else {
      blocks.push({ type: "p", text: line });
    }
  }

  flushTable();
  flushList();

  // Helper to format inline bold, italics, and internal links
  const formatInline = (text) => {
    if (!text) return "";
    // Match bold **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-bold text-primary">
            {part.slice(2, -2)}
          </strong>
        );
      }
      // Match italic *text*
      const subParts = part.split(/(\*.*?\*)/g);
      return subParts.map((sub, sIdx) => {
        if (sub.startsWith("*") && sub.endsWith("*")) {
          return (
            <em key={`${index}-${sIdx}`} className="italic text-accent">
              {sub.slice(1, -1)}
            </em>
          );
        }
        return sub;
      });
    });
  };

  return (
    <div className="prose prose-lg max-w-none text-ink/80 space-y-5 leading-relaxed text-sm sm:text-base">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "h3":
            return (
              <h2
                key={idx}
                className="font-display text-xl sm:text-2xl font-bold text-primary mt-8 mb-3 pt-2 border-b border-primary/10 pb-2 flex items-center gap-2"
              >
                <Sparkles size={18} className="text-accent shrink-0" />
                <span>{block.text}</span>
              </h2>
            );
          case "h4":
            return (
              <h3
                key={idx}
                className="font-display text-base sm:text-lg font-bold text-primary mt-5 mb-2"
              >
                {block.text}
              </h3>
            );
          case "hr":
            return <hr key={idx} className="border-t border-primary/10 my-8" />;
          case "quote":
            return (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-2xl bg-accent/10 border-l-4 border-accent text-primary text-xs sm:text-sm italic leading-relaxed my-4"
              >
                {formatInline(block.text)}
              </div>
            );
          case "list":
            return (
              <ul key={idx} className="space-y-2 pl-2 my-4">
                {block.items.map((item, lIdx) => (
                  <li key={lIdx} className="flex items-start gap-2 text-xs sm:text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                    <span>{formatInline(item)}</span>
                  </li>
                ))}
              </ul>
            );
          case "table":
            return (
              <div key={idx} className="overflow-x-auto my-6 rounded-2xl border border-primary/15 shadow-2xs">
                <table className="w-full text-left text-xs sm:text-sm border-collapse bg-white">
                  <thead>
                    <tr className="bg-primary text-bg">
                      {block.rows[0].map((th, hIdx) => (
                        <th key={hIdx} className="p-3.5 font-semibold text-xs uppercase tracking-wider">
                          {th.replace(/\*\*/g, "")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/10">
                    {block.rows.slice(1).map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-bg/40" : "bg-white"}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-3.5 text-ink font-medium">
                            {formatInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "p":
          default:
            return (
              <p key={idx} className="text-ink/80 leading-relaxed text-xs sm:text-sm md:text-base">
                {formatInline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}

export default function BlogDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { notify } = useApp();

  const [post, setPost] = useState(() => getLocalBlogPostBySlug(slug));
  const [relatedPosts, setRelatedPosts] = useState(() =>
    post ? getLocalRelatedPosts(post.slug, post.category) : []
  );
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Look up local fallback first
    const local = getLocalBlogPostBySlug(slug);
    if (local) {
      setPost(local);
      setRelatedPosts(getLocalRelatedPosts(local.slug, local.category));
    }

    setLoading(true);
    api
      .get(`/api/blogs/article/${slug}`)
      .then((res) => {
        if (isMounted && res?.data?.post) {
          setPost(res.data.post);
          if (res.data.relatedPosts && res.data.relatedPosts.length > 0) {
            setRelatedPosts(res.data.relatedPosts);
          }
        }
      })
      .catch((err) => {
        console.warn("Using offline article data:", err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    notify("Article link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(
      `Check out this article from Lucky Couture: "${post?.title}"\n\n${window.location.href}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  if (!post && !loading) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <BookOpen size={40} className="mx-auto text-primary/30 mb-4" />
        <h1 className="font-display text-2xl font-bold text-primary mb-2">Article Not Found</h1>
        <p className="text-xs text-ink/60 mb-6">
          The blog article you are looking for does not exist or may have been moved.
        </p>
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-bg font-semibold text-xs hover:bg-accent transition-colors"
        >
          <ChevronLeft size={16} /> Back to Blog
        </Link>
      </div>
    );
  }

  if (!post) return null;

  const categoryBadgeClass =
    CATEGORY_STYLES[post.category]?.badge || "bg-accent/10 text-accent border-accent/20";

  // Dynamic BlogPosting Schema for Rich Search Results
  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    image: [post.featuredImage?.url],
    datePublished: post.publishedAt || new Date().toISOString(),
    dateModified: post.updatedAt || post.publishedAt || new Date().toISOString(),
    author: {
      "@type": "Organization",
      name: post.author || "Lucky Couture Studio",
      url: "https://www.luckycouture.in",
    },
    publisher: {
      "@type": "Organization",
      name: "Lucky Couture",
      logo: {
        "@type": "ImageObject",
        url: "https://www.luckycouture.in/logo.jpg",
      },
    },
    description: post.excerpt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://www.luckycouture.in/blog/${post.slug}`,
    },
  };

  return (
    <article className="min-h-screen bg-bg/50 pb-20">
      <SEO
        title={post.metaTitle || `${post.title} | Lucky Couture Blog`}
        description={post.metaDescription || post.excerpt}
        canonical={`/blog/${post.slug}`}
        image={post.featuredImage?.url}
        type="article"
        schema={blogSchema}
      />

      {/* Breadcrumb Navigation Bar */}
      <div className="bg-white border-b border-primary/10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-3.5 flex items-center justify-between">
          <nav className="flex items-center gap-2 text-xs text-ink/60 overflow-x-auto no-scrollbar">
            <Link to="/" className="hover:text-accent font-medium">Home</Link>
            <span>/</span>
            <Link to="/blog" className="hover:text-accent font-medium">Blog</Link>
            <span>/</span>
            <span className="text-primary font-semibold truncate max-w-[200px] sm:max-w-[300px]">
              {post.title}
            </span>
          </nav>

          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline shrink-0"
          >
            <ChevronLeft size={14} /> Back to Blog
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-5 md:px-8 pt-8 sm:pt-12">
        {/* Article Header */}
        <header className="max-w-3xl mb-8 sm:mb-10">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${categoryBadgeClass}`}>
              {post.category}
            </span>
            <span className="text-xs text-ink/50 flex items-center gap-1 font-medium">
              <Calendar size={13} />
              {new Date(post.publishedAt || Date.now()).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="text-xs text-ink/50 flex items-center gap-1 font-medium">
              <Clock size={13} /> {post.readTime || "5 min read"}
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary leading-tight mb-4">
            {post.title}
          </h1>

          <p className="text-sm sm:text-base text-ink/70 leading-relaxed font-medium">
            {post.excerpt}
          </p>

          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-primary/10 text-xs text-ink/60">
            <div className="w-8 h-8 rounded-full bg-accent text-white font-bold flex items-center justify-center text-xs shadow-2xs">
              LC
            </div>
            <div>
              <span className="font-semibold text-primary block">{post.author || "Lucky Couture Studio"}</span>
              <span className="text-[11px] text-ink/50">Master Craftsmen &amp; Fashion Stylists, Guntur</span>
            </div>
          </div>
        </header>

        {/* Large Featured Image */}
        <div className="relative rounded-3xl overflow-hidden shadow-card border border-primary/10 mb-10 sm:mb-14 h-72 sm:h-96 md:h-[450px] bg-primary/5">
          <img
            src={getImageUrl(post.featuredImage?.url || post.featuredImage || post.image) || FALLBACK_BLOG_IMAGE}
            alt={post.featuredImage?.alt || post.title || "Blog article"}
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = FALLBACK_BLOG_IMAGE;
            }}
          />
        </div>

        {/* Two-Column Layout (Content + Sticky Sidebar) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* Main Left Column (Article Body) */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-10 border border-primary/10 shadow-card">
            <ArticleContentRenderer rawContent={post.content} />

            {/* Tags Pill List */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-10 pt-6 border-t border-primary/10">
                <span className="text-xs font-semibold text-ink/60 block mb-2.5 flex items-center gap-1.5">
                  <Tag size={13} className="text-accent" /> Topic Tags:
                </span>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-bg text-primary text-xs font-medium border border-primary/10"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Social Share Bar */}
            <div className="mt-8 pt-6 border-t border-primary/10 flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <Share2 size={14} className="text-accent" /> Share this article:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleWhatsAppShare}
                  className="px-3.5 py-1.5 rounded-full bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  <MessageCircle size={14} /> WhatsApp
                </button>
                <button
                  onClick={handleCopyLink}
                  className="px-3.5 py-1.5 rounded-full bg-primary/5 text-primary hover:bg-primary/10 font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Bookmark size={14} />}
                  <span>{copied ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>
            </div>

            {/* Author Bio Box */}
            <div className="mt-10 p-6 rounded-2xl bg-bg/80 border border-primary/10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary text-highlight font-display text-lg font-bold flex items-center justify-center shrink-0">
                LC
              </div>
              <div className="text-xs sm:text-sm">
                <strong className="text-primary font-bold block text-sm mb-1">
                  About Lucky Couture Atelier
                </strong>
                <p className="text-ink/70 leading-relaxed">
                  Located in Guntur, Andhra Pradesh, Lucky Couture is a bespoke women's fashion studio specializing in bridal lehengas, hand-embroidered maggam blouses, designer sarees, and 24-hour priority stitching.
                </p>
              </div>
            </div>
          </div>

          {/* Right Sidebar (Sticky CTAs & Quick Booking) */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Custom Tailoring CTA Card */}
            <div className="bg-primary text-bg rounded-3xl p-6 sm:p-7 shadow-card border border-highlight/20 sticky top-24 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-highlight text-[11px] font-bold uppercase tracking-wider">
                <Scissors size={12} /> Custom Stitching
              </div>
              <h3 className="font-display text-xl font-bold text-bg leading-tight">
                Love This Design? Get It Custom Stitched
              </h3>
              <p className="text-xs text-bg/80 leading-relaxed">
                Send us your fabric or pick from our premium silk &amp; cotton catalog. Our master tailors in Guntur guarantee single-needle perfection.
              </p>
              <div className="pt-2 space-y-2.5">
                <Link
                  to="/tailoring"
                  className="w-full py-3 rounded-full bg-highlight text-primary font-semibold text-xs text-center block hover:bg-white transition-colors shadow-sm"
                >
                  Book Tailoring Order
                </Link>
                <Link
                  to="/design-gallery"
                  className="w-full py-3 rounded-full border border-bg/25 text-bg font-semibold text-xs text-center block hover:bg-bg/10 transition-colors"
                >
                  Explore Design Gallery
                </Link>
              </div>

              <div className="pt-4 border-t border-bg/15 text-[11px] text-bg/70 flex items-center justify-between">
                <span>Priority 24h Stitching Available</span>
                <Link to="/priority-stitching" className="text-highlight underline font-semibold">
                  Learn more
                </Link>
              </div>
            </div>

            {/* WhatsApp Consultation Box */}
            <div className="bg-white rounded-3xl p-6 border border-primary/10 shadow-card text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#25D366]/10 text-[#128C7E] flex items-center justify-center mx-auto">
                <MessageCircle size={20} />
              </div>
              <h4 className="font-display text-base font-bold text-primary">
                Have a Styling Question?
              </h4>
              <p className="text-xs text-ink/60 leading-relaxed">
                Chat directly with our master stylists on WhatsApp for blouse neckline advice, fabric yardage estimates, and price quotes.
              </p>
              <a
                href={`${contactInfo.whatsappHref}?text=${encodeURIComponent(
                  `Hi Lucky Couture, I was reading your blog article "${post.title}" and would like to ask a tailoring question.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-[#25D366] hover:bg-[#1ebd5b] text-white font-semibold text-xs transition-colors shadow-xs"
              >
                <MessageCircle size={14} /> Chat on WhatsApp
              </a>
            </div>
          </aside>
        </div>

        {/* Related Articles Section */}
        {relatedPosts && relatedPosts.length > 0 && (
          <section className="mt-16 sm:mt-20 pt-12 border-t border-primary/10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[11px] uppercase font-bold tracking-widest text-accent block mb-1">
                  Keep Reading
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary">
                  Related Articles
                </h2>
              </div>
              <Link
                to="/blog"
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
              >
                <span>View All Articles</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((rel, idx) => {
                const badge =
                  CATEGORY_STYLES[rel.category]?.badge || "bg-primary/10 text-primary border-primary/15";
                const relImg =
                  getImageUrl(rel.featuredImage?.url || rel.featuredImage || rel.image) || FALLBACK_BLOG_IMAGE;
                return (
                  <article
                    key={rel.slug || idx}
                    className="bg-white rounded-2xl border border-primary/10 shadow-card hover:shadow-xl hover:scale-[1.025] transition-all duration-300 ease-out overflow-hidden flex flex-col group"
                  >
                    <Link to={`/blog/${rel.slug}`} className="block h-44 overflow-hidden bg-primary/5 shrink-0">
                      <img
                        src={relImg}
                        alt={rel.title}
                        className="w-full h-full object-cover object-center"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = FALLBACK_BLOG_IMAGE;
                        }}
                      />
                    </Link>
                    <div className="p-5 flex flex-col flex-1 justify-between">
                      <div>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 border ${badge}`}>
                          {rel.category}
                        </span>
                        <Link to={`/blog/${rel.slug}`}>
                          <h3 className="font-display text-sm font-bold text-primary group-hover:text-accent transition-colors line-clamp-2 mb-2">
                            {rel.title}
                          </h3>
                        </Link>
                        <p className="text-xs text-ink/60 line-clamp-2 mb-3">
                          {rel.excerpt}
                        </p>
                      </div>
                      <Link
                        to={`/blog/${rel.slug}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline mt-auto"
                      >
                        <span>Read Article</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
