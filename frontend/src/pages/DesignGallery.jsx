import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { SlidersHorizontal, Search, X } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import DesignCard from "../components/DesignCard";
import { GridSkeleton } from "../components/Skeleton";
import { categories, designs } from "../data/mockData";

export default function DesignGallery() {
  const [params, setParams] = useSearchParams();
  const activeCategory = params.get("category") || "All";
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    let list = activeCategory === "All" ? designs : designs.filter((d) => d.category === activeCategory);

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) => d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCategory, searchQuery]);

  const setCategory = (cat) => {
    if (cat === "All") setParams({});
    else setParams({ category: cat });
    setShowFilters(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <SectionHeading
        eyebrow="Design Gallery"
        title="Stitched by Lucky Couture"
        subtitle="Browse past work across categories — tap any design to book something similar, tailored to you."
      />

      <div className="max-w-md mx-auto mb-8 relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by design name or category..."
          className="w-full pl-11 pr-9 py-3 rounded-full border border-primary/15 focus:border-accent outline-none text-sm bg-white shadow-card"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/35 hover:text-primary"
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mb-6 lg:hidden">
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="flex items-center gap-2 text-sm font-medium text-primary border border-primary/15 px-4 py-2 rounded-full"
        >
          <SlidersHorizontal size={14} /> Filters
        </button>
        <span className="text-sm text-ink/50">{filtered.length} designs</span>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-10">
        {/* Sticky filter sidebar — pinned below the navbar, and scrolls
            internally if its own content ever exceeds the viewport height,
            so you never have to scroll the whole page to reach a filter. */}
        <aside className={`${showFilters ? "block" : "hidden"} lg:block lg:self-start`}>
          <div className="bg-white rounded-2xl shadow-card p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <h4 className="font-display text-base font-semibold text-primary mb-4">Category</h4>
            <div className="flex flex-col gap-1">
              {["All", ...categories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                    activeCategory === cat ? "bg-highlight/50 text-primary font-medium" : "text-ink/60 hover:bg-bg"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Gallery grid */}
        <div>
          <p className="hidden lg:block text-sm text-ink/50 mb-6">{filtered.length} designs</p>
          {loading ? (
            <GridSkeleton count={9} h="h-80" />
          ) : (
            <motion.div layout className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-7 items-stretch">
              {filtered.map((d) => (
                <DesignCard key={d.id} design={d} />
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
    </div>
  );
}
