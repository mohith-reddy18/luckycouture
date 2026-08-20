import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  Search,
  Filter,
  AlertCircle,
  ChevronDown,
  Check,
  Eye,
  Zap,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import api from "../../utils/api";
import { format } from "date-fns";

export const getOrderCategory = (order) => {
  const status = (order.status || "").toLowerCase();

  if (status === "delivered") {
    return "delivered";
  }
  if (status === "rejected" || status === "cancelled" || status === "returned") {
    return "rejected";
  }

  const isPriority = Boolean(
    order.isFastDelivery ||
    order.isPriority ||
    order.priority === true ||
    order.orderType === "priority" ||
    order.isPriorityOrder
  );

  if (isPriority) {
    return "priority";
  }

  return "regular";
};

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("priority");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const url = statusFilter ? `/api/orders?status=${statusFilter}` : "/api/orders";
      const res = await api.get(url);
      if (res?.data) {
        setOrders(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/api/orders/${orderId}/status`, { status: newStatus });
      setOrders(orders.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o)));
    } catch (err) {
      alert(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateDeliveryDate = async (orderId, dateStr) => {
    setUpdatingId(orderId);
    try {
      const res = await api.patch(`/api/orders/${orderId}/status`, { estimatedDeliveryDate: dateStr });
      setOrders(
        orders.map((o) =>
          o._id === orderId
            ? { ...o, estimatedDeliveryDate: res.data.estimatedDeliveryDate, deliveryDateReviewed: true }
            : o
        )
      );
    } catch (err) {
      alert(err.message || "Failed to update delivery date");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "placed": return "bg-blue-100 text-blue-700";
      case "confirmed": return "bg-indigo-100 text-indigo-700";
      case "packed": return "bg-amber-100 text-amber-700";
      case "shipped": return "bg-purple-100 text-purple-700";
      case "delivered": return "bg-emerald-100 text-emerald-700";
      case "cancelled": return "bg-red-100 text-red-700";
      case "returned": return "bg-gray-100 text-gray-700";
      case "rejected": return "bg-rose-100 text-rose-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  // Compute category counts dynamically
  const counts = useMemo(() => {
    let priority = 0, regular = 0, delivered = 0, rejected = 0;
    orders.forEach((o) => {
      const cat = getOrderCategory(o);
      if (cat === "priority") priority++;
      else if (cat === "regular") regular++;
      else if (cat === "delivered") delivered++;
      else if (cat === "rejected") rejected++;
    });
    return { priority, regular, delivered, rejected, all: orders.length };
  }, [orders]);

  // Filter orders by active tab and search query
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (activeTab !== "all") {
        const cat = getOrderCategory(order);
        if (cat !== activeTab) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const orderId = (order.orderId || order._id || "").toLowerCase();
        const custName = (order.user?.name || "").toLowerCase();
        const custEmail = (order.user?.email || "").toLowerCase();
        const custPhone = (order.shippingAddress?.phone || "").toLowerCase();
        if (!orderId.includes(q) && !custName.includes(q) && !custEmail.includes(q) && !custPhone.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [orders, activeTab, searchQuery]);

  const tabs = [
    { id: "priority", label: "Priority Orders", icon: Zap, count: counts.priority, color: "text-amber-600", activeBg: "bg-amber-500 text-white" },
    { id: "regular", label: "Regular Orders", icon: Package, count: counts.regular, color: "text-primary", activeBg: "bg-primary text-white" },
    { id: "delivered", label: "Delivered Orders", icon: CheckCircle2, count: counts.delivered, color: "text-emerald-600", activeBg: "bg-emerald-600 text-white" },
    { id: "rejected", label: "Rejected Orders", icon: XCircle, count: counts.rejected, color: "text-rose-600", activeBg: "bg-rose-600 text-white" },
    { id: "all", label: "All Orders", icon: ShoppingBag, count: counts.all, color: "text-ink/60", activeBg: "bg-primary/80 text-white" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
            <ShoppingBag className="text-accent" /> Shopping Orders
          </h2>
          <p className="text-sm text-ink/60 mt-1">Manage and update customer orders &amp; delivery schedules.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative flex-1 sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, name, phone..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-primary/10 rounded-xl text-sm outline-none focus:border-highlight"
            />
          </div>

          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-white border border-primary/10 rounded-xl text-sm outline-none focus:border-highlight appearance-none"
            >
              <option value="">All Statuses</option>
              <option value="placed">Placed</option>
              <option value="confirmed">Confirmed</option>
              <option value="packed">Packed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="rejected">Rejected</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Order Category Tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-primary/10">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? `${tab.activeBg} shadow-sm`
                  : "bg-white text-ink/70 hover:bg-primary/5 border border-primary/10"
              }`}
            >
              <Icon size={14} className={isActive ? "text-white" : tab.color} />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-700 text-sm p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary/5 text-xs uppercase tracking-wider text-ink/50 border-b border-primary/10">
                <th className="p-4 font-medium">Order ID</th>
                <th className="p-4 font-medium">Order Placed</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Priority / Type</th>
                <th className="p-4 font-medium">Delivery &amp; Location</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-ink/40">Loading orders...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-ink/40">
                    No orders found in {tabs.find((t) => t.id === activeTab)?.label || "this category"}.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isGuntur = (order.shippingAddress?.city || "").trim().toLowerCase() === "guntur";
                  const category = getOrderCategory(order);
                  const isPriority = category === "priority";

                  return (
                    <tr key={order._id} className="hover:bg-primary/[0.03] transition-colors">
                      <td className="p-4 font-mono text-xs font-medium text-ink/70">
                        <button
                          onClick={() => navigate(`/admin/orders/shopping/${order._id}`)}
                          className="font-bold text-accent hover:underline text-left block"
                        >
                          {order.orderId || order._id.slice(-6)}
                        </button>
                      </td>

                      {/* Actual Order Placed Date & Time */}
                      <td className="p-4">
                        <div className="text-xs font-semibold text-primary">
                          {order.createdAt ? format(new Date(order.createdAt), "dd MMM yyyy") : "—"}
                        </div>
                        <div className="text-[11px] text-ink/50 font-mono mt-0.5">
                          {order.createdAt ? format(new Date(order.createdAt), "hh:mm a") : ""}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-medium text-ink">{order.user?.name || "Unknown"}</div>
                        <div className="text-xs text-ink/50">{order.shippingAddress?.phone || order.user?.email || "-"}</div>
                      </td>

                      <td className="p-4">
                        {isPriority ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Zap size={10} className="fill-amber-600 text-amber-600" /> Priority
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                            Regular
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        {order.needsDelivery === false ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800">
                            Store Pickup
                          </span>
                        ) : isGuntur ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">
                            Guntur (24h Delivery)
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            {order.shippingAddress?.city || "Outstation"} (Long Distance)
                          </span>
                        )}

                        <div className="text-xs mt-1">
                          {order.deliveryDateReviewed && order.estimatedDeliveryDate ? (
                            <span className="font-semibold text-primary">
                              Target: {format(new Date(order.estimatedDeliveryDate), "MMM d, yyyy")}
                            </span>
                          ) : isGuntur && order.estimatedDeliveryDate ? (
                            <span className="font-semibold text-primary">
                              Target: {format(new Date(order.estimatedDeliveryDate), "MMM d, yyyy")}
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold block text-[11px]">
                              Pending Review
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 font-medium">
                        ₹{order.total?.toLocaleString("en-IN")}
                        <div className="text-xs text-ink/50 font-normal">{order.paymentMethod?.toUpperCase()}</div>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex flex-col gap-2 items-end">
                          <button
                            onClick={() => navigate(`/admin/orders/shopping/${order._id}`)}
                            className="inline-flex items-center gap-1 text-xs text-accent font-semibold hover:underline cursor-pointer"
                          >
                            <Eye size={13} /> View Details
                          </button>

                          <select
                            disabled={updatingId === order._id}
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                            className="text-xs bg-bg border border-primary/10 rounded-lg px-2 py-1.5 outline-none focus:border-highlight disabled:opacity-50"
                          >
                            <option value="placed">Placed</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="packed">Packed</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="rejected">Rejected</option>
                          </select>

                          {(!isGuntur || !order.deliveryDateReviewed) && (
                            <input
                              type="date"
                              disabled={updatingId === order._id}
                              onChange={(e) => e.target.value && handleUpdateDeliveryDate(order._id, e.target.value)}
                              className="text-[11px] bg-bg border border-primary/10 rounded px-2 py-1 outline-none focus:border-highlight"
                              title="Set/Confirm Delivery Date"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
