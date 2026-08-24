/**
 * Delivery Pricing Utility for Lucky Couture
 *
 * Store Location: Lakshmi Designers, Guntur
 * Coordinates: 16.3218581, 80.4362961
 * Address: Muthyalareddy Nagar Main Road, Amaravathi Road, Guntur 522007
 */

const STORE_LOCATION = Object.freeze({
  name: "Lakshmi Designers, Guntur",
  address: "Muthyalareddy Nagar Main Road, Amaravathi Road, Guntur 522007",
  pincode: "522007",
  city: "Guntur",
  state: "Andhra Pradesh",
  country: "India",
  lat: 16.3218581,
  lng: 80.4362961,
});

const MAX_SHORT_DISTANCE_KM = 20.0;

/**
 * Progressive Short-Distance Delivery Fee Calculation
 *
 * Slabs (Distance d in km):
 * 1. 0.0 – 1.0 km  → Fee = 10 * 2^d (Min: ₹10, at 1.0 km = ₹20.00)
 * 2. 1.0 – 5.0 km  → Fee = 20 + (d - 1.0) * 7.0 (at 5.0 km = ₹48.00)
 * 3. 5.0 – 10.0 km → Fee = 48 + (d - 5.0) * 4.0 (at 10.0 km = ₹68.00)
 * 4. 10.0 – 15.0 km → Fee = 68 + (d - 10.0) * 4.50 (at 15.0 km = ₹90.50)
 * 5. 15.0 – 20.0 km → Fee = 90.50 + (d - 15.0) * 3.0 (at 15.5 km = ₹92.00, at 20.0 km = ₹105.50)
 *
 * Distance is never rounded before slab computation.
 * Final monetary amount is rounded to 2 decimal places.
 *
 * @param {number} distanceKm - Exact road distance in kilometres
 * @returns {number|null} Delivery fee in INR or null if > 20 km
 */
function calculateShortDistanceDeliveryFee(distanceKm) {
  const d = Number(distanceKm);
  if (isNaN(d) || d < 0) return 0;
  if (d > MAX_SHORT_DISTANCE_KM) return null; // Long-distance delivery

  let fee = 0;
  if (d <= 1.0) {
    fee = 10 * Math.pow(2, d);
  } else if (d <= 5.0) {
    fee = 20 + (d - 1.0) * 7.0;
  } else if (d <= 10.0) {
    fee = 48 + (d - 5.0) * 4.0;
  } else if (d <= 15.0) {
    fee = 68 + (d - 10.0) * 4.5;
  } else {
    fee = 90.5 + (d - 15.0) * 3.0;
  }

  return Math.round(fee * 100) / 100;
}

module.exports = {
  STORE_LOCATION,
  MAX_SHORT_DISTANCE_KM,
  calculateShortDistanceDeliveryFee,
};
