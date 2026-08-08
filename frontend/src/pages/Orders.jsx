import { useState, useEffect } from "react";
import { Package, Scissors, ShoppingBag, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import { orders as mockOrders } from "../data/mockData";
import { useApp } from "../context/AppContext";
import api from "../utils/api";

const statusColors = {
  Delivered: "bg-green-100 text-green-800 border-green-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  "In Progress": "bg-amber-100 text-amber-800 border-amber-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  placed: "bg-blue-100 text-blue-800 border-blue-200",
  confirmed: "bg-indigo-100 text-indigo-800 border-indigo-200",
  packed: "bg-purple-100 text-purple-800 border-purple-200",
  shipped: "bg-cyan-100 text-cyan-800 border-cyan-200",
  fabric_received: "bg-purple-100 text-purple-800 border-purple-200",
  cutting: "bg-blue-100 text-blue-800 border-blue-200",
  stitching: "bg-indigo-100 text-indigo-800 border-indigo-200",
  quality_check: "bg-teal-100 text-teal-800 border-teal-200",
  ready_for_pickup: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Cancelled: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  returned: "bg-rose-100 text-rose-800 border-rose-200",
};

const formatStatus = (s) => {
  if (!s) return "Unknown";
  if (s === "In Progress" || s === "Delivered" || s === "Cancelled") return s;
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

export default function Orders() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState("all"); // "all" | "shopping" | "tailoring"
  const [loading, setLoading] = useState(false);
  const [shoppingOrders, setShoppingOrders] = useState([]);
  const [tailoringOrders, setTailoringOrders] = useState([]);
  const [isUsingRealApi, setIsUsingRealApi] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchUserOrders() {
      if (!user) return;
      setLoading(true);
      try {
        const [shopRes, tailorRes] = await Promise.allSettled([
          api.get("/api/orders/me"),
          api.get("/api/tailoring/me"),
        ]);

        if (!isMounted) return;

        let shopData = [];
        let tailorData = [];

        if (shopRes.status === "fulfilled" && Array.isArray(shopRes.value?.data)) {
          shopData = shopRes.value.data.map((o) => ({
            id: o.orderId || o.orderNumber || o._id,
            type: "Shop",
            item: o.items?.map((i) => `${i.name} (x${i.quantity})`).join(", ") || "Shopping Item",
            status: o.status,
            date: new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
            eta: o.createdAt
              ? new Date(new Date(o.createdAt).setDate(new Date(o.createdAt).getDate() + 5)).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
              : "5–7 days",
            amount: o.total || 0,
            raw: o,
          }));
        }

        if (tailorRes.status === "fulfilled" && Array.isArray(tailorRes.value?.data)) {
          tailorData = tailorRes.value.data.map((o) => ({
            id: o.orderId || o.orderNumber || o._id,
            type: "Stitching",
            item: o.garmentType + (o.customGarment ? ` (${o.customGarment})` : ""),
            status: o.status,
            date: new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
            eta: o.expectedDeliveryDate
              ? new Date(o.expectedDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
              : "3–5 days",
            amount: o.finalPrice || o.estimatedPrice || 0,
            raw: o,
          }));
        }

        if (shopData.length > 0 || tailorData.length > 0) {
          setShoppingOrders(shopData);
          setTailoringOrders(tailorData);
          setIsUsingRealApi(true);
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchUserOrders();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Combined fallback dataset
  const combinedList = isUsingRealApi
    ? [...shoppingOrders, ...tailoringOrders]
    : mockOrders;

  const shoppingList = isUsingRealApi
    ? shoppingOrders
    : mockOrders.filter((o) => o.type === "Shop");

  const tailoringList = isUsingRealApi
    ? tailoringOrders
    : mockOrders.filter((o) => o.type === "Stitching");

  const displayedOrders =
    activeTab === "shopping"
      ? shoppingList
      : activeTab === "tailoring"
      ? tailoringList
      : combinedList;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-24">
      <SectionHeading align="left" eyebrow="Track & Manage" title="Your Orders" />

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8 border-b border-primary/10 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            activeTab === "all"
              ? "bg-primary text-bg shadow-sm"
              : "bg-bg text-ink/70 hover:text-primary hover:bg-primary/5"
          }`}
        >
          <Package size={15} /> All Orders ({combinedList.length})
        </button>
        <button
          onClick={() => setActiveTab("shopping")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            activeTab === "shopping"
              ? "bg-primary text-bg shadow-sm"
              : "bg-bg text-ink/70 hover:text-primary hover:bg-primary/5"
          }`}
        >
          <ShoppingBag size={15} /> Shopping Orders ({shoppingList.length})
        </button>
        <button
          onClick={() => setActiveTab("tailoring")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            activeTab === "tailoring"
              ? "bg-primary text-bg shadow-sm"
              : "bg-bg text-ink/70 hover:text-primary hover:bg-primary/5"
          }`}
        >
          <Scissors size={15} /> Tailoring Orders ({tailoringList.length})
        </button>
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
            <div key={o.id} className="bg-white rounded-2xl shadow-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-primary/5">
              <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                <span className="w-11 h-11 rounded-full bg-bg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                  {o.type === "Stitching" ? (
                    <Scissors size={18} className="text-accent" />
                  ) : (
                    <ShoppingBag size={18} className="text-accent" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-display text-base font-semibold text-primary truncate max-w-full">{o.item}</p>
                    <span className={`text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${statusColors[o.status] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                      {formatStatus(o.status)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/5 text-ink/60 font-medium">
                      {o.type === "Stitching" ? "Tailoring" : "Shopping"}
                    </span>
                  </div>
                  <div className="text-xs text-ink/65 space-y-0.5">
                    <p className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-ink/45">Order ID:</span>
                      <span className="font-mono font-medium text-primary tracking-wide bg-bg px-2 py-0.5 rounded border border-primary/10">
                        {o.id}
                      </span>
                    </p>
                    <p className="text-ink/50 text-[11px]">
                      Placed: {o.date} · {o.status === "Delivered" || o.status === "delivered" ? "Delivered" : "Expected Delivery"}: {o.eta}
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
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && displayedOrders.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-primary/10 p-8">
          <Package size={40} className="mx-auto text-primary/30 mb-3" />
          <h3 className="font-display text-lg font-semibold text-primary mb-1">No {activeTab} orders found</h3>
          <p className="text-sm text-ink/60">
            {activeTab === "shopping"
              ? "You haven't placed any shopping orders yet."
              : activeTab === "tailoring"
              ? "You haven't booked any custom tailoring orders yet."
              : "Your order history is empty."}
          </p>
        </div>
      )}
    </div>
  );
}


