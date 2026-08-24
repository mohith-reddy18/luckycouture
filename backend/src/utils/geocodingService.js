const https = require("https");
const http = require("http");
const { STORE_LOCATION, calculateShortDistanceDeliveryFee, MAX_SHORT_DISTANCE_KM } = require("./deliveryPricing");

// 24-hour in-memory cache for geocoded addresses and routes
const geocodeCache = new Map();
const routeCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const USER_AGENT = "LuckyCouture-DeliveryService/1.0 (contact@luckycouture.in)";

/**
 * Clean and normalize text for comparison
 */
function normalizeText(text) {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Standard HTTP GET helper with User-Agent and timeout
 */
function httpGet(url, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        timeout: timeoutMs,
      },
      (res) => {
        let rawData = "";
        res.on("data", (chunk) => (rawData += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve(parsed);
          } catch (e) {
            resolve(rawData);
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Clean street line to extract geocodable road/locality terms
 * (e.g. "D.No 12-4-56, Muthyalareddy Nagar, Amaravathi Road" -> "Muthyalareddy Nagar, Amaravathi Road")
 */
function cleanStreetForGeocoding(line) {
  if (!line) return "";
  return line
    .replace(/^(d\.?\s*no\.?|h\.?\s*no\.?|door\s*no\.?|flat\s*no\.?|plot\s*no\.?|house\s*no\.?)[^,]+,\s*/i, "")
    .replace(/^[0-9]+[-/][0-9]+[^,]*,?\s*/i, "")
    .trim();
}

/**
 * Geocode address to coordinates (lat, lng) and verify consistency against PIN code
 */
async function geocodeAddress(addressData, pinDetails) {
  const { line1 = "", locality = "", city = "", state = "", pincode = "" } = addressData;
  const cleanPin = String(pincode).trim().replace(/\D/g, "");

  const cacheKey = `geo_${normalizeText(line1)}_${normalizeText(locality)}_${cleanPin}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const cleanedStreet = cleanStreetForGeocoding(line1);
  const targetCity = city || pinDetails?.city || pinDetails?.district || "Guntur";
  const targetState = state || pinDetails?.state || "Andhra Pradesh";

  // Build candidate queries in order of precision
  const candidateQueries = [
    [cleanedStreet, locality, targetCity, cleanPin].filter(Boolean).join(", "),
    [cleanedStreet, targetCity, targetState].filter(Boolean).join(", "),
    [locality, targetCity, cleanPin].filter(Boolean).join(", "),
    [cleanedStreet, targetCity].filter(Boolean).join(", "),
    [locality, targetCity, targetState].filter(Boolean).join(", "),
    [targetCity, cleanPin, targetState].filter(Boolean).join(", "),
  ].filter((q) => q.trim().length > 3);

  let geocoded = null;

  // Try queries with high-speed Photon & Nominatim
  for (const query of candidateQueries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=3&countrycodes=in`;
      const results = await httpGet(url, 2500);

      if (Array.isArray(results) && results.length > 0) {
        for (const item of results) {
          const itemLat = parseFloat(item.lat);
          const itemLng = parseFloat(item.lon);
          const itemPostcode = item.address?.postcode ? String(item.address.postcode).trim() : "";
          const itemState = item.address?.state || "";
          const itemDistrict = item.address?.state_district || item.address?.county || item.address?.city || "";

          // Check if resolved location matches the entered state
          if (targetState && itemState && !normalizeText(itemState).includes(normalizeText(targetState)) && !normalizeText(targetState).includes(normalizeText(itemState))) {
            continue; // Mismatched state, skip candidate
          }

          // If the geocoded result has a postcode and it completely differs from the entered PIN district
          if (itemPostcode && itemPostcode !== cleanPin) {
            // If the first 3 digits differ significantly (different postal region/circle), it's a mismatch
            if (cleanPin.length === 6 && itemPostcode.length === 6 && cleanPin.slice(0, 3) !== itemPostcode.slice(0, 3)) {
              continue;
            }
          }

          if (!isNaN(itemLat) && !isNaN(itemLng)) {
            geocoded = {
              lat: itemLat,
              lng: itemLng,
              displayName: item.display_name,
              postcode: itemPostcode || cleanPin,
              matchedQuery: query,
            };
            break;
          }
        }
      }
      if (geocoded) break;
    } catch (err) {
      // Continue to fallback candidate
    }
  }

  // Fallback to Photon geocoder if Nominatim had no matches
  if (!geocoded) {
    for (const query of candidateQueries.slice(0, 3)) {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=3`;
        const res = await httpGet(url, 2000);
        if (res && Array.isArray(res.features) && res.features.length > 0) {
          for (const feat of res.features) {
            const coords = feat.geometry?.coordinates;
            const props = feat.properties || {};
            if (Array.isArray(coords) && coords.length >= 2) {
              const featLng = coords[0];
              const featLat = coords[1];
              const featPostcode = props.postcode ? String(props.postcode).trim() : "";
              const featState = props.state || "";

              if (targetState && featState && !normalizeText(featState).includes(normalizeText(targetState))) {
                continue;
              }

              if (featPostcode && featPostcode !== cleanPin && cleanPin.slice(0, 3) !== featPostcode.slice(0, 3)) {
                continue;
              }

              geocoded = {
                lat: featLat,
                lng: featLng,
                displayName: [props.name, props.street, props.city, props.state].filter(Boolean).join(", "),
                postcode: featPostcode || cleanPin,
                matchedQuery: query,
              };
              break;
            }
          }
        }
        if (geocoded) break;
      } catch (err) {
        // Continue
      }
    }
  }

  // If geocoding still could not establish location within the target PIN's district/state
  if (!geocoded && pinDetails && pinDetails.valid) {
    // Fall back to District/City centroid of the verified PIN code
    if (normalizeText(targetCity).includes("guntur") || cleanPin.startsWith("522")) {
      geocoded = {
        lat: 16.3067,
        lng: 80.4365,
        displayName: `${targetCity}, ${targetState}, ${cleanPin}`,
        postcode: cleanPin,
        isApproximate: true,
      };
    }
  }

  if (geocoded) {
    geocodeCache.set(cacheKey, { timestamp: Date.now(), data: geocoded });
  }

  return geocoded;
}

/**
 * Calculate actual driving road distance from Lakshmi Designers store using OSRM routing
 *
 * @param {number} destLat - Destination Latitude
 * @param {number} destLng - Destination Longitude
 * @returns {Promise<number>} Road distance in kilometres
 */
async function calculateDrivingRoadDistance(destLat, destLng) {
  const routeKey = `route_${destLat.toFixed(4)}_${destLng.toFixed(4)}`;
  const cached = routeCache.get(routeKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.distanceKm;
  }

  const startLng = STORE_LOCATION.lng;
  const startLat = STORE_LOCATION.lat;

  // Query OSRM road routing engine
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=false`;

  try {
    const response = await httpGet(osrmUrl, 3000);
    if (response && response.code === "Ok" && Array.isArray(response.routes) && response.routes.length > 0) {
      const distanceMeters = response.routes[0].distance;
      const distanceKm = Math.round((distanceMeters / 1000) * 100) / 100;

      routeCache.set(routeKey, { timestamp: Date.now(), distanceKm });
      return distanceKm;
    }
  } catch (osrmErr) {
    console.warn("[ROUTING WARNING] OSRM routing fallback:", osrmErr.message);
  }

  // Fallback: Haversine with typical road route winding factor (1.28x)
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(destLat - startLat);
  const dLon = toRad(destLng - startLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(startLat)) * Math.cos(toRad(destLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineKm = R * c;
  const estimatedRoadKm = Math.round(straightLineKm * 1.28 * 100) / 100;

  routeCache.set(routeKey, { timestamp: Date.now(), distanceKm: estimatedRoadKm });
  return estimatedRoadKm;
}

/**
 * Authoritatively verify physical address integrity and calculate road delivery pricing
 *
 * @param {object} addressData - { line1, line2, locality, city, state, pincode, country }
 * @param {object} pinDetails - Verified India Post postal records
 * @returns {Promise<object>} Verification result with road distance & delivery fee
 */
async function verifyAddressAndCalculateDelivery(addressData, pinDetails) {
  const { line1 = "", pincode = "" } = addressData;
  const cleanPin = String(pincode).trim().replace(/\D/g, "");

  if (!cleanPin || cleanPin.length !== 6) {
    return {
      valid: false,
      error: "Please enter a valid 6-digit Indian PIN code.",
    };
  }

  // 1. Direct street geocode to detect if street belongs to a different state/district/pincode
  const targetState = addressData.state || pinDetails?.state || "Andhra Pradesh";
  const cleanedStreet = cleanStreetForGeocoding(line1);

  if (cleanedStreet && cleanedStreet.length >= 4) {
    try {
      const streetUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedStreet)}&format=json&addressdetails=1&limit=3&countrycodes=in`;
      const streetRes = await httpGet(streetUrl, 2000);
      if (Array.isArray(streetRes) && streetRes.length > 0) {
        for (const item of streetRes) {
          const itemState = item.address?.state || "";
          const itemPostcode = item.address?.postcode ? String(item.address.postcode).trim() : "";

          // If street resolves to a known location with state and state completely differs from targetState
          if (itemState && targetState) {
            const normItemState = normalizeText(itemState);
            const normTargetState = normalizeText(targetState);
            if (!normItemState.includes(normTargetState) && !normTargetState.includes(normItemState)) {
              return {
                valid: false,
                error: `The entered street address appears to be located in ${itemState} (${itemPostcode || "another region"}), which does not match the entered PIN code ${cleanPin} (${targetState}).`,
              };
            }
          }

          // If postcode resolved and circle differs (e.g. Delhi 110xxx vs AP 522xxx)
          if (itemPostcode && itemPostcode.length === 6 && cleanPin.length === 6 && itemPostcode.slice(0, 2) !== cleanPin.slice(0, 2)) {
            return {
              valid: false,
              error: `The entered street address is located in postal code ${itemPostcode}, which does not match the entered PIN code ${cleanPin}.`,
            };
          }
        }
      }
    } catch (err) {}
  }

  // 2. Geocode full address to physical coordinates
  const geocoded = await geocodeAddress(addressData, pinDetails);

  if (!geocoded) {
    return {
      valid: false,
      error: "The entered address does not match the PIN code. Please enter the correct address/location or PIN code.",
    };
  }

  // 2. Cross-verify physical postal correspondence
  if (geocoded.postcode && geocoded.postcode !== cleanPin) {
    const geoCircle = geocoded.postcode.slice(0, 3);
    const pinCircle = cleanPin.slice(0, 3);
    if (geoCircle !== pinCircle) {
      return {
        valid: false,
        error: "The entered address does not match the PIN code. Please enter the correct address/location or PIN code.",
      };
    }
  }

  // 3. Compute exact road distance from Lakshmi Designers store
  const roadDistanceKm = await calculateDrivingRoadDistance(geocoded.lat, geocoded.lng);

  // 4. Compute progressive short-distance delivery charge (strictly d < 20.00 km)
  const isShortDistance = roadDistanceKm < MAX_SHORT_DISTANCE_KM;
  const deliveryCharge = isShortDistance ? calculateShortDistanceDeliveryFee(roadDistanceKm) : null;

  return {
    valid: true,
    data: {
      country: "India",
      pincode: cleanPin,
      city: addressData.city || pinDetails?.city || pinDetails?.district || "Guntur",
      district: pinDetails?.district || "Guntur",
      state: addressData.state || pinDetails?.state || "Andhra Pradesh",
      locality: addressData.locality || "",
      line1: addressData.line1,
      line2: addressData.line2 || "",
      coordinates: {
        lat: geocoded.lat,
        lng: geocoded.lng,
      },
      roadDistanceKm,
      distanceText: `${roadDistanceKm.toFixed(2)} km driving distance`,
      isShortDistance,
      isLongDistance: !isShortDistance,
      deliveryCharge,
      deliveryChargeText: isShortDistance ? `₹${deliveryCharge.toFixed(2)}` : "To be confirmed",
      store: {
        name: STORE_LOCATION.name,
        address: STORE_LOCATION.address,
        coordinates: { lat: STORE_LOCATION.lat, lng: STORE_LOCATION.lng },
      },
    },
  };
}

module.exports = {
  geocodeAddress,
  calculateDrivingRoadDistance,
  verifyAddressAndCalculateDelivery,
};
