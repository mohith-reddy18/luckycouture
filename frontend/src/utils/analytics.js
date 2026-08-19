/**
 * Google Analytics 4 (GA4) SPA Utility
 * Measurement ID: G-H9WDRMBTMW
 */

export const GA_MEASUREMENT_ID = "G-H9WDRMBTMW";

/**
 * Log a page view to GA4 across React Router SPA navigation.
 * Safely checks for window and window.gtag.
 * Does not include any personal or sensitive user data.
 */
export function trackPageView(path, title) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  window.gtag("event", "page_view", {
    page_path: path || window.location.pathname + window.location.search,
    page_location: window.location.href,
    page_title: title || document.title,
    send_to: GA_MEASUREMENT_ID,
  });
}

/**
 * Log custom analytics events to GA4 (e.g. actions, bookings, clicks).
 * Does not transmit any personal data.
 */
export function trackEvent(action, params = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  window.gtag("event", action, params);
}
