import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import DesignCard from "../components/DesignCard";
import { GridSkeleton } from "../components/Skeleton";
import { categories, designs } from "../data/mockData";

export default function DesignGallery() {
  const [params, setParams] = useSearchParams();
  const activeCategory = params.get("category") || "All";
  const [loading, setLoading] = useState(true);
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
  };

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <SectionHeading
        eyebrow="Design Gallery"
        title="Stitched by Lucky Couture"
        subtitle="Browse past work across categories — tap any design to book something similar, tailored to you."
      />

      {/* Search Bar */}
      <div className="max-w-md mx-auto mb-6 relative">
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

      {/* Horizontal Category Filter Bar */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap overflow-x-auto pb-2 mb-8 no-scrollbar">
        {["All", ...categories].map((cat) => {
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
  );
}
