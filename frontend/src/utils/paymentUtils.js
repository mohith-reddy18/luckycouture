/**
 * Presentation and sanitization helpers for payment metadata in Lucky Couture.
 * NOTE: This file does NOT perform financial calculations or modify financial records.
 */

/**
 * Cleans internal admin attribution annotations from payment notes for clean customer/receipt presentation.
 * E.g. "Advance paid by Admin (Admin Note)" -> "Advance paid"
 *
 * @param {string|any} note - Raw payment note string
 * @returns {string} Sanitized display note
 */
export function cleanPaymentNote(note) {
  if (!note) return "";
  return String(note).replace(/\s+by Admin\s*\([^)]*\)/gi, "").trim();
}
