/**
 * Progressive Platform Fee Calculator for Lucky Couture
 *
 * Business Rules:
 * - Lucky Couture is currently NOT GST-registered.
 * - Do NOT add GST separately to the customer's Platform Fee.
 * - Do NOT show Razorpay's GST as customer GST.
 * - Customer-facing charge is strictly called "Platform Fee".
 *
 * Progressive Tier Calculation:
 * - First ₹1,000 portion (₹0 – ₹1,000)          → 2.013% (0.02013)
 * - ₹1,001–₹5,000 portion (next up to ₹4,000)   → 1.013% (0.01013)
 * - ₹5,001–₹10,000 portion (next up to ₹5,000)  → 0.763% (0.00763)
 * - ₹10,001–₹25,000 portion (next up to ₹15,000)→ 0.517% (0.00517)
 * - Above ₹25,000 portion (everything beyond)   → 0.263% (0.00263)
 *
 * @param {number|string} amount - Order base amount (subtotal - discount + shippingFee / deliveryCharge)
 * @returns {number} Calculated Platform Fee in INR rounded to 2 decimal places
 */
export const MIN_PLATFORM_FEE = 8.13;

export function calculatePlatformFee(amount) {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) return 0;

  let fee = 0;
  let remaining = num;

  // 1. Tier 1: First ₹1,000 (0 to 1,000) → 2.013%
  const tier1 = Math.min(remaining, 1000);
  fee += tier1 * 0.02013;
  remaining -= tier1;

  // 2. Tier 2: ₹1,001–₹5,000 (next up to 4,000) → 1.013%
  if (remaining > 0) {
    const tier2 = Math.min(remaining, 4000);
    fee += tier2 * 0.01013;
    remaining -= tier2;
  }

  // 3. Tier 3: ₹5,001–₹10,000 (next up to 5,000) → 0.763%
  if (remaining > 0) {
    const tier3 = Math.min(remaining, 5000);
    fee += tier3 * 0.00763;
    remaining -= tier3;
  }

  // 4. Tier 4: ₹10,001–₹25,000 (next up to 15,000) → 0.517%
  if (remaining > 0) {
    const tier4 = Math.min(remaining, 15000);
    fee += tier4 * 0.00517;
    remaining -= tier4;
  }

  // 5. Tier 5: Above ₹25,000 portion → 0.263%
  if (remaining > 0) {
    fee += remaining * 0.00263;
  }

  // Apply non-rounded base/minimum platform fee (approx ₹8)
  const finalFee = Math.max(fee, MIN_PLATFORM_FEE);

  // Round to 2 decimal places for INR currency
  return Math.round(finalFee * 100) / 100;
}
