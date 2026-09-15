import { format, isValid } from "date-fns";

/**
 * Safely parses any date input into a valid Date object or null.
 * Handles Date objects, ISO strings, timestamps, numbers, null, undefined, and malformed strings.
 *
 * @param {any} input
 * @returns {Date | null}
 */
export const parseSafeDate = (input) => {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  try {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

/**
 * Safely formats a date using date-fns format tokens.
 * Guarantees that neither an invalid date nor a bad format string will throw an uncaught exception.
 *
 * @param {any} dateInput - Date, ISO string, timestamp
 * @param {string} formatPattern - date-fns format string (e.g. "dd MMM yyyy")
 * @param {string} fallback - String to return if date or formatting fails
 * @returns {string}
 */
export const safeFormat = (dateInput, formatPattern, fallback = "—") => {
  const d = parseSafeDate(dateInput);
  if (!d || !isValid(d)) return fallback;
  if (typeof formatPattern !== "string" || !formatPattern.trim()) return fallback;

  try {
    return format(d, formatPattern);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[dateUtils] Failed to format date with pattern "${formatPattern}":`, err.message);
    }
    // Fallback to safe browser localization if date-fns fails on unusual format token
    try {
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return fallback;
    }
  }
};

/**
 * Standard date format: "23 Aug 2026"
 */
export const formatDate = (dateInput, fallback = "—") => {
  return safeFormat(dateInput, "dd MMM yyyy", fallback);
};

/**
 * Standard time format: "10:55 AM"
 */
export const formatTime = (dateInput, fallback = "") => {
  return safeFormat(dateInput, "hh:mm a", fallback);
};

/**
 * Standard date & time format: "23 Aug 2026, 10:55 AM"
 */
export const formatDateTime = (dateInput, fallback = "—") => {
  return safeFormat(dateInput, "dd MMM yyyy, hh:mm a", fallback);
};

/**
 * Short date format: "Aug 23, 2026"
 */
export const formatDateShort = (dateInput, fallback = "—") => {
  return safeFormat(dateInput, "MMM d, yyyy", fallback);
};

/**
 * Full date with day of week: "Sunday, 23 August 2026"
 */
export const formatDateLong = (dateInput, fallback = "—") => {
  return safeFormat(dateInput, "EEEE, d MMMM yyyy", fallback);
};
