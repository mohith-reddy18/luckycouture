import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Search, Filter, AlertCircle, ChevronDown, Check, Eye } from "lucide-react";
import api from "../../utils/api";
import { format } from "date-fns";

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
      setOrders(orders.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
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
      setOrders(orders.map(o => o._id === orderId ? { ...o, estimatedDeliveryDate: res.data.estimatedDeliveryDate, deliveryDateReviewed: true } : o));
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
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
            <ShoppingBag className="text-accent" /> Shopping Orders
          </h2>
          <p className="text-sm text-ink/60 mt-1">Manage and update customer orders &amp; delivery schedules.</p>
        </div>

        <div className="flex items-center gap-3">
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
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
          </div>
        </div>
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
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Delivery &amp; Location</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-ink/40">Loading orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-ink/40">No orders found.</td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isGuntur = (order.shippingAddress?.city || "").trim().toLowerCase() === "guntur";
                  return (
                    <tr key={order._id} className="hover:bg-primary/[0.03] transition-colors">
                      <td className="p-4 font-mono text-xs font-medium text-ink/70">
                        <button
                          onClick={() => navigate(`/admin/orders/shopping/${order._id}`)}
                          className="font-bold text-accent hover:underline text-left"
                        >
                          {order.orderId || order._id.slice(-6)}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-ink">{order.user?.name || "Unknown"}</div>
                        <div className="text-xs text-ink/50">{order.user?.email || "-"}</div>
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
                            className="inline-flex items-center gap-1 text-xs text-accent font-semibold hover:underline"
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
