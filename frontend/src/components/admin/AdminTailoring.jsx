import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Scissors,
  Search,
  Filter,
  AlertCircle,
  ChevronDown,
  Eye,
  Zap,
  Package,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import api from "../../utils/api";
import { formatDate, formatTime, formatDateShort } from "../../utils/dateUtils";



export const getTailoringOrderCategory = (order) => {
  const status = (order.status || "").toLowerCase();

  if (status === "delivered" || status === "completed") {
    return "delivered";
  }
  if (status === "rejected" || status === "cancelled") {
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

export default function AdminTailoring() {
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
      const url = statusFilter ? `/api/tailoring?status=${statusFilter}&limit=100` : "/api/tailoring?limit=100";
      const res = await api.get(url);
      if (res?.data) {
        setOrders(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load tailoring orders");
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
      await api.patch(`/api/tailoring/${orderId}/status`, { status: newStatus });
      setOrders(orders.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o)));
    } catch (err) {
      alert(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending_payment": return "bg-amber-100 text-amber-800 border-amber-200";
      case "pending": return "bg-amber-100 text-amber-800 border-amber-200";
      case "confirmed": return "bg-blue-100 text-blue-800 border-blue-200";
      case "fabric_received": return "bg-purple-100 text-purple-800 border-purple-200";
      case "cutting": return "bg-blue-100 text-blue-800 border-blue-200";
      case "stitching": return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "quality_check": return "bg-teal-100 text-teal-800 border-teal-200";
      case "ready_for_pickup": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "delivered": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      case "rejected": return "bg-rose-100 text-rose-800 border-rose-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Compute category counts dynamically
  const counts = useMemo(() => {
    let priority = 0, regular = 0, delivered = 0, rejected = 0;
    orders.forEach((o) => {
      const cat = getTailoringOrderCategory(o);
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
        const cat = getTailoringOrderCategory(order);
        if (cat !== activeTab) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const orderId = (order.orderId || order._id || "").toLowerCase();
        const custName = (order.customer?.name || order.guestInfo?.name || "").toLowerCase();
        const custContact = (order.customer?.email || order.customer?.phone || order.guestInfo?.phone || "").toLowerCase();
        const garment = (order.garmentType || "").toLowerCase();
        if (!orderId.includes(q) && !custName.includes(q) && !custContact.includes(q) && !garment.includes(q)) {
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
    { id: "all", label: "All Orders", icon: Scissors, count: counts.all, color: "text-ink/60", activeBg: "bg-primary/80 text-white" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
            <Scissors className="text-accent" /> Tailoring Orders
          </h2>
          <p className="text-sm text-ink/60 mt-1">Review custom stitching requests and queues.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative flex-1 sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, name, phone, garment..."
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
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="fabric_received">Fabric Received</option>
              <option value="cutting">Cutting</option>
              <option value="stitching">Stitching</option>
              <option value="quality_check">Quality Check</option>
              <option value="ready_for_pickup">Ready for Pickup</option>
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
                <th className="p-4 font-medium">Garment &amp; Design</th>
                <th className="p-4 font-medium">Delivery ETA</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-ink/40">Loading tailoring orders...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-ink/40">
                    No orders found in {tabs.find((t) => t.id === activeTab)?.label || "this category"}.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const customerName = order.customer?.name || order.guestInfo?.name || "Unknown";
                  const customerContact = order.customer?.phone || order.customer?.email || order.guestInfo?.phone || "-";
                  const category = getTailoringOrderCategory(order);
                  const isPriority = category === "priority";

                  return (
                    <tr key={order._id} className="hover:bg-primary/[0.03] transition-colors">
                      <td className="p-4 font-mono text-xs font-medium text-ink/70">
                        <button
                          onClick={() => navigate(`/admin/orders/tailoring/${order._id}`)}
                          className="font-bold text-accent hover:underline text-left block"
                        >
                          {order.orderId || order._id.slice(-6)}
                        </button>
                      </td>

                      {/* Actual Order Placed Date & Time */}
                      <td className="p-4">
                        <div className="text-xs font-semibold text-primary">
                          {formatDate(order.createdAt)}
                        </div>
                        <div className="text-[11px] text-ink/50 font-mono mt-0.5">
                          {formatTime(order.createdAt)}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-medium text-ink">{customerName}</div>
                        <div className="text-xs text-ink/50">{customerContact}</div>
                      </td>

                      <td className="p-4">
                        {isPriority ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Zap size={10} className="fill-amber-600 text-amber-600" /> Priority (24h)
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                            Regular
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="font-medium text-ink">{order.garmentType}</div>
                        <div className="text-xs text-ink/50 capitalize">
                          {order.designComplexity} • {(order.fabricSource || "").replace("_", " ")}
                        </div>
                      </td>

                      <td className="p-4 text-ink/70">
                        <span className="font-medium">
                          {formatDateShort(order.expectedDeliveryDate, "-")}
                        </span>
                      </td>


                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                          {(order.status || "").replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex flex-col gap-2 items-end">
                          <button
                            onClick={() => navigate(`/admin/orders/tailoring/${order._id}`)}
                            className="inline-flex items-center gap-1 text-xs text-accent font-semibold hover:underline cursor-pointer"
                          >
                            <Eye size={13} /> View Details
                          </button>

                          {["completed", "rejected", "cancelled"].includes(order.status) ? (
                            <span className="text-[11px] font-semibold text-ink/50 italic px-2 py-0.5 rounded bg-primary/5">
                              {order.status === "completed" ? "Completed" : "Closed"}
                            </span>
                          ) : (order.status === "pending_payment" || order.status === "pending") ? (
                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                              Pending Advance
                            </span>
                          ) : (
                            <select
                              disabled={updatingId === order._id}
                              value={order.status}
                              onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                              className="text-xs bg-bg border border-primary/10 rounded-lg px-2 py-1.5 outline-none focus:border-highlight disabled:opacity-50 font-medium cursor-pointer"
                            >
                              <option value="confirmed">Confirmed</option>
                              <option value="fabric_received">Fabric Received</option>
                              <option value="cutting">Cutting</option>
                              <option value="stitching">Stitching</option>
                              <option value="quality_check">Quality Check</option>
                              <option value="ready_for_pickup">Ready for Pickup</option>
                              <option value="delivered">Delivered</option>
                            </select>
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
