import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft, Package, Scissors, MapPin, CreditCard, Clock,
  CheckCircle2, AlertCircle, Loader2, Receipt, Truck,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import api from "../utils/api";

// ─── helpers ──────────────────────────────────────────────────────────────
const statusColors = {
  placed:           "bg-blue-100 text-blue-800 border-blue-200",
  confirmed:        "bg-indigo-100 text-indigo-800 border-indigo-200",
  packed:           "bg-purple-100 text-purple-800 border-purple-200",
  shipped:          "bg-cyan-100 text-cyan-800 border-cyan-200",
  delivered:        "bg-green-100 text-green-800 border-green-200",
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

const paymentStatusColors = {
  pending:  "bg-amber-50 text-amber-700 border-amber-200",
  paid:     "bg-green-50 text-green-700 border-green-200",
  failed:   "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-blue-50 text-blue-700 border-blue-200",
};

const formatStatus = (s) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Unknown";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-primary/5 last:border-0">
      <span className="text-sm text-ink/55 shrink-0">{label}</span>
      <span className={`text-sm font-medium text-primary text-right ${mono ? "font-mono tracking-wide" : ""}`}>
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

// ─── Shopping order detail ─────────────────────────────────────────────────
function ShoppingDetail({ order }) {
  const GST_RATE = 0.05; // 5% GST — only show if tax > 0
  return (
    <div className="space-y-6">
      {/* Items */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <h3 className="font-display text-base font-semibold text-primary mb-4 flex items-center gap-2">
          <Package size={16} className="text-accent" /> Items Ordered
        </h3>
        <div className="space-y-4">
          {order.items?.map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              {item.image && (
                <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-primary/10" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary">{item.name}</p>
                <p className="text-xs text-ink/55 mt-0.5">
                  {[item.size && `Size: ${item.size}`, item.color && `Color: ${item.color}`].filter(Boolean).join(" · ")}
                </p>
                <p className="text-xs text-ink/50 mt-0.5">Qty: {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-primary shrink-0">
                ₹{(item.price * item.quantity).toLocaleString("en-IN")}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <h3 className="font-display text-base font-semibold text-primary mb-4 flex items-center gap-2">
          <Receipt size={16} className="text-accent" /> Price Breakdown
        </h3>
        <div>
          <InfoRow label="Subtotal" value={`₹${order.subtotal?.toLocaleString("en-IN") ?? "—"}`} />
          {order.discount > 0 && <InfoRow label="Discount" value={`−₹${order.discount.toLocaleString("en-IN")}`} />}
          <InfoRow label="Shipping" value={order.shippingFee === 0 ? "Free" : `₹${order.shippingFee?.toLocaleString("en-IN")}`} />
          {order.tax > 0 && <InfoRow label={`GST (${Math.round(GST_RATE * 100)}%)`} value={`₹${order.tax.toLocaleString("en-IN")}`} />}
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-primary/10">
            <span className="font-semibold text-primary">Total</span>
            <span className="font-bold text-primary text-lg">₹{order.total?.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      {order.shippingAddress && (
        <div className="bg-white rounded-2xl shadow-card p-6">
          <h3 className="font-display text-base font-semibold text-primary mb-3 flex items-center gap-2">
            <MapPin size={16} className="text-accent" /> Shipping Address
          </h3>
          <p className="text-sm text-ink/70 leading-relaxed">
            {[order.shippingAddress.line2, order.shippingAddress.line1,
              order.shippingAddress.city, order.shippingAddress.state,
              order.shippingAddress.pincode].filter(Boolean).join(", ")}
          </p>
          {order.shippingAddress.phone && (
            <p className="text-sm text-ink/55 mt-1">Phone: {order.shippingAddress.phone}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tailoring order detail ────────────────────────────────────────────────
function TailoringDetail({ order }) {
  const measurements = Object.entries(order.measurements || {}).filter(([, v]) => v);
  return (
    <div className="space-y-6">
      {/* Garment info */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <h3 className="font-display text-base font-semibold text-primary mb-4 flex items-center gap-2">
          <Scissors size={16} className="text-accent" /> Garment Details
        </h3>
        <InfoRow label="Garment type"     value={order.garmentType} />
        {order.customGarment && <InfoRow label="Custom garment" value={order.customGarment} />}
        <InfoRow label="Design complexity" value={formatStatus(order.designComplexity)} />
        <InfoRow label="Fabric"           value={order.fabricSource === "customer_provided" ? "Customer-provided" : "Shop-provided"} />
        {order.fabricDropoffDate && <InfoRow label="Fabric drop-off" value={formatDate(order.fabricDropoffDate)} />}
        {order.preferredMaterial && <InfoRow label="Material"       value={order.preferredMaterial} />}
        {order.description && (
          <div className="pt-2.5">
            <p className="text-xs text-ink/50 mb-1">Special instructions</p>
            <p className="text-sm text-ink/75 leading-relaxed">{order.description}</p>
          </div>
        )}
      </div>

      {/* Measurements */}
      {measurements.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-6">
          <h3 className="font-display text-base font-semibold text-primary mb-4">Measurements</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {measurements.map(([key, val]) => (
              <div key={key} className="bg-bg rounded-xl p-3 text-center">
                <p className="text-[10px] text-ink/50 capitalize mb-0.5">{key.replace(/_/g, " ")}</p>
                <p className="text-sm font-semibold text-primary">{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <h3 className="font-display text-base font-semibold text-primary mb-4 flex items-center gap-2">
          <Receipt size={16} className="text-accent" /> Pricing
        </h3>
        {order.estimatedPrice && <InfoRow label="Estimated price" value={`₹${order.estimatedPrice.toLocaleString("en-IN")}`} />}
        {order.finalPrice && (
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-primary/10">
            <span className="font-semibold text-primary">Final price</span>
            <span className="font-bold text-primary text-lg">₹{order.finalPrice.toLocaleString("en-IN")}</span>
          </div>
        )}
        {!order.estimatedPrice && !order.finalPrice && (
          <p className="text-sm text-ink/50">Pricing will be confirmed after review.</p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function OrderDetail() {
  const { type, id } = useParams(); // type = "shopping" | "tailoring"
  const navigate = useNavigate();
  const { user, authLoading } = useApp();

  const [order, setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }

    const endpoint = type === "tailoring" ? `/api/tailoring/${id}` : `/api/orders/${id}`;
    api.get(endpoint)
      .then((res) => { setOrder(res.data); setLoading(false); })
      .catch((err) => { setError(err.message || "Could not load order"); setLoading(false); });
  }, [id, type, user, authLoading, navigate]);

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
        <h1 className="font-display text-xl font-semibold text-primary mb-2">Order not found</h1>
        <p className="text-sm text-ink/60 mb-8">{error || "This order doesn't exist or you don't have access to it."}</p>
        <Link to="/orders" className="inline-block bg-primary text-bg px-7 py-3 rounded-full font-medium hover:bg-primary/90">
          Back to Orders
        </Link>
      </div>
    );
  }

  const isTailoring = type === "tailoring";
  const orderId  = order.orderId || order._id;
  const status   = order.status;
  const paymentStatus = order.paymentStatus;
  const paymentMethod = order.paymentMethod;
  const createdAt = formatDate(order.createdAt);
  const scheduledDate = order.scheduledDate ? formatDate(order.scheduledDate) : null;
  const expectedDelivery = order.expectedDeliveryDate
    ? formatDate(order.expectedDeliveryDate)
    : null;
  const statusHistory = order.statusHistory || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto px-5 md:px-8 py-12 md:py-20"
    >
      {/* Back */}
      <button
        onClick={() => navigate("/orders")}
        className="flex items-center gap-1.5 text-sm text-ink/60 hover:text-primary transition-colors mb-8"
      >
        <ChevronLeft size={16} /> Back to Orders
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-card p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-ink/40 mb-1">
              {isTailoring ? "Tailoring Order" : "Shopping Order"}
            </p>
            <h1 className="font-display text-2xl font-bold text-primary">
              {isTailoring ? (order.garmentType || "Tailoring Order") : "Shopping Order"}
            </h1>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="grid sm:grid-cols-2 gap-0">
          <InfoRow label="Order ID" value={orderId} mono />
          <InfoRow label="Placed on" value={createdAt} />
          {paymentStatus && (
            <div className="flex items-start justify-between gap-4 py-2.5 border-b border-primary/5">
              <span className="text-sm text-ink/55">Payment</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${paymentStatusColors[paymentStatus] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                {formatStatus(paymentStatus)}
              </span>
            </div>
          )}
          {paymentMethod && <InfoRow label="Payment method" value={paymentMethod.toUpperCase()} />}
          {scheduledDate && <InfoRow label="Scheduled date" value={scheduledDate} />}
          {expectedDelivery && (
            <InfoRow label="Expected delivery" value={expectedDelivery} />
          )}
        </div>
      </div>

      {/* Type-specific details */}
      {isTailoring ? <TailoringDetail order={order} /> : <ShoppingDetail order={order} />}

      {/* Status history */}
      {statusHistory.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-6 mt-6">
          <h3 className="font-display text-base font-semibold text-primary mb-4 flex items-center gap-2">
            <Clock size={16} className="text-accent" /> Status History
          </h3>
          <ol className="relative border-l border-primary/15 space-y-4 pl-5">
            {[...statusHistory].reverse().map((h, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[22px] top-0.5 w-3 h-3 rounded-full bg-white border-2 border-accent" />
                <p className="text-sm font-medium text-primary">{formatStatus(h.status)}</p>
                <p className="text-xs text-ink/50 mt-0.5">{formatDate(h.changedAt)}</p>
                {h.note && <p className="text-xs text-ink/60 mt-1 italic">{h.note}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </motion.div>
  );
}
