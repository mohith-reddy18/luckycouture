import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Package, Scissors, MapPin, CreditCard, Clock,
  CheckCircle2, AlertCircle, Loader2, Receipt, Truck, User,
  FileText, ZoomIn, X, Save, Calendar, Sparkles, Store, MessageCircle
} from "lucide-react";
import { useApp } from "../context/AppContext";
import api from "../utils/api";
import { standardFabricRequirements, fabricCatalog, contactInfo } from "../data/mockData";

// ─── Status Colors & Formatters ──────────────────────────────────────────────
const statusColors = {
  placed:           "bg-blue-100 text-blue-800 border-blue-200",
  confirmed:        "bg-indigo-100 text-indigo-800 border-indigo-200",
  packed:           "bg-purple-100 text-purple-800 border-purple-200",
  shipped:          "bg-cyan-100 text-cyan-800 border-cyan-200",
  delivered:        "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled:        "bg-red-100 text-red-800 border-red-200",
  returned:         "bg-rose-100 text-rose-800 border-rose-200",
  pending:          "bg-amber-100 text-amber-800 border-amber-200",
  fabric_received:  "bg-purple-100 text-purple-800 border-purple-200",
  cutting:          "bg-blue-100 text-blue-800 border-blue-200",
  stitching:        "bg-indigo-100 text-indigo-800 border-indigo-200",
  quality_check:    "bg-teal-100 text-teal-800 border-teal-200",
  ready_for_pickup: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected:         "bg-red-100 text-red-800 border-red-200",
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

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const formatDateShort = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

function InfoRow({ label, value, mono, highlight }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-primary/5 last:border-0 text-xs sm:text-sm">
      <span className="text-ink/60 shrink-0 font-medium">{label}</span>
      <span className={`text-right font-medium ${mono ? "font-mono tracking-wide" : ""} ${highlight ? "text-accent font-bold" : "text-primary"}`}>
        {value ?? "—"}
      </span>
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

export default function OrderDetail({ isAdmin: routeIsAdmin }) {
  const { type, id } = useParams(); // type = "shopping" | "tailoring"
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authLoading, notify } = useApp();

  const isTailoring = type === "tailoring";
  const isAdminUser = Boolean(user && user.role === "admin");
  const isAdminView = Boolean(isAdminUser && (routeIsAdmin || location.pathname.startsWith("/admin")));

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);

  // Admin controls state
  const [adminStatus, setAdminStatus] = useState("");
  const [adminDeliveryDate, setAdminDeliveryDate] = useState("");
  const [adminDeliveryCharge, setAdminDeliveryCharge] = useState("");
  const [adminFinalPrice, setAdminFinalPrice] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [assignedTailor, setAssignedTailor] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = isTailoring ? `/api/tailoring/${id}` : `/api/orders/${id}`;
      const res = await api.get(endpoint);
      if (res?.data) {
        const item = res.data;
        setOrder(item);
        setAdminStatus(item.status || "");
        setAdminDeliveryDate(item.expectedDeliveryDate ? new Date(item.expectedDeliveryDate).toISOString().slice(0, 10) : (item.estimatedDeliveryDate ? new Date(item.estimatedDeliveryDate).toISOString().slice(0, 10) : ""));
        setAdminDeliveryCharge(item.deliveryCharge != null ? item.deliveryCharge : (item.shippingFee != null ? item.shippingFee : ""));
        setAdminFinalPrice(item.finalPrice != null ? item.finalPrice : "");
        setAdminNotes(item.adminNotes || "");
        setAssignedTailor(item.assignedTailor || "");
      }
    } catch (err) {
      setError(err.message || "Could not load order details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    fetchOrder();
  }, [id, type, user, authLoading, navigate]);

  const handleAdminUpdate = async (e) => {
    e.preventDefault();
    if (!order || !isAdminUser) return;
    setUpdating(true);
    try {
      const endpoint = isTailoring ? `/api/tailoring/${order._id}/status` : `/api/orders/${order._id}/status`;
      const payload = {
        status: adminStatus,
        ...(adminDeliveryDate && { expectedDeliveryDate: adminDeliveryDate, estimatedDeliveryDate: adminDeliveryDate }),
        ...(adminDeliveryCharge !== "" && {
          deliveryCharge: Number(adminDeliveryCharge) || 0,
          shippingFee: Number(adminDeliveryCharge) || 0,
          deliveryChargeStatus: Number(adminDeliveryCharge) > 0 ? "fixed" : "to_be_confirmed",
        }),
        ...(isTailoring && {
          adminNotes,
          assignedTailor,
          ...(adminFinalPrice !== "" && { finalPrice: Number(adminFinalPrice) || 0 }),
        }),
      };

      const res = await api.patch(endpoint, payload);
      notify("Order details and status updated successfully! Customer notified.");
      if (res?.data) {
        setOrder((prev) => ({ ...prev, ...res.data }));
      } else {
        fetchOrder();
      }
    } catch (err) {
      notify(err.message || "Failed to update order status");
    } finally {
      setUpdating(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <AlertCircle size={40} className="mx-auto text-red-400 mb-5" />
        <h1 className="font-display text-xl font-semibold text-primary mb-2">Order Not Found</h1>
        <p className="text-sm text-ink/60 mb-8">{error || "This order does not exist or you do not have permission to view it."}</p>
        <button
          onClick={() => navigate(isAdminView ? "/admin" : "/orders")}
          className="inline-block bg-primary text-bg px-7 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
        >
          {isAdminView ? "Back to Dashboard" : "Back to Orders"}
        </button>
      </div>
    );
  }

  const orderId = order.orderId || order._id;

  // Customer metadata
  const customerObj = order.customer || order.user;
  const customerName = customerObj?.name || order.guestInfo?.name || "Customer";
  const customerEmail = customerObj?.email || order.guestInfo?.email || "Not provided";
  const customerPhone = customerObj?.phone || order.guestInfo?.phone || "Not provided";
  const customerAccountId = customerObj?._id || "Guest Checkout";

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
  const deliveryCity = deliveryAddress.city || "Guntur";
  const deliveryPincode = deliveryAddress.pincode || "";
  const deliveryArea = deliveryAddress.address || [deliveryAddress.line2, deliveryAddress.line1].filter(Boolean).join(", ");
  const approxDistance = order.approxDistanceKm ? `${order.approxDistanceKm} km` : (order.isLongDistance ? ">30 km" : (isStorePickup ? "N/A (Pickup)" : "Location pending"));
  const deliveryCategory = order.deliveryCategory || (isStorePickup ? "store_pickup" : (order.isLongDistance ? "long_distance" : "guntur_city"));
  const deliveryStatus = order.deliveryChargeStatus || (isStorePickup ? "not_applicable" : (order.isLongDistance ? "to_be_confirmed" : "fixed"));

  const deliveryChargeText = isStorePickup
    ? "₹0 (Store Pickup)"
    : deliveryStatus === "to_be_confirmed"
    ? "To be confirmed"
    : `₹${(order.deliveryCharge ?? order.shippingFee ?? 0).toLocaleString("en-IN")}`;

  const isLongDistanceOrUnverifiable = deliveryCategory === "long_distance" || deliveryStatus === "to_be_confirmed";

  // Itemized breakdown pricing
  const subtotalCost = order.subtotal || (designCost + totalFabricCost + priorityFee);
  const deliveryChargeVal = isStorePickup || isLongDistanceOrUnverifiable ? 0 : (order.deliveryCharge ?? order.shippingFee ?? 0);
  const finalTotalAmount = order.finalPrice || order.total || order.estimatedPrice || (subtotalCost + deliveryChargeVal);

  const measurementsList = Object.entries(order.measurements || {}).filter(([, v]) => v !== null && v !== undefined && v !== "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16 space-y-6"
    >
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
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white border border-primary/15 hover:bg-primary/5 text-primary transition-colors shadow-xs"
        >
          <ChevronLeft size={16} /> Back to {isAdminView ? "Admin Dashboard" : "My Orders"}
        </button>

        {isAdminView && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent text-white uppercase tracking-wider">
            <Sparkles size={13} /> Admin View
          </span>
        )}
      </div>

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
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 text-[11px] font-semibold transition-colors"
                  title="Discuss this order on WhatsApp"
                >
                  <MessageCircle size={13} className="fill-current" /> Chat on WhatsApp
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-1.5">
            <StatusBadge status={order.status} className="text-sm px-4 py-1.5" />
            <span className="text-xs text-ink/70 font-medium">
              Order Placed: <strong className="text-primary font-semibold">{formatDate(order.createdAt)}</strong>
            </span>
          </div>
        </div>

        {/* Core Date & Payment Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 text-xs">
          <div>
            <span className="text-ink/50 block font-medium">Order Placed</span>
            <span className="font-semibold text-primary block">
              {formatDate(order.createdAt)}
            </span>
          </div>
          <div>
            <span className="text-ink/50 block font-medium">Last Updated</span>
            <span className="font-semibold text-primary block">{formatDate(order.updatedAt)}</span>
          </div>
          <div>
            <span className="text-ink/50 block font-medium">Target Delivery</span>
            <span className="font-semibold text-primary block">
              {order.expectedDeliveryDate ? formatDateShort(order.expectedDeliveryDate) : (order.estimatedDeliveryDate ? formatDateShort(order.estimatedDeliveryDate) : "Pending Review")}
            </span>
          </div>
          <div>
            <span className="text-ink/50 block font-medium">Payment Method</span>
            <span className="font-semibold text-primary uppercase block">{order.paymentMethod || "COD"}</span>
          </div>
          <div>
            <span className="text-ink/50 block font-medium">Payment Status</span>
            <span className={`font-bold capitalize block ${order.paymentStatus === "paid" ? "text-green-700" : "text-amber-700"}`}>
              {order.paymentStatus || "pending"}
            </span>
          </div>
        </div>
      </div>

      {/* ADMIN STATUS & FULFILLMENT CONTROLS (Displayed when Admin View is active) */}
      {isAdminView && (
        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAdminUpdate}
          className="bg-white rounded-2xl shadow-card p-6 border-2 border-accent/40 space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-primary/10 pb-3">
            <Scissors size={18} className="text-accent" />
            <h3 className="font-display text-base font-bold text-primary">Admin Order Controls</h3>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-primary mb-1.5">Order Status</label>
              <select
                value={adminStatus}
                onChange={(e) => setAdminStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-primary/20 text-xs font-medium text-primary bg-bg/50 outline-none focus:border-accent"
              >
                {isTailoring ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <option value="placed">Placed</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="packed">Packed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
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

            <div>
              <label className="block text-xs font-semibold text-primary mb-1.5">
                Delivery Charge (₹) {isLongDistanceOrUnverifiable && <span className="text-amber-700 font-normal">(Pending Confirmation)</span>}
              </label>
              <input
                type="number"
                min="0"
                value={adminDeliveryCharge}
                onChange={(e) => setAdminDeliveryCharge(e.target.value)}
                placeholder="e.g. 150"
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
              className="px-6 py-2.5 rounded-full bg-accent text-white font-semibold text-xs hover:bg-accent/90 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {updating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {updating ? "Saving..." : "Update Order Status"}
            </button>
          </div>
        </motion.form>
      )}

      {/* 2. CUSTOMER INFORMATION */}
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

      {/* 3. TAILORING INFORMATION & REFERENCE DESIGN (If Tailoring Order) */}
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
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isGalleryRef
                      ? "bg-accent/10 text-accent border-accent/25"
                      : "bg-primary/10 text-primary border-primary/20"
                  }`}>
                    {isGalleryRef ? "Reference Type: Design Gallery" : "Reference Type: Uploaded Image"}
                  </span>
                  {refDesign?.category && (
                    <span className="text-[10px] text-ink/50 font-medium">
                      ({typeof refDesign.category === "object" ? refDesign.category.name : refDesign.category})
                    </span>
                  )}
                </div>

                <h4 className="text-sm sm:text-base font-semibold text-primary truncate">
                  {refTitle}
                </h4>

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

          {/* Customer Measurements Grid */}
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

      {/* SHOPPING ITEMS LIST (If Shopping Order) */}
      {!isTailoring && order.items && (
        <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/10 space-y-4">
          <h3 className="font-display text-base font-semibold text-primary flex items-center gap-2 border-b border-primary/10 pb-3">
            <Package size={18} className="text-accent" /> Items Ordered
          </h3>
          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center gap-4 py-2 border-b border-primary/5 last:border-0">
                {item.image && (
                  <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover border border-primary/10 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">{item.name}</p>
                  <p className="text-xs text-ink/60">
                    {[item.size && `Size: ${item.size}`, item.color && `Color: ${item.color}`].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs text-ink/50 mt-0.5">Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-bold text-primary">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. FABRIC INFORMATION (If Tailoring Order) */}
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

      {/* 6. DELIVERY INFORMATION */}
      <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/10 space-y-4">
        <h3 className="font-display text-base font-semibold text-primary flex items-center gap-2 border-b border-primary/10 pb-3">
          <Truck size={18} className="text-accent" /> Delivery &amp; Location Details
        </h3>

        <div className="grid sm:grid-cols-2 gap-x-6">
          <InfoRow label="Delivery Method" value={isStorePickup ? "Store Pickup" : (deliveryCategory === "long_distance" ? "Long-distance delivery" : "Home Delivery")} />
          <InfoRow label="City / Town" value={deliveryCity || "—"} />
          <InfoRow label="Area / Address" value={deliveryArea || "Store Pickup"} />
          <InfoRow label="Pincode" value={deliveryPincode || "—"} />
          <InfoRow label="Approximate Distance" value={approxDistance} />
          <InfoRow label="Delivery Category" value={formatStatus(deliveryCategory)} />
          <InfoRow label="Delivery Charge Status" value={formatStatus(deliveryStatus)} />
          <InfoRow label="Delivery Charge" value={deliveryChargeText} highlight />
        </div>

        {isLongDistanceOrUnverifiable && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-900 leading-relaxed mt-2">
            <strong className="block text-amber-950 text-sm mb-1">Delivery Charge: To be confirmed</strong>
            Our team will check the delivery route for this location and confirm the delivery charge directly with the customer.
          </div>
        )}
      </div>

      {/* 7. CUSTOMER NOTES & SPECIAL INSTRUCTIONS */}
      {order.description && (
        <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/10 space-y-2">
          <h3 className="font-display text-base font-semibold text-primary flex items-center gap-2 border-b border-primary/10 pb-2">
            <FileText size={18} className="text-accent" /> Customer Notes &amp; Instructions
          </h3>
          <p className="text-xs sm:text-sm text-ink/80 leading-relaxed pt-1">{order.description}</p>
        </div>
      )}

      {/* 5. ITEMIZED PRICING BREAKDOWN (Strictly NO GST) */}
      <div className="bg-white rounded-2xl shadow-card p-6 border border-primary/10 space-y-3">
        <h3 className="font-display text-base font-semibold text-primary flex items-center gap-2 border-b border-primary/10 pb-3">
          <Receipt size={18} className="text-accent" /> Itemized Pricing Breakdown
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
            </>
          ) : (
            <>
              <InfoRow label="Items Subtotal" value={`₹${(order.subtotal || 0).toLocaleString("en-IN")}`} />
              {order.discount > 0 && <InfoRow label="Discount Applied" value={`−₹${order.discount.toLocaleString("en-IN")}`} />}
              <InfoRow label="Delivery Fee" value={deliveryChargeText} />
            </>
          )}

          <div className="flex items-center justify-between pt-4 mt-2 border-t-2 border-primary/15 text-sm sm:text-base font-bold text-primary">
            <span>Total Estimated Charge</span>
            <span className="text-accent font-display text-lg sm:text-xl">
              ₹{finalTotalAmount.toLocaleString("en-IN")}
              {isLongDistanceOrUnverifiable && <span className="text-xs font-normal text-amber-700 block text-right">+ Delivery to be confirmed</span>}
            </span>
          </div>

          <p className="text-[11px] text-ink/50 pt-1 text-right italic">
            * Lucky Couture prices do not include GST. No GST applies.
          </p>
        </div>
      </div>

      {/* Lightbox Modal for enlarged image preview */}
      <AnimatePresence>
        {lightboxImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/80 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl p-4 shadow-2xl">
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-primary text-bg hover:bg-accent transition-colors z-10"
              >
                <X size={18} />
              </button>
              <img src={lightboxImage} alt="Enlarged Reference" className="max-w-full max-h-[80vh] rounded-xl object-contain" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
