import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors,
  Search,
  AlertCircle,
  Check,
  Eye,
  Zap,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Store,
  DollarSign,
  Ban,
  ShieldCheck,
  Wallet,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import api from "../../utils/api";
import { formatDate, formatTime, formatDateShort } from "../../utils/dateUtils";

export default function AdminOrders({ defaultType = "all", initialScheduleFilter = "all" }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [typeFilter, setTypeFilter] = useState(defaultType); // "all" | "shopping" | "tailoring" | "priority"
  const [scheduleFilter, setScheduleFilter] = useState(initialScheduleFilter || "all"); // "all" | "tomorrow" | "today" | "overdue" | "pending"
  const [activeCategoryTab, setActiveCategoryTab] = useState("all"); // "all" | "priority" | "regular" | "delivered" | "completed" | "rejected"
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 1,
  });

  const [scheduleCounts, setScheduleCounts] = useState({
    all: 0,
    overdue: 0,
    today: 0,
    tomorrow: 0,
    pending: 0,
  });

  const [categoryCounts, setCategoryCounts] = useState({
    all: 0,
    priority: 0,
    regular: 0,
    delivered: 0,
    completed: 0,
    rejected: 0,
  });

  const [typeCounts, setTypeCounts] = useState({
    all: 0,
    shopping: 0,
    tailoring: 0,
    priority: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  // Modals state
  const [activeOrderForAction, setActiveOrderForAction] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [offlineMethod, setOfflineMethod] = useState("cash");
  const [offlineAmountInput, setOfflineAmountInput] = useState("");
  const [offlineNotesInput, setOfflineNotesInput] = useState("");
  const [recordingOffline, setRecordingOffline] = useState(false);
  const [completingId, setCompletingId] = useState(null);

  useEffect(() => {
    if (defaultType) {
      setTypeFilter(defaultType);
      setPage(1);
    }
  }, [defaultType]);

  useEffect(() => {
    if (initialScheduleFilter) {
      setScheduleFilter(initialScheduleFilter);
      if (initialScheduleFilter !== "all") {
        setActiveCategoryTab("all");
      }
      setPage(1);
    }
  }, [initialScheduleFilter]);

  // Fetch orders from the authoritative backend endpoint
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        orderType: typeFilter,
        schedule: scheduleFilter,
        category: activeCategoryTab,
        page: String(page),
        limit: String(limit),
      });

      if (statusFilter) params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await api.get(`/api/admin/orders?${params.toString()}`);
      if (res?.data) {
        setOrders(res.data);
      }
      if (res?.pagination) {
        setPagination({
          total: res.pagination.total || 0,
          page: res.pagination.page || 1,
          limit: res.pagination.limit || limit,
          totalPages: res.pagination.totalPages || 1,
        });
        if (res.pagination.scheduleCounts) setScheduleCounts(res.pagination.scheduleCounts);
        if (res.pagination.categoryCounts) setCategoryCounts(res.pagination.categoryCounts);
        if (res.pagination.typeCounts) setTypeCounts(res.pagination.typeCounts);
      }
    } catch (err) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, scheduleFilter, activeCategoryTab, statusFilter, searchQuery, page, limit]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleTypeFilterChange = (type) => {
    setTypeFilter(type);
    setPage(1);
  };

  const handleScheduleFilterChange = (schedule) => {
    setScheduleFilter(schedule);
    setPage(1);
  };

  const handleCategoryTabChange = (cat) => {
    setActiveCategoryTab(cat);
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleUpdateStatus = async (order, newStatus) => {
    setUpdatingId(order._id);
    try {
      const endpoint =
        order.orderKind === "tailoring"
          ? `/api/tailoring/${order._id}/status`
          : `/api/orders/${order._id}/status`;
      await api.patch(endpoint, { status: newStatus });
      await fetchOrders();
    } catch (err) {
      alert(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  // Complete Order Handler (Verifies 100% full payment)
  const handleCompleteOrder = async (order) => {
    const isTailoring = order.orderKind === "tailoring";
    const totalAmount = Number(order.totalAmount || order.total || 0);
    const amountPaid = Number(order.amountPaid || order.advancePaid || (order.paymentStatus === "paid" ? totalAmount : 0));
    const amountDue = Math.max(0, totalAmount - amountPaid);

    if (order.paymentStatus !== "paid" || amountDue > 0) {
      alert(`Cannot complete order: ₹${amountDue.toLocaleString("en-IN")} balance is unpaid. Please collect payment first.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to mark order #${order.displayId} as COMPLETED?`)) return;

    setCompletingId(order._id);
    try {
      const endpoint = isTailoring ? `/api/tailoring/${order._id}/complete` : `/api/orders/${order._id}/complete`;
      await api.patch(endpoint, {});
      await fetchOrders();
      alert(`Order #${order.displayId} successfully marked as Completed!`);
    } catch (err) {
      alert(err.message || "Failed to complete order");
    } finally {
      setCompletingId(null);
    }
  };

  // Open Reject Modal
  const handleOpenRejectModal = (order) => {
    setActiveOrderForAction(order);
    setRejectionReasonInput("");
    setRejectModalOpen(true);
  };

  // Confirm Reject & Trigger Automated Refund
  const handleConfirmReject = async () => {
    if (!activeOrderForAction || !rejectionReasonInput.trim()) {
      alert("Please enter a valid rejection reason");
      return;
    }

    setRejecting(true);
    try {
      const isTailoring = activeOrderForAction.orderKind === "tailoring";
      const endpoint = isTailoring
        ? `/api/tailoring/${activeOrderForAction._id}/reject`
        : `/api/orders/${activeOrderForAction._id}/reject`;

      await api.patch(endpoint, { rejectionReason: rejectionReasonInput.trim() });
      setRejectModalOpen(false);
      setActiveOrderForAction(null);
      setRejectionReasonInput("");
      await fetchOrders();
      alert(`Order #${activeOrderForAction.displayId} has been rejected and any captured online payment refunded.`);
    } catch (err) {
      alert(err.message || "Failed to reject order");
    } finally {
      setRejecting(false);
    }
  };

  // Open Offline Payment Modal with fresh database state
  const handleOpenOfflineModal = async (order) => {
    try {
      const isTailoring = order.orderKind === "tailoring";
      const endpoint = isTailoring ? `/api/tailoring/${order._id}` : `/api/orders/${order._id}`;
      const freshRes = await api.get(endpoint);
      const freshOrder = freshRes?.data || order;

      const totalAmount = Number(freshOrder.totalAmount || freshOrder.total || freshOrder.finalPrice || freshOrder.estimatedPrice || 0);
      const amountPaid = Number(freshOrder.amountPaid || freshOrder.advancePaid || (freshOrder.paymentStatus === "paid" ? totalAmount : 0));
      const amountDue = Math.max(0, totalAmount - amountPaid);

      if (freshOrder.paymentStatus === "paid" || amountDue <= 0) {
        alert(`Order #${order.displayId || order.orderId} is already fully paid (₹${totalAmount.toLocaleString("en-IN")})! No balance remaining.`);
        return;
      }

      setActiveOrderForAction({ ...order, ...freshOrder, totalAmount, amountPaid, amountDue });
      setOfflineAmountInput(String(amountDue > 0 ? amountDue : ""));
      setOfflineMethod("cash");
      setOfflineNotesInput("");
      setOfflineModalOpen(true);
    } catch (err) {
      alert(err.message || "Failed to load latest order details");
    }
  };

  // Confirm Offline Balance Payment
  const handleConfirmOfflinePayment = async () => {
    if (!activeOrderForAction) return;

    const totalAmount = Number(activeOrderForAction.totalAmount || activeOrderForAction.total || 0);
    const amountPaid = Number(activeOrderForAction.amountPaid || activeOrderForAction.advancePaid || (activeOrderForAction.paymentStatus === "paid" ? totalAmount : 0));
    const maxDue = Math.max(0, totalAmount - amountPaid);

    const paymentVal = offlineAmountInput !== "" ? Number(offlineAmountInput) : maxDue;
    if (isNaN(paymentVal) || paymentVal <= 0) {
      alert("Please enter a valid positive payment amount");
      return;
    }

    if (paymentVal > maxDue) {
      alert(`Amount cannot exceed the remaining balance of ₹${maxDue.toLocaleString("en-IN")}`);
      return;
    }

    setRecordingOffline(true);
    try {
      const isTailoring = activeOrderForAction.orderKind === "tailoring";
      await api.post("/api/payments/record-offline", {
        dbOrderId: activeOrderForAction._id,
        orderType: isTailoring ? "tailoring" : "shopping",
        paymentMethod: offlineMethod,
        amount: paymentVal,
        notes: offlineNotesInput.trim(),
      });

      setOfflineModalOpen(false);
      setActiveOrderForAction(null);
      await fetchOrders();
      alert(`Recorded ₹${paymentVal.toLocaleString("en-IN")} via ${offlineMethod.toUpperCase()} successfully!`);
    } catch (err) {
      alert(err.message || "Failed to record offline payment");
    } finally {
      setRecordingOffline(false);
    }
  };

  const handleUpdateDeliveryDate = async (order, dateStr) => {
    setUpdatingId(order._id);
    try {
      const endpoint =
        order.orderKind === "tailoring"
          ? `/api/tailoring/${order._id}/status`
          : `/api/orders/${order._id}/status`;
      const payload =
        order.orderKind === "tailoring"
          ? { expectedDeliveryDate: dateStr }
          : { estimatedDeliveryDate: dateStr };
      await api.patch(endpoint, payload);
      await fetchOrders();
    } catch (err) {
      alert(err.message || "Failed to update delivery date");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "placed": return "bg-blue-100 text-blue-700";
      case "pending_payment": return "bg-amber-100 text-amber-700";
      case "confirmed": return "bg-indigo-100 text-indigo-700";
      case "fabric_received": return "bg-indigo-100 text-indigo-700";
      case "cutting": return "bg-amber-100 text-amber-700";
      case "stitching": return "bg-orange-100 text-orange-700";
      case "packed": return "bg-amber-100 text-amber-700";
      case "quality_check": return "bg-purple-100 text-purple-700";
      case "shipped": return "bg-purple-100 text-purple-700";
      case "ready_for_pickup": return "bg-emerald-100 text-emerald-700";
      case "delivered": return "bg-emerald-100 text-emerald-700";
      case "completed": return "bg-green-100 text-green-700";
      case "cancelled": return "bg-red-100 text-red-700";
      case "returned": return "bg-gray-100 text-gray-700";
      case "rejected": return "bg-rose-100 text-rose-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const scheduleTabs = [
    { id: "all", label: "All Orders", count: scheduleCounts.all, color: "text-ink/70", activeBg: "bg-primary text-white" },
    { id: "overdue", label: "Overdue Orders", count: scheduleCounts.overdue, color: "text-red-700", activeBg: "bg-red-600 text-white" },
    { id: "today", label: "Today's Orders", count: scheduleCounts.today, color: "text-amber-800", activeBg: "bg-amber-600 text-white" },
    { id: "tomorrow", label: "Tomorrow's Orders", count: scheduleCounts.tomorrow, color: "text-blue-800", activeBg: "bg-blue-600 text-white" },
    { id: "pending", label: "Total Pending", count: scheduleCounts.pending, color: "text-ink/80", activeBg: "bg-primary/80 text-white" },
  ];

  const categoryTabs = [
    { id: "all", label: "All Categories", icon: Layers, count: categoryCounts.all, color: "text-ink/60", activeBg: "bg-primary/80 text-white" },
    ...(typeFilter !== "shopping"
      ? [{ id: "priority", label: "Priority Orders", icon: Zap, count: categoryCounts.priority, color: "text-amber-600", activeBg: "bg-amber-500 text-white" }]
      : []),
    { id: "regular", label: "Regular Orders", icon: Package, count: categoryCounts.regular, color: "text-primary", activeBg: "bg-primary text-white" },
    { id: "delivered", label: "Delivered Orders", icon: CheckCircle2, count: categoryCounts.delivered, color: "text-emerald-600", activeBg: "bg-emerald-600 text-white" },
    { id: "completed", label: "Completed Orders", icon: Check, count: categoryCounts.completed, color: "text-green-700", activeBg: "bg-green-700 text-white" },
    { id: "rejected", label: "Rejected Orders", icon: XCircle, count: categoryCounts.rejected, color: "text-rose-600", activeBg: "bg-rose-600 text-white" },
  ];

  const getScheduleBannerInfo = () => {
    switch (scheduleFilter) {
      case "overdue":
        return {
          title: "Overdue Orders",
          desc: "Showing active orders that have exceeded their target delivery date.",
          color: "bg-red-50 text-red-800 border-red-200",
        };
      case "today":
        return {
          title: "Today's Orders",
          desc: "Showing orders scheduled for delivery today or placed same-day.",
          color: "bg-amber-50 text-amber-900 border-amber-200",
        };
      case "tomorrow":
        return {
          title: "Tomorrow's Orders",
          desc: "Showing active orders scheduled for delivery tomorrow.",
          color: "bg-blue-50 text-blue-900 border-blue-200",
        };
      case "pending":
        return {
          title: "Total Pending Orders",
          desc: "Showing all active fulfillment orders across boutique & tailoring queues.",
          color: "bg-primary/5 text-primary border-primary/15",
        };
      default:
        return null;
    }
  };

  const scheduleBanner = getScheduleBannerInfo();

  return (
    <div className="space-y-6">
      {/* ── Top Header & Global Controls ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
            <Layers className="text-accent" /> Orders Management
          </h2>
          <p className="text-sm text-ink/60 mt-1">
            Authoritative unified management across Boutique Shopping, Custom Tailoring &amp; Express Queues.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Order Type Switcher Pills */}
          <div className="bg-primary/5 p-1 rounded-xl flex items-center gap-1 border border-primary/10">
            <button
              onClick={() => handleTypeFilterChange("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                typeFilter === "all" ? "bg-white text-primary shadow-xs" : "text-ink/60 hover:text-primary"
              }`}
            >
              All Types ({typeCounts.all})
            </button>
            <button
              onClick={() => handleTypeFilterChange("shopping")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                typeFilter === "shopping" ? "bg-white text-primary shadow-xs" : "text-ink/60 hover:text-primary"
              }`}
            >
              <Store size={13} className="text-accent" />
              <span>Shopping ({typeCounts.shopping})</span>
            </button>
            <button
              onClick={() => handleTypeFilterChange("tailoring")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                typeFilter === "tailoring" ? "bg-white text-primary shadow-xs" : "text-ink/60 hover:text-primary"
              }`}
            >
              <Scissors size={13} className="text-accent" />
              <span>Tailoring ({typeCounts.tailoring})</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative flex-1 sm:w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search orders..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-primary/10 rounded-xl text-xs outline-none focus:border-highlight"
            />
          </div>

          <button
            onClick={fetchOrders}
            disabled={loading}
            className="p-2 bg-white border border-primary/10 rounded-xl text-primary hover:bg-bg transition-colors disabled:opacity-50"
            title="Refresh Orders"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Schedule Filters (Tomorrow, Today, Overdue, Total Pending, All) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {scheduleTabs.map((tab) => {
          const isActive = scheduleFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleScheduleFilterChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? `${tab.activeBg} shadow-sm`
                  : "bg-white text-ink/70 hover:bg-primary/5 border border-primary/10"
              }`}
            >
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

      {/* ── Active Schedule Filter Banner ── */}
      {scheduleBanner && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${scheduleBanner.color}`}>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span>{scheduleBanner.title}</span>
              <span className="text-[11px] font-normal">({pagination.total} order{pagination.total === 1 ? "" : "s"})</span>
            </div>
            <p className="text-xs opacity-80 mt-0.5">{scheduleBanner.desc}</p>
          </div>
          <button
            onClick={() => handleScheduleFilterChange("all")}
            className="px-3 py-1.5 bg-white/80 hover:bg-white text-ink rounded-lg text-xs font-semibold border border-current/20 shadow-xs shrink-0 cursor-pointer transition-all"
          >
            ✕ Show All Orders
          </button>
        </div>
      )}

      {/* ── Order Category Tabs (Priority, Regular, Delivered, Completed, Rejected, All) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-primary/10">
        {categoryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategoryTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleCategoryTabChange(tab.id)}
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

      {/* ── Unified Orders Table ── */}
      <div className="bg-white rounded-2xl shadow-card border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary/5 text-xs uppercase tracking-wider text-ink/50 border-b border-primary/10">
                <th className="p-4 font-medium">Order ID &amp; Type</th>
                <th className="p-4 font-medium">Order Placed</th>
                <th className="p-4 font-medium">Customer</th>
                {typeFilter !== "shopping" && <th className="p-4 font-medium">Priority / Type</th>}
                <th className="p-4 font-medium">Details / Delivery</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={typeFilter === "shopping" ? 7 : 8} className="p-8 text-center text-ink/40">Loading authoritative order data...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={typeFilter === "shopping" ? 7 : 8} className="p-8 text-center text-ink/40">
                    No orders found matching the selected filters.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isTailoring = order.orderKind === "tailoring";
                  const isPriority = Boolean(order.isPriority);

                  return (
                    <tr key={`${order.orderKind}-${order._id}`} className="hover:bg-primary/[0.03] transition-colors">
                      {/* Order ID & Type Badge */}
                      <td className="p-4 font-mono text-xs font-medium text-ink/70">
                        <button
                          onClick={() => navigate(order.detailsUrl)}
                          className="font-bold text-accent hover:underline text-left block"
                        >
                          {order.displayId}
                        </button>
                        <div className="mt-1">
                          {isTailoring ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                              <Scissors size={10} /> Tailoring
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                              <Store size={10} /> Shopping
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actual Order Placed Date & Time */}
                      <td className="p-4">
                        <div className="text-xs font-semibold text-primary">
                          {formatDate(order.placedAt)}
                        </div>
                        <div className="text-[11px] text-ink/50 font-mono mt-0.5">
                          {formatTime(order.placedAt)}
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="p-4">
                        <div className="font-medium text-ink">{order.customer?.name || "Customer"}</div>
                        <div className="text-xs text-ink/50">{order.customer?.phone || order.customer?.email || "-"}</div>
                      </td>

                      {/* Priority Badge */}
                      {typeFilter !== "shopping" && (
                        <td className="p-4">
                          {isTailoring ? (
                            isPriority ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Zap size={10} className="fill-amber-600 text-amber-600" /> Priority (24h)
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                                Standard (5d)
                              </span>
                            )
                          ) : (
                            <span className="text-ink/30 text-xs">-</span>
                          )}
                        </td>
                      )}

                      {/* Item details / Delivery */}
                      <td className="p-4">
                        <div className="text-xs font-medium text-ink">{order.itemsSummary}</div>
                        <div className="text-[11px] text-ink/60 mt-0.5">
                          {order.targetDeliveryDate ? (
                            <span className="font-semibold text-primary">
                              ETA: {formatDateShort(order.targetDeliveryDate)}
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold">Pending Review</span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="p-4 font-medium">
                        ₹{Number(order.totalAmount || 0).toLocaleString("en-IN")}
                        <div className="text-xs text-ink/50 font-normal">{order.paymentMethod}</div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                          {(order.status || "").replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex flex-col gap-2 items-end">
                          <button
                            onClick={() => navigate(order.detailsUrl)}
                            className="inline-flex items-center gap-1 text-xs text-accent font-semibold hover:underline cursor-pointer"
                          >
                            <Eye size={13} /> View Details
                          </button>

                          {/* Physical Progress Stages ONLY */}
                          {["completed", "rejected", "cancelled"].includes(order.status) ? (
                            <span className="text-[11px] font-bold text-ink/50 italic px-2 py-0.5 rounded bg-primary/5">
                              {order.status === "completed" ? "Completed" : (order.status === "rejected" ? "Rejected" : "Cancelled")}
                            </span>
                          ) : (order.status === "pending_payment" || (order.status === "placed" && order.paymentStatus === "pending")) ? (
                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                              Pending Advance
                            </span>
                          ) : (
                            <select
                              disabled={updatingId === order._id}
                              value={order.status}
                              onChange={(e) => handleUpdateStatus(order, e.target.value)}
                              className="text-xs bg-bg border border-primary/10 rounded-lg px-2 py-1.5 outline-none focus:border-highlight disabled:opacity-50 font-medium cursor-pointer"
                            >
                              {isTailoring ? (
                                <>
                                  <option value="confirmed">Confirmed</option>
                                  <option value="fabric_received">Fabric Received</option>
                                  <option value="cutting">Cutting</option>
                                  <option value="stitching">Stitching</option>
                                  <option value="quality_check">Quality Check</option>
                                  <option value="ready_for_pickup">Ready for Pickup</option>
                                  <option value="delivered">Delivered</option>
                                </>
                              ) : (
                                <>
                                  <option value="confirmed">Confirmed</option>
                                  <option value="packed">Packed</option>
                                  <option value="shipped">Shipped</option>
                                  <option value="delivered">Delivered</option>
                                </>
                              )}
                            </select>
                          )}

                          {/* Terminal & Financial Action Buttons */}
                          {!["completed", "rejected", "cancelled", "pending_payment"].includes(order.status) &&
                            !(order.paymentMethod === "RAZORPAY" && Number(order.amountPaid || 0) === 0 && order.paymentStatus === "pending") && (
                            <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                              {/* Complete Order Button */}
                              <button
                                type="button"
                                disabled={completingId === order._id}
                                onClick={() => handleCompleteOrder(order)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                                title="Complete Order (Requires 100% full payment)"
                              >
                                <Check size={11} /> Complete
                              </button>

                              {/* Reject Order Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenRejectModal(order)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Reject Order & Automated Razorpay Refund"
                              >
                                <Ban size={11} /> Reject
                              </button>

                              {/* Collect Offline Balance if any remaining */}
                              {order.paymentStatus !== "paid" && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenOfflineModal(order)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-medium transition-colors cursor-pointer"
                                  title="Mark Balance Paid (Cash / POS)"
                                >
                                  <Wallet size={11} /> Cash/POS
                                </button>
                              )}
                            </div>
                          )}

                          {!isTailoring && (!order.isGuntur || !order.deliveryReviewed) &&
                            !["completed", "rejected", "cancelled", "pending_payment"].includes(order.status) &&
                            !(order.paymentMethod === "RAZORPAY" && Number(order.amountPaid || 0) === 0 && order.paymentStatus === "pending") && (
                            <input
                              type="date"
                              disabled={updatingId === order._id}
                              onChange={(e) => e.target.value && handleUpdateDeliveryDate(order, e.target.value)}
                              className="text-[11px] bg-bg border border-primary/10 rounded px-2 py-1 outline-none focus:border-highlight mt-1"
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

        {/* Server-Side Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-primary/[0.02]">
            <span className="text-ink/60">
              Showing page <b>{pagination.page}</b> of <b>{pagination.totalPages}</b> ({pagination.total} total orders)
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

      {/* ── Reject Order Confirmation Modal ── */}
      <AnimatePresence>
        {rejectModalOpen && activeOrderForAction && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-primary/10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-primary/10">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-base font-display">
                  <Ban size={18} />
                  <span>Reject Order #{activeOrderForAction.displayId}</span>
                </div>
                <button
                  onClick={() => {
                    setRejectModalOpen(false);
                    setActiveOrderForAction(null);
                  }}
                  className="p-1 text-ink/40 hover:text-ink rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="py-4 space-y-3">
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-rose-700" /> Automated Refund &amp; Rollback
                  </p>
                  <p className="opacity-90">
                    Rejecting this order will trigger an automated Razorpay refund for all verified online payments and restore stock idempotently.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1.5">
                    Reason for Rejection <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    placeholder="e.g. Fabric unavailable, out of delivery zone, slot full..."
                    className="w-full text-xs p-3 rounded-xl border border-primary/20 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-bg/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-primary/10">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalOpen(false);
                    setActiveOrderForAction(null);
                  }}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-ink/70 hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={rejecting || !rejectionReasonInput.trim()}
                  onClick={handleConfirmReject}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {rejecting ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                  Confirm Rejection &amp; Refund
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Offline Balance Payment Modal ── */}
      <AnimatePresence>
        {offlineModalOpen && activeOrderForAction && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-primary/10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-primary/10">
                <div className="flex items-center gap-2 text-primary font-bold text-base font-display">
                  <Wallet size={18} className="text-accent" />
                  <span>Record Offline Payment #{activeOrderForAction.displayId}</span>
                </div>
                <button
                  onClick={() => {
                    setOfflineModalOpen(false);
                    setActiveOrderForAction(null);
                  }}
                  className="p-1 text-ink/40 hover:text-ink rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="py-4 space-y-3.5">
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-3.5 text-xs text-ink/80 space-y-1">
                  <div className="flex justify-between font-semibold text-primary">
                    <span>Order Total:</span>
                    <span>₹{Number(activeOrderForAction.totalAmount || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-ink/60">
                    <span>Currently Verified Paid:</span>
                    <span>₹{Number(activeOrderForAction.amountPaid || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-accent font-bold pt-1 border-t border-accent/10">
                    <span>Remaining Balance Due:</span>
                    <span>₹{Math.max(0, Number(activeOrderForAction.totalAmount || 0) - Number(activeOrderForAction.amountPaid || 0)).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Payment Method</label>
                    <select
                      value={offlineMethod}
                      onChange={(e) => setOfflineMethod(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-primary/20 outline-none focus:border-accent bg-bg/50 font-medium"
                    >
                      <option value="cash">Cash (Counter/Delivery)</option>
                      <option value="pos">POS / Card Terminal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      min="1"
                      value={offlineAmountInput}
                      onChange={(e) => setOfflineAmountInput(e.target.value)}
                      placeholder="Amount in INR"
                      className="w-full text-xs p-2.5 rounded-xl border border-primary/20 outline-none focus:border-accent bg-bg/50 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">Notes / Receipt Ref (Optional)</label>
                  <input
                    type="text"
                    value={offlineNotesInput}
                    onChange={(e) => setOfflineNotesInput(e.target.value)}
                    placeholder="e.g. Cash collected at counter by Lucky"
                    className="w-full text-xs p-2.5 rounded-xl border border-primary/20 outline-none focus:border-accent bg-bg/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-primary/10">
                <button
                  type="button"
                  onClick={() => {
                    setOfflineModalOpen(false);
                    setActiveOrderForAction(null);
                  }}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-ink/70 hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={recordingOffline || !offlineAmountInput || Number(offlineAmountInput) <= 0}
                  onClick={handleConfirmOfflinePayment}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-accent hover:bg-accent/90 text-white transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {recordingOffline ? <Loader2 size={13} className="animate-spin" /> : <DollarSign size={13} />}
                  Record Payment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
