export function resolvePrimaryAddress(addresses) {
  if (!Array.isArray(addresses) || addresses.length === 0) return null;
  if (addresses.length === 1) return addresses[0];
  const explicitDefault = addresses.find((a) => a.isDefault);
  return explicitDefault || null;
}

/**
 * Format address display string for customer & order views
 *
 * @param {Object} addr - Address object containing line1/line2/locality/city/state/pincode
 * @returns {string} Formatted single-line address string
 */
export const formatDisplayAddress = (addr) => {
  if (!addr) return "";
  const parts = [
    addr.line2, // Door / Flat / House
    addr.line1 || addr.address, // Street / Road
    addr.locality, // Locality / Area
    addr.city, // City / District
    addr.state, // State
  ].filter(Boolean);

  const main = parts.join(", ");
  const pin = addr.pincode ? ` – ${addr.pincode}` : "";
  return `${main}${pin}`;
};
