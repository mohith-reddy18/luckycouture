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
  if (normalized.startsWith("+91")) {
    const num = normalized.slice(3);
    if (!/^[6-9]\d{9}$/.test(num)) {
      return { isValid: false, error: "Indian mobile numbers must be 10 digits starting with 6, 7, 8, or 9." };
    }
  } else if (normalized.startsWith("+1")) {
    const num = normalized.slice(2);
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(num)) {
      return { isValid: false, error: "Please enter a valid 10-digit North American phone number." };
    }
  } else if (normalized.startsWith("+44")) {
    const num = normalized.slice(3);
    if (!/^7\d{9}$/.test(num) && !/^[1-9]\d{8,9}$/.test(num)) {
      return { isValid: false, error: "Please enter a valid UK phone number." };
    }
  } else if (normalized.startsWith("+971")) {
    const num = normalized.slice(4);
    if (!/^5\d{8}$/.test(num) && !/^[234679]\d{7,8}$/.test(num)) {
      return { isValid: false, error: "Please enter a valid UAE phone number." };
    }
  } else if (normalized.startsWith("+65")) {
    const num = normalized.slice(3);
    if (!/^[689]\d{7}$/.test(num)) {
      return { isValid: false, error: "Please enter a valid 8-digit Singapore phone number." };
    }
  } else if (normalized.startsWith("+61")) {
    const num = normalized.slice(3);
    if (!/^4\d{8}$/.test(num) && !/^[2378]\d{8}$/.test(num)) {
      return { isValid: false, error: "Please enter a valid 9-digit Australian phone number." };
    }
  }

  return { isValid: true, normalized };
};
