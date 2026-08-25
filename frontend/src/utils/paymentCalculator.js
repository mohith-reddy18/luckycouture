/**
 * Authoritative Payment & Financial Calculation Engine for Lucky Couture (Frontend).
 * Single source of truth for Shopping Orders and Tailoring Orders.
 */

/**
 * Calculates authoritative financial state for an order.
 *
 * @param {Object} order - Raw or normalized order object
 * @returns {Object} Calculated financial breakdown
 */
export function calculateOrderFinancials(order) {
  if (!order) {
    return {
      totalAmount: 0,
      advanceRequired: 0,
      totalPaid: 0,
      amountPaid: 0,
      advancePaid: 0,
      remainingBalance: 0,
      amountDue: 0,
      isAdvancePaid: false,
      isFullyPaid: false,
      isPartiallyPaid: false,
      isPendingAdvance: true,
      paymentStatus: "pending",
      paymentPercentage: 0,
    };
  }

  const totalAmount = Math.round(
    Number(
      order.totalAmount ??
      order.finalPrice ??
      order.estimatedPrice ??
      order.total ??
      0
    ) * 100
  ) / 100;

  const advanceRequired = Math.round(totalAmount * 0.30);

  // Deduplicate and aggregate verified/captured payments strictly from ledger if available
  let totalPaid = 0;
  if (Array.isArray(order.payments) && order.payments.length > 0) {
    const seenPaymentIds = new Set();
    for (const p of order.payments) {
      const isSuccess =
        p.status === "captured" ||
        p.status === "success" ||
        p.status === "paid" ||
        (!p.status && (p.paymentMethod === "cash" || p.paymentMethod === "pos" || p.paymentMethod === "razorpay"));
      if (!isSuccess) continue;

      const pId = String(p.razorpayPaymentId || p.paymentId || p.transactionId || p._id || "").trim();
      if (pId) {
        if (seenPaymentIds.has(pId)) continue;
        seenPaymentIds.add(pId);
      }

      totalPaid += Number(p.amount || 0);
    }
  } else {
    // If no payments ledger, strictly use verified amountPaid (or full total if paymentStatus is explicitly "paid")
    // NEVER fall back to unverified advancePaid field!
    totalPaid = Number(
      order.amountPaid != null && order.amountPaid !== ""
        ? order.amountPaid
        : (order.paymentStatus === "paid" ? totalAmount : 0)
    );
  }

  totalPaid = Math.round(Math.max(0, totalPaid) * 100) / 100;
  const advancePaid = Math.min(totalPaid, advanceRequired);
  const remainingBalance = Math.max(0, Math.round((totalAmount - totalPaid) * 100) / 100);
  const amountDue = remainingBalance;

  const isFullyPaid = totalAmount > 0 ? (totalPaid >= totalAmount && remainingBalance === 0) : true;
  const isAdvancePaid = advanceRequired > 0 ? (totalPaid >= advanceRequired) : isFullyPaid;
  const isPartiallyPaid = !isFullyPaid && totalPaid > 0;
  const isPendingAdvance = !isFullyPaid && totalPaid < advanceRequired;

  const paymentStatus = isFullyPaid
    ? "paid"
    : (totalPaid > 0 ? "partially_paid" : "pending");

  const paymentPercentage = totalAmount > 0
    ? Math.min(100, Math.max(0, Math.round((totalPaid / totalAmount) * 100)))
    : (isFullyPaid ? 100 : 0);

  return {
    totalAmount,
    advanceRequired,
    totalPaid,
    amountPaid: totalPaid,
    advancePaid,
    remainingBalance,
    amountDue,
    isAdvancePaid,
    isFullyPaid,
    isPartiallyPaid,
    isPendingAdvance,
    paymentStatus,
    paymentPercentage,
  };
}

/**
 * Validates order completion rules according to strict 3-tier payment validation.
 *
 * Case A — 30% advance not paid (advancePaid < advanceRequired)
 * Case B — 30% advance paid, but remaining balance is unpaid (totalPaid < totalAmount)
 * Case C — 100% full payment received (totalPaid >= totalAmount)
 *
 * @param {Object} order
 * @returns {Object} { canComplete: boolean, reason: string|null, message: string|null, financials: Object }
 */
export function validateOrderCompletion(order) {
  const fin = calculateOrderFinancials(order);

  // Case A: 30% Advance not paid
  if (!fin.isAdvancePaid || fin.totalPaid < fin.advanceRequired) {
    return {
      canComplete: false,
      reason: "advance_unpaid",
      message: "Cannot complete order. The required 30% advance payment has not been received.",
      financials: fin,
    };
  }

  // Case B: 30% Advance paid, but remaining balance unpaid
  if (!fin.isFullyPaid || fin.totalPaid < fin.totalAmount || fin.remainingBalance > 0) {
    return {
      canComplete: false,
      reason: "balance_unpaid",
      message: `30% advance received. Remaining balance of ₹${fin.remainingBalance.toLocaleString("en-IN")} is still unpaid.`,
      financials: fin,
    };
  }

  // Case C: Full Payment Received
  return {
    canComplete: true,
    reason: null,
    message: null,
    financials: fin,
  };
}
