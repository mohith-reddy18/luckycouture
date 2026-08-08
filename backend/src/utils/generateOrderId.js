/**
 * generateOrderId
 *
 * Produces a 15-digit, numbers-only, cryptographically-secure order ID.
 * Uses Node's crypto module (not Math.random) so the output is
 * unpredictable and safe for customer-facing references.
 *
 * Collision probability with 10^15 possible values is negligible, but the
 * callers in orderController / tailoringController apply a database-level
 * uniqueness retry loop for correctness at scale.
 *
 * The same function is used for BOTH shopping orders AND tailoring orders,
 * guaranteeing a single, globally-consistent format across order types.
 * MongoDB _id is kept unchanged and is never returned as the customer ID.
 */

const crypto = require("crypto");

/**
 * Returns a random 15-digit decimal string, e.g. "382941750293847".
 * First digit is always 1–9 so there are no leading zeros.
 */
function generateOrderId() {
  // 8 random bytes → 16 hex chars → parse as BigInt → take mod to fit 15 decimal digits
  // We want a number in [100_000_000_000_000, 999_999_999_999_999].
  // Simple approach: generate 8 bytes, read as unsigned 64-bit, scale into range.
  const buf = crypto.randomBytes(8);
  const uint64 = buf.readBigUInt64BE(0);

  const MIN = 100_000_000_000_000n; // 10^14 — ensures 15 digits, no leading zero
  const MAX = 999_999_999_999_999n; // 10^15 - 1
  const RANGE = MAX - MIN + 1n;     // 9 * 10^14 possible values

  const id = MIN + (uint64 % RANGE);
  return id.toString();
}

module.exports = { generateOrderId };
