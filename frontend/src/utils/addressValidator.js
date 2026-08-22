import api from "./api";

// Client-side cache for verified PIN codes
const clientPinCache = new Map();

/**
 * Validate PIN code format: 6 digits starting with 1-9
 */
export const isValidPincodeFormat = (pin) => {
  if (!pin) return false;
  const clean = String(pin).trim().replace(/\D/g, "");
  return clean.length === 6 && /^[1-9]\d{5}$/.test(clean);
};

/**
 * Look up real Indian postal data by 6-digit PIN code.
 * Calls backend API with fallback to India Post API.
 */
export const lookupIndianPincode = async (pincode) => {
  const clean = String(pincode || "").trim().replace(/\D/g, "");
  if (!isValidPincodeFormat(clean)) {
    return {
      valid: false,
      error: "Indian PIN code must be exactly 6 digits (1–9).",
    };
  }

  if (clientPinCache.has(clean)) {
    return clientPinCache.get(clean);
  }

  try {
    // 1. Query Lucky Couture backend pincode endpoint
    const response = await api.get(`/api/pincode/${clean}`);
    if (response && response.success && response.data) {
      const data = {
        valid: true,
        pincode: clean,
        city: response.data.city || response.data.district,
        district: response.data.district || response.data.city,
        state: response.data.state,
        localities: response.data.localities || [],
        postOffices: response.data.postOffices || [],
      };
      clientPinCache.set(clean, data);
      return data;
    }
  } catch (backendErr) {
    // If backend returns an explicit invalid PIN message, return it
    if (backendErr.status === 400 || (backendErr.message && backendErr.message.includes("not a valid"))) {
      const result = {
        valid: false,
        error: backendErr.message || `PIN code ${clean} is not a valid Indian postal PIN code.`,
      };
      return result;
    }

    // 2. Fallback directly to India Post public API
    try {
      const directRes = await fetch(`https://api.postalpincode.in/pincode/${clean}`);
      const parsed = await directRes.json();

      if (Array.isArray(parsed) && parsed[0]?.Status === "Success" && Array.isArray(parsed[0]?.PostOffice) && parsed[0].PostOffice.length > 0) {
        const poList = parsed[0].PostOffice;
        const data = {
          valid: true,
          pincode: clean,
          city: poList[0].District,
          district: poList[0].District,
          state: poList[0].State,
          localities: poList.map((p) => p.Name),
          postOffices: poList,
        };
        clientPinCache.set(clean, data);
        return data;
      } else {
        return {
          valid: false,
          error: `PIN code ${clean} does not exist in Indian postal data. Please enter a valid PIN code.`,
        };
      }
    } catch {
      return {
        valid: false,
        error: backendErr.message || "Unable to verify PIN code right now. Please check your internet connection.",
      };
    }
  }

  return {
    valid: false,
    error: `PIN code ${clean} is not a valid Indian postal PIN code.`,
  };
};

/**
 * Format address display string
 */
export const formatDisplayAddress = (addr) => {
  if (!addr) return "";
  const parts = [
    addr.line2, // Door / Flat / House
    addr.line1, // Street / Road
    addr.locality, // Locality / Area
    addr.city, // City / District
    addr.state, // State
  ].filter(Boolean);

  const main = parts.join(", ");
  const pin = addr.pincode ? ` – ${addr.pincode}` : "";
  return `${main}${pin}`;
};
