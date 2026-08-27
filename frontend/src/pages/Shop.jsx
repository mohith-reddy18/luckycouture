import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, ArrowUpDown, Check, Search, X, RotateCcw } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import ProductCard from "../components/ProductCard";
import { GridSkeleton } from "../components/Skeleton";
import SEO from "../components/SEO";
import { isDealActive } from "../data/mockData";
import api from "../utils/api";

const priceRanges = [
  { id: "under1k", label: "Under ₹1,000", test: (p) => p.price < 1000 },
  { id: "1kto3k", label: "₹1,000 – ₹3,000", test: (p) => p.price >= 1000 && p.price <= 3000 },
  { id: "3kto6k", label: "₹3,000 – ₹6,000", test: (p) => p.price > 3000 && p.price <= 6000 },
  { id: "above6k", label: "Above ₹6,000", test: (p) => p.price > 6000 },
];

const ratingOptions = [
  { id: "r4", label: "4★ & above", min: 4 },
  { id: "r3", label: "3★ & above", min: 3 },
];

const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "bestsellers", label: "Best Sellers" },
];

function CheckRow({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 text-xs sm:text-sm text-ink/75 cursor-pointer py-1 group select-none">
      <span
        onClick={onChange}
        className={`w-[18px] h-[18px] rounded-md border flex items-center justify-center transition-colors shrink-0 ${
          checked ? "bg-accent border-accent text-white" : "border-primary/25 group-hover:border-accent"
        }`}
      >
        {checked && <Check size={12} />}
      </span>
      <span onClick={onChange} className={checked ? "text-primary font-medium" : ""}>
        {label}
      </span>
    </label>
  );
}

export default function Shop() {
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [shopCategories, setShopCategories] = useState([]);

  const [categoryFilters, setCategoryFilters] = useState(() => {
    const c = params.get("category");
    return c ? [c] : [];
  });
  const [priceFilters, setPriceFilters] = useState([]);
  const [ratingFilter, setRatingFilter] = useState(null);
  const [dealOnly, setDealOnly] = useState(false);
  const [bestsellerOnly, setBestsellerOnly] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);
  const [sort, setSort] = useState("featured");
  const [sortOpen, setSortOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const sortRef = useRef(null);
  const filterRef = useRef(null);

  // Fetch products and shop categories from the live API
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, catsRes] = await Promise.all([
        api.get("/api/products?limit=200"),
        api.get("/api/categories?limit=100"),
      ]);
      setProducts(productsRes.data || []);
      // Shop categories: type "shop" or "both", active only
      const shopCats = (catsRes.data || []).filter(
        (c) => (c.type === "shop" || c.type === "both") && c.isActive !== false
      );
      setShopCategories(shopCats);
    } catch (err) {
      console.error("Shop fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Dismiss Sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const toggle = (list, setList, id) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const clearAllFilters = () => {
    setCategoryFilters([]);
    setPriceFilters([]);
    setRatingFilter(null);
    setDealOnly(false);
    setBestsellerOnly(false);
    setRecentOnly(false);
  };

  const activeFilterCount =
    categoryFilters.length +
    priceFilters.length +
    (ratingFilter ? 1 : 0) +
    (dealOnly ? 1 : 0) +
    (bestsellerOnly ? 1 : 0) +
    (recentOnly ? 1 : 0);

  // Category names for filter panel
  const shopCategoryNames =
    shopCategories.length > 0
      ? shopCategories.map((c) => c.name)
      : ["Wedding", "Sarees", "Dresses", "Nighties", "Blouses", "Casual"];

  const filtered = useMemo(() => {
    let list = [...products];

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.category?.name || p.category || "").toLowerCase().includes(q)
      );
    }

    if (categoryFilters.length > 0) {
      list = list.filter((p) => {
        const catName = p.category?.name || p.category || "";
        return categoryFilters.includes(catName);
      });
    }

    if (priceFilters.length > 0) {
      list = list.filter((p) => priceRanges.some((r) => priceFilters.includes(r.id) && r.test(p)));
    }
    if (ratingFilter) {
      const min = ratingOptions.find((r) => r.id === ratingFilter)?.min ?? 0;
      list = list.filter((p) => (p.ratingAverage || p.rating || 0) >= min);
    }
    if (dealOnly) {
      list = list.filter((p) => isDealActive(p));
    }
    if (bestsellerOnly) {
      list = list.filter((p) => p.bestseller || p.isBestseller || (p.unitsSold && p.unitsSold > 50));
    }
    if (recentOnly) {
      list = list.filter((p) => p.recent || p.isNewArrival || p.isNew);
    }

    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sort === "rating")
      list.sort((a, b) => (b.ratingAverage || b.rating || 0) - (a.ratingAverage || a.rating || 0));
    if (sort === "bestsellers") list.sort((a, b) => (b.unitsSold || 0) - (a.unitsSold || 0));

    return list;
  }, [products, categoryFilters, priceFilters, ratingFilter, dealOnly, bestsellerOnly, recentOnly, sort, searchQuery]);

  const activeSort = sortOptions.find((s) => s.value === sort) || sortOptions[0];

  // Render Filter Content Body (shared between desktop sidebar and mobile drawer)
  const renderFilterContent = () => (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-base font-semibold text-primary">Filters</h4>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-accent font-medium hover:underline flex items-center gap-1"
          >
            <RotateCcw size={11} /> Clear All
          </button>
        )}
      </div>

      <div>
        <h4 className="font-display text-sm font-semibold text-primary mb-2.5">Category</h4>
        <CheckRow checked={categoryFilters.length === 0} onChange={() => setCategoryFilters([])} label="All" />
        {shopCategoryNames.map((cat) => (
          <CheckRow
            key={cat}
            checked={categoryFilters.includes(cat)}
            onChange={() => toggle(categoryFilters, setCategoryFilters, cat)}
            label={cat}
          />
        ))}
      </div>

      <div className="border-t border-primary/10 pt-4">
        <h4 className="font-display text-sm font-semibold text-primary mb-2.5">Price</h4>
        {priceRanges.map((r) => (
          <CheckRow
            key={r.id}
            checked={priceFilters.includes(r.id)}
            onChange={() => toggle(priceFilters, setPriceFilters, r.id)}
            label={r.label}
          />
        ))}
      </div>

      <div className="border-t border-primary/10 pt-4">
        <h4 className="font-display text-sm font-semibold text-primary mb-2.5">Rating</h4>
        {ratingOptions.map((r) => (
          <CheckRow
            key={r.id}
            checked={ratingFilter === r.id}
            onChange={() => setRatingFilter(ratingFilter === r.id ? null : r.id)}
            label={r.label}
          />
        ))}
      </div>

      <div className="border-t border-primary/10 pt-4">
        <h4 className="font-display text-sm font-semibold text-primary mb-2.5">Collection</h4>
        <CheckRow checked={dealOnly} onChange={() => setDealOnly((v) => !v)} label="Deals" />
        <CheckRow checked={bestsellerOnly} onChange={() => setBestsellerOnly((v) => !v)} label="Best Sellers" />
        <CheckRow checked={recentOnly} onChange={() => setRecentOnly((v) => !v)} label="New Arrivals" />
      </div>
    </div>
  );

  return (
    <div className="relative max-w-7xl mx-auto px-3.5 sm:px-6 md:px-8 pt-4 sm:pt-6 md:pt-10 pb-16 md:pb-24">
      <SEO
        title="Shop Designer Ethnic Wear & Custom Fashion | Lucky Couture"
        description="Shop ready-to-wear hand-embroidered lehengas, Kanjeevaram sarees, chikankari dresses, and nighties with professional tailoring customization."
        canonical="/shop"
        schema={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Lucky Couture Shop — Women's Fashion & Boutique Collection",
          "description":
            "Shop ready-to-wear hand-embroidered lehengas, Kanjeevaram sarees, chikankari dresses, and nighties with professional tailoring customization.",
          "url": "https://www.luckycouture.in/shop",
          "isPartOf": {
            "@type": "WebSite",
            "name": "Lucky Couture",
            "url": "https://www.luckycouture.in/",
          },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://www.luckycouture.in/",
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Shop",
                "item": "https://www.luckycouture.in/shop",
              },
            ],
          },
        }}
      />
      {/* Visible Repeating Cross-Grid Background Pattern in Page Body */}
      <div className="absolute inset-0 -z-10 pointer-events-none opacity-[0.12] overflow-hidden" aria-hidden="true">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="shop-body-cross-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#443742" strokeWidth="1" />
              <path d="M 20 15 L 20 25 M 15 20 L 25 20" fill="none" stroke="#C1791F" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#shop-body-cross-grid)" />
        </svg>
      </div>

      {/* Hero Header & Search Section Container Box */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-primary border border-highlight/25 py-5 px-4 sm:px-8 md:py-8 mb-5 sm:mb-6 shadow-card text-center"
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
              id="inclined-shop-hero-grid"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#EDD9A3" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#inclined-shop-hero-grid)" />
        </svg>

        <div className="relative z-10">
          <SectionHeading
            light
            animate={false}
            eyebrow="Shop"
            title="Ready to wear, made with care"
            subtitle="Browse our ready-to-wear collection — tap any product to choose size, color, and buy."
          />

          {/* Search Bar */}
          <div className="max-w-md mx-auto relative z-10">
            <Search size={15} className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-primary/50" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name or category..."
              className="w-full pl-9 sm:pl-11 pr-8 py-2.5 sm:py-3 rounded-full border border-highlight/30 focus:border-highlight outline-none text-xs sm:text-sm bg-bg text-primary placeholder:text-ink/40 shadow-card transition-shadow focus:shadow-soft"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary transition-colors"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Controls Bar (Filter toggle, product count, sort) */}
      <div className="flex items-center justify-between gap-2 mb-5 sm:mb-8">
        <button
          onClick={() => setShowFilters(true)}
          className="lg:hidden flex items-center gap-1.5 text-xs sm:text-sm font-medium text-primary border border-primary/15 px-3.5 py-2 rounded-full bg-white shadow-card active:bg-bg transition-colors shrink-0"
        >
          <SlidersHorizontal size={13} />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        <span className="text-xs sm:text-sm text-ink/50 hidden lg:block">{filtered.length} products</span>

        {/* Sort control */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortOpen((s) => !s)}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-primary bg-white border border-primary/15 rounded-full pl-3.5 pr-3 py-2 hover:border-accent transition-colors shadow-card"
          >
            <ArrowUpDown size={12} className="text-accent shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-none">Sort: {activeSort.label}</span>
          </button>
          {sortOpen && (
            <div className="absolute right-0 mt-2 w-52 sm:w-56 bg-white rounded-2xl shadow-soft border border-primary/10 overflow-hidden z-30 max-w-[calc(100vw-32px)]">
              {sortOptions.map((o) => (
                <button
                  key={o.value}
                  onClick={() => {
                    setSort(o.value);
                    setSortOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm transition-colors ${
                    sort === o.value ? "bg-highlight/40 text-primary font-medium" : "text-ink/70 hover:bg-bg"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Layout (Desktop Sticky Sidebar + Product Grid) */}
      <div className="grid lg:grid-cols-[240px_1fr] gap-6 lg:gap-10">
        {/* Desktop Sticky Left Filter Sidebar */}
        <aside className="hidden lg:block lg:self-start" ref={filterRef}>
          <div className="bg-white rounded-2xl shadow-card p-5 lg:sticky lg:top-24 flex flex-col gap-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {renderFilterContent()}
          </div>
        </aside>

        {/* Mobile Slide-in Filter Drawer */}
        <AnimatePresence>
          {showFilters && (
            <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFilters(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              />

              {/* Drawer panel */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 250 }}
                className="relative w-[85%] max-w-sm h-full bg-white shadow-2xl flex flex-col z-10"
              >
                {/* Drawer Header */}
                <div className="p-4 border-b border-primary/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-accent" />
                    <span className="font-display font-semibold text-primary">Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="bg-accent/15 text-accent text-xs font-bold px-2 py-0.5 rounded-full">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-1.5 text-primary/60 hover:text-primary rounded-full hover:bg-primary/5 transition-colors"
                    aria-label="Close filters"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Drawer Scrollable Content */}
                <div className="p-5 flex-1 overflow-y-auto">{renderFilterContent()}</div>

                {/* Drawer Footer Actions */}
                <div className="p-4 border-t border-primary/10 bg-bg/50 flex gap-2.5">
                  <button
                    onClick={clearAllFilters}
                    className="flex-1 py-2.5 rounded-xl border border-primary/20 text-xs font-medium text-primary hover:bg-white transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
                  >
                    Apply ({filtered.length})
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Products Grid */}
        <div className="min-w-0">
          {loading ? (
            <GridSkeleton count={8} h="h-56 sm:h-72" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 md:gap-7 content-start">
              {filtered.map((p) => (
                <ProductCard key={p._id || p.id} product={p} />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center text-ink/50 py-16 bg-white rounded-2xl border border-primary/10 p-8 shadow-card">
              <p className="font-display text-primary text-base font-semibold mb-1">No products found</p>
              <p className="text-xs text-ink/60">
                {searchQuery ? `No products match "${searchQuery}".` : "No products match these filters yet."}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-white text-xs font-semibold shadow-xs hover:bg-accent/90 transition-colors"
                >
                  <RotateCcw size={12} /> Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
