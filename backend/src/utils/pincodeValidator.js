const https = require("https");

// In-memory cache for verified Indian postal PIN codes (TTL: 24 hours)
const pincodeCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Clean and normalize text for comparison
 */
const normalizeText = (text) => {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
};

/**
 * Fetch PIN code details from India Post API
 */
const fetchFromIndiaPostApi = (pincode) => {
  return new Promise((resolve, reject) => {
    const req = https.get(
      `https://api.postalpincode.in/pincode/${pincode}`,
      { timeout: 5000 },
      (res) => {
        let rawData = "";
        res.on("data", (chunk) => (rawData += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve(parsed);
          } catch (err) {
            reject(new Error("Failed to parse postal API response"));
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Postal verification service timed out. Please try again."));
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
};

/**
 * Validate and fetch details for an Indian postal PIN code.
 */
const fetchPincodeDetails = async (pincode) => {
  if (!pincode || typeof pincode !== "string") {
    return { valid: false, error: "PIN code is required." };
  }

  const cleanPin = pincode.trim().replace(/\D/g, "");

  // Format Check: Exactly 6 digits starting with 1-9
  if (cleanPin.length !== 6 || !/^[1-9]\d{5}$/.test(cleanPin)) {
    return {
      valid: false,
      error: "Indian PIN code must be exactly 6 digits starting with a digit between 1 and 9.",
    };
  }

  // Check cache
  const cached = pincodeCache.get(cleanPin);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const response = await fetchFromIndiaPostApi(cleanPin);

    if (!Array.isArray(response) || response.length === 0) {
      return { valid: false, error: "Invalid response from postal verification service." };
    }

    const firstResult = response[0];

    if (firstResult.Status !== "Success" || !Array.isArray(firstResult.PostOffice) || firstResult.PostOffice.length === 0) {
      const errorMsg = firstResult.Message === "No records found"
        ? `PIN code ${cleanPin} is not a valid Indian postal PIN code.`
        : (firstResult.Message || "Please enter a valid Indian PIN code.");
      return { valid: false, error: errorMsg };
    }

    const postOffices = firstResult.PostOffice.map((po) => ({
      name: po.Name,
      branchType: po.BranchType,
      deliveryStatus: po.DeliveryStatus,
      district: po.District,
      division: po.Division,
      region: po.Region,
      block: po.Block,
      state: po.State,
      country: po.Country || "India",
      pincode: po.Pincode || cleanPin,
    }));

    const primaryPO = postOffices[0];
    const resultData = {
      valid: true,
      pincode: cleanPin,
      district: primaryPO.district,
      city: primaryPO.district,
      state: primaryPO.state,
      country: "India",
      localities: postOffices.map((po) => po.name),
      postOffices,
    };

    // Cache successful result
    pincodeCache.set(cleanPin, { timestamp: Date.now(), data: resultData });

    return resultData;
  } catch (err) {
    console.error(`[PINCODE VALIDATION ERROR] for ${cleanPin}:`, err.message);
    return {
      valid: false,
      error: "Postal verification service is temporarily unavailable. Please retry shortly.",
      isServiceUnavailable: true,
    };
  }
};

/**
 * Validate full Indian address integrity (PIN ↔ City/District ↔ State ↔ Country)
 */
const validateAddressIntegrity = async (address) => {
  if (!address || typeof address !== "object") {
    return { valid: false, error: "Address details are required." };
  }

  const { country = "India", pincode, city, state, locality, line1 } = address;

  // 1. Country validation
  const normCountry = normalizeText(country);
  if (normCountry && !["india", "ind", "in"].includes(normCountry)) {
    return { valid: false, error: "Only Indian delivery addresses are supported at this time." };
  }

  // 2. Street / Road validation
  if (!line1 || !line1.trim()) {
    return { valid: false, error: "Street / Road address is required." };
  }

  // 3. PIN code verification against real postal records
  const pinDetails = await fetchPincodeDetails(pincode);
  if (!pinDetails.valid) {
    return { valid: false, error: pinDetails.error || "Please enter a valid Indian postal PIN code." };
  }

  // 4. State validation
  if (state && state.trim()) {
    const inputStateNorm = normalizeText(state);
    const pinStateNorm = normalizeText(pinDetails.state);

    const isStateMatch =
      inputStateNorm === pinStateNorm ||
      inputStateNorm.includes(pinStateNorm) ||
      pinStateNorm.includes(inputStateNorm);

    if (!isStateMatch) {
      return {
        valid: false,
        error: `PIN code ${pincode} belongs to ${pinDetails.state}, but you selected ${state}. Please select the matching state.`,
      };
    }
  }

  // 5. City / District validation
  if (city && city.trim()) {
    const inputCityNorm = normalizeText(city);
    const pinDistrictNorm = normalizeText(pinDetails.district);
    const postOfficeNamesNorm = pinDetails.localities.map(normalizeText);

    const isCityMatch =
      inputCityNorm === pinDistrictNorm ||
      pinDistrictNorm.includes(inputCityNorm) ||
      inputCityNorm.includes(pinDistrictNorm) ||
      postOfficeNamesNorm.some((po) => po === inputCityNorm || po.includes(inputCityNorm) || inputCityNorm.includes(po));

    if (!isCityMatch) {
      return {
        valid: false,
        error: `PIN code ${pincode} belongs to ${pinDetails.district} district (${pinDetails.state}), not ${city}. Please verify your city.`,
      };
    }
  }

  // 6. Locality validation (if provided)
  if (locality && locality.trim()) {
    const inputLocalityNorm = normalizeText(locality);
    const postOfficeNamesNorm = pinDetails.localities.map(normalizeText);

    const localityMatched = postOfficeNamesNorm.some(
      (po) => po === inputLocalityNorm || po.includes(inputLocalityNorm) || inputLocalityNorm.includes(po)
    );

    // If not matching postal list directly, we record the locality as user-specified area under this PIN
    return {
      valid: true,
      data: {
        country: "India",
        pincode: pinDetails.pincode,
        city: city?.trim() || pinDetails.district,
        district: pinDetails.district,
        state: pinDetails.state,
        locality: locality.trim(),
        localityVerified: localityMatched,
      },
    };
  }

  return {
    valid: true,
    data: {
      country: "India",
      pincode: pinDetails.pincode,
      city: city?.trim() || pinDetails.district,
      district: pinDetails.district,
      state: pinDetails.state,
    },
  };
};

module.exports = {
  fetchPincodeDetails,
  validateAddressIntegrity,
};
