/**
 * Client-side phone normalization and validation utility for Lucky Couture.
 * Mirrors backend validation rules for real-time form validation.
 */

export const normalizePhoneNumber = (rawPhone, defaultCountryCode = "+91") => {
  if (!rawPhone || typeof rawPhone !== "string") return "";
  let clean = rawPhone.trim().replace(/[\s\-\(\)\.]/g, "");
  if (!clean) return "";

  if (clean.startsWith("+")) {
    return clean;
  }

  if (clean.startsWith("00")) {
    return "+" + clean.slice(2);
  }

  if (clean.startsWith("91") && clean.length === 12 && /^[6-9]/.test(clean.slice(2))) {
    return "+" + clean;
  }

  if (/^[6-9]\d{9}$/.test(clean)) {
    return "+91" + clean;
  }

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

export const validatePhoneNumber = (phone) => {
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    return { isValid: false, error: "Phone number is required." };
  }

  if (/[a-zA-Z]/.test(phone)) {
    return { isValid: false, error: "Phone number cannot contain letters." };
  }

  const normalized = normalizePhoneNumber(phone);

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    return { isValid: false, error: "Please enter a valid phone number with country code." };
  }

  const allDigits = normalized.slice(1);
  const trailing10 = allDigits.slice(-10);
  if (/^(\d)\1+$/.test(trailing10)) {
    return { isValid: false, error: "Please enter a valid phone number (not repetitive dummy digits)." };
  }

  // Country-specific rules:
  const matchedRule = COUNTRY_RULES.find((rule) => normalized.startsWith(rule.prefix));
  if (matchedRule) {
    const nationalNumber = normalized.slice(matchedRule.prefix.length);
    if (!matchedRule.validator(nationalNumber)) {
      return { isValid: false, error: matchedRule.error };
    }
  }

  return { isValid: true, normalized };
};
