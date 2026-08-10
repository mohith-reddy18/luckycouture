import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Tag,
  Save,
  ShoppingBag,
  Scissors,
  Users,
  Palette,
  Star,
  Boxes,
  CreditCard,
  ShieldAlert,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import api from "../utils/api";
import AdminLogin from "../components/admin/AdminLogin";
import AdminLayout from "../components/admin/AdminLayout";
import AdminOverview from "../components/admin/AdminOverview";
import AdminSectionPlaceholder from "../components/admin/AdminSectionPlaceholder";

function AdminProductManager() {
  const { notify } = useApp();
  const [productsList, setProductsList] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);

  const currentProduct = productsList.find((p) => p._id === selectedId);

  const [dealEnabled, setDealEnabled] = useState(false);
  const [dealStart, setDealStart] = useState("");
  const [dealEnd, setDealEnd] = useState("");
  const [bestseller, setBestseller] = useState(false);
  const [recent, setRecent] = useState(false);
  const [unitsSold, setUnitsSold] = useState(0);

  // Fetch products on mount
  useEffect(() => {
    api.get("/api/products?limit=100").then((res) => {
      if (res?.data) {
        setProductsList(res.data);
        if (res.data.length > 0 && !selectedId) {
          setSelectedId(res.data[0]._id);
        }
      }
    }).catch((err) => console.error("Failed to fetch products:", err));
  }, []);

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
      setBestseller(Boolean(currentProduct.isBestseller));
      setRecent(Boolean(currentProduct.isNewArrival));
      setUnitsSold(currentProduct.unitsSold || 0);
    }
  }, [selectedId, currentProduct]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentProduct) return;
    setLoading(true);

    try {
      const payload = {
        isBestseller: bestseller,
        isNewArrival: recent,
        unitsSold: Number(unitsSold),
        limitedTimeDeal: {
          enabled: dealEnabled,
          startDate: dealStart ? new Date(dealStart).toISOString() : null,
          endDate: dealEnd ? new Date(dealEnd).toISOString() : null,
        }
      };
      await api.patch(`/api/products/${currentProduct._id}`, payload);
      
      // Update local state to reflect changes without full refetch
      setProductsList((prev) => 
        prev.map((p) => (p._id === currentProduct._id ? { ...p, ...payload } : p))
      );
      notify(`Updated label & deal settings for ${currentProduct.name}!`);
    } catch (err) {
      console.error(err);
      notify(`Failed to update ${currentProduct.name}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 md:p-8 border-l-4 border-accent space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Tag size={20} className="text-accent" />
          <h3 className="font-display text-xl font-semibold text-primary">
            Products &amp; Limited Time Deals Manager
          </h3>
        </div>
        <p className="text-xs text-ink/60">
          Configure product labels, Limited Time Deal badges, sales units, and bestseller markers.
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <div>
          <label className="block text-xs font-semibold text-primary mb-1.5">Select Product to Edit</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-primary/15 outline-none text-sm text-ink bg-bg/50 focus:border-accent"
          >
            {productsList.length === 0 ? (
              <option value="">Loading products...</option>
            ) : (
              productsList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.category?.name || p.category})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Limited Time Deal Section */}
        <div className="bg-bg/60 p-5 rounded-2xl space-y-3 border border-primary/10">
          <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-xs text-primary">
            <input
              type="checkbox"
              checked={dealEnabled}
              onChange={(e) => setDealEnabled(e.target.checked)}
              className="accent-accent w-4 h-4 rounded"
            />
            <span>Enable Limited Time Deal (Amazon-style Red Badge)</span>
          </label>

          {dealEnabled && (
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] text-ink/60 mb-1">Start Date/Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={dealStart}
                  onChange={(e) => setDealStart(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 text-xs text-ink bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-ink/60 mb-1">End Date/Time (Auto-expires)</label>
                <input
                  type="datetime-local"
                  value={dealEnd}
                  onChange={(e) => setDealEnd(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 text-xs text-ink bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Best Seller & Sales Ranking */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-bg/60 p-5 rounded-2xl border border-primary/10 flex flex-col justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-xs text-primary">
              <input
                type="checkbox"
                checked={bestseller}
                onChange={(e) => setBestseller(e.target.checked)}
                className="accent-accent w-4 h-4 rounded"
              />
              <span>Best Seller Label</span>
            </label>
            <p className="text-[11px] text-ink/50 mt-2">Display bestseller pill badge across shop cards.</p>
          </div>

          <div className="bg-bg/60 p-5 rounded-2xl border border-primary/10">
            <label className="block text-xs font-semibold text-primary mb-1">Units Sold (Sales Ranking)</label>
            <input
              type="number"
              min="0"
              value={unitsSold}
              onChange={(e) => setUnitsSold(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 text-xs text-ink bg-white"
            />
            <p className="text-[11px] text-ink/50 mt-1">Used to rank Best Sellers dynamically.</p>
          </div>
        </div>

        {/* New Item Flag */}
        <div className="bg-bg/60 p-5 rounded-2xl border border-primary/10">
          <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-xs text-primary">
            <input
              type="checkbox"
              checked={recent}
              onChange={(e) => setRecent(e.target.checked)}
              className="accent-accent w-4 h-4 rounded"
            />
            <span>Mark as "New Collection" Item</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3.5 rounded-full text-sm font-semibold text-white shadow-card flex items-center justify-center gap-2 transition-colors ${
            loading ? "bg-accent/50 cursor-not-allowed" : "bg-accent hover:bg-accent/90"
          }`}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {loading ? "Saving..." : "Save Product Settings"}
        </button>
      </form>
    </div>
  );
}

export default function Admin() {
  const { user, authLoading, logout } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get("tab") || "dashboard";

  const handleSetActiveSection = (section) => {
    setSearchParams({ tab: section });
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-5 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 animate-pulse mb-6" />
        <div className="h-4 w-44 bg-primary/10 rounded animate-pulse" />
      </div>
    );
  }

  // Security check: if not authenticated OR role is not 'admin', render AdminLogin interface
  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user && user.role !== "admin" && (
          <div className="max-w-md mx-auto mb-4 bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-700 shrink-0" />
              <span>Signed in as customer ({user.email}). Admin portal requires administrator credentials.</span>
            </div>
            <button onClick={() => logout()} className="underline font-semibold shrink-0 ml-2">Sign out</button>
          </div>
        )}
        <AdminLogin />
      </div>
    );
  }

  // Render Section Content based on active navigation tab
  const renderSectionContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <AdminOverview onNavigateSection={handleSetActiveSection} />;
      case "products":
        return <AdminProductManager />;
      case "orders":
        return (
          <AdminSectionPlaceholder
            title="Orders"
            description="Review shopping orders, delivery addresses, dispatch statuses, and customer order histories."
            icon={ShoppingBag}
            onBackToDashboard={() => handleSetActiveSection("dashboard")}
          />
        );
      case "tailoring":
        return (
          <AdminSectionPlaceholder
            title="Tailoring Orders"
            description="Review custom stitching requests, customer measurements, fabric drop-off dates, and priority status."
            icon={Scissors}
            onBackToDashboard={() => handleSetActiveSection("dashboard")}
          />
        );
      case "customers":
        return (
          <AdminSectionPlaceholder
            title="Customers"
            description="View registered customer profiles, account statuses, saved addresses, and saved measurements."
            icon={Users}
            onBackToDashboard={() => handleSetActiveSection("dashboard")}
          />
        );
      case "designs":
        return (
          <AdminSectionPlaceholder
            title="Design Gallery"
            description="Manage gallery designs, tags, categories, and reference images."
            icon={Palette}
            onBackToDashboard={() => handleSetActiveSection("dashboard")}
          />
        );
      case "reviews":
        return (
          <AdminSectionPlaceholder
            title="Reviews"
            description="Moderate customer reviews and verified buyer ratings."
            icon={Star}
            onBackToDashboard={() => handleSetActiveSection("dashboard")}
          />
        );
      case "inventory":
        return (
          <AdminSectionPlaceholder
            title="Inventory & Stock"
            description="Monitor stock levels, reorder triggers, and catalog inventory."
            icon={Boxes}
            onBackToDashboard={() => handleSetActiveSection("dashboard")}
          />
        );
      case "payments":
        return (
          <AdminSectionPlaceholder
            title="Payments & Sales"
            description="Track sales revenue, payment methods, COD transactions, and financial summaries."
            icon={CreditCard}
            onBackToDashboard={() => handleSetActiveSection("dashboard")}
          />
        );
      default:
        return <AdminOverview onNavigateSection={(sec) => setActiveSection(sec)} />;
    }
  };

  return (
    <AdminLayout
      activeSection={activeSection}
      onSelectSection={handleSetActiveSection}
    >
      {renderSectionContent()}
    </AdminLayout>
  );
}
