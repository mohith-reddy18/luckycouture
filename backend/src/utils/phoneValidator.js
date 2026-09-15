/**
 * Phone number normalization and validation for Lucky Couture.
 * Supports Indian mobile numbers, E.164 international formats, and country-code picker numbers.
 */

/**
 * Clean and normalize phone numbers into standard E.164 format (+[country][number]).
 * Strips whitespace, dashes, parentheses, dots.
 * If 10 digits starting with 6-9 without country code, normalizes to +91XXXXXXXXXX.
 */
const normalizePhoneNumber = (rawPhone, defaultCountryCode = "+91") => {
  if (!rawPhone || typeof rawPhone !== "string") return "";
  let clean = rawPhone.trim().replace(/[\s\-\(\)\.]/g, "");
  if (!clean) return "";

  // If already starts with '+', return clean version
  if (clean.startsWith("+")) {
    return clean;
  }

  // If starts with 00 (international call prefix), convert to +
  if (clean.startsWith("00")) {
    return "+" + clean.slice(2);
  }

  // If starts with 91 followed by 10 digits starting with 6-9
  if (clean.startsWith("91") && clean.length === 12 && /^[6-9]/.test(clean.slice(2))) {
    return "+" + clean;
  }

  // If 10 digits starting with 6-9 (Indian mobile number)
  if (/^[6-9]\d{9}$/.test(clean)) {
    return "+91" + clean;
  }

  // If a country code is provided
  const prefix = defaultCountryCode.startsWith("+") ? defaultCountryCode : `+${defaultCountryCode}`;
  return `${prefix}${clean}`;
};

const COUNTRY_RULES = [
  {
    prefix: "+91",
    validator: (num) => /^[6-9]\d{9}$/.test(num),
    error: "Indian mobile numbers must be 10 digits starting with 6, 7, 8, or 9.",
  },
  {
    prefix: "+1",
    validator: (num) => /^[2-9]\d{2}[2-9]\d{6}$/.test(num),
    error: "Please enter a valid 10-digit North American phone number.",
  },
  {
    prefix: "+44",
    validator: (num) => /^7\d{9}$/.test(num) || /^[1-9]\d{8,9}$/.test(num),
    error: "Please enter a valid UK phone number.",
  },
  {
    prefix: "+971",
    validator: (num) => /^5\d{8}$/.test(num) || /^[234679]\d{7,8}$/.test(num),
    error: "Please enter a valid UAE phone number.",
  },
  {
    prefix: "+65",
    validator: (num) => /^[689]\d{7}$/.test(num),
    error: "Please enter a valid 8-digit Singapore phone number.",
  },
  {
    prefix: "+61",
    validator: (num) => /^4\d{8}$/.test(num) || /^[2378]\d{8}$/.test(num),
    error: "Please enter a valid 9-digit Australian phone number.",
  },
];

/**
 * Validate phone number structure rigorously.
 * Rejects letters, dummy repetitive numbers, invalid lengths, and malformed country codes.
 */
const validatePhoneNumber = (phone) => {
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    return { isValid: false, error: "Phone number is required." };
  }

  // Reject any alphabetical characters or invalid symbols
  if (/[a-zA-Z]/.test(phone)) {
    return { isValid: false, error: "Phone number cannot contain letters." };
  }

  const normalized = normalizePhoneNumber(phone);

  // Must match basic E.164 format: + followed by 8 to 15 digits
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    return { isValid: false, error: "Please enter a valid phone number with country code (e.g. +91 98765 43210)." };
  }

  const allDigits = normalized.slice(1);

  // Check for dummy repeated digits like 0000000000, 1111111111, 9999999999
  const trailing10 = allDigits.slice(-10);
  if (/^(\d)\1+$/.test(trailing10)) {
    return { isValid: false, error: "Please enter a valid, real phone number (repetitive digits are not allowed)." };
  }

  // Country-specific validations:
  const matchedRule = COUNTRY_RULES.find((rule) => normalized.startsWith(rule.prefix));
  if (matchedRule) {
    const nationalNumber = normalized.slice(matchedRule.prefix.length);
    if (!matchedRule.validator(nationalNumber)) {
      return { isValid: false, error: matchedRule.error };
    }
  }

  return { isValid: true, normalized };
};

module.exports = {
  normalizePhoneNumber,
  validatePhoneNumber,
};
