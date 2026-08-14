/**
 * Normalizes any image source into a browser-loadable URL.
 *
 * Handles:
 * - Cloudinary & remote HTTPS URLs: `https://res.cloudinary.com/...` -> used as-is
 * - Browser blob URLs: `blob:http://...` -> used as-is (for instant local previews)
 * - Data URLs: `data:image/...` -> used as-is
 * - Local server relative uploads: `/uploads/...` -> prepended with API host when configured, or resolved via Vite proxy
 * - Object representations: `{ url: "...", publicId: "..." }` -> extracts `.url`
 */

const rawBase = import.meta.env.VITE_API_URL || "";
const API_BASE = rawBase.replace(/\/+$/, "");

export function getImageUrl(imageSource) {
  if (!imageSource) return "";

  // If passed an object like { url: "...", publicId: "..." }
  let url = typeof imageSource === "string" ? imageSource : imageSource.url || imageSource.secure_url || "";
  if (!url || typeof url !== "string") return "";

  url = url.trim();
  if (!url) return "";

  // Already a full remote URL, blob, or data URL
  if (/^(https?:|blob:|data:|\/\/)/i.test(url)) {
    return url;
  }

  // Relative upload path (e.g. /uploads/image.jpg or uploads/image.jpg)
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  if (API_BASE) {
    return `${API_BASE}${cleanPath}`;
  }

  // In local dev without VITE_API_URL, relative path /uploads/... is served via Vite proxy
  return cleanPath;
}

export default getImageUrl;
