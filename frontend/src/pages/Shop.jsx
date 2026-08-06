import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { SlidersHorizontal, ArrowUpDown, Check, Search, X } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import ProductCard from "../components/ProductCard";
import { GridSkeleton } from "../components/Skeleton";
import { shopCategories, products } from "../data/mockData";

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
];

function CheckRow({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-ink/70 cursor-pointer py-1 group">
      <span
        onClick={onChange}
        className={`w-[18px] h-[18px] rounded-md border flex items-center justify-center transition-colors shrink-0 ${
          checked ? "bg-accent border-accent text-white" : "border-primary/25 group-hover:border-accent"
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
  const [categoryFilters, setCategoryFilters] = useState(() => {
    const c = params.get("category");
    return c && shopCategories.includes(c) ? [c] : [];
  });
  const [priceFilters, setPriceFilters] = useState([]);
  const [discountFilter, setDiscountFilter] = useState(null);
  const [ratingFilter, setRatingFilter] = useState(null);
  const [bestsellerOnly, setBestsellerOnly] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);
  const [sort, setSort] = useState("featured");
  const [sortOpen, setSortOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const toggle = (list, setList, id) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const filtered = useMemo(() => {
    let list = [...products];

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      );
    }
    if (categoryFilters.length > 0) {
      list = list.filter((p) => categoryFilters.includes(p.category));
    }
    if (priceFilters.length > 0) {
      list = list.filter((p) => priceRanges.some((r) => priceFilters.includes(r.id) && r.test(p)));
    }
    if (discountFilter) {
      const minDiscount = discountRanges.find((d) => d.id === discountFilter)?.min ?? 0;
      list = list.filter((p) => Math.round(100 - (p.price / p.mrp) * 100) >= minDiscount);
    }
    if (ratingFilter) {
      const min = ratingOptions.find((r) => r.id === ratingFilter)?.min ?? 0;
      list = list.filter((p) => p.rating >= min);
    }
    if (bestsellerOnly) list = list.filter((p) => p.bestseller);
    if (recentOnly) list = list.filter((p) => p.recent);

    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sort === "rating") list.sort((a, b) => b.rating - a.rating);

    return list;
  }, [categoryFilters, priceFilters, discountFilter, ratingFilter, bestsellerOnly, recentOnly, sort, searchQuery]);

  const activeSort = sortOptions.find((s) => s.value === sort);

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <SectionHeading
        eyebrow="Shop"
        title="Ready to wear, made with care"
        subtitle="Curated pieces you can order today — tap a card to see full views, reviews, and buy options."
      />

      <div className="max-w-md mx-auto mb-8 relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by product name or category..."
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

      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="lg:hidden flex items-center gap-2 text-sm font-medium text-primary border border-primary/15 px-4 py-2 rounded-full"
        >
          <SlidersHorizontal size={14} /> Filters
        </button>
        <span className="text-sm text-ink/50 hidden lg:block">{filtered.length} products</span>

        {/* Redesigned sort control */}
        <div className="relative">
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
                  onClick={() => {
                    setSort(o.value);
                    setSortOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
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

      <div className="grid lg:grid-cols-[240px_1fr] gap-10">
        {/* Filters sidebar — pinned below the navbar; scrolls internally
            once its content (5 filter groups) exceeds the viewport height,
            so every filter is reachable without scrolling the whole page. */}
        <aside className={`${showFilters ? "block" : "hidden"} lg:block lg:self-start`}>
          <div className="bg-white rounded-2xl shadow-card p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto flex flex-col gap-6">
            <div>
              <h4 className="font-display text-base font-semibold text-primary mb-3">Category</h4>
              <CheckRow checked={categoryFilters.length === 0} onChange={() => setCategoryFilters([])} label="All" />
              {shopCategories.map((cat) => (
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
              <CheckRow checked={bestsellerOnly} onChange={() => setBestsellerOnly((v) => !v)} label="Best Sellers" />
              <CheckRow checked={recentOnly} onChange={() => setRecentOnly((v) => !v)} label="Recently Added" />
            </div>
          </div>
        </aside>

        {/* Products */}
        {loading ? (
          <GridSkeleton count={9} h="h-80" />
        ) : (
          <motion.div layout className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-7 content-start">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </motion.div>
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
