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
  // 1. India (+91)
  if (normalized.startsWith("+91")) {
    const num = normalized.slice(3);
    if (!/^[6-9]\d{9}$/.test(num)) {
      return { isValid: false, error: "Indian mobile numbers must be 10 digits starting with 6, 7, 8, or 9." };
    }
  }
  // 2. USA / Canada (+1)
  else if (normalized.startsWith("+1")) {
    const num = normalized.slice(2);
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(num)) {
      return { isValid: false, error: "Please enter a valid 10-digit North American phone number." };
    }
  }
  // 3. UK (+44)
  else if (normalized.startsWith("+44")) {
    const num = normalized.slice(3);
    if (!/^7\d{9}$/.test(num) && !/^[1-9]\d{8,9}$/.test(num)) {
      return { isValid: false, error: "Please enter a valid UK phone number." };
    }
  }
  // 4. UAE (+971)
  else if (normalized.startsWith("+971")) {
    const num = normalized.slice(4);
    if (!/^5\d{8}$/.test(num) && !/^[234679]\d{7,8}$/.test(num)) {
      return { isValid: false, error: "Please enter a valid UAE phone number." };
    }
  }
  // 5. Singapore (+65)
  else if (normalized.startsWith("+65")) {
    const num = normalized.slice(3);
    if (!/^[689]\d{7}$/.test(num)) {
      return { isValid: false, error: "Please enter a valid 8-digit Singapore phone number." };
    }
  }
  // 6. Australia (+61)
  else if (normalized.startsWith("+61")) {
    const num = normalized.slice(3);
    if (!/^4\d{8}$/.test(num) && !/^[2378]\d{8}$/.test(num)) {
      return { isValid: false, error: "Please enter a valid 9-digit Australian phone number." };
    }
  }

  return { isValid: true, normalized };
};

module.exports = {
  normalizePhoneNumber,
  validatePhoneNumber,
};
