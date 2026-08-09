import { useState, useEffect } from "react";
import { Tag, Save } from "lucide-react";
import { useApp } from "../context/AppContext";
import { products } from "../data/mockData";
import SectionHeading from "../components/SectionHeading";

function AdminProductManager() {
  const { notify } = useApp();
  const [selectedId, setSelectedId] = useState(products[0]?.id || "p1");
  const [, setTick] = useState(0);

  const currentProduct = products.find((p) => p.id === selectedId);

  const [dealEnabled, setDealEnabled] = useState(false);
  const [dealStart, setDealStart] = useState("");
  const [dealEnd, setDealEnd] = useState("");
  const [bestseller, setBestseller] = useState(false);
  const [recent, setRecent] = useState(false);
  const [unitsSold, setUnitsSold] = useState(0);

  useEffect(() => {
    if (currentProduct) {
      setDealEnabled(Boolean(currentProduct.limitedTimeDeal?.enabled));
      setDealStart(
        currentProduct.limitedTimeDeal?.startDate
          ? new Date(currentProduct.limitedTimeDeal.startDate).toISOString().slice(0, 16)
          : ""
      );
      setDealEnd(
        currentProduct.limitedTimeDeal?.endDate
          ? new Date(currentProduct.limitedTimeDeal.endDate).toISOString().slice(0, 16)
          : ""
      );
      setBestseller(Boolean(currentProduct.bestseller || currentProduct.isBestseller));
      setRecent(Boolean(currentProduct.recent || currentProduct.isNewArrival || currentProduct.isNew));
      setUnitsSold(currentProduct.unitsSold || 0);
    }
  }, [selectedId, currentProduct]);

  const handleSave = (e) => {
    e.preventDefault();
    if (!currentProduct) return;

    currentProduct.limitedTimeDeal = {
      enabled: dealEnabled,
      startDate: dealStart ? new Date(dealStart).toISOString() : null,
      endDate: dealEnd ? new Date(dealEnd).toISOString() : null,
    };
    currentProduct.bestseller = bestseller;
    currentProduct.isBestseller = bestseller;
    currentProduct.recent = recent;
    currentProduct.isNewArrival = recent;
    currentProduct.isNew = recent;
    currentProduct.unitsSold = Number(unitsSold);

    setTick((t) => t + 1);
    notify(`Updated label & deal settings for ${currentProduct.name}!`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border-l-4 border-accent">
      <div className="flex items-center gap-2 mb-1">
        <Tag size={18} className="text-accent" />
        <h3 className="font-display text-base font-semibold text-primary">
          Admin: Product Labels &amp; Limited Time Deals
        </h3>
      </div>
      <p className="text-xs text-ink/50 mb-4">
        Set optional start/end dates for auto-expiring Limited Time Deals, toggle Best Seller flags, set units sold, and manage New product badges.
      </p>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-ink/70 mb-1">Select Product</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 outline-none text-sm text-ink bg-bg/50"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.category})
              </option>
            ))}
          </select>
        </div>

        {/* Limited Time Deal Section */}
        <div className="bg-bg/60 p-4 rounded-xl space-y-3 border border-primary/10">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-xs text-primary">
            <input
              type="checkbox"
              checked={dealEnabled}
              onChange={(e) => setDealEnabled(e.target.checked)}
              className="accent-accent w-4 h-4 rounded"
            />
            <span>Enable Limited Time Deal (Amazon-style Red Badge)</span>
          </label>

          {dealEnabled && (
            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] text-ink/50 mb-1">Start Date/Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={dealStart}
                  onChange={(e) => setDealStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-primary/15 text-xs text-ink bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-ink/50 mb-1">End Date/Time (Optional - Auto-expires)</label>
                <input
                  type="datetime-local"
                  value={dealEnd}
                  onChange={(e) => setDealEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-primary/15 text-xs text-ink bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Best Seller & Sales Ranking */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-bg/60 p-4 rounded-xl border border-primary/10 flex flex-col justify-between">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-xs text-primary">
              <input
                type="checkbox"
                checked={bestseller}
                onChange={(e) => setBestseller(e.target.checked)}
                className="accent-accent w-4 h-4 rounded"
              />
              <span>Best Seller Label (Manual Selection)</span>
            </label>
            <p className="text-[11px] text-ink/40 mt-1">Initially set manually by admin.</p>
          </div>

          <div className="bg-bg/60 p-4 rounded-xl border border-primary/10">
            <label className="block text-xs font-medium text-primary mb-1">Units Sold (Sales Data)</label>
            <input
              type="number"
              min="0"
              value={unitsSold}
              onChange={(e) => setUnitsSold(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-primary/15 text-xs text-ink bg-white"
            />
            <p className="text-[11px] text-ink/40 mt-1">Used for ranking Best Sellers dynamically.</p>
          </div>
        </div>

        {/* New Item Flag */}
        <div className="bg-bg/60 p-4 rounded-xl border border-primary/10">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-xs text-primary">
            <input
              type="checkbox"
              checked={recent}
              onChange={(e) => setRecent(e.target.checked)}
              className="accent-accent w-4 h-4 rounded"
            />
            <span>Mark as "New" Item</span>
          </label>
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-full text-sm font-semibold bg-accent text-white hover:bg-accent/90 transition-colors shadow-card flex items-center justify-center gap-2"
        >
          <Save size={15} /> Save Label &amp; Deal Settings
        </button>
      </form>
    </div>
  );
}

export default function Admin() {
  const { user, authLoading } = useApp();

  if (authLoading) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 animate-pulse mx-auto mb-6" />
        <div className="h-4 w-40 bg-primary/10 rounded animate-pulse mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-8 py-12 md:py-20">
      <SectionHeading align="center" eyebrow="Dashboard" title="Admin Portal" />
      <div className="mt-10">
        <AdminProductManager />
      </div>
    </div>
  );
}
