import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import DesignCard from "../components/DesignCard";
import { GridSkeleton } from "../components/Skeleton";
import SEO from "../components/SEO";
import api from "../utils/api";

const DEFAULT_GALLERY_CATEGORIES = [
  "Bridal", "Party Wear", "Casual", "Traditional", "Embroidery", "Maggam Work", "Hand Work", "Designer", "Festive", "Other"
];

const gallerySchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Lucky Couture Design Gallery",
  "description": "Explore Lucky Couture's curated design gallery featuring bridal lehengas, maggam work blouses, designer kurtis, sarees, and custom tailoring patterns in Guntur.",
  "url": "https://www.luckycouture.in/design-gallery",
  "isPartOf": {
    "@type": "WebSite",
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
      }
    ]
  }
};

export default function DesignGallery() {
  const [params, setParams] = useSearchParams();
  const activeCategory = params.get("category") || "All";
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [designs, setDesigns] = useState([]);
  const [categories, setCategories] = useState([]);

  // Fetch designs and categories from the live API
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [designsRes, catsRes] = await Promise.all([
        api.get("/api/designs?limit=200"),
        api.get("/api/categories?limit=100"),
      ]);
      setDesigns(designsRes.data || []);
      // Use design-type and "both" categories for the filter bar
      const allCats = (catsRes.data || []).filter((c) => c.type !== "shop" && c.isActive !== false);
      setCategories(allCats);
    } catch (err) {
      console.error("Design gallery fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    let list = designs;

    if (activeCategory !== "All") {
      list = list.filter((d) => {
        const catName = d.category?.name || (typeof d.category === "string" ? d.category : "");
        const catSlug = d.category?.slug || "";
        return (
          catName.toLowerCase() === activeCategory.toLowerCase() ||
          catSlug.toLowerCase() === activeCategory.toLowerCase().replace(/[\s_]+/g, "-") ||
          catSlug.toLowerCase() === activeCategory.toLowerCase().replace(/[\s-]+/g, "_")
        );
      });
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          (d.title || "").toLowerCase().includes(q) ||
          (d.category?.name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [designs, activeCategory, searchQuery]);

  const setCategory = (cat) => {
    if (cat === "All") setParams({});
    else setParams({ category: cat });
  };

  // Build category names from the API categories list or predefined gallery categories
  const categoryNames = categories.length > 0
    ? categories.map((c) => c.name)
    : DEFAULT_GALLERY_CATEGORIES;

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 pt-8 sm:pt-10 md:pt-14 pb-16 md:pb-24">
      <SEO
        title="Lucky Couture Design Gallery | Bespoke & Custom Designs"
        description="Explore Lucky Couture's curated design gallery featuring bridal lehengas, maggam work blouses, designer kurtis, sarees, and custom tailoring patterns in Guntur."
        canonical="/design-gallery"
        schema={gallerySchema}
      />
      {/* Hero Header & Search Section Container Box */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl bg-primary border border-highlight/25 py-5 px-4 sm:px-10 md:py-10 mb-6 shadow-card text-center"
      >
        {/* Inclined Diamond Grid Pattern clipped inside the hero box */}
        <svg
          className="absolute inset-0 w-full h-full opacity-15 pointer-events-none text-highlight"
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="inclined-gallery-hero-grid"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="#EDD9A3"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#inclined-gallery-hero-grid)" />
        </svg>

        <div className="relative z-10">
          <SectionHeading
            light
            animate={false}
            eyebrow="Design Gallery"
            title="Stitched by Lucky Couture"
            subtitle="Browse past work across categories — tap any design to book something similar, tailored to you."
          />

          {/* Search Bar */}
          <div className="max-w-md mx-auto relative z-10">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by design name or category..."
              className="w-full pl-11 pr-9 py-3 rounded-full border border-highlight/30 focus:border-highlight outline-none text-sm bg-bg text-primary placeholder:text-ink/40 shadow-card transition-shadow focus:shadow-soft"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary transition-colors"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Horizontal Category Filter Bar */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap overflow-x-auto pb-2 mb-8 no-scrollbar">
        {["All", ...categoryNames].map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`whitespace-nowrap text-xs sm:text-sm px-4 py-2 rounded-full transition-all duration-200 ${
                isActive
                  ? "bg-primary text-highlight font-semibold shadow-xs ring-1 ring-primary"
                  : "bg-white text-primary/80 hover:text-primary hover:bg-bg border border-primary/15 shadow-2xs font-medium"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Results Count Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs sm:text-sm font-medium text-ink/50">
          Showing <span className="text-primary font-semibold">{filtered.length}</span> designs
        </p>
      </div>

      {/* Full-width Gallery Grid */}
      <div>
        {loading ? (
          <GridSkeleton count={8} h="h-80" />
        ) : (
          <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-7 items-stretch">
            {filtered.map((d) => (
              <DesignCard key={d._id} design={d} />
            ))}
          </motion.div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-center text-ink/50 py-16">
            {searchQuery ? `No designs match "${searchQuery}".` : "No designs found in this category yet."}
          </p>
        )}
      </div>
    </div>
  );
}
