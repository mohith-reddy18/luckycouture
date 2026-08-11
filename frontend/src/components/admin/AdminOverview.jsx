import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  ShoppingBag,
  Scissors,
  Package,
  IndianRupee,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Zap,
  MessageSquare,
  Calendar,
} from "lucide-react";
import api from "../../utils/api";

export default function AdminOverview({ onNavigateSection }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSummary = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/admin/dashboard");
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const stats = [
    {
      id: "customers",
      title: "Total Customers",
      value: data?.totalCustomers ?? 0,
      subtext: "Registered user accounts",
      icon: Users,
      color: "bg-blue-500/10 text-blue-700 border-blue-200",
      section: "customers",
    },
    {
      id: "products",
      title: "Total Products",
      value: data?.totalProducts ?? 0,
      subtext: "Active catalog items",
      icon: Package,
      color: "bg-purple-500/10 text-purple-700 border-purple-200",
      section: "products",
    },
    {
      id: "orders",
      title: "Shopping Orders",
      value: data?.totalOrders ?? 0,
      subtext: "Total placed orders",
      icon: ShoppingBag,
      color: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
      section: "shoppingOrders",
    },
    {
      id: "tailoring",
      title: "Tailoring Orders",
      value: data?.totalTailoringOrders ?? 0,
      subtext: "Bespoke stitching bookings",
      icon: Scissors,
      color: "bg-amber-500/10 text-amber-800 border-amber-200",
      section: "tailoringOrders",
    },
    {
      id: "revenue",
      title: "Total Sales Revenue",
      value: `₹${(data?.totalRevenue || 0).toLocaleString("en-IN")}`,
      subtext: `₹${(data?.monthlyRevenue || 0).toLocaleString("en-IN")} this month`,
      icon: IndianRupee,
      color: "bg-accent/15 text-accent border-accent/30",
      section: "payments",
    },
    {
      id: "pending",
      title: "Pending Actions",
      value: (data?.pendingTailoringOrders || 0) + (data?.pendingPriorityOrders || 0) + (data?.lowStockProducts || 0),
      subtext: `${data?.pendingTailoringOrders || 0} stitching · ${data?.lowStockProducts || 0} low stock`,
      icon: AlertTriangle,
      color: "bg-red-500/10 text-red-700 border-red-200",
      section: "tailoringOrders",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-card border border-primary/5">
        <div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-accent">Overview</span>
          <h2 className="font-display text-2xl font-semibold text-primary mt-0.5">
            Dashboard Metrics
          </h2>
          <p className="text-xs text-ink/60 mt-1">
            Real-time business performance across boutique orders, tailoring queues, catalog stock &amp; customer accounts.
          </p>
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/15 text-xs font-semibold text-primary hover:bg-bg transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Orders to be Completed Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-primary flex items-center gap-2">
            <Clock size={20} className="text-accent" />
            Orders to be Completed
          </h3>
          <span className="text-xs text-ink/50">Fulfillment &amp; delivery schedule</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Tomorrow's Orders - Solid Main Dark Brand Color */}
          <div
            onClick={() => onNavigateSection && onNavigateSection("shoppingOrders")}
            className="bg-primary text-bg rounded-3xl p-8 md:p-10 min-h-[230px] shadow-card hover:shadow-soft cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-2.5 rounded-xl bg-highlight/20 text-highlight">
                <Calendar size={18} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-highlight text-primary px-2.5 py-1 rounded-full">Tomorrow</span>
            </div>
            <div>
              <p className="text-xs font-medium text-bg/75">Tomorrow's Orders</p>
              <h4 className="font-display text-2xl font-bold text-bg mt-1">
                {loading ? <span className="inline-block w-12 h-6 bg-bg/20 rounded animate-pulse" /> : data?.ordersCompletion?.tomorrowsOrders ?? 0}
              </h4>
              <p className="text-[11px] text-bg/60 mt-1">Due for delivery tomorrow</p>
            </div>
          </div>

          {/* Card 2: Today's Orders - Solid Brand Accent (Amber Gold) */}
          <div
            onClick={() => onNavigateSection && onNavigateSection("shoppingOrders")}
            className="bg-accent text-white rounded-3xl p-8 md:p-10 min-h-[230px] shadow-card hover:shadow-soft cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-2.5 rounded-xl bg-white/20 text-white">
                <Zap size={18} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white text-accent px-2.5 py-1 rounded-full">Today</span>
            </div>
            <div>
              <p className="text-xs font-medium text-white/80">Today's Orders</p>
              <h4 className="font-display text-2xl font-bold text-white mt-1">
                {loading ? <span className="inline-block w-12 h-6 bg-white/20 rounded animate-pulse" /> : data?.ordersCompletion?.todaysOrders ?? 0}
              </h4>
              <p className="text-[11px] text-white/70 mt-1">Ordered today &lt; 11am or due today</p>
            </div>
          </div>

          {/* Card 3: Overdue Orders - Solid Deep Crimson */}
          <div
            onClick={() => onNavigateSection && onNavigateSection("shoppingOrders")}
            className="bg-[#8B2626] text-white rounded-3xl p-8 md:p-10 min-h-[230px] shadow-card hover:shadow-soft cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-2.5 rounded-xl bg-white/20 text-white">
                <AlertTriangle size={18} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white text-[#8B2626] px-2.5 py-1 rounded-full">Overdue</span>
            </div>
            <div>
              <p className="text-xs font-medium text-white/80">Overdue Orders</p>
              <h4 className="font-display text-2xl font-bold text-white mt-1">
                {loading ? <span className="inline-block w-12 h-6 bg-white/20 rounded animate-pulse" /> : data?.ordersCompletion?.overdueOrders ?? 0}
              </h4>
              <p className="text-[11px] text-white/70 mt-1">Passed target delivery date</p>
            </div>
          </div>

          {/* Card 4: Total Active Orders - Solid Brand Secondary (Warm Mocha) */}
          <div
            onClick={() => onNavigateSection && onNavigateSection("shoppingOrders")}
            className="bg-secondary text-white rounded-3xl p-8 md:p-10 min-h-[230px] shadow-card hover:shadow-soft cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-2.5 rounded-xl bg-white/20 text-white">
                <ShoppingBag size={18} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white text-secondary px-2.5 py-1 rounded-full">Total Active</span>
            </div>
            <div>
              <p className="text-xs font-medium text-white/80">Total Pending Orders</p>
              <h4 className="font-display text-2xl font-bold text-white mt-1">
                {loading ? <span className="inline-block w-12 h-6 bg-white/20 rounded animate-pulse" /> : data?.ordersCompletion?.totalPendingOrders ?? 0}
              </h4>
              <p className="text-[11px] text-white/70 mt-1">Active fulfillment queue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-700 text-xs p-4 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchSummary} className="underline font-semibold">Retry</button>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => onNavigateSection && onNavigateSection(stat.section)}
              className="bg-white rounded-2xl p-6 shadow-card hover:shadow-soft transition-all duration-300 border border-primary/5 cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className={`p-3 rounded-xl border ${stat.color} shrink-0`}>
                  <Icon size={20} />
                </div>
                <button
                  className="text-ink/30 group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all p-1"
                  aria-label="View section"
                >
                  <ArrowUpRight size={18} />
                </button>
              </div>

              <div>
                <p className="text-xs font-medium text-ink/60">{stat.title}</p>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-primary tracking-tight mt-1 mb-1">
                  {loading ? <span className="inline-block w-20 h-7 bg-primary/10 rounded animate-pulse" /> : stat.value}
                </h3>
                <p className="text-[11px] text-ink/50">{stat.subtext}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Action Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          onClick={() => onNavigateSection && onNavigateSection("products")}
          className="bg-gradient-to-br from-primary to-primary/90 text-bg p-6 rounded-2xl shadow-card cursor-pointer hover:scale-[1.01] transition-transform flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="p-2.5 rounded-xl bg-highlight/20 text-highlight">
              <Package size={18} />
            </span>
            <span className="text-xs text-bg/60 uppercase font-mono tracking-wider">Catalog</span>
          </div>
          <div>
            <h4 className="font-display text-base font-semibold text-bg mb-1">Manage Catalog &amp; Products</h4>
            <p className="text-xs text-bg/70">Update stock, labels, pricing &amp; limited time deal badges.</p>
          </div>
        </div>

        <div
          onClick={() => onNavigateSection && onNavigateSection("tailoringOrders")}
          className="bg-gradient-to-br from-accent to-amber-700 text-white p-6 rounded-2xl shadow-card cursor-pointer hover:scale-[1.01] transition-transform flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="p-2.5 rounded-xl bg-white/20 text-white">
              <Scissors size={18} />
            </span>
            <span className="text-xs text-white/70 uppercase font-mono tracking-wider">Queue</span>
          </div>
          <div>
            <h4 className="font-display text-base font-semibold text-white mb-1">Tailoring &amp; Priority Orders</h4>
            <p className="text-xs text-white/80">Review measurements, drop-off dates &amp; delivery ETAs.</p>
          </div>
        </div>

        <div
          onClick={() => onNavigateSection && onNavigateSection("inventory")}
          className="bg-white p-6 rounded-2xl shadow-card border border-primary/10 cursor-pointer hover:border-accent transition-colors flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="p-2.5 rounded-xl bg-red-500/10 text-red-600">
              <AlertTriangle size={18} />
            </span>
            <span className="text-xs text-ink/40 uppercase font-mono tracking-wider">Inventory</span>
          </div>
          <div>
            <h4 className="font-display text-base font-semibold text-primary mb-1">Low Stock Alerts</h4>
            <p className="text-xs text-ink/60">
              {data?.lowStockProducts ? `${data.lowStockProducts} products need restocking.` : "Monitor stock thresholds."}
            </p>
          </div>
        </div>
      </div>

      {/* Tables Row: Recent Shopping Orders & Recent Tailoring Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        {/* Recent Shopping Orders */}
        <div className="bg-white rounded-2xl p-6 shadow-card border border-primary/5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-accent" />
              <h3 className="font-display text-lg font-semibold text-primary">Recent Shopping Orders</h3>
            </div>
            <button
              onClick={() => onNavigateSection && onNavigateSection("shoppingOrders")}
              className="text-xs font-semibold text-accent hover:underline"
            >
              View all
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-bg/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : data?.recentOrders && data.recentOrders.length > 0 ? (
            <div className="divide-y divide-primary/10 overflow-x-auto">
              {data.recentOrders.map((order) => (
                <div key={order._id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-mono font-semibold text-primary">{order.orderId || order._id.slice(-8)}</p>
                    <p className="text-ink/60 text-[11px]">{order.user?.name || "Customer"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">₹{(order.total || 0).toLocaleString("en-IN")}</p>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800 capitalize">
                      {order.orderStatus || "Placed"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink/50 text-center py-8">No recent orders found.</p>
          )}
        </div>

        {/* Recent Tailoring Bookings */}
        <div className="bg-white rounded-2xl p-6 shadow-card border border-primary/5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Scissors size={18} className="text-accent" />
              <h3 className="font-display text-lg font-semibold text-primary">Recent Tailoring Bookings</h3>
            </div>
            <button
              onClick={() => onNavigateSection && onNavigateSection("tailoringOrders")}
              className="text-xs font-semibold text-accent hover:underline"
            >
              View queue
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-bg/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : data?.recentTailoringOrders && data.recentTailoringOrders.length > 0 ? (
            <div className="divide-y divide-primary/10 overflow-x-auto">
              {data.recentTailoringOrders.map((tOrder) => (
                <div key={tOrder._id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-primary capitalize">{tOrder.garmentType}</p>
                    <p className="text-ink/60 text-[11px]">{tOrder.customer?.name || tOrder.guestInfo?.name || "Client"}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                      tOrder.isFastDelivery ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {tOrder.isFastDelivery ? "Priority" : "Standard"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink/50 text-center py-8">No recent tailoring bookings found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
