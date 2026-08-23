import { useState, useEffect } from "react";
import { CreditCard, AlertCircle, TrendingUp, Filter, ShieldAlert, RotateCcw, CheckCircle2 } from "lucide-react";
import api from "../../utils/api";
import { formatDateShort, formatTime } from "../../utils/dateUtils";


export default function AdminPayments() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchPayments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/orders?limit=100");
      if (res?.data) {
        setOrders(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load payment data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const totalAdvanceCollected = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, order) => sum + (order.advancePaid || order.total || 0), 0);

  const totalBalanceDue = orders
    .filter((o) => o.paymentStatus === "paid" && o.status !== "delivered")
    .reduce((sum, order) => sum + (order.balanceDue || 0), 0);

  const filteredOrders = orders.filter((order) => {
    if (filter === "paid") return order.paymentStatus === "paid";
    if (filter === "pending") return order.paymentStatus === "pending";
    if (filter === "refunded") return order.paymentStatus === "refunded" || order.refundStatus === "processed";
    if (filter === "disputes") return Array.isArray(order.disputes) && order.disputes.length > 0;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
            <CreditCard className="text-accent" /> Payments & Financial Reconciliation
          </h2>
          <p className="text-sm text-ink/60 mt-1">
            Track Razorpay online advance collections, balance due at delivery, refunds, and dispute logs.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-700 text-sm p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-6 shadow-card border border-primary/5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-ink/60">30% Advance Collected</p>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight mt-1 mb-1">
              {loading ? (
                <span className="inline-block w-24 h-8 bg-emerald-100 rounded animate-pulse" />
              ) : (
                `₹${totalAdvanceCollected.toLocaleString("en-IN")}`
              )}
            </h3>
            <p className="text-[11px] text-ink/50">Verified online payments</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-card border border-primary/5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-ink/60">70% Balance Due (Delivery)</p>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-amber-600 tracking-tight mt-1 mb-1">
              {loading ? (
                <span className="inline-block w-24 h-8 bg-amber-100 rounded animate-pulse" />
              ) : (
                `₹${totalBalanceDue.toLocaleString("en-IN")}`
              )}
            </h3>
            <p className="text-[11px] text-ink/50">Remaining on active orders</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-card border border-primary/5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-ink/60">Total Order Volume</p>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-primary tracking-tight mt-1 mb-1">
              {loading ? (
                <span className="inline-block w-16 h-8 bg-primary/10 rounded animate-pulse" />
              ) : (
                orders.length
              )}
            </h3>
            <p className="text-[11px] text-ink/50">All recorded orders</p>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Filter size={24} />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pt-2">
        {[
          { key: "all", label: "All Orders" },
          { key: "paid", label: "Paid / Advance Paid" },
          { key: "pending", label: "Pending" },
          { key: "refunded", label: "Refunded" },
          { key: "disputes", label: "Disputes" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === tab.key
                ? "bg-primary text-bg shadow-sm"
                : "bg-white text-ink/70 border border-primary/10 hover:border-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-primary/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/10 flex justify-between items-center bg-primary/5">
          <h3 className="font-semibold text-sm text-ink">Transaction Audit Trail</h3>
          <span className="text-xs text-ink/50">{filteredOrders.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-xs uppercase tracking-wider text-ink/50 border-b border-primary/10">
                <th className="p-4 font-medium">Order Ref & Razorpay IDs</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Method</th>
                <th className="p-4 font-medium">Total / Advance / Due</th>
                <th className="p-4 font-medium text-right">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-ink/40">
                    Loading transactions...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-ink/40">
                    No transactions matching this filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-primary/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="font-mono text-xs font-semibold text-primary">
                        #{order.orderId || order._id.slice(-8)}
                      </div>
                      {order.razorpayOrderId && (
                        <div className="text-[11px] font-mono text-ink/50 truncate max-w-[200px]" title={order.razorpayOrderId}>
                          RZP Order: {order.razorpayOrderId}
                        </div>
                      )}
                      {order.razorpayPaymentId && (
                        <div className="text-[11px] font-mono text-emerald-600 truncate max-w-[200px]" title={order.razorpayPaymentId}>
                          Pay ID: {order.razorpayPaymentId}
                        </div>
                      )}
                      {Array.isArray(order.disputes) && order.disputes.length > 0 && (
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">
                          <ShieldAlert size={10} /> Dispute: {order.disputes[0].status}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-ink/80">{order.user?.name || "Customer"}</div>
                      <div className="text-[11px] text-ink/50">{order.user?.email || order.shippingAddress?.phone || ""}</div>
                    </td>
                    <td className="p-4 text-xs text-ink/70">
                      {formatDateShort(order.createdAt)}
                      <div className="text-[11px] text-ink/40">{formatTime(order.createdAt)}</div>
                    </td>

                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/5 text-primary">
                        {order.paymentMethod || "COD"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-primary">₹{(order.total || 0).toLocaleString("en-IN")}</div>
                      {order.paymentMethod === "razorpay" && (
                        <div className="text-[11px] text-ink/60">
                          <span className="text-emerald-600 font-medium">Adv: ₹{(order.advancePaid || Math.round((order.total || 0) * 0.3)).toLocaleString("en-IN")}</span>
                          {" • "}
                          <span className="text-amber-600 font-medium">Due: ₹{(order.balanceDue || Math.round((order.total || 0) * 0.7)).toLocaleString("en-IN")}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex flex-col items-end gap-1">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            order.paymentStatus === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : order.paymentStatus === "refunded"
                              ? "bg-gray-100 text-gray-700"
                              : order.paymentStatus === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {order.paymentStatus || "pending"}
                        </span>
                        {order.refundStatus && order.refundStatus !== "none" && (
                          <span className="text-[10px] text-ink/50 flex items-center gap-0.5">
                            <RotateCcw size={9} /> Refund: {order.refundStatus}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
