import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { SlidersHorizontal, ArrowUpDown, Check, Search, X } from "lucide-react";
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

const discountRanges = [
  { id: "d10", label: "10% off or more", min: 10 },
  { id: "d20", label: "20% off or more", min: 20 },
  { id: "d30", label: "30% off or more", min: 30 },
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
  { value: "bestsellers", label: "Best Sellers (Sales)" },
];

function CheckRow({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-ink/70 cursor-pointer py-1 group">
      <span
        onClick={onChange}
        className={`w-[18px] h-[18px] rounded-md border flex items-center justify-center transition-colors shrink-0 ${checked ? "bg-accent border-accent text-white" : "border-primary/25 group-hover:border-accent"
          }`}
      >
        {checked && <Check size={12} />}
      </span>
      <span onClick={onChange} className={checked ? "text-primary font-medium" : ""}>{label}</span>
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
  const [discountFilter, setDiscountFilter] = useState(null);
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

  // Dismiss Sort & Filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilters(false);
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

  // Category names for filter panel
  const shopCategoryNames = shopCategories.map((c) => c.name);

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
    if (discountFilter) {
      const minDiscount = discountRanges.find((d) => d.id === discountFilter)?.min ?? 0;
      list = list.filter((p) => p.mrp > 0 && Math.round(100 - (p.price / p.mrp) * 100) >= minDiscount);
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
    if (sort === "rating") list.sort((a, b) => (b.ratingAverage || b.rating || 0) - (a.ratingAverage || a.rating || 0));
    if (sort === "bestsellers") list.sort((a, b) => (b.unitsSold || 0) - (a.unitsSold || 0));

    return list;
  }, [products, categoryFilters, priceFilters, discountFilter, ratingFilter, dealOnly, bestsellerOnly, recentOnly, sort, searchQuery]);

  const activeSort = sortOptions.find((s) => s.value === sort) || sortOptions[0];

  return (
    <div className="relative max-w-7xl mx-auto px-5 md:px-8 pt-8 sm:pt-10 md:pt-14 pb-16 md:pb-24">
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
              id="inclined-shop-hero-grid"
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
          <rect width="100%" height="100%" fill="url(#inclined-shop-hero-grid)" />
        </svg>

        <div className="relative z-10">
          <SectionHeading
            light
            animate={false}
            eyebrow="Shop"
            title="Ready to wear, made with care"
            subtitle="Curated pieces you can order today — tap a card to see full views, reviews, and buy options."
          />

          {/* Search Bar */}
          <div className="max-w-md mx-auto relative z-10">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name or category..."
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

      {/* Controls Bar (Filter toggle, product count, sort) */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="lg:hidden flex items-center gap-2 text-sm font-medium text-primary border border-primary/15 px-4 py-2 rounded-full bg-white shadow-card"
        >
          <SlidersHorizontal size={14} /> Filters
        </button>
        <span className="text-sm text-ink/50 hidden lg:block">{filtered.length} products</span>

        {/* Sort control */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortOpen((s) => !s)}
            className="flex items-center gap-2 text-sm font-medium text-primary bg-white border border-primary/15 rounded-full pl-4 pr-3 py-2 hover:border-accent transition-colors shadow-card"
          >
            <ArrowUpDown size={13} className="text-accent" />
            Sort: {activeSort.label}
          </button>
          {sortOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-soft border border-primary/10 overflow-hidden z-20">
              {sortOptions.map((o) => (
                <button
                  key={o.value}
                  onClick={() => { setSort(o.value); setSortOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sort === o.value ? "bg-highlight/40 text-primary font-medium" : "text-ink/70 hover:bg-bg"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-10">
        {/* Left Filter Sidebar */}
        <aside className={`${showFilters ? "block" : "hidden"} lg:block lg:self-start`} ref={filterRef}>
          <div className="bg-white rounded-2xl shadow-card p-5 lg:sticky lg:top-24 flex flex-col gap-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div>
              <h4 className="font-display text-base font-semibold text-primary mb-3">Category</h4>
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
              <h4 className="font-display text-base font-semibold text-primary mb-3">Price</h4>
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
              <h4 className="font-display text-base font-semibold text-primary mb-3">Discount</h4>
              {discountRanges.map((d) => (
                <CheckRow
                  key={d.id}
                  checked={discountFilter === d.id}
                  onChange={() => setDiscountFilter(discountFilter === d.id ? null : d.id)}
                  label={d.label}
                />
              ))}
            </div>

            <div className="border-t border-primary/10 pt-4">
              <h4 className="font-display text-base font-semibold text-primary mb-3">Customer Rating</h4>
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
              <h4 className="font-display text-base font-semibold text-primary mb-3">Collection</h4>
              <CheckRow checked={dealOnly} onChange={() => setDealOnly((v) => !v)} label="Limited Time Deals" />
              <CheckRow checked={bestsellerOnly} onChange={() => setBestsellerOnly((v) => !v)} label="Best Sellers" />
              <CheckRow checked={recentOnly} onChange={() => setRecentOnly((v) => !v)} label="Recently Added" />
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        {loading ? (
          <GridSkeleton count={9} h="h-80" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-7 content-start">
            {filtered.map((p) => (
              <ProductCard key={p._id || p.id} product={p} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-center text-ink/50 py-16 lg:col-start-2">
            {searchQuery ? `No products match "${searchQuery}".` : "No products match these filters yet."}
          </p>
        )}
      </div>
    </div>
  );
}
