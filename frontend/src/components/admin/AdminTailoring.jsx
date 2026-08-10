import { useState, useEffect } from "react";
import { Scissors, Filter, AlertCircle, ChevronDown } from "lucide-react";
import api from "../../utils/api";
import { format } from "date-fns";

export default function AdminTailoring() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const url = statusFilter ? `/api/tailoring?status=${statusFilter}` : "/api/tailoring";
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
      setOrders(orders.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      alert(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "bg-gray-100 text-gray-700";
      case "confirmed": return "bg-blue-100 text-blue-700";
      case "fabric_received": return "bg-indigo-100 text-indigo-700";
      case "cutting": return "bg-amber-100 text-amber-700";
      case "stitching": return "bg-orange-100 text-orange-700";
      case "quality_check": return "bg-purple-100 text-purple-700";
      case "ready_for_pickup": return "bg-emerald-100 text-emerald-700";
      case "delivered": return "bg-teal-100 text-teal-700";
      case "cancelled": return "bg-red-100 text-red-700";
      case "rejected": return "bg-rose-100 text-rose-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
            <Scissors className="text-accent" /> Tailoring Orders
          </h2>
          <p className="text-sm text-ink/60 mt-1">Review custom stitching requests and queues.</p>
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
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="fabric_received">Fabric Received</option>
              <option value="cutting">Cutting</option>
              <option value="stitching">Stitching</option>
              <option value="quality_check">Quality Check</option>
              <option value="ready_for_pickup">Ready for Pickup</option>
              <option value="delivered">Delivered</option>
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
                <th className="p-4 font-medium">Garment</th>
                <th className="p-4 font-medium">Delivery ETA</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-ink/40">Loading tailoring orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-ink/40">No tailoring orders found.</td>
                </tr>
              ) : (
                orders.map((order) => {
                  const customerName = order.customer?.name || order.guestInfo?.name || "Unknown";
                  const customerContact = order.customer?.email || order.guestInfo?.phone || "-";
                  
                  return (
                    <tr key={order._id} className="hover:bg-primary/[0.02] transition-colors">
                      <td className="p-4 font-mono text-xs font-medium text-ink/70">
                        {order.orderId || order._id.slice(-6)}
                        {order.isFastDelivery && (
                          <span className="block mt-1 text-[10px] text-accent font-bold uppercase tracking-wider">Priority</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-ink">{customerName}</div>
                        <div className="text-xs text-ink/50">{customerContact}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-ink">{order.garmentType}</div>
                        <div className="text-xs text-ink/50 capitalize">
                          {order.designComplexity} • {order.fabricSource.replace("_", " ")}
                        </div>
                      </td>
                      <td className="p-4 text-ink/70">
                        {order.expectedDeliveryDate ? format(new Date(order.expectedDeliveryDate), "MMM d, yyyy") : "-"}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <select
                          disabled={updatingId === order._id}
                          value={order.status}
                          onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                          className="text-xs bg-bg border border-primary/10 rounded-lg px-2 py-1.5 outline-none focus:border-highlight disabled:opacity-50"
                        >
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
