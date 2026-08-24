/**
 * Delivery Pricing Utility for Lucky Couture (Frontend)
 *
 * Store Location: Lakshmi Designers, Guntur
 * Coordinates: 16.3218581, 80.4362961
 * Address: Muthyalareddy Nagar Main Road, Amaravathi Road, Guntur 522007
 */

export const STORE_LOCATION = Object.freeze({
  name: "Lakshmi Designers, Guntur",
  address: "Muthyalareddy Nagar Main Road, Amaravathi Road, Guntur 522007",
  pincode: "522007",
  city: "Guntur",
  state: "Andhra Pradesh",
  country: "India",
  lat: 16.3218581,
  lng: 80.4362961,
});

export const STORE_LOCATION_VERSION = "lakshmi_designers_v1";
export const MAX_SHORT_DISTANCE_KM = 20.0;

/**
 * Fixed Long-Distance Delivery Configuration
 *
 * Within Andhra Pradesh (>= 20 km):
 * - Fixed customer delivery charge: ₹120.00
 * - Estimated delivery window: 4–7 days (estimate, not a guarantee)
 *
 * Outside Andhra Pradesh (>= 20 km):
 * - Fixed customer delivery charge: ₹160.00
 * - Estimated delivery window: 10+ days (estimate, not a guarantee)
 */
export const LONG_DISTANCE_CONFIG = Object.freeze({
  withinAP: {
    deliveryFee: 120.0,
    estimatedDaysText: "4–7 days",
    estimatedDeliveryText: "Estimated delivery: 4–7 days",
    minDays: 4,
    maxDays: 7,
  },
  outsideAP: {
    deliveryFee: 160.0,
    estimatedDaysText: "10+ days",
    estimatedDeliveryText: "Estimated delivery: 10+ days",
    minDays: 10,
    maxDays: null,
  },
});

/**
 * Check if the verified location / PIN belongs to Andhra Pradesh
 *
 * @param {string} state - Verified state name
 * @param {string} pincode - Verified 6-digit Indian postal PIN code
 * @returns {boolean}
 */
export function isAndhraPradeshState(state, pincode) {
  const cleanPin = String(pincode || "").trim();
  const normState = state ? String(state).toLowerCase().replace(/[^a-z]/g, "") : "";

  if (normState.includes("telangana") || cleanPin.startsWith("50")) {
    return false;
  }

  if (cleanPin.startsWith("51") || cleanPin.startsWith("52") || cleanPin.startsWith("53")) {
    return true;
  }

  return normState.includes("andhra") || normState === "ap";
}

/**
 * Calculate Progressive Short-Distance Delivery Fee
 *
 * Slabs (Distance d in km):
 * 1. 0.0 – 1.0 km   → Fee = 10 * 2^d (Min: ₹10.00, at 1.0 km = ₹20.00)
 * 2. 1.0 – 5.0 km   → Fee = 20 + (d - 1.0) * 7.0 (at 5.0 km = ₹48.00)
 * 3. 5.0 – 10.0 km  → Fee = 48 + (d - 5.0) * 4.0 (at 10.0 km = ₹68.00)
 * 4. 10.0 – 15.0 km → Fee = 68 + (d - 10.0) * 5.0 (at 15.0 km = ₹93.00)
 * 5. 15.0 – <20 km  → Fee = 93 + (d - 15.0) * 5.40 (at 15.5 km = ₹95.70, at 19.5 km = ₹117.30)
 * 6. >= 20.0 km     → Long Distance (null)
 *
 * @param {number} distanceKm - Exact road distance in kilometres
 * @returns {number|null} Delivery fee in INR or null if >= 20 km
 */
export function calculateShortDistanceDeliveryFee(distanceKm) {
  const d = Number(distanceKm);
  if (isNaN(d) || d < 0) return 0;
  if (d >= MAX_SHORT_DISTANCE_KM) return null;

  let fee = 0;
  if (d <= 1.0) {
    fee = 10 * Math.pow(2, d);
  } else if (d <= 5.0) {
    fee = 20 + (d - 1.0) * 7.0;
  } else if (d <= 10.0) {
    fee = 48 + (d - 5.0) * 4.0;
  } else if (d <= 15.0) {
    fee = 68 + (d - 10.0) * 5.0;
  } else {
    fee = 93 + (d - 15.0) * 5.40;
  }

  return Math.round(fee * 100) / 100;
}

/**
 * Calculate Delivery Details for Short & Long Distance
 *
 * @param {object} params - { roadDistanceKm, state, pincode, city }
 * @returns {object} Comprehensive delivery calculation result
 */
export function calculateDeliveryDetails({ roadDistanceKm, state, pincode, city }) {
  const d = roadDistanceKm != null && !isNaN(Number(roadDistanceKm)) ? Number(roadDistanceKm) : null;
  const isAP = isAndhraPradeshState(state, pincode);

  if (d !== null && d < MAX_SHORT_DISTANCE_KM) {
    const fee = calculateShortDistanceDeliveryFee(d);
    return {
      isShortDistance: true,
      isLongDistance: false,
      isAndhraPradesh: true,
      deliveryZone: "short_distance",
      roadDistanceKm: d,
      deliveryFee: fee,
      deliveryFeeText: `₹${fee.toFixed(2)}`,
      estimatedDaysText: "1–2 days",
      estimatedDeliveryText: "Estimated delivery: Same day / Next day",
      notice: null,
    };
  }

  if (isAP) {
    const fee = LONG_DISTANCE_CONFIG.withinAP.deliveryFee;
    return {
      isShortDistance: false,
      isLongDistance: true,
      isAndhraPradesh: true,
      deliveryZone: "long_distance_ap",
      roadDistanceKm: d,
      deliveryFee: fee,
      deliveryFeeText: `₹${fee.toFixed(2)}`,
      estimatedDaysText: LONG_DISTANCE_CONFIG.withinAP.estimatedDaysText,
      estimatedDeliveryText: LONG_DISTANCE_CONFIG.withinAP.estimatedDeliveryText,
      notice: "Estimated delivery: 4–7 days (Andhra Pradesh)",
    };
  } else {
    const fee = LONG_DISTANCE_CONFIG.outsideAP.deliveryFee;
    return {
      isShortDistance: false,
      isLongDistance: true,
      isAndhraPradesh: false,
      deliveryZone: "long_distance_outside_ap",
      roadDistanceKm: d,
      deliveryFee: fee,
      deliveryFeeText: `₹${fee.toFixed(2)}`,
      estimatedDaysText: LONG_DISTANCE_CONFIG.outsideAP.estimatedDaysText,
      estimatedDeliveryText: LONG_DISTANCE_CONFIG.outsideAP.estimatedDeliveryText,
      notice: "Estimated delivery: 10+ days (Outside Andhra Pradesh)",
    };
  }
}
