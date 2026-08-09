import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Scissors, ShoppingBag, ChevronRight } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import { useApp } from "../context/AppContext";
import api from "../utils/api";

const statusColors = {
  placed:           "bg-blue-100 text-blue-800 border-blue-200",
  confirmed:        "bg-indigo-100 text-indigo-800 border-indigo-200",
  packed:           "bg-purple-100 text-purple-800 border-purple-200",
  shipped:          "bg-cyan-100 text-cyan-800 border-cyan-200",
  delivered:        "bg-green-100 text-green-800 border-green-200",
  cancelled:        "bg-red-100 text-red-800 border-red-200",
  returned:         "bg-rose-100 text-rose-800 border-rose-200",
  pending:          "bg-amber-100 text-amber-800 border-amber-200",
  fabric_received:  "bg-purple-100 text-purple-800 border-purple-200",
  cutting:          "bg-blue-100 text-blue-800 border-blue-200",
  stitching:        "bg-indigo-100 text-indigo-800 border-indigo-200",
  quality_check:    "bg-teal-100 text-teal-800 border-teal-200",
  ready_for_pickup: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected:         "bg-red-100 text-red-800 border-red-200",
};

const formatStatus = (s) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Unknown";

export default function Orders() {
  const { user } = useApp();
  const navigate  = useNavigate();

  const [activeTab, setActiveTab]         = useState("all");
  const [loading, setLoading]             = useState(false);
  const [shoppingOrders, setShoppingOrders] = useState([]);
  const [tailoringOrders, setTailoringOrders] = useState([]);
  const [fetched, setFetched]             = useState(false);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    setLoading(true);

    Promise.allSettled([
      api.get("/api/orders/me"),
      api.get("/api/tailoring/me"),
    ]).then(([shopRes, tailorRes]) => {
      if (!isMounted) return;

      if (shopRes.status === "fulfilled" && Array.isArray(shopRes.value?.data)) {
        setShoppingOrders(shopRes.value.data.map((o) => ({
          id:    o._id,
          orderId: o.orderId || o._id,
          type:  "shopping",
          label: o.items?.map((i) => `${i.name} ×${i.quantity}`).join(", ") || "Shopping Order",
          status: o.status,
          date:  new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
          eta:   o.createdAt
            ? new Date(new Date(o.createdAt).setDate(new Date(o.createdAt).getDate() + 5))
                .toLocaleDateString("en-IN", { day: "numeric", month: "short" })
            : "5–7 days",
          amount: o.total || 0,
        })));
      }

      if (tailorRes.status === "fulfilled" && Array.isArray(tailorRes.value?.data)) {
        setTailoringOrders(tailorRes.value.data.map((o) => ({
          id:    o._id,
          orderId: o.orderId || o._id,
          type:  "tailoring",
          label: o.garmentType + (o.customGarment ? ` (${o.customGarment})` : ""),
          status: o.status,
          date:  new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
          eta:   o.expectedDeliveryDate
            ? new Date(o.expectedDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
            : "—",
          amount: o.finalPrice || o.estimatedPrice || 0,
        })));
      }

      if (isMounted) { setFetched(true); setLoading(false); }
    }).catch(() => { if (isMounted) { setFetched(true); setLoading(false); } });

    return () => { isMounted = false; };
  }, [user]);

  const combinedList  = [...shoppingOrders, ...tailoringOrders].sort((a, b) => 0);
  const displayedOrders =
    activeTab === "shopping"  ? shoppingOrders  :
    activeTab === "tailoring" ? tailoringOrders : combinedList;

  const openDetail = (o) => navigate(`/orders/${o.type}/${o.id}`);

  // ── Not signed in ──────────────────────────────────────────────────────
  if (!user && !loading) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <Package size={40} className="mx-auto text-primary/30 mb-5" />
        <h1 className="font-display text-2xl font-semibold text-primary mb-3">Sign in to view orders</h1>
        <p className="text-ink/60 mb-8">Log in to track your shopping and tailoring orders.</p>
        <button onClick={() => navigate("/login")}
          className="bg-primary text-bg px-7 py-3 rounded-full font-medium hover:bg-primary/90">
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-24">
      <SectionHeading align="left" eyebrow="Track & Manage" title="Your Orders" />

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8 border-b border-primary/10 pb-3 overflow-x-auto">
        {[
          { key: "all",       label: `All Orders (${combinedList.length})`,       icon: <Package size={15} /> },
          { key: "shopping",  label: `Shopping (${shoppingOrders.length})`,       icon: <ShoppingBag size={15} /> },
          { key: "tailoring", label: `Tailoring (${tailoringOrders.length})`,     icon: <Scissors size={15} /> },
        ].map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === t.key
                ? "bg-primary text-bg shadow-sm"
                : "bg-bg text-ink/70 hover:text-primary hover:bg-primary/5"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-5 shadow-card animate-pulse flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-primary/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-primary/10 rounded w-1/3" />
                <div className="h-3 bg-primary/10 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {displayedOrders.map((o) => (
            <button
              key={o.id}
              onClick={() => openDetail(o)}
              className="bg-white rounded-2xl shadow-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-primary/5 hover:border-accent/30 hover:shadow-soft transition-all text-left w-full"
            >
              <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                <span className="w-11 h-11 rounded-full bg-bg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                  {o.type === "tailoring"
                    ? <Scissors size={18} className="text-accent" />
                    : <ShoppingBag size={18} className="text-accent" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-display text-base font-semibold text-primary truncate max-w-full">{o.label}</p>
                    <span className={`text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${statusColors[o.status] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                      {formatStatus(o.status)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/5 text-ink/60 font-medium">
                      {o.type === "tailoring" ? "Tailoring" : "Shopping"}
                    </span>
                  </div>
                  <div className="text-xs text-ink/65 space-y-0.5">
                    <p className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-ink/45">Order ID:</span>
                      <span className="font-mono font-medium text-primary tracking-wide bg-bg px-2 py-0.5 rounded border border-primary/10">
                        {o.orderId}
                      </span>
                    </p>
                    <p className="text-ink/50 text-[11px]">
                      Placed: {o.date} · {o.status === "delivered" ? "Delivered" : "Expected"}: {o.eta}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-primary/10">
                {o.amount > 0 && (
                  <p className="font-semibold text-primary text-base sm:text-lg shrink-0">
                    ₹{o.amount.toLocaleString("en-IN")}
                  </p>
                )}
                <ChevronRight size={16} className="text-ink/30 shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {fetched && !loading && displayedOrders.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-primary/10 p-8">
          <Package size={40} className="mx-auto text-primary/30 mb-3" />
          <h3 className="font-display text-lg font-semibold text-primary mb-1">
            No {activeTab === "all" ? "" : activeTab + " "}orders yet
          </h3>
          <p className="text-sm text-ink/60">
            {activeTab === "shopping"
              ? "You haven't placed any shopping orders yet."
              : activeTab === "tailoring"
              ? "You haven't booked any tailoring orders yet."
              : "Your order history is empty."}
          </p>
        </div>
      )}
    </div>
  );
}
