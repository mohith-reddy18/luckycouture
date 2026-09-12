import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Package, Scissors, MapPin, CreditCard, Clock,
  CheckCircle2, AlertCircle, Loader2, Receipt, Truck, User,
  FileText, ZoomIn, X, Save, Calendar, Sparkles, Store, MessageCircle, ShoppingBag, MessageSquare,
  DollarSign, Check, XCircle, RefreshCw, Ban, ShieldCheck, Wallet, Copy, Printer
} from "lucide-react";
import { useApp } from "../context/AppContext";
import useRazorpay from "../hooks/useRazorpay";
import api from "../utils/api";
import getImageUrl from "../utils/imageUrl";
import { standardFabricRequirements, fabricCatalog } from "../data/mockData";
import SEO from "../components/SEO";
import { formatDateTime, formatDate, formatDateShort } from "../utils/dateUtils";
import { calculateOrderFinancials, validateOrderCompletion } from "../utils/paymentCalculator";
import { STORE_LOCATION } from "../utils/deliveryPricing";

export function cleanPaymentNote(note) {
  if (!note) return "";
  return String(note).replace(/\s+by Admin\s*\([^)]*\)/gi, "").trim();
}

// ─── Status Colors & Formatters ──────────────────────────────────────────────
const statusColors = {
  placed: "bg-blue-100 text-blue-800 border-blue-200",
  pending_payment: "bg-amber-100 text-amber-800 border-amber-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-indigo-100 text-indigo-800 border-indigo-200",
  fabric_received: "bg-purple-100 text-purple-800 border-purple-200",
  cutting: "bg-blue-100 text-blue-800 border-blue-200",
  stitching: "bg-indigo-100 text-indigo-800 border-indigo-200",
  quality_check: "bg-teal-100 text-teal-800 border-teal-200",
  ready_for_pickup: "bg-emerald-100 text-emerald-800 border-emerald-200",
  packed: "bg-purple-100 text-purple-800 border-purple-200",
  shipped: "bg-cyan-100 text-cyan-800 border-cyan-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
  returned: "bg-rose-100 text-rose-800 border-rose-200",
};

const paymentStatusColors = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  partially_paid: "bg-blue-100 text-blue-800 border-blue-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  refunded: "bg-rose-100 text-rose-800 border-rose-200",
  partially_refunded: "bg-orange-100 text-orange-800 border-orange-200",
  failed: "bg-red-100 text-red-800 border-red-200",
};

const complexityLabels = {
  simple: "Simple Design",
  embroidery: "Heavy — Embroidery",
  maggam: "Heavy — Maggam Work",
  other: "Other Custom Design",
};

const COMPLEXITY_PRICING = {
  simple: 600,
  embroidery: 2500,
  maggam: 6500,
  other: 1500,
};

const MEASUREMENT_LABEL_MAP = {
  bust: "Chest / Bust",
  waist: "Waist",
  hips: "Hip",
  shoulder: "Shoulder",
  armhole: "Armhole / Arm Round",
  sleeves_round: "Sleeves Round",
  front_neck_deep: "Front Neck Deep",
  back_neck_deep: "Back Neck Deep",
  sleeve: "Sleeve Length",
  length: "Body Length",
};

const formatStatus = (s) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Unknown";

function InfoRow({ label, value, mono, highlight, copyable }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value || value === "—") return;
    try {
      navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-primary/5 last:border-0 text-xs sm:text-sm">
      <span className="text-ink/60 shrink-0 font-medium">{label}</span>
      <div className="flex items-center gap-1.5 justify-end text-right min-w-0">
        <span className={`font-medium ${mono ? "font-mono tracking-wide text-[11px] sm:text-xs break-all select-text" : ""} ${highlight ? "text-accent font-bold" : "text-primary"}`}>
          {value ?? "—"}
        </span>
        {copyable && value && value !== "—" && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 text-ink/40 hover:text-accent transition-colors rounded cursor-pointer shrink-0"
            title={copied ? "Copied!" : `Copy ${label}`}
          >
            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, className = "" }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[status] || "bg-gray-100 text-gray-700 border-gray-200"} ${className}`}>
      {formatStatus(status)}
    </span>
  );
}

function PaymentStatusBadge({ status, className = "" }) {
  const label = status === "partially_paid"
    ? "Partially Paid"
    : status === "paid"
      ? "Paid in Full"
      : status === "pending" || !status
        ? "Pending Payment"
        : formatStatus(status);

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${paymentStatusColors[status] || "bg-gray-100 text-gray-700 border-gray-200"} ${className}`}>
      {label}
    </span>
  );
}

export default function OrderDetail({ isAdmin: routeIsAdmin }) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authLoading, notify, contactInfo } = useApp();
  const { openCheckout } = useRazorpay();

  // Support both /orders/:type/:id (e.g. /orders/shopping/123) and /orders/:id (e.g. /orders/123)
  const isDirectOrder = !params.id;
  const targetId = isDirectOrder ? params.type : params.id;
  const targetType = isDirectOrder ? "shopping" : params.type;
  const type = targetType;
  const id = targetId;
  const isTailoring = targetType === "tailoring";

  const isAdminUser = Boolean(user && user.role === "admin");
  const isAdminView = Boolean(isAdminUser && (routeIsAdmin || location.pathname.startsWith("/admin")));

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Online payment processing state
  const [payingOnline, setPayingOnline] = useState(false);

  // Admin controls state
  const [adminStatus, setAdminStatus] = useState("");
  const [adminDeliveryDate, setAdminDeliveryDate] = useState("");
  const [adminFinalPrice, setAdminFinalPrice] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [assignedTailor, setAssignedTailor] = useState("");
  const [updating, setUpdating] = useState(false);

  // Modals state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [offlineMethod, setOfflineMethod] = useState("cash");
  const [offlineAmountInput, setOfflineAmountInput] = useState("");
  const [offlineNotesInput, setOfflineNotesInput] = useState("");
  const [recordingOffline, setRecordingOffline] = useState(false);

  const [completing, setCompleting] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [printTarget, setPrintTarget] = useState(null); // null | "order" | "payment"

  const handlePrintOrder = () => {
    setPrintTarget("order");
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintPaymentDetails = () => {
    setPrintTarget("payment");
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const fetchOrder = async () => {
    if (!targetId) {
      setErrorInfo({ status: 400, message: "No order identifier provided", isNotFound: true });
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorInfo(null);
    try {
      const endpoint = isTailoring ? `/api/tailoring/${targetId}` : `/api/orders/${targetId}`;
      const res = await api.get(endpoint);
      if (res?.data) {
        const item = res.data;
        setOrder(item);
        setErrorInfo(null);
        setAdminStatus(item.status || "");
        setAdminDeliveryDate(
          item.expectedDeliveryDate
            ? new Date(item.expectedDeliveryDate).toISOString().slice(0, 10)
            : item.estimatedDeliveryDate
              ? new Date(item.estimatedDeliveryDate).toISOString().slice(0, 10)
              : ""
        );
        setAdminFinalPrice(item.finalPrice != null ? item.finalPrice : (item.totalAmount != null ? item.totalAmount : ""));
        setAdminNotes(item.adminNotes || "");
        setAssignedTailor(item.assignedTailor || "");
      } else {
        setErrorInfo({ status: 404, message: "This order does not exist or may have been removed.", isNotFound: true });
      }
    } catch (err) {
      console.error("[OrderDetail] Failed to fetch order:", err);
      const status = err?.status || (err?.message?.toLowerCase().includes("not found") ? 404 : 500);
      const isNotFound = status === 404 || err?.message?.toLowerCase().includes("not found");
      const isForbidden = status === 403 || err?.message?.toLowerCase().includes("not authorized") || err?.message?.toLowerCase().includes("permission");

      let message = "We couldn't load this order right now. Please try again.";
      if (isNotFound) {
        message = "This order does not exist or may have been removed.";
      } else if (isForbidden) {
        message = "You do not have permission to view this order.";
      }

      setErrorInfo({
        status,
        message,
        isNotFound,
        isForbidden,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    fetchOrder();
  }, [targetId, targetType, user, authLoading, navigate]);

  // Handle generic production stage updates
  const handleAdminUpdate = async (e) => {
    e.preventDefault();
    if (!order || !isAdminUser) return;
    setUpdating(true);
    try {
      const endpoint = isTailoring ? `/api/tailoring/${order._id}/status` : `/api/orders/${order._id}/status`;
      const payload = {
        status: adminStatus,
        ...(adminDeliveryDate && { expectedDeliveryDate: adminDeliveryDate, estimatedDeliveryDate: adminDeliveryDate }),
        ...(isTailoring && {
          adminNotes,
          assignedTailor,
          ...(adminFinalPrice !== "" && { finalPrice: Number(adminFinalPrice) || 0 }),
        }),
      };

      const res = await api.patch(endpoint, payload);
      notify("Production details updated successfully!");
      if (res?.data) {
        const item = res.data;
        setOrder((prev) => ({ ...prev, ...item }));
        setAdminStatus(item.status || adminStatus);
        setAdminFinalPrice(item.finalPrice != null ? item.finalPrice : (item.totalAmount != null ? item.totalAmount : ""));
        setAdminNotes(item.adminNotes || "");
        setAssignedTailor(item.assignedTailor || "");
      } else {
        fetchOrder();
      }
    } catch (err) {
      notify(err.message || "Failed to update order status");
    } finally {
      setUpdating(false);
    }
  };

  // Complete Order action (Requires 100% payment verification)
  const handleCompleteOrder = async () => {
    if (!order || !isAdminUser) return;
    const validation = validateOrderCompletion(order);

    if (!validation.canComplete) {
      notify(validation.message);
      return;
    }

    if (!window.confirm(`Are you sure you want to mark this ${isTailoring ? "tailoring" : "shopping"} order as COMPLETED?`)) return;

    setCompleting(true);
    try {
      const endpoint = isTailoring ? `/api/tailoring/${order._id}/complete` : `/api/orders/${order._id}/complete`;
      const res = await api.patch(endpoint, {});

      notify("Order marked as Completed successfully! 🎉");
      if (res?.data) {
        setOrder((prev) => ({ ...prev, ...res.data, status: "completed" }));
      } else {
        fetchOrder();
      }
    } catch (err) {
      notify(err.message || "Failed to complete order");
    } finally {
      setCompleting(false);
    }
  };

  // Reject Order action with automated Razorpay refund
  const handleRejectOrder = async () => {
    if (!order || !isAdminUser) return;
    if (!rejectionReasonInput.trim()) {
      notify("Please provide a reason for rejecting this order.");
      return;
    }

    setRejecting(true);
    try {
      const endpoint = isTailoring ? `/api/tailoring/${order._id}/reject` : `/api/orders/${order._id}/reject`;
      const payload = { rejectionReason: rejectionReasonInput.trim() };

      const res = await api.patch(endpoint, payload);
      notify("Order rejected and any advance payments refunded.");
      setRejectModalOpen(false);
      setRejectionReasonInput("");
      if (res?.data) {
        setOrder((prev) => ({ ...prev, ...res.data }));
      } else {
        fetchOrder();
      }
    } catch (err) {
      notify(err.message || "Failed to reject order");
    } finally {
      setRejecting(false);
    }
  };


  // Record Offline Balance Payment (Cash or POS)
  const handleRecordOfflinePayment = async () => {
    if (!order || !isAdminUser) return;

    const fin = calculateOrderFinancials(order);
    const maxDue = fin.remainingBalance;

    const paymentVal = offlineAmountInput !== "" ? Number(offlineAmountInput) : maxDue;
    if (isNaN(paymentVal) || paymentVal <= 0) {
      notify("Please enter a valid payment amount");
      return;
    }

    if (paymentVal > maxDue) {
      notify(`Amount cannot exceed the remaining balance of ₹${maxDue.toLocaleString("en-IN")}`);
      return;
    }

    setRecordingOffline(true);
    try {
      const res = await api.post("/api/payments/record-offline", {
        dbOrderId: order._id,
        orderType: isTailoring ? "tailoring" : "shopping",
        paymentMethod: offlineMethod,
        amount: paymentVal,
        notes: offlineNotesInput.trim(),
      });

      notify(`Recorded ₹${paymentVal.toLocaleString("en-IN")} via ${offlineMethod.toUpperCase()} successfully!`);
      setOfflineModalOpen(false);
      setOfflineAmountInput("");
      setOfflineNotesInput("");
      await fetchOrder();
    } catch (err) {
      notify(err.message || "Failed to record offline payment");
    } finally {
      setRecordingOffline(false);
    }
  };

  // Customer Online Payment Trigger (Advance 30% or Balance 70%)
  const handlePayOnline = async (paymentType = "balance") => {
    if (!order || payingOnline) return;
    setPayingOnline(true);
    try {
      const rzpRes = await api.post("/api/payments/create-order", {
        dbOrderId: order._id,
        orderType: isTailoring ? "tailoring" : "shopping",
        paymentType,
      });

      const { razorpayOrderId, amount, currency, keyId, prefill, amountINR } = rzpRes.data;

      openCheckout({
        razorpayOrderId,
        amount,
        currency,
        keyId,
        prefill,
        description: `Lucky Couture — ${paymentType === "advance" ? "30% Advance" : "Remaining Balance"} (₹${amountINR?.toLocaleString("en-IN")})`,
        onSuccess: async ({ razorpayOrderId: rzpOrderId, razorpayPaymentId, razorpaySignature }) => {
          try {
            await api.post("/api/payments/verify", {
              razorpayOrderId: rzpOrderId,
              razorpayPaymentId,
              razorpaySignature,
              dbOrderId: order._id,
              orderType: isTailoring ? "tailoring" : "shopping",
            });

            notify("Payment verified successfully! 🎉");
            await fetchOrder();
          } catch (vErr) {
            notify(vErr.message || "Payment verification failed. Please contact support.");
            await fetchOrder();
          } finally {
            setPayingOnline(false);
          }
        },

        onFailure: (errMsg) => {
          notify(errMsg || "Payment was not completed.");
          setPayingOnline(false);
        },
        onDismiss: () => {
          notify("Payment window closed.");
          setPayingOnline(false);
        },
      });
    } catch (err) {
      notify(err.message || "Could not initialize payment — please try again");
      setPayingOnline(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={36} className="animate-spin text-accent" />
        <p className="text-sm font-medium text-primary/70">Loading your order details…</p>
      </div>
    );
  }

  if (errorInfo || (!loading && !order)) {
    const isNotFound = errorInfo?.isNotFound ?? true;
    const isForbidden = errorInfo?.isForbidden ?? false;

    const heading = isNotFound
      ? "Order Not Found"
      : isForbidden
        ? "Access Restricted"
        : "Unable to Load Order";

    const description = errorInfo?.message || (isNotFound
      ? "This order does not exist or may have been removed."
      : isForbidden
        ? "You do not have permission to view this order."
        : "We couldn't load this order right now. Please try again.");

    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <AlertCircle size={40} className="mx-auto text-red-400 mb-5" />
        <h1 className="font-display text-xl font-semibold text-primary mb-2">{heading}</h1>
        <p className="text-sm text-ink/60 mb-8">{description}</p>
        <button
          onClick={() => navigate(isAdminView ? "/admin" : "/orders")}
          className="inline-block bg-primary text-bg px-7 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          {isAdminView ? "Back to Dashboard" : "Back to Orders"}
        </button>
      </div>
    );
  }

  const orderId = order.orderId || order._id;

  // Customer metadata
  const customerObj = typeof order.customer === "object" && order.customer !== null
    ? order.customer
    : (typeof order.user === "object" && order.user !== null ? order.user : null);

  const isRegisteredUser = Boolean(
    (customerObj && customerObj._id) ||
    (typeof order.user === "string" && order.user) ||
    (typeof order.customer === "string" && order.customer)
  );

  const customerName =
    customerObj?.name ||
    order.guestInfo?.name ||
    order.customerName ||
    "Customer";

  const customerEmail =
    customerObj?.email ||
    order.guestInfo?.email ||
    order.customerEmail ||
    "Not provided";

  const customerPhone =
    customerObj?.phone ||
    order.shippingAddress?.phone ||
    order.deliveryAddress?.phone ||
    order.guestInfo?.phone ||
    order.customerPhone ||
    "Not provided";

  const customerAccountId = isRegisteredUser
    ? (customerObj?._id
        ? String(customerObj._id)
        : (typeof order.user === "string"
            ? order.user
            : (typeof order.customer === "string"
                ? order.customer
                : "Guest Checkout")))
    : "Guest Checkout";

  // Tailoring & Design details
  const refDesign = typeof order.referenceDesign === "object" && order.referenceDesign !== null ? order.referenceDesign : null;
  const isGalleryRef = order.referenceType === "gallery" || Boolean(refDesign) || Boolean(order.referenceDesignTitle && !order.referenceDesignTitle.toLowerCase().includes("upload") && order.referenceDesignTitle !== "Uploaded Reference Image");
  const isUploadedRef = order.referenceType === "uploaded" || (!isGalleryRef && (order.referenceImage || (order.referenceImages && order.referenceImages.length > 0) || (order.referenceDesignTitle && order.referenceDesignTitle.toLowerCase().includes("upload"))));
  const hasRef = Boolean(order.referenceType !== "none" && (isGalleryRef || isUploadedRef || refDesign || order.referenceImage || order.referenceDesignTitle || (order.referenceImages && order.referenceImages.length > 0)));

  const refImage = getImageUrl(
    refDesign?.thumbnail?.url ||
    refDesign?.images?.[0]?.url ||
    refDesign?.image ||
    order.referenceDesignImage ||
    order.referenceImage ||
    order.referenceImages?.[0]?.url
  );

  const refTitle = refDesign?.title || order.referenceDesignTitle || (typeof order.referenceDesign === "string" ? order.referenceDesign : (isGalleryRef ? "Design Gallery Reference" : "Customer Uploaded Reference Image"));
  const refSlugOrId = refDesign?.slug || refDesign?._id || refDesign?.id || (typeof order.referenceDesign === "string" ? order.referenceDesign : null);

  const garmentName = order.garmentType || "Custom Garment";
  const complexityText = complexityLabels[order.designComplexity] || formatStatus(order.designComplexity);

  // Fabric details
  const stdQty = refDesign?.standardFabricQty || standardFabricRequirements[garmentName] || 1;
  const fabricObj = fabricCatalog.find((f) => f.name.toLowerCase() === (order.preferredMaterial || "").toLowerCase());
  const fabricPricePerM = fabricObj?.pricePerMeter || (order.fabricSource === "shop_provided" ? 400 : 0);
  const totalFabricCost = order.fabricCost ?? (order.fabricSource === "shop_provided" ? (fabricPricePerM * stdQty) : 0);
  const designCost = (order.designCost != null && order.designCost > 0)
    ? order.designCost
    : (refDesign?.designCost || refDesign?.price || (order.designComplexity ? COMPLEXITY_PRICING[order.designComplexity] : (isTailoring ? 600 : 0)));
  const priorityFee = order.isFastDelivery ? 500 : 0;

  // Delivery details
  const isStorePickup = order.deliveryMethod === "store_pickup" || order.needsDelivery === false;
  const deliveryAddress = order.deliveryAddress || order.shippingAddress || {};
  const deliveryCity = isStorePickup ? (deliveryAddress.city || STORE_LOCATION.city) : (deliveryAddress.city || "Guntur");
  const deliveryPincode = isStorePickup ? STORE_LOCATION.pincode : (deliveryAddress.pincode || "");
  const deliveryArea = isStorePickup ? STORE_LOCATION.address : (deliveryAddress.address || [deliveryAddress.line2, deliveryAddress.line1].filter(Boolean).join(", "));
  const approxDistance = order.approxDistanceKm ? `${order.approxDistanceKm} km` : (order.isLongDistance ? ">30 km" : (isStorePickup ? "N/A (Pickup)" : "Location pending"));
  const deliveryCategory = order.deliveryCategory || (isStorePickup ? "store_pickup" : (order.isLongDistance ? "long_distance" : "guntur_city"));
  const deliveryStatus = order.deliveryChargeStatus || (isStorePickup ? "not_applicable" : (order.isLongDistance ? "to_be_confirmed" : "fixed"));

  const deliveryFeeVal = Number(order.deliveryCharge ?? order.shippingFee ?? 0);
  const isDeliveryPending = !isStorePickup && (deliveryStatus === "to_be_confirmed" || order.deliveryChargeStatus === "to_be_confirmed") && deliveryFeeVal === 0;

  const deliveryChargeText = isStorePickup
    ? "₹0 (Store Pickup)"
    : isDeliveryPending
      ? "To be confirmed"
      : `₹${deliveryFeeVal.toLocaleString("en-IN")}`;

  // Authoritative Financial calculations via shared engine
  const fin = calculateOrderFinancials(order);
  const totalOrderAmount = fin.totalAmount;
  const amountPaidVal = fin.totalPaid;
  const amountDueVal = fin.remainingBalance;
  const paymentPercentage = fin.paymentPercentage;
  const isFullyPaid = fin.isFullyPaid;
  const isPartiallyPaid = fin.isPartiallyPaid;
  const isPendingPayment = fin.isPendingAdvance || amountPaidVal === 0;
  const isRejected = order.status === "rejected";
  const isCompleted = order.status === "completed" || order.status === "delivered";

  const rawPaymentsLedger = Array.isArray(order.payments) ? order.payments : [];
  const seenLedgerIds = new Set();
  const paymentsLedger = rawPaymentsLedger.filter((pm) => {
    const pId = String(pm.razorpayPaymentId || pm._id || "").trim();
    if (pId) {
      if (seenLedgerIds.has(pId)) return false;
      seenLedgerIds.add(pId);
    }
    return true;
  });
  const refundsLedger = Array.isArray(order.refunds) ? order.refunds : [];

  const measurementsList = Object.entries(order.measurements || {}).filter(([, v]) => v !== null && v !== undefined && v !== "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16 space-y-6"
    >
      <SEO title={`Order #${orderId} | Lucky Couture`} robots="noindex, nofollow" />

      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-4 pb-2">
        <button
          onClick={() => {
            if (isAdminView) {
              navigate(isTailoring ? "/admin?tab=tailoring" : "/admin?tab=orders");
            } else {
              navigate("/orders");
            }
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white border border-primary/15 hover:bg-primary/5 text-primary transition-colors shadow-xs cursor-pointer"
        >
          <ChevronLeft size={16} /> Back to {isAdminView ? "Admin Dashboard" : "My Orders"}
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintOrder}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white border border-primary/15 hover:bg-primary/5 text-primary transition-colors shadow-xs cursor-pointer print:hidden"
            title="Print clean Order Details invoice document"
          >
            <Printer size={15} className="text-accent" />
            <span>Print Order</span>
          </button>

          {isAdminView && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent text-white uppercase tracking-wider">
              <Sparkles size={13} /> Admin View
            </span>
          )}
        </div>
      </div>

      {/* Rejection Alert Banner (if rejected) */}
      {isRejected && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 text-rose-950 flex items-start gap-3 shadow-xs">
          <Ban size={22} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm sm:text-base text-rose-900">Order Cancelled / Rejected</h4>
            <p className="text-xs sm:text-sm text-rose-800 leading-relaxed">
              <strong>Reason:</strong> {order.rejectionReason || "Order could not be accepted by our tailoring team."}
            </p>
            {amountPaidVal > 0 && (
              <p className="text-xs text-rose-700 font-medium">
                Refund Status: {order.paymentStatus === "refunded" ? "All payments have been refunded." : "Refund in progress."}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl shadow-card p-5 sm:p-7 border border-primary/10 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-primary/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-accent">
                {isTailoring ? (order.isFastDelivery ? "Priority Stitching Order" : "Standard Tailoring Order") : "Boutique Shopping Order"}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
              {isTailoring ? garmentName : "Shopping Order"}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <p className="font-mono text-xs text-ink/60">
                Order ID: <strong className="text-primary">{orderId}</strong>
              </p>
              {!isAdminView && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to={`/support?orderId=${encodeURIComponent(orderId)}&type=${type}&category=${isTailoring ? "tailoring" : "order"}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-[#342431] text-bg text-xs font-semibold transition-all shadow-xs border border-accent/45 hover:border-accent cursor-pointer active:scale-[0.98] select-none"
                    title="Get help with this order from Lucky Couture support"
                  >
                    <MessageSquare size={13} className="text-highlight shrink-0" /> Get Help
                  </Link>
                  <a
                    href={
                      orderId
                        ? `${contactInfo.whatsappHref}?text=${encodeURIComponent(
                          `Hi Lucky Couture, I have placed an order. My Order ID is ${orderId}. I would like to discuss my order.`
                        )}`
                        : `${contactInfo.whatsappHref}?text=${encodeURIComponent(
                          "Hi Lucky Couture, I would like to discuss my order."
                        )}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-[#062E2A] text-xs font-semibold transition-all shadow-2xs border border-[#1EBE5D] cursor-pointer active:scale-[0.98] select-none"
                    title="Discuss this order on WhatsApp"
                  >
                    <MessageCircle size={13} className="fill-[#062E2A] text-[#25D366] shrink-0" /> WhatsApp
                  </a>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-1.5">
            <div className="flex items-center gap-2 flex-wrap sm:justify-end">
              <StatusBadge status={order.status} className="text-sm px-4 py-1.5" />
              <PaymentStatusBadge status={isFullyPaid ? "paid" : (isPartiallyPaid ? "partially_paid" : "pending")} className="text-xs px-3 py-1" />
            </div>
            <span className="text-xs text-ink/70 font-medium">
              Placed: <strong className="text-primary font-semibold">{formatDate(order.createdAt)}</strong>
            </span>
          </div>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 text-xs">
          <div>
            <span className="text-ink/50 block font-medium">Total Order Value</span>
            <span className="font-semibold text-primary block text-sm sm:text-base">
              ₹{totalOrderAmount.toLocaleString("en-IN")}
            </span>
          </div>
          <div>
            <span className="text-ink/50 block font-medium">
              {fin.isPendingAdvance ? "30% Advance Required" : (fin.isAdvancePaid && !fin.isFullyPaid ? "30% Advance Paid" : "Amount Paid")}
            </span>
            <span className={`font-semibold block text-sm sm:text-base ${fin.isPendingAdvance ? "text-primary" : "text-emerald-700"}`}>
              {fin.isPendingAdvance
                ? `₹${fin.advanceRequired.toLocaleString("en-IN")}`
                : `₹${fin.totalPaid.toLocaleString("en-IN")}`}
            </span>
          </div>
          <div>
            <span className="text-ink/50 block font-medium">
              {fin.isPendingAdvance ? "Remaining Balance (70%)" : "Balance Due"}
            </span>
            <span className={`font-semibold block text-sm sm:text-base ${fin.isPendingAdvance ? "text-ink/70" : (fin.isFullyPaid ? "text-emerald-700 font-bold" : "text-amber-700 font-bold")}`}>
              ₹{fin.remainingBalance.toLocaleString("en-IN")}
            </span>
          </div>
          <div>
            <span className="text-ink/50 block font-medium">Expected Delivery</span>
            <span className="font-semibold text-primary block">
              {order.deliveryRangeText || (order.expectedDeliveryMinDate && order.expectedDeliveryMaxDate
                ? `${formatDateShort(order.expectedDeliveryMinDate)} – ${formatDateShort(order.expectedDeliveryMaxDate)}`
                : (order.expectedDeliveryDate ? formatDateShort(order.expectedDeliveryDate) : (order.estimatedDeliveryDate ? formatDateShort(order.estimatedDeliveryDate) : "Pending Review")))}
            </span>
            {isAdminView && order.adminReadyDate && (
              <span className="text-[11px] font-medium text-accent block mt-0.5">
                Ready Deadline: {formatDateShort(order.adminReadyDate)}
              </span>
            )}
          </div>
          <div>
            <span className="text-ink/50 block font-medium">Payment Status</span>
            <span className="font-bold capitalize block text-primary">
              {fin.isFullyPaid ? "Paid in Full" : (fin.isAdvancePaid ? "Advance Paid" : "Pending Advance")}
            </span>
          </div>
        </div>
      </div>

      {/* ── 1. PAYMENT & FINANCIAL LEDGER CARD ── */}
      <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/10 space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-primary/10 pb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-accent" />
            <h3 className="font-display text-base font-bold text-primary">Payment &amp; Financial Ledger</h3>
          </div>
          <PaymentStatusBadge status={fin.isFullyPaid ? "paid" : (fin.isAdvancePaid ? "partially_paid" : "pending")} />
        </div>

        {/* Financial Progress Bar */}
        <div className="bg-bg/60 p-4 rounded-xl border border-primary/10 space-y-2.5">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="font-medium text-ink/70">
              {fin.isFullyPaid
                ? "Payment Status: Paid in Full (100%)"
                : fin.isAdvancePaid
                  ? `Payment Status: 30% Advance Paid (${fin.paymentPercentage}% Collected)`
                  : "Payment Status: Awaiting 30% Advance Deposit (0% Paid)"}
            </span>
            <span className="font-bold text-primary">
              ₹{fin.totalPaid.toLocaleString("en-IN")} of ₹{fin.totalAmount.toLocaleString("en-IN")} Paid ({fin.paymentPercentage}%)
            </span>
          </div>
          <div className="w-full bg-primary/10 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${fin.isFullyPaid ? "bg-emerald-500" : (fin.isAdvancePaid ? "bg-accent" : "bg-amber-400")
                }`}
              style={{ width: `${fin.paymentPercentage}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-primary/10">
              <span className="text-ink/50 block font-medium">Total Order Value</span>
              <strong className="text-primary font-display text-sm">₹{fin.totalAmount.toLocaleString("en-IN")}</strong>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-primary/10">
              <span className="text-ink/50 block font-medium">
                {fin.isPendingAdvance ? "30% Advance Required" : (fin.isAdvancePaid && !fin.isFullyPaid ? "30% Advance Paid" : "Amount Paid")}
              </span>
              <strong className={`font-display text-sm ${fin.isPendingAdvance ? "text-primary" : "text-emerald-700"}`}>
                {fin.isPendingAdvance
                  ? `₹${fin.advanceRequired.toLocaleString("en-IN")}`
                  : `₹${fin.totalPaid.toLocaleString("en-IN")}`}
              </strong>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-primary/10 col-span-2 sm:col-span-1">
              <span className="text-ink/50 block font-medium">
                {fin.isPendingAdvance ? "Remaining Balance (70%)" : "Balance Due"}
              </span>
              <strong className={`font-display text-sm ${fin.isPendingAdvance ? "text-ink/70" : (fin.isFullyPaid ? "text-emerald-700 font-bold" : "text-amber-700 font-bold")}`}>
                ₹{fin.remainingBalance.toLocaleString("en-IN")}
              </strong>
            </div>
          </div>
        </div>

        {/* CUSTOMER ACTION: Pay Remaining Balance / Pay 30% Advance */}
        {!isAdminView && !isRejected && !isCompleted && fin.isPendingAdvance && (
          <div className="bg-highlight/30 border border-accent/30 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <h4 className="font-semibold text-primary text-sm flex items-center gap-1.5">
                <Wallet size={16} className="text-accent" />
                30% Advance Payment Required
              </h4>
              <p className="text-xs text-ink/70 mt-0.5">
                Pay the initial 30% advance (₹{fin.advanceRequired.toLocaleString("en-IN")}) to automatically confirm your order. The remaining balance (₹{fin.remainingBalance.toLocaleString("en-IN")}) is payable at delivery or before dispatch.
              </p>
            </div>
            <button
              onClick={() => handlePayOnline("advance")}
              disabled={payingOnline}
              className="px-6 py-2.5 rounded-full bg-accent text-white font-semibold text-xs hover:bg-accent/90 shadow-md shadow-accent/20 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {payingOnline ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
              {payingOnline ? "Processing..." : `Pay 30% Advance (₹${fin.advanceRequired.toLocaleString("en-IN")})`}
            </button>
          </div>
        )}

        {!isAdminView && !isRejected && !isCompleted && isPartiallyPaid && amountDueVal > 0 && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <h4 className="font-semibold text-amber-950 text-sm flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                30% Advance Paid · Balance Due: ₹{amountDueVal.toLocaleString("en-IN")}
              </h4>
              <p className="text-xs text-amber-900/80 mt-0.5">
                Your 30% advance of ₹{amountPaidVal.toLocaleString("en-IN")} has been verified and confirmed. You can pay the remaining balance of ₹{amountDueVal.toLocaleString("en-IN")} online now or settle upon delivery/store pickup.
              </p>
            </div>
            <button
              onClick={() => handlePayOnline("balance")}
              disabled={payingOnline}
              className="px-6 py-2.5 rounded-full bg-primary text-bg font-semibold text-xs hover:bg-primary/90 shadow-md shadow-primary/20 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {payingOnline ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
              {payingOnline ? "Processing..." : `Pay Remaining Balance (₹${amountDueVal.toLocaleString("en-IN")})`}
            </button>
          </div>
        )}

        {!isAdminView && !isRejected && isFullyPaid && (
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <div className="text-xs text-emerald-950">
              <strong className="block font-semibold">Paid in Full</strong>
              <span>All payments for this order are complete (₹{amountPaidVal.toLocaleString("en-IN")}). Balance Due: ₹0.</span>
            </div>
          </div>
        )}

        {/* Payment Transaction Ledger */}
        {paymentsLedger.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-primary block">Verified Transactions</span>
              <button
                type="button"
                onClick={handlePrintPaymentDetails}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline cursor-pointer print:hidden"
                title="Print Payment Details & Transaction Receipt"
              >
                <Printer size={12} /> Print Payment Details
              </button>
            </div>
            <div className="space-y-2">
              {paymentsLedger.map((pm, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedTransaction(pm)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-bg/40 hover:bg-primary/5 rounded-xl border border-primary/10 hover:border-primary/30 text-xs transition-all cursor-pointer group shadow-2xs"
                  title="Click to view full payment transaction details"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold uppercase text-primary tracking-wider">
                        {pm.paymentMethod === "razorpay" ? "Online (Razorpay)" : pm.paymentMethod?.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                        {formatStatus(pm.paymentType || "payment")}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${pm.status === "captured" ? "bg-green-100 text-green-800" : "bg-rose-100 text-rose-800"}`}>
                        {formatStatus(pm.status)}
                      </span>
                    </div>
                    {pm.razorpayPaymentId && (
                      <p className="font-mono text-[11px] text-ink/60">ID: {pm.razorpayPaymentId}</p>
                    )}
                    {pm.notes && <p className="text-[11px] text-ink/60 italic">{cleanPaymentNote(pm.notes)}</p>}
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:shrink-0">
                    <div className="text-right">
                      <strong className="text-green-700 text-sm font-semibold block">₹{(pm.amount || 0).toLocaleString("en-IN")}</strong>
                      <span className="text-[10px] text-ink/50">{formatDate(pm.paidAt)}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-accent opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-flex items-center gap-0.5">
                      Details &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Refund Ledger */}
        {refundsLedger.length > 0 && (
          <div className="pt-2 border-t border-primary/10">
            <span className="text-xs font-semibold text-rose-800 block mb-2">Refund Records</span>
            <div className="space-y-2">
              {refundsLedger.map((rf, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 p-3 bg-rose-50/50 rounded-xl border border-rose-200 text-xs">
                  <div>
                    <span className="font-bold text-rose-900 block">Refund #{rf.refundId}</span>
                    <span className="text-ink/60 text-[11px]">{rf.reason || "Rejection / Cancellation Refund"}</span>
                  </div>
                  <div className="text-right">
                    <strong className="text-rose-700 font-bold text-sm block">−₹{(rf.amount || 0).toLocaleString("en-IN")}</strong>
                    <span className="text-[10px] text-ink/50">{formatDate(rf.processedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. ADMIN FULFILLMENT CONTROLS & SPECIAL ACTIONS ── */}
      {isAdminView && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-card p-6 border-2 border-accent/40 space-y-5"
        >
          <div className="flex items-center justify-between gap-3 border-b border-primary/10 pb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Scissors size={18} className="text-accent" />
              <h3 className="font-display text-base font-bold text-primary">Admin Order &amp; Production Controls</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Record Cash / POS Balance */}
              {amountDueVal > 0 && !isRejected && (
                <button
                  type="button"
                  onClick={() => {
                    setOfflineAmountInput(String(amountDueVal));
                    setOfflineModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <DollarSign size={13} /> Mark Balance Paid (Cash/POS)
                </button>
              )}

              {/* Complete Order Button */}
              {!isCompleted && !isRejected && (
                <button
                  type="button"
                  onClick={handleCompleteOrder}
                  disabled={completing}
                  title={amountDueVal > 0 ? `Cannot complete: ₹${amountDueVal} balance remains` : "Mark physical order as Completed"}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${amountDueVal === 0
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                >
                  {completing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Complete Order
                </button>
              )}

              {/* Reject Order Button */}
              {!isRejected && (
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Ban size={13} /> Reject Order
                </button>
              )}
            </div>
          </div>

          {/* Form for Production Stage, Date, Price, and Notes */}
          <form onSubmit={handleAdminUpdate} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">Production Stage</label>
                <select
                  value={adminStatus}
                  onChange={(e) => setAdminStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-primary/20 text-xs font-medium text-primary bg-bg/50 outline-none focus:border-accent"
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

              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">Target Delivery Date</label>
                <input
                  type="date"
                  value={adminDeliveryDate}
                  onChange={(e) => setAdminDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-primary/20 text-xs font-medium text-primary bg-white outline-none focus:border-accent"
                />
              </div>

              {isTailoring && (
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1.5">Final Total Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={adminFinalPrice}
                    onChange={(e) => setAdminFinalPrice(e.target.value)}
                    placeholder="e.g. 3500"
                    className="w-full px-3 py-2.5 rounded-xl border border-primary/20 text-xs font-medium text-primary bg-white outline-none focus:border-accent"
                  />
                </div>
              )}

              {isTailoring && (
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1.5">Assigned Tailor / Master</label>
                  <input
                    type="text"
                    value={assignedTailor}
                    onChange={(e) => setAssignedTailor(e.target.value)}
                    placeholder="e.g. Master Rajesh"
                    className="w-full px-3 py-2.5 rounded-xl border border-primary/20 text-xs text-primary bg-white outline-none focus:border-accent"
                  />
                </div>
              )}
            </div>

            {isTailoring && (
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">Admin Internal Notes</label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes for tailoring team..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-primary/20 outline-none focus:border-accent"
                />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={updating}
                className="px-6 py-2.5 rounded-full bg-accent text-white font-semibold text-xs hover:bg-accent/90 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {updating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {updating ? "Saving..." : "Update Production Details"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* ── 3. CUSTOMER INFORMATION ── */}
      <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/10 space-y-3">
        <h3 className="font-display text-base font-semibold text-primary flex items-center gap-2 border-b border-primary/10 pb-3">
          <User size={18} className="text-accent" /> Customer Details
        </h3>
        <div className="grid sm:grid-cols-2 gap-x-6">
          <InfoRow label="Customer Name" value={customerName} />
          <InfoRow label="Phone Number" value={customerPhone} />
          <InfoRow label="Email Address" value={customerEmail} />
          <InfoRow label="Customer Account ID" value={customerAccountId} mono />
          <InfoRow label="Order Placed At" value={formatDate(order.createdAt)} />
          <InfoRow label="Last Status Update" value={formatDate(order.updatedAt)} />
        </div>
      </div>

      {/* ── 4. TAILORING INFORMATION & REFERENCE DESIGN ── */}
      {isTailoring && (
        <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/10 space-y-4">
          <h3 className="font-display text-base font-semibold text-primary flex items-center gap-2 border-b border-primary/10 pb-3">
            <Scissors size={18} className="text-accent" /> Tailoring &amp; Design Specifications
          </h3>

          <div className="grid sm:grid-cols-2 gap-x-6">
            <InfoRow label="Garment Type" value={garmentName} />
            <InfoRow label="Design Complexity" value={complexityText} />
            <InfoRow label="Stitching Speed" value={order.isFastDelivery ? "Priority Stitching (24–30 hrs)" : "Standard Stitching (3–7 days)"} highlight={order.isFastDelivery} />
            {order.fabricDropoffDate && <InfoRow label="Fabric Drop-off Date" value={formatDateShort(order.fabricDropoffDate)} />}
          </div>

          {/* Reference Design Display */}
          {hasRef && (
            <div className="bg-bg/80 p-4 sm:p-5 rounded-2xl border border-primary/15 flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-3 shadow-2xs">
              {refImage ? (
                <div
                  onClick={() => setLightboxImage(refImage)}
                  className="relative group cursor-pointer w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-primary/20 shrink-0 bg-white shadow-2xs"
                >
                  <img src={refImage} alt={refTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-primary/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ZoomIn size={18} className="text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Scissors size={24} className="text-primary/40" />
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${isGalleryRef
                      ? "bg-accent/10 text-accent border-accent/25"
                      : "bg-primary/10 text-primary border-primary/20"
                    }`}>
                    {isGalleryRef ? "Reference Type: Design Gallery" : "Reference Type: Uploaded Image"}
                  </span>
                </div>

                <h4 className="text-sm sm:text-base font-semibold text-primary truncate">{refTitle}</h4>

                {refDesign?.designCost && (
                  <p className="text-xs text-ink/60">
                    Design / Work Charge: <strong className="text-primary">₹{refDesign.designCost.toLocaleString("en-IN")}</strong>
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {isGalleryRef && refSlugOrId && (
                    <Link
                      to={`/design-gallery/${refSlugOrId}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                    >
                      <Sparkles size={12} /> View Design in Gallery
                    </Link>
                  )}
                  {refImage && (
                    <button
                      type="button"
                      onClick={() => setLightboxImage(refImage)}
                      className="text-xs text-ink/60 hover:text-primary font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ZoomIn size={12} /> View full image
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Measurements Grid */}
          {measurementsList.length > 0 && (
            <div className="pt-3 border-t border-primary/10">
              <span className="text-xs font-semibold text-primary block mb-2">Order Measurements (inches)</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-bg/50 p-3 rounded-xl border border-primary/10">
                {measurementsList.map(([k, v]) => (
                  <div key={k} className="text-xs">
                    <span className="text-ink/60">
                      {MEASUREMENT_LABEL_MAP[k] || (k === "length" ? "Body Length" : k.replace(/_/g, " "))}:{" "}
                    </span>
                    <strong className="text-primary">{v} in</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 5. SHOPPING ITEMS (If Shopping Order) ── */}
      {!isTailoring && Array.isArray(order.items) && order.items.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/10 space-y-4">
          <h3 className="font-display text-base font-semibold text-primary flex items-center gap-2 border-b border-primary/10 pb-3">
            <Package size={18} className="text-accent" /> Items Ordered ({order.items.length})
          </h3>
          <div className="space-y-3">
            {order.items.map((item, i) => {
              const itemImg = getImageUrl(item.image || item.product?.thumbnail?.url || item.product?.images?.[0]?.url || item.product?.image || item.product);
              const itemPrice = Number(item.price) || 0;
              const itemQty = Number(item.quantity) || 1;
              return (
                <div key={i} className="flex items-center gap-4 py-2 border-b border-primary/5 last:border-0">
                  {itemImg ? (
                    <img src={itemImg} alt={item.name || "Item"} className="w-14 h-14 rounded-xl object-cover border border-primary/10 shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <ShoppingBag size={20} className="text-primary/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary">{item.name || "Product"}</p>
                    <p className="text-xs text-ink/60">
                      {[
                        item.size && `Size: ${item.size}`,
                        item.color && `Color: ${item.color}`,
                        item.fabricType && (item.fabricCategory ? `Fabric: ${item.fabricCategory} (${item.fabricType})` : `Fabric: ${item.fabricType}`),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="text-xs text-ink/50 mt-0.5">Qty: {itemQty} × ₹{itemPrice.toLocaleString("en-IN")}</p>
                  </div>
                  <p className="text-sm font-bold text-primary">₹{(itemPrice * itemQty).toLocaleString("en-IN")}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 6. FABRIC INFORMATION ── */}
      {isTailoring && (
        <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/10 space-y-3">
          <h3 className="font-display text-base font-semibold text-primary flex items-center gap-2 border-b border-primary/10 pb-3">
            <FileText size={18} className="text-accent" /> Fabric Details
          </h3>
          <div className="grid sm:grid-cols-2 gap-x-6">
            <InfoRow label="Fabric Source" value={order.fabricSource === "customer_provided" ? "Customer Provided" : "Store Sourced"} />
            <InfoRow label="Material / Fabric Type" value={order.preferredMaterial || "Standard Fabric"} />
            {order.fabricSource === "shop_provided" && (
              <>
                <InfoRow label="Required Fabric Length" value={`${stdQty} ${stdQty === 1 ? "metre" : "metres"}`} />
                <InfoRow label="Price per Metre" value={`₹${fabricPricePerM}/m`} />
                <InfoRow label="Total Fabric Cost" value={`₹${totalFabricCost.toLocaleString("en-IN")}`} highlight />
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 7. DELIVERY DETAILS ── */}
      <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/10 space-y-4">
        <h3 className="font-display text-base font-semibold text-primary flex items-center gap-2 border-b border-primary/10 pb-3">
          <Truck size={18} className="text-accent" /> Delivery &amp; Location Details
        </h3>

        <div className="grid sm:grid-cols-2 gap-x-6">
          <InfoRow label="Delivery Method" value={isStorePickup ? "Store Pickup" : (deliveryCategory === "long_distance" ? "Long-distance delivery" : "Home Delivery")} />
          <InfoRow label="City / Town" value={deliveryCity || "—"} />
          <InfoRow label="Area / Address" value={deliveryArea || "Store Pickup"} />
          <InfoRow label="Pincode" value={deliveryPincode || "—"} />
          <InfoRow label="Delivery Category" value={formatStatus(deliveryCategory)} />
          <InfoRow label="Delivery Charge" value={deliveryChargeText} highlight />
        </div>

        {isDeliveryPending && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-900 leading-relaxed mt-2">
            <strong className="block text-amber-950 text-sm mb-1">Delivery Charge: To be confirmed</strong>
            Our team will check the delivery route for this location and confirm the delivery charge directly with the customer.
          </div>
        )}
      </div>

      {/* ── 8. CUSTOMER SPECIAL INSTRUCTIONS ── */}
      {order.description && (
        <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/10 space-y-2">
          <h3 className="font-display text-base font-semibold text-primary flex items-center gap-2 border-b border-primary/10 pb-2">
            <FileText size={18} className="text-accent" /> Customer Notes &amp; Instructions
          </h3>
          <p className="text-xs sm:text-sm text-ink/80 leading-relaxed pt-1">{order.description}</p>
        </div>
      )}

      {/* ── 9. ITEMIZED PRICING BREAKDOWN (Strictly NO GST) ── */}
      <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/10 space-y-3">
        <h3 className="font-display text-base font-semibold text-primary flex items-center gap-2 border-b border-primary/10 pb-3">
          <Receipt size={18} className="text-accent" /> Pricing Breakdown
        </h3>

        <div className="space-y-2 text-xs sm:text-sm">
          {isTailoring ? (
            <>
              {designCost > 0 && (
                <InfoRow
                  label={`Design / Work Cost (${refDesign?.title || complexityLabels[order.designComplexity] || "Custom Work"})`}
                  value={`₹${designCost.toLocaleString("en-IN")}`}
                />
              )}
              <InfoRow label="Fabric Cost" value={order.fabricSource === "shop_provided" ? `₹${totalFabricCost.toLocaleString("en-IN")}` : "Customer Provided (₹0)"} />
              {priorityFee > 0 && <InfoRow label="Priority Stitching Surcharge" value={`₹${priorityFee.toLocaleString("en-IN")}`} highlight />}
              <InfoRow label="Delivery Charge" value={deliveryChargeText} />
              {order.platformFee > 0 && (
                <InfoRow
                  label="Platform Fee"
                  value={`₹${Number(order.platformFee).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
              )}
            </>
          ) : (
            <>
              <InfoRow label="Items Subtotal" value={`₹${(order.subtotal || 0).toLocaleString("en-IN")}`} />
              {order.discount > 0 && <InfoRow label="Discount Applied" value={`−₹${order.discount.toLocaleString("en-IN")}`} />}
              <InfoRow label="Delivery Fee" value={deliveryChargeText} />
              {order.platformFee > 0 && (
                <InfoRow
                  label="Platform Fee"
                  value={`₹${Number(order.platformFee).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
              )}
            </>
          )}

          <div className="flex items-center justify-between pt-4 mt-2 border-t-2 border-primary/15 text-sm sm:text-base font-bold text-primary">
            <span>Your Order Total</span>
            <span className="text-accent font-display text-lg sm:text-xl">
              ₹{totalOrderAmount.toLocaleString("en-IN")}
              {isDeliveryPending && <span className="text-xs font-normal text-amber-700 block text-right">+ Delivery to be confirmed</span>}
            </span>
          </div>

          {/* 30% Advance & Balance Sub-summary in Pricing Card */}
          <div className="pt-2 border-t border-primary/10 space-y-1.5 text-xs text-ink/70">
            {isPendingPayment && (
              <>
                <div className="flex justify-between">
                  <span>Pay Now (30%)</span>
                  <span className="font-semibold text-primary">₹{Math.round(totalOrderAmount * 0.30).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-ink/55">
                  <span>Pay Later (at delivery)</span>
                  <span>₹{(totalOrderAmount - Math.round(totalOrderAmount * 0.30)).toLocaleString("en-IN")}</span>
                </div>
              </>
            )}
            {isPartiallyPaid && (
              <>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-600" /> Paid Now (30%)
                  </span>
                  <span>₹{amountPaidVal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-700">
                  <span>Pay Later</span>
                  <span>₹{amountDueVal.toLocaleString("en-IN")}</span>
                </div>
              </>
            )}
            {isFullyPaid && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-600" /> Paid in Full
                </span>
                <span>Balance Due: ₹0</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-ink/50 pt-1 text-right italic">
            * Lucky Couture prices do not include GST. No GST applies.
          </p>
        </div>
      </div>

      {/* ── REJECT ORDER MODAL ── */}
      <AnimatePresence>
        {rejectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/80 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-primary/20">
              <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                <h3 className="font-display text-base font-bold text-rose-800 flex items-center gap-2">
                  <Ban size={18} /> Reject &amp; Refund Order
                </h3>
                <button onClick={() => setRejectModalOpen(false)} className="p-1 rounded-full text-ink/50 hover:text-primary cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-ink/70 leading-relaxed">
                Rejecting this order will permanently stop production, issue an automated refund for any captured online payments (₹{amountPaidVal.toLocaleString("en-IN")}), and restore stock.
              </p>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">Rejection Reason *</label>
                <textarea
                  rows={3}
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="e.g. Design complexity beyond current machine capability / Out of required fabric..."
                  className="w-full p-3 text-xs rounded-xl border border-primary/20 outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-ink/70 border border-primary/15 hover:bg-primary/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectOrder}
                  disabled={rejecting || !rejectionReasonInput.trim()}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {rejecting ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                  {rejecting ? "Processing..." : "Confirm Rejection & Refund"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── OFFLINE PAYMENT MODAL (CASH / POS) ── */}
      <AnimatePresence>
        {offlineModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/80 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-primary/20">
              <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                <h3 className="font-display text-base font-bold text-primary flex items-center gap-2">
                  <DollarSign size={18} className="text-accent" /> Record Offline Balance Payment
                </h3>
                <button onClick={() => setOfflineModalOpen(false)} className="p-1 rounded-full text-ink/50 hover:text-primary cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-ink/70">
                Collect in-person payment from customer at the store or upon delivery.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-primary mb-1">Payment Method</label>
                  <div className="flex gap-2">
                    {["cash", "pos"].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setOfflineMethod(m)}
                        className={`flex-1 py-2 rounded-xl font-bold uppercase transition-all cursor-pointer ${offlineMethod === m ? "bg-accent text-white" : "bg-bg text-primary border border-primary/15"
                          }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-primary mb-1">Amount Collected (₹)</label>
                  <input
                    type="number"
                    min="1"
                    max={amountDueVal}
                    value={offlineAmountInput}
                    onChange={(e) => setOfflineAmountInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-primary/20 outline-none focus:border-accent text-sm font-semibold"
                  />
                  <span className="text-[11px] text-ink/50 block mt-1">Maximum remaining balance: ₹{amountDueVal.toLocaleString("en-IN")}</span>
                </div>

                <div>
                  <label className="block font-semibold text-primary mb-1">Notes / Receipt Reference</label>
                  <input
                    type="text"
                    value={offlineNotesInput}
                    onChange={(e) => setOfflineNotesInput(e.target.value)}
                    placeholder="e.g. POS Transaction slip #8492"
                    className="w-full p-2.5 rounded-xl border border-primary/20 outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-primary/10">
                <button
                  type="button"
                  onClick={() => setOfflineModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-ink/70 border border-primary/15 hover:bg-primary/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRecordOfflinePayment}
                  disabled={recordingOffline || !offlineAmountInput || Number(offlineAmountInput) <= 0}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-accent text-white hover:bg-accent/90 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {recordingOffline ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {recordingOffline ? "Recording..." : `Record ₹${Number(offlineAmountInput || 0).toLocaleString("en-IN")}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal for enlarged image preview */}
      <AnimatePresence>
        {lightboxImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/80 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl p-4 shadow-2xl">
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-primary text-bg hover:bg-accent transition-colors z-10 cursor-pointer"
              >
                <X size={18} />
              </button>
              <img src={lightboxImage} alt="Enlarged Reference" className="max-w-full max-h-[80vh] rounded-xl object-contain" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Transaction Details Modal */}
      <AnimatePresence>
        {selectedTransaction && (() => {
          const rawMethod = (selectedTransaction.paymentMethod || selectedTransaction.method || "").toLowerCase();
          const isOffline = ["cash", "pos", "offline"].includes(rawMethod);

          const pMethod = selectedTransaction.paymentMethod === "razorpay"
            ? (rawMethod ? `Online (${rawMethod.toUpperCase()})` : "Online (Razorpay)")
            : (selectedTransaction.paymentMethod?.toUpperCase() || "N/A");
          const pType = formatStatus(selectedTransaction.paymentType || "Payment");
          const pStatus = formatStatus(selectedTransaction.status);

          // Payment ID: Only genuine provider payment ID (e.g. pay_... from Razorpay or explicit paymentId string)
          // NEVER display internal Mongoose subdocument _id (24-hex ObjectId) as a Payment ID!
          let paymentId = selectedTransaction.razorpayPaymentId || selectedTransaction.paymentId || null;
          if (paymentId && (isOffline || /^[0-9a-fA-F]{24}$/.test(String(paymentId)))) {
            paymentId = null;
          }

          // Razorpay Order ID: Only for online payments if distinct and genuine
          const razorpayOrderId = (!isOffline && selectedTransaction.razorpayOrderId && selectedTransaction.razorpayOrderId !== paymentId && !/^[0-9a-fA-F]{24}$/.test(String(selectedTransaction.razorpayOrderId)))
            ? selectedTransaction.razorpayOrderId
            : null;

          // Bank / UPI reference ID (if explicitly present from payment provider)
          const rawBankTx = selectedTransaction.bankTransactionId || selectedTransaction.acquirerRef || selectedTransaction.rrn || selectedTransaction.upiTransactionId || selectedTransaction.utr || null;
          const bankTxId = (rawBankTx && !/^[0-9a-fA-F]{24}$/.test(String(rawBankTx))) ? rawBankTx : null;
          const isUpi = rawMethod === "upi" || (bankTxId && String(bankTxId).length === 12 && /^\d+$/.test(String(bankTxId)));
          const isNetbanking = rawMethod === "netbanking";
          const bankTxLabel = isUpi
            ? "UPI Transaction ID / UTR"
            : isNetbanking
              ? "Bank Transaction Reference"
              : "Bank / Network Reference (UTR)";

          // External Transaction ID (if explicitly present and distinct)
          const rawTxId = selectedTransaction.transactionId;
          const transactionId = (rawTxId && rawTxId !== paymentId && rawTxId !== razorpayOrderId && rawTxId !== bankTxId && !/^[0-9a-fA-F]{24}$/.test(String(rawTxId)))
            ? rawTxId
            : null;

          // Refund ID (if refund genuinely belongs to this transaction or is attached)
          const txRefund = (Array.isArray(order?.refunds) ? order.refunds : []).find(
            (rf) =>
              (rf.paymentId &&
                (rf.paymentId === selectedTransaction.razorpayPaymentId ||
                  rf.paymentId === selectedTransaction.transactionId)) ||
              (selectedTransaction.refundId && rf.refundId === selectedTransaction.refundId)
          );
          const refundId = selectedTransaction.refundId || txRefund?.refundId || null;

          return (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/70 backdrop-blur-xs overflow-y-auto overflow-x-hidden"
              onClick={() => setSelectedTransaction(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full border border-primary/10 space-y-4 max-h-[90vh] overflow-y-auto overflow-x-hidden"
              >
                <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-accent" />
                    <h3 className="font-display font-bold text-primary text-base">Payment Details</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTransaction(null)}
                    className="p-1 rounded-full text-ink/50 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                    title="Close modal"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="bg-bg/50 p-3.5 rounded-xl border border-primary/10 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-ink/60 uppercase tracking-wider block">Transaction Amount</span>
                    <strong className="text-emerald-700 font-display text-xl font-bold">
                      ₹{(selectedTransaction.amount || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${selectedTransaction.status === "captured" ? "bg-green-100 text-green-800 border border-green-200" : "bg-rose-100 text-rose-800 border border-rose-200"}`}>
                    {pStatus}
                  </span>
                </div>

                <div className="space-y-1 divide-y divide-primary/5 text-xs sm:text-sm">
                  <InfoRow label="Payment Method" value={pMethod} />
                  <InfoRow label="Payment Type" value={pType} />
                  <InfoRow label="Payment Status" value={pStatus} />

                  {paymentId && (
                    <InfoRow label="Payment ID" value={paymentId} mono copyable />
                  )}
                  {razorpayOrderId && (
                    <InfoRow label="Razorpay Order ID" value={razorpayOrderId} mono copyable />
                  )}
                  {bankTxId && bankTxId !== paymentId && bankTxId !== razorpayOrderId && (
                    <InfoRow label={bankTxLabel} value={bankTxId} mono copyable highlight={isUpi} />
                  )}
                  {transactionId && (
                    <InfoRow label="Transaction ID" value={transactionId} mono copyable />
                  )}
                  {refundId && (
                    <InfoRow label="Refund ID" value={refundId} mono copyable highlight />
                  )}
                  {selectedTransaction.paidAt && (
                    <InfoRow label="Date & Time" value={formatDateTime(selectedTransaction.paidAt)} />
                  )}
                  {selectedTransaction.notes && (
                    <InfoRow label="Notes / Reference" value={cleanPaymentNote(selectedTransaction.notes)} />
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handlePrintPaymentDetails}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                    title="Print Payment Details & Transaction Receipt"
                  >
                    <Printer size={14} className="text-accent" />
                    <span>Print Payment Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTransaction(null)}
                    className="px-5 py-2 rounded-full text-xs font-semibold bg-primary text-bg hover:bg-primary/90 cursor-pointer shadow-xs transition-all"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Print Document Styles & Layout (Visible ONLY during window.print()) ── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-area, #print-area * {
            visibility: visible !important;
          }
          #print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          @page {
            size: A4;
            margin: 12mm 15mm;
          }
        }
      `}</style>

      <div id="print-area" className="hidden print:block font-sans text-black leading-normal">
        {printTarget === "payment" ? (
          /* Payment Statement & Transaction Receipt */
          <div className="p-8 max-w-3xl mx-auto bg-white text-black space-y-6">
            <div className="flex justify-between items-start border-b-2 border-black pb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-black uppercase">LUCKY COUTURE</h1>
                <p className="text-xs text-gray-700 font-medium mt-0.5">Boutique Fashion &amp; Bespoke Tailoring Studio</p>
                <p className="text-xs text-gray-600">Guntur, Andhra Pradesh, India • contact@luckycouture.in</p>
              </div>
              <div className="text-right">
                <h2 className="text-base font-bold text-gray-900 uppercase">Payment Statement</h2>
                <p className="text-xs font-mono font-bold text-black mt-1">Order ID: {orderId}</p>
                <p className="text-xs text-gray-600">Generated: {formatDate(new Date())}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-300 rounded-lg text-xs">
              <div>
                <p className="text-gray-500 font-bold uppercase text-[10px]">Customer Information</p>
                <p className="font-bold text-sm text-black mt-0.5">{customerName}</p>
                <p className="text-gray-700">Phone: {customerPhone}</p>
                <p className="text-gray-700">Email: {customerEmail}</p>
                <p className="text-gray-500 text-[10px] mt-1">Account: {customerAccountId}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 font-bold uppercase text-[10px]">Financial Overview</p>
                <p className="text-xs text-gray-800 mt-0.5">Total Order Amount: <strong>₹{totalOrderAmount.toLocaleString("en-IN")}</strong></p>
                <p className="text-xs text-emerald-800 font-bold">Total Amount Paid: ₹{amountPaidVal.toLocaleString("en-IN")}</p>
                <p className="text-xs text-amber-900 font-bold">Remaining Balance Due: ₹{amountDueVal.toLocaleString("en-IN")}</p>
                <p className="text-xs uppercase font-bold text-black mt-1">
                  Status: {isFullyPaid ? "PAID IN FULL" : (isPartiallyPaid ? "PARTIALLY PAID" : "PENDING PAYMENT")}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black border-b border-gray-300 pb-1">Verified Payment Transactions</h3>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300">
                    <th className="p-2">Type / Method</th>
                    <th className="p-2">Transaction Identifiers</th>
                    <th className="p-2">Date &amp; Time</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paymentsLedger.map((pm, idx) => (
                    <tr key={`pm-${idx}`}>
                      <td className="p-2 align-top">
                        <span className="font-bold block uppercase">{pm.paymentMethod === "razorpay" ? "Online (Razorpay)" : pm.paymentMethod?.toUpperCase()}</span>
                        <span className="text-[10px] text-gray-600 capitalize">{pm.paymentType || "Payment"} • {pm.status}</span>
                        {pm.notes && <p className="text-[10px] italic text-gray-700 mt-1">{cleanPaymentNote(pm.notes)}</p>}
                      </td>
                      <td className="p-2 align-top font-mono text-[10px] space-y-0.5">
                        {pm.razorpayPaymentId && <div>Payment ID: {pm.razorpayPaymentId}</div>}
                        {pm.razorpayOrderId && <div>Razorpay Order ID: {pm.razorpayOrderId}</div>}
                        {pm.transactionId && !/^[0-9a-fA-F]{24}$/.test(String(pm.transactionId)) && <div>Tx ID: {pm.transactionId}</div>}
                        {pm.bankTransactionId && !/^[0-9a-fA-F]{24}$/.test(String(pm.bankTransactionId)) && <div>Bank Tx ID: {pm.bankTransactionId}</div>}
                        {!pm.razorpayPaymentId && !pm.razorpayOrderId && !pm.transactionId && !pm.bankTransactionId && <div>—</div>}
                      </td>
                      <td className="p-2 align-top text-gray-700">{formatDateTime(pm.paidAt)}</td>
                      <td className="p-2 align-top text-right font-bold text-emerald-800">₹{(pm.amount || 0).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                  {refundsLedger.map((rf, idx) => (
                    <tr key={`rf-${idx}`} className="bg-rose-50/50">
                      <td className="p-2 align-top">
                        <span className="font-bold text-rose-900 block uppercase">Refund Record</span>
                        <span className="text-[10px] text-rose-700">{rf.reason || "Order Refund"}</span>
                      </td>
                      <td className="p-2 align-top font-mono text-[10px] text-rose-800 space-y-0.5">
                        {rf.refundId && <div>Refund ID: {rf.refundId}</div>}
                        {rf.razorpayPaymentId && <div>Original Payment ID: {rf.razorpayPaymentId}</div>}
                      </td>
                      <td className="p-2 align-top text-rose-800">{formatDate(rf.processedAt)}</td>
                      <td className="p-2 align-top text-right font-bold text-rose-700">−₹{(rf.amount || 0).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-6 border-t border-gray-300 text-center text-[10px] text-gray-500">
              Official Payment Record &amp; Statement • Lucky Couture • www.luckycouture.in
            </div>
          </div>
        ) : (
          /* Full Order Details Invoice Document */
          <div className="p-8 max-w-3xl mx-auto bg-white text-black space-y-6">
            <div className="flex justify-between items-start border-b-2 border-black pb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-black uppercase">LUCKY COUTURE</h1>
                <p className="text-xs text-gray-700 font-medium mt-0.5">Boutique Fashion &amp; Bespoke Tailoring Studio</p>
                <p className="text-xs text-gray-600">Guntur, Andhra Pradesh, India • contact@luckycouture.in</p>
              </div>
              <div className="text-right">
                <h2 className="text-base font-bold text-gray-900 uppercase">Order Details</h2>
                <p className="text-xs font-mono font-bold text-black mt-1">Order ID: {orderId}</p>
                <p className="text-xs text-gray-600">Order Placed: {formatDate(order.createdAt)}</p>
                <p className="text-xs font-bold text-black mt-1 uppercase">Order Status: {formatStatus(order.status)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-300 rounded-lg text-xs">
              <div>
                <p className="text-gray-500 font-bold uppercase text-[10px]">Customer Information</p>
                <p className="font-bold text-sm text-black mt-0.5">{customerName}</p>
                <p className="text-gray-700">Phone: {customerPhone}</p>
                <p className="text-gray-700">Email: {customerEmail}</p>
                <p className="text-gray-500 text-[10px] mt-1">Account: {customerAccountId}</p>
              </div>
              <div>
                <p className="text-gray-500 font-bold uppercase text-[10px]">Fulfillment Details</p>
                <p className="font-bold text-black mt-0.5">{isStorePickup ? "Store Pickup (Guntur)" : "Home Delivery"}</p>
                <p className="text-gray-700">{deliveryArea}</p>
                <p className="text-gray-700">{deliveryCity} {deliveryPincode}</p>
                {order.targetDeliveryDate && (
                  <p className="text-xs font-bold text-black mt-1">Expected Delivery: {formatDateShort(order.targetDeliveryDate)}</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-black border-b border-gray-300 pb-1 mb-2">Order Items &amp; Services</h3>
              {isTailoring ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300">
                      <th className="p-2">Item / Garment Specification</th>
                      <th className="p-2 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="p-2">
                        <strong className="block text-sm text-black">{garmentName} ({complexityText})</strong>
                        <span className="text-gray-600 text-[11px] block">Fabric: {order.preferredMaterial || "Custom"} ({order.fabricSource === "shop_provided" ? "Provided by Store" : "Customer Provided"})</span>
                        {refTitle && <span className="block text-gray-600 text-[11px]">Design Reference: {refTitle}</span>}
                      </td>
                      <td className="p-2 text-right font-medium">₹{(designCost || 600).toLocaleString("en-IN")}</td>
                    </tr>
                    {totalFabricCost > 0 && (
                      <tr>
                        <td className="p-2">Fabric Charge ({order.preferredMaterial})</td>
                        <td className="p-2 text-right font-medium">₹{totalFabricCost.toLocaleString("en-IN")}</td>
                      </tr>
                    )}
                    {priorityFee > 0 && (
                      <tr>
                        <td className="p-2">Express Priority Surcharge (24–36h)</td>
                        <td className="p-2 text-right font-medium">₹{priorityFee.toLocaleString("en-IN")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300">
                      <th className="p-2">Product Name</th>
                      <th className="p-2">Variant</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Price</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(order.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium text-black">{item.name || "Boutique Product"}</td>
                        <td className="p-2 text-gray-600">{[item.color, item.size, item.fabricType].filter(Boolean).join(" / ") || "Standard"}</td>
                        <td className="p-2 text-center">{item.quantity || 1}</td>
                        <td className="p-2 text-right">₹{Number(item.price || 0).toLocaleString("en-IN")}</td>
                        <td className="p-2 text-right font-medium">₹{(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {isTailoring && measurementsList.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-black border-b border-gray-300 pb-1 mb-2">Custom Measurements</h3>
                <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                  {measurementsList.map(([key, val]) => (
                    <div key={key}>
                      <span className="text-gray-500 text-[10px] uppercase block">{MEASUREMENT_LABEL_MAP[key] || key}</span>
                      <strong className="text-black font-mono">{val} in</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t-2 border-black pt-3 flex justify-end">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span>₹{(totalOrderAmount - deliveryFeeVal).toLocaleString("en-IN")}</span>
                </div>
                {deliveryFeeVal > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Delivery Charges:</span>
                    <span>₹{deliveryFeeVal.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-black border-t border-gray-300 pt-1.5">
                  <span>Total Order Amount:</span>
                  <span>₹{totalOrderAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Total Amount Paid:</span>
                  <span>₹{amountPaidVal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-amber-900 font-bold">
                  <span>Remaining Balance Due:</span>
                  <span>₹{amountDueVal.toLocaleString("en-IN")}</span>
                </div>
                <div className="text-right pt-1">
                  <span className="px-2 py-0.5 bg-gray-200 text-black text-[10px] font-bold rounded uppercase">
                    Payment Status: {isFullyPaid ? "PAID IN FULL" : (isPartiallyPaid ? "PARTIALLY PAID" : "PENDING PAYMENT")}
                  </span>
                </div>
              </div>
            </div>

            {paymentsLedger.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-300">
                <h3 className="text-xs font-bold uppercase tracking-wider text-black">Payment Ledger</h3>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300">
                      <th className="p-2">Method / Type</th>
                      <th className="p-2">Identifiers</th>
                      <th className="p-2">Date</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paymentsLedger.map((pm, idx) => (
                      <tr key={`pm-inv-${idx}`}>
                        <td className="p-2 align-top">
                          <span className="font-bold block uppercase">{pm.paymentMethod === "razorpay" ? "Online (Razorpay)" : pm.paymentMethod?.toUpperCase()}</span>
                          <span className="text-[10px] text-gray-600">{pm.paymentType || "Payment"} • {pm.status}</span>
                        </td>
                        <td className="p-2 align-top font-mono text-[10px]">
                          {pm.razorpayPaymentId || (pm.transactionId && !/^[0-9a-fA-F]{24}$/.test(String(pm.transactionId)) ? pm.transactionId : null) || (pm.bankTransactionId && !/^[0-9a-fA-F]{24}$/.test(String(pm.bankTransactionId)) ? pm.bankTransactionId : null) || "—"}
                        </td>
                        <td className="p-2 align-top text-gray-700">{formatDate(pm.paidAt)}</td>
                        <td className="p-2 align-top text-right font-bold text-emerald-800">₹{(pm.amount || 0).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-6 border-t border-gray-300 text-center text-[10px] text-gray-500">
              Thank you for choosing Lucky Couture • Muthyalareddy Nagar Main Road, Amaravathi Road, Guntur, AP • www.luckycouture.in
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
