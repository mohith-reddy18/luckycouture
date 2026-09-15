/**
 * Centralized Status Color, Label, and Formatting Utilities for Lucky Couture.
 * Single source of truth for Order statuses, Tailoring statuses, and Payment statuses.
 */

export const statusColors = {
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
  delivered: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
  returned: "bg-rose-100 text-rose-800 border-rose-200",
};

export const paymentStatusColors = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  partially_paid: "bg-blue-100 text-blue-800 border-blue-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  refunded: "bg-rose-100 text-rose-800 border-rose-200",
  partially_refunded: "bg-orange-100 text-orange-800 border-orange-200",
  failed: "bg-red-100 text-red-800 border-red-200",
};

export const statusLabels = {
  placed: "Order Placed",
  confirmed: "Order Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  returned: "Returned",
  pending_payment: "Payment Pending",
  pending: "Pending",
  partially_paid: "30% Paid",
  fabric_received: "Fabric Received",
  cutting: "Cutting",
  stitching: "Stitching",
  quality_check: "Quality Check",
  ready_for_pickup: "Ready for Pickup",
  rejected: "Order Rejected",
};

export const formatStatus = (s) =>
  statusLabels[s] || (s ? String(s).replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Unknown");

export const formatStatusTitle = (s) =>
  s ? String(s).replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Unknown";

export const getStatusBadgeClass = (status, fallback = "bg-gray-100 text-gray-700 border-gray-200") =>
  statusColors[status] || fallback;

export const getPaymentStatusBadgeClass = (status, fallback = "bg-gray-100 text-gray-700 border-gray-200") =>
  paymentStatusColors[status] || fallback;
