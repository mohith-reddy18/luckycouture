import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Scissors,
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
  Layers,
  Store,
  DollarSign,
  Ban,
  ShieldCheck,
  Wallet,
  X,
  Loader2,
} from "lucide-react";
import api from "../../utils/api";
import { format } from "date-fns";

export const getOrderCategory = (order) => {
  const status = (order.status || "").toLowerCase();

  if (status === "delivered" || status === "completed") {
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

export const matchesScheduleFilter = (order, filter) => {
  if (!filter || filter === "all") return true;

  const status = (order.status || "").toLowerCase();
  const isDeliveredOrRejected =
    status === "delivered" ||
    status === "completed" ||
    status === "cancelled" ||
    status === "rejected" ||
    status === "returned";

  // Pending filter: all active orders not delivered or rejected
  if (filter === "pending") {
    return !isDeliveredOrRejected;
  }

  // Overdue, today, tomorrow only apply to active orders
  if (isDeliveredOrRejected) return false;

  const targetDateRaw =
    order.targetDelivery ||
    order.expectedDeliveryDate ||
    order.estimatedDeliveryDate ||
    order.expectedDeliveryAt;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  if (filter === "overdue") {
    if (!targetDateRaw) return false;
    const target = new Date(targetDateRaw);
    return target < todayStart;
  }

  if (filter === "today") {
    if (targetDateRaw) {
      const target = new Date(targetDateRaw);
      return target >= todayStart && target <= todayEnd;
    }
    if (order.placedAt) {
      const placed = new Date(order.placedAt);
      return placed >= todayStart && placed <= todayEnd;
    }
    return false;
  }

  if (filter === "tomorrow") {
    if (!targetDateRaw) return false;
    const target = new Date(targetDateRaw);
    return target >= tomorrowStart && target <= tomorrowEnd;
  }

  return true;
};

export default function AdminOrders({ defaultType = "all", initialScheduleFilter = "all" }) {
  const navigate = useNavigate();
  const [shoppingOrders, setShoppingOrders] = useState([]);
  const [tailoringOrders, setTailoringOrders] = useState([]);
  const [typeFilter, setTypeFilter] = useState(defaultType); // "all" | "shopping" | "tailoring"
  const [scheduleFilter, setScheduleFilter] = useState(initialScheduleFilter || "all"); // "all" | "tomorrow" | "today" | "overdue" | "pending"
  const [activeCategoryTab, setActiveCategoryTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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
    if (defaultType) setTypeFilter(defaultType);
  }, [defaultType]);

  useEffect(() => {
    if (initialScheduleFilter) {
      setScheduleFilter(initialScheduleFilter);
      if (initialScheduleFilter !== "all") {
        setActiveCategoryTab("all");
      }
    }
  }, [initialScheduleFilter]);

  const fetchAllOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const [shopRes, tailRes] = await Promise.all([
        api.get("/api/orders?limit=100"),
        api.get("/api/tailoring?limit=100"),
      ]);
      if (shopRes?.data) setShoppingOrders(shopRes.data);
      if (tailRes?.data) setTailoringOrders(tailRes.data);
    } catch (err) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const handleUpdateStatus = async (order, newStatus) => {
    setUpdatingId(order._id);
    try {
      const endpoint =
        order.orderKind === "tailoring"
          ? `/api/tailoring/${order._id}/status`
          : `/api/orders/${order._id}/status`;
      await api.patch(endpoint, { status: newStatus });

      if (order.orderKind === "tailoring") {
        setTailoringOrders((prev) =>
          prev.map((o) => (o._id === order._id ? { ...o, status: newStatus } : o))
        );
      } else {
        setShoppingOrders((prev) =>
          prev.map((o) => (o._id === order._id ? { ...o, status: newStatus } : o))
        );
      }
    } catch (err) {
      alert(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  // Complete Order Handler (Verifies 100% full payment)
  const handleCompleteOrder = async (order) => {
    const isTailoring = order.orderKind === "tailoring";
    const totalAmount = Number(order.totalAmount || order.total || order.finalPrice || order.estimatedPrice || 0);
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
      const res = await api.patch(endpoint, {});

      if (isTailoring) {
        setTailoringOrders((prev) =>
          prev.map((o) => (o._id === order._id ? { ...o, status: "completed", ...res.data } : o))
        );
      } else {
        setShoppingOrders((prev) =>
          prev.map((o) => (o._id === order._id ? { ...o, status: "completed", ...res.data } : o))
        );
      }
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

      const res = await api.patch(endpoint, { rejectionReason: rejectionReasonInput.trim() });

      if (isTailoring) {
        setTailoringOrders((prev) =>
          prev.map((o) => (o._id === activeOrderForAction._id ? { ...o, status: "rejected", ...res.data } : o))
        );
      } else {
        setShoppingOrders((prev) =>
          prev.map((o) => (o._id === activeOrderForAction._id ? { ...o, status: "rejected", ...res.data } : o))
        );
      }

      setRejectModalOpen(false);
      setActiveOrderForAction(null);
      setRejectionReasonInput("");
      alert(`Order #${activeOrderForAction.displayId} has been rejected and any captured online payment refunded.`);
    } catch (err) {
      alert(err.message || "Failed to reject order");
    } finally {
      setRejecting(false);
    }
  };

  // Open Offline Payment Modal
  const handleOpenOfflineModal = (order) => {
    setActiveOrderForAction(order);
    const totalAmount = Number(order.totalAmount || order.total || order.finalPrice || order.estimatedPrice || 0);
    const amountPaid = Number(order.amountPaid || order.advancePaid || (order.paymentStatus === "paid" ? totalAmount : 0));
    const amountDue = Math.max(0, totalAmount - amountPaid);
    setOfflineAmountInput(String(amountDue > 0 ? amountDue : ""));
    setOfflineMethod("cash");
    setOfflineNotesInput("");
    setOfflineModalOpen(true);
  };

  // Confirm Offline Balance Payment
  const handleConfirmOfflinePayment = async () => {
    if (!activeOrderForAction) return;

    const totalAmount = Number(activeOrderForAction.totalAmount || activeOrderForAction.total || activeOrderForAction.finalPrice || activeOrderForAction.estimatedPrice || 0);
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
      const res = await api.post("/api/payments/record-offline", {
        dbOrderId: activeOrderForAction._id,
        orderType: isTailoring ? "tailoring" : "shopping",
        paymentMethod: offlineMethod,
        amount: paymentVal,
        notes: offlineNotesInput.trim(),
      });

      if (isTailoring) {
        setTailoringOrders((prev) =>
          prev.map((o) => (o._id === activeOrderForAction._id ? { ...o, ...res.data } : o))
        );
      } else {
        setShoppingOrders((prev) =>
          prev.map((o) => (o._id === activeOrderForAction._id ? { ...o, ...res.data } : o))
        );
      }

      setOfflineModalOpen(false);
      setActiveOrderForAction(null);
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
      const res = await api.patch(endpoint, payload);

      if (order.orderKind === "tailoring") {
        setTailoringOrders((prev) =>
          prev.map((o) =>
            o._id === order._id ? { ...o, expectedDeliveryDate: res.data.expectedDeliveryDate } : o
          )
        );
      } else {
        setShoppingOrders((prev) =>
          prev.map((o) =>
            o._id === order._id
              ? { ...o, estimatedDeliveryDate: res.data.estimatedDeliveryDate, deliveryDateReviewed: true }
              : o
          )
        );
      }
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


  // Combine and normalize both shopping & tailoring orders
  const combinedOrders = useMemo(() => {
    const list = [];

    // Normalize Shopping Orders
    if (typeFilter === "all" || typeFilter === "shopping") {
      shoppingOrders.forEach((o) => {
        const isGuntur = (o.shippingAddress?.city || "").trim().toLowerCase() === "guntur";
        list.push({
          ...o,
          _raw: o,
          orderKind: "shopping",
          kindLabel: "Shopping",
          displayId: o.orderId || o._id.slice(-6),
          customerName: o.user?.name || "Customer",
          customerEmail: o.user?.email || "-",
          customerPhone: o.shippingAddress?.phone || "-",
          itemSubtitle: o.items && o.items.length > 0 ? `${o.items.length} item${o.items.length > 1 ? "s" : ""} • ${o.items[0]?.name || "Shop Item"}` : "Boutique Order",
          totalAmount: o.total || 0,
          paymentMethod: o.paymentMethod || "COD",
          isPriority: Boolean(o.isFastDelivery || o.isPriority || o.priority),
          placedAt: o.createdAt,
          targetDelivery: o.estimatedDeliveryDate,
          deliveryReviewed: o.deliveryDateReviewed,
          isGuntur,
          detailsUrl: `/admin/orders/shopping/${o._id}`,
        });
      });
    }

    // Normalize Tailoring Orders
    if (typeFilter === "all" || typeFilter === "tailoring") {
      tailoringOrders.forEach((t) => {
        const cost =
          t.finalPrice ||
          t.estimatedPrice ||
          ((t.stitchingCost || 0) + (t.designCost || 0) + (t.fabricCost || 0) + (t.deliveryCharge || 0));
        list.push({
          ...t,
          _raw: t,
          orderKind: "tailoring",
          kindLabel: "Tailoring",
          displayId: t.orderId || t._id.slice(-6),
          customerName: t.customer?.name || t.guestInfo?.name || "Customer",
          customerEmail: t.customer?.email || t.guestInfo?.email || "-",
          customerPhone: t.customer?.phone || t.guestInfo?.phone || "-",
          itemSubtitle: `${t.garmentType || "Garment"} • ${(t.designComplexity || "Simple").replace("_", " ")}`,
          totalAmount: cost,
          paymentMethod: t.paymentStatus ? `Tailoring (${t.paymentStatus})` : "Pending",
          isPriority: Boolean(t.isFastDelivery || t.isPriority || t.priority),
          placedAt: t.createdAt,
          targetDelivery: t.expectedDeliveryDate,
          deliveryReviewed: true,
          detailsUrl: `/admin/orders/tailoring/${t._id}`,
        });
      });
    }

    // Sort by createdAt descending (most recent first)
    return list.sort((a, b) => new Date(b.placedAt || 0) - new Date(a.placedAt || 0));
  }, [shoppingOrders, tailoringOrders, typeFilter]);

  // Compute schedule counts dynamically across combined orders
  const scheduleCounts = useMemo(() => {
    let tomorrow = 0, today = 0, overdue = 0, pending = 0;
    combinedOrders.forEach((o) => {
      if (matchesScheduleFilter(o, "tomorrow")) tomorrow++;
      if (matchesScheduleFilter(o, "today")) today++;
      if (matchesScheduleFilter(o, "overdue")) overdue++;
      if (matchesScheduleFilter(o, "pending")) pending++;
    });
    return { tomorrow, today, overdue, pending, all: combinedOrders.length };
  }, [combinedOrders]);

  // Compute category counts dynamically across combined orders (or within schedule)
  const counts = useMemo(() => {
    let priority = 0, regular = 0, delivered = 0, rejected = 0;
    combinedOrders.forEach((o) => {
      if (scheduleFilter !== "all" && !matchesScheduleFilter(o, scheduleFilter)) return;
      const cat = getOrderCategory(o);
      if (cat === "priority") priority++;
      else if (cat === "regular") regular++;
      else if (cat === "delivered") delivered++;
      else if (cat === "rejected") rejected++;
    });
    const totalMatching = scheduleFilter !== "all"
      ? combinedOrders.filter((o) => matchesScheduleFilter(o, scheduleFilter)).length
      : combinedOrders.length;
    return { priority, regular, delivered, rejected, all: totalMatching };
  }, [combinedOrders, scheduleFilter]);

  // Filter orders by schedule filter, category tab, status filter, and search query
  const filteredOrders = useMemo(() => {
    return combinedOrders.filter((order) => {
      // 1. Schedule Filter (overdue, today, tomorrow, pending)
      if (scheduleFilter !== "all") {
        if (!matchesScheduleFilter(order, scheduleFilter)) return false;
      }

      // 2. Category Tab Filter (priority, regular, delivered, rejected, all)
      if (activeCategoryTab !== "all") {
        const cat = getOrderCategory(order);
        if (cat !== activeCategoryTab) return false;
      }

      // 3. Status Dropdown Filter
      if (statusFilter) {
        if (order.status !== statusFilter) return false;
      }

      // 4. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const orderId = (order.displayId || "").toLowerCase();
        const custName = (order.customerName || "").toLowerCase();
        const custEmail = (order.customerEmail || "").toLowerCase();
        const custPhone = (order.customerPhone || "").toLowerCase();
        const subtitle = (order.itemSubtitle || "").toLowerCase();
        if (
          !orderId.includes(q) &&
          !custName.includes(q) &&
          !custEmail.includes(q) &&
          !custPhone.includes(q) &&
          !subtitle.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [combinedOrders, scheduleFilter, activeCategoryTab, statusFilter, searchQuery]);  const scheduleTabs = [
    { id: "all", label: "All Orders", count: scheduleCounts.all, color: "text-ink/70", activeBg: "bg-primary text-white" },
    { id: "overdue", label: "Overdue Orders", count: scheduleCounts.overdue, color: "text-red-700", activeBg: "bg-red-600 text-white" },
    { id: "today", label: "Today's Orders", count: scheduleCounts.today, color: "text-amber-800", activeBg: "bg-amber-600 text-white" },
    { id: "tomorrow", label: "Tomorrow's Orders", count: scheduleCounts.tomorrow, color: "text-blue-800", activeBg: "bg-blue-600 text-white" },
    { id: "pending", label: "Total Pending", count: scheduleCounts.pending, color: "text-ink/80", activeBg: "bg-primary/80 text-white" },
  ];

  const categoryTabs = [
    { id: "all", label: "All Priorities", icon: Layers, count: counts.all, color: "text-ink/60", activeBg: "bg-primary/80 text-white" },
    { id: "priority", label: "Priority Orders", icon: Zap, count: counts.priority, color: "text-amber-600", activeBg: "bg-amber-500 text-white" },
    { id: "regular", label: "Regular Orders", icon: Package, count: counts.regular, color: "text-primary", activeBg: "bg-primary text-white" },
    { id: "delivered", label: "Delivered Orders", icon: CheckCircle2, count: counts.delivered, color: "text-emerald-600", activeBg: "bg-emerald-600 text-white" },
    { id: "rejected", label: "Rejected Orders", icon: XCircle, count: counts.rejected, color: "text-rose-600", activeBg: "bg-rose-600 text-white" },
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
            Unified management for both Tailoring and Shopping orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Order Type Switcher Pills */}
          <div className="bg-primary/5 p-1 rounded-xl flex items-center gap-1 border border-primary/10">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                typeFilter === "all" ? "bg-white text-primary shadow-xs" : "text-ink/60 hover:text-primary"
              }`}
            >
              All Types ({shoppingOrders.length + tailoringOrders.length})
            </button>
            <button
              onClick={() => setTypeFilter("shopping")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                typeFilter === "shopping" ? "bg-white text-primary shadow-xs" : "text-ink/60 hover:text-primary"
              }`}
            >
              <Store size={13} className="text-accent" />
              <span>Shopping ({shoppingOrders.length})</span>
            </button>
            <button
              onClick={() => setTypeFilter("tailoring")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                typeFilter === "tailoring" ? "bg-white text-primary shadow-xs" : "text-ink/60 hover:text-primary"
              }`}
            >
              <Scissors size={13} className="text-accent" />
              <span>Tailoring ({tailoringOrders.length})</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative flex-1 sm:w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-primary/10 rounded-xl text-xs outline-none focus:border-highlight"
            />
          </div>
        </div>
      </div>

      {/* ── Schedule Filters (Tomorrow, Today, Overdue, Total Pending, All) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {scheduleTabs.map((tab) => {
          const isActive = scheduleFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setScheduleFilter(tab.id)}
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

      {/* ── Active Schedule Filter Banner (If filtered by card click) ── */}
      {scheduleBanner && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${scheduleBanner.color}`}>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span>{scheduleBanner.title}</span>
              <span className="text-[11px] font-normal">({filteredOrders.length} order{filteredOrders.length === 1 ? "" : "s"})</span>
            </div>
            <p className="text-xs opacity-80 mt-0.5">{scheduleBanner.desc}</p>
          </div>
          <button
            onClick={() => setScheduleFilter("all")}
            className="px-3 py-1.5 bg-white/80 hover:bg-white text-ink rounded-lg text-xs font-semibold border border-current/20 shadow-xs shrink-0 cursor-pointer transition-all"
          >
            ✕ Show All Orders
          </button>
        </div>
      )}

      {/* ── Order Category Tabs (Priority, Regular, Delivered, Rejected, All) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-primary/10">
        {categoryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategoryTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategoryTab(tab.id)}
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
                <th className="p-4 font-medium">Priority / Type</th>
                <th className="p-4 font-medium">Details / Delivery</th>
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
                    No orders found in {categoryTabs.find((t) => t.id === activeCategoryTab)?.label || "this category"}.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const category = getOrderCategory(order);
                  const isPriority = category === "priority";
                  const isTailoring = order.orderKind === "tailoring";

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
                          {order.placedAt ? format(new Date(order.placedAt), "dd MMM yyyy") : "—"}
                        </div>
                        <div className="text-[11px] text-ink/50 font-mono mt-0.5">
                          {order.placedAt ? format(new Date(order.placedAt), "hh:mm a") : ""}
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="p-4">
                        <div className="font-medium text-ink">{order.customerName}</div>
                        <div className="text-xs text-ink/50">{order.customerPhone || order.customerEmail}</div>
                      </td>

                      {/* Priority Badge */}
                      <td className="p-4">
                        {isPriority ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Zap size={10} className="fill-amber-600 text-amber-600" /> {isTailoring ? "Priority (24h)" : "Priority"}
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                            Regular
                          </span>
                        )}
                      </td>

                      {/* Item details / Delivery */}
                      <td className="p-4">
                        <div className="text-xs font-medium text-ink">{order.itemSubtitle}</div>
                        <div className="text-[11px] text-ink/60 mt-0.5">
                          {order.targetDelivery ? (
                            <span className="font-semibold text-primary">
                              ETA: {format(new Date(order.targetDelivery), "MMM d, yyyy")}
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

                          {/* Legitimate Physical Progress Stages ONLY */}
                          {["completed", "rejected", "cancelled"].includes(order.status) ? (
                            <span className="text-[11px] font-bold text-ink/50 italic px-2 py-0.5 rounded bg-primary/5">
                              {order.status === "completed" ? "Completed" : format(new Date(), "Order Closed")}
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

                          {/* Separate Terminal & Financial Action Buttons */}
                          {!["completed", "rejected", "cancelled"].includes(order.status) && (
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

                          {!isTailoring && (!order.isGuntur || !order.deliveryReviewed) && (
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
                    <span>₹{Number(activeOrderForAction.totalAmount || activeOrderForAction.total || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-ink/60">
                    <span>Currently Verified Paid:</span>
                    <span>₹{Number(activeOrderForAction.amountPaid || activeOrderForAction.advancePaid || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-accent font-bold pt-1 border-t border-accent/10">
                    <span>Remaining Balance Due:</span>
                    <span>₹{Math.max(0, Number(activeOrderForAction.totalAmount || activeOrderForAction.total || 0) - Number(activeOrderForAction.amountPaid || activeOrderForAction.advancePaid || 0)).toLocaleString("en-IN")}</span>
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

