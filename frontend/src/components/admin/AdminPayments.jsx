import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  AlertCircle,
  TrendingUp,
  Filter,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  Scissors,
  Store,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import api from "../../utils/api";
import { formatDateShort, formatTime } from "../../utils/dateUtils";

export default function AdminPayments() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalAdvanceCollected: 0,
    totalBalanceDue: 0,
    totalOrderVolume: 0,
    totalRevenue: 0,
    totalRefunded: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 1,
  });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        filter,
        page: String(page),
        limit: String(limit),
      });
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await api.get(`/api/admin/payments?${params.toString()}`);
      if (res?.data) {
        setTransactions(res.data.transactions || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
      if (res?.pagination) {
        setPagination({
          total: res.pagination.total || 0,
          page: res.pagination.page || 1,
          limit: res.pagination.limit || limit,
          totalPages: res.pagination.totalPages || 1,
        });
      }
    } catch (err) {
      setError(err.message || "Failed to load payment reconciliation data");
    } finally {
      setLoading(false);
    }
  }, [filter, searchQuery, page, limit]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleFilterChange = (key) => {
    setFilter(key);
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
            <CreditCard className="text-accent" /> Payments &amp; Financial Reconciliation
          </h2>
          <p className="text-sm text-ink/60 mt-1">
            Authoritative financial ledger across Shopping, Custom Tailoring &amp; Express Queues.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by order ID, customer, RZP ID..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-primary/10 rounded-xl text-xs outline-none focus:border-highlight"
            />
          </div>
          <button
            onClick={fetchPayments}
            disabled={loading}
            className="p-2 bg-white border border-primary/10 rounded-xl text-primary hover:bg-bg transition-colors disabled:opacity-50"
            title="Refresh Payments"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
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
            <p className="text-xs font-medium text-ink/60">Verified Collections (Advance &amp; Full)</p>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight mt-1 mb-1">
              {loading ? (
                <span className="inline-block w-24 h-8 bg-emerald-100 rounded animate-pulse" />
              ) : (
                `₹${(summary.totalAdvanceCollected || 0).toLocaleString("en-IN")}`
              )}
            </h3>
            <p className="text-[11px] text-ink/50">Online Razorpay &amp; Verified Offline Cash/POS</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-card border border-primary/5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-ink/60">Balance Due at Delivery / Pickup</p>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-amber-600 tracking-tight mt-1 mb-1">
              {loading ? (
                <span className="inline-block w-24 h-8 bg-amber-100 rounded animate-pulse" />
              ) : (
                `₹${(summary.totalBalanceDue || 0).toLocaleString("en-IN")}`
              )}
            </h3>
            <p className="text-[11px] text-ink/50">Remaining on active fulfillment orders</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-card border border-primary/5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-ink/60">Total Unified Order Volume</p>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-primary tracking-tight mt-1 mb-1">
              {loading ? (
                <span className="inline-block w-16 h-8 bg-primary/10 rounded animate-pulse" />
              ) : (
                summary.totalOrderVolume || 0
              )}
            </h3>
            <p className="text-[11px] text-ink/50">Combined Shopping &amp; Tailoring records</p>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Filter size={24} />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pt-2">
        {[
          { key: "all", label: "All Transactions" },
          { key: "paid", label: "Paid / Advance Paid" },
          { key: "pending", label: "Pending Payment" },
          { key: "refunded", label: "Refunded" },
          { key: "disputes", label: "Disputes" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleFilterChange(tab.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
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
          <span className="text-xs text-ink/50">{pagination.total} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-xs uppercase tracking-wider text-ink/50 border-b border-primary/10">
                <th className="p-4 font-medium">Order Ref &amp; Razorpay IDs</th>
                <th className="p-4 font-medium">Type</th>
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
                  <td colSpan="7" className="p-8 text-center text-ink/40">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-ink/40">
                    No transactions matching this filter.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isTailoring = tx.orderKind === "tailoring";
                  return (
                    <tr key={`${tx.orderKind}-${tx._id}`} className="hover:bg-primary/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="font-mono text-xs font-semibold text-primary">
                          #{tx.displayId}
                        </div>
                        {tx.razorpayOrderId && (
                          <div className="text-[11px] font-mono text-ink/50 truncate max-w-[200px]" title={tx.razorpayOrderId}>
                            RZP Order: {tx.razorpayOrderId}
                          </div>
                        )}
                        {tx.razorpayPaymentId && (
                          <div className="text-[11px] font-mono text-emerald-600 truncate max-w-[200px]" title={tx.razorpayPaymentId}>
                            Pay ID: {tx.razorpayPaymentId}
                          </div>
                        )}
                        {Array.isArray(tx.disputes) && tx.disputes.length > 0 && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">
                            <ShieldAlert size={10} /> Dispute: {tx.disputes[0].status}
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        {isTailoring ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                            <Scissors size={10} /> Tailoring
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                            <Store size={10} /> Shopping
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="font-medium text-ink/80">{tx.customerName}</div>
                        <div className="text-[11px] text-ink/50">{tx.customerPhone || tx.customerEmail || ""}</div>
                      </td>

                      <td className="p-4 text-xs text-ink/70">
                        {formatDateShort(tx.createdAt)}
                        <div className="text-[11px] text-ink/40">{formatTime(tx.createdAt)}</div>
                      </td>

                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/5 text-primary">
                          {tx.paymentMethod}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-primary">₹{(tx.totalAmount || 0).toLocaleString("en-IN")}</div>
                        <div className="text-[11px] text-ink/60">
                          <span className="text-emerald-600 font-medium">Adv: ₹{(tx.advancePaid || 0).toLocaleString("en-IN")}</span>
                          {" • "}
                          <span className="text-amber-600 font-medium">Due: ₹{(tx.balanceDue || 0).toLocaleString("en-IN")}</span>
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="inline-flex flex-col items-end gap-1">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              tx.paymentStatus === "paid"
                                ? "bg-emerald-100 text-emerald-700"
                                : tx.paymentStatus === "refunded"
                                ? "bg-gray-100 text-gray-700"
                                : tx.paymentStatus === "failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {tx.paymentStatus}
                          </span>
                          {tx.refundStatus && tx.refundStatus !== "none" && (
                            <span className="text-[10px] text-ink/50 flex items-center gap-0.5">
                              <RotateCcw size={9} /> Refund: {tx.refundStatus}
                            </span>
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

        {/* Server-Side Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-primary/[0.02]">
            <span className="text-ink/60">
              Showing page <b>{pagination.page}</b> of <b>{pagination.totalPages}</b> ({pagination.total} total records)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-primary/15 bg-white text-ink/80 hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span className="px-3 py-1.5 font-bold text-primary bg-white border border-primary/15 rounded-lg">
                {page}
              </span>

              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-primary/15 bg-white text-ink/80 hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
