import { useState, useEffect } from "react";
import { CreditCard, AlertCircle, TrendingUp, Filter } from "lucide-react";
import api from "../../utils/api";
import { format } from "date-fns";

export default function AdminPayments() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPayments = async () => {
    setLoading(true);
    setError("");
    try {
      // For payments, we'll look at the orders which carry the financial data
      const res = await api.get("/api/orders");
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

  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const pendingRevenue = orders.filter(o => o.paymentStatus === 'pending').reduce((sum, order) => sum + (order.total || 0), 0);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
            <CreditCard className="text-accent" /> Payments & Sales
          </h2>
          <p className="text-sm text-ink/60 mt-1">Track sales revenue and transaction history.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-700 text-sm p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-6 shadow-card border border-primary/5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-ink/60">Total Collected</p>
            <h3 className="font-display text-3xl font-bold text-emerald-600 tracking-tight mt-1 mb-1">
              {loading ? <span className="inline-block w-24 h-8 bg-emerald-100 rounded animate-pulse" /> : `₹${totalRevenue.toLocaleString("en-IN")}`}
            </h3>
            <p className="text-[11px] text-ink/50">From all processed orders</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <TrendingUp size={24} />
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-card border border-primary/5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-ink/60">Pending / COD Value</p>
            <h3 className="font-display text-3xl font-bold text-amber-600 tracking-tight mt-1 mb-1">
              {loading ? <span className="inline-block w-24 h-8 bg-amber-100 rounded animate-pulse" /> : `₹${pendingRevenue.toLocaleString("en-IN")}`}
            </h3>
            <p className="text-[11px] text-ink/50">Cash on delivery & pending</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
            <Filter size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-primary/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-primary/10 flex justify-between items-center bg-primary/5">
          <h3 className="font-semibold text-sm text-ink">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-xs uppercase tracking-wider text-ink/50 border-b border-primary/10">
                <th className="p-4 font-medium">Transaction Ref</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Method</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium text-right">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-ink/40">Loading transactions...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-ink/40">No transaction data available.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-primary/[0.02] transition-colors">
                    <td className="p-4 font-mono text-xs font-medium text-ink/70">
                      {order.orderId || order._id.slice(-6)}
                    </td>
                    <td className="p-4 text-ink/80">
                      {order.user?.name || "Unknown"}
                    </td>
                    <td className="p-4 text-ink/70">
                      {format(new Date(order.createdAt), "MMM d, yyyy h:mm a")}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/5 text-primary">
                        {order.paymentMethod || "COD"}
                      </span>
                    </td>
                    <td className="p-4 font-medium">
                      ₹{order.total?.toLocaleString("en-IN")}
                    </td>
                    <td className="p-4 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                        order.paymentStatus === 'refunded' ? 'bg-gray-100 text-gray-700' :
                        order.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {order.paymentStatus || 'pending'}
                      </span>
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
