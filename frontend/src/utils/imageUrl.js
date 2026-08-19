/**
 * Universal Image URL Normalizer for Lucky Couture.
 *
 * Handles:
 * 1. Cloudinary HTTPS URLs (e.g. https://res.cloudinary.com/...) -> returned directly as-is
 * 2. Insecure / protocol-relative Cloudinary or external URLs -> upgraded to https://
 * 3. Browser Blob URLs (blob:http...) -> returned as-is (for instant local upload preview)
 * 4. Inline Base64 Data URLs (data:image/...) -> returned as-is
 * 5. Localhost / local IP URLs in database -> stripped cleanly to relative /uploads path
 * 6. Relative upload paths (/uploads/...) -> joined cleanly with VITE_API_URL when present, or served via proxy
 * 7. Object structures ({ url, secure_url, path, preview, thumbnail, images }) -> automatically extracts string
 */

const rawBase = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "";
const API_BASE = rawBase.replace(/\/+$/, "");

export function getImageUrl(imageSource) {
  if (!imageSource) return "";

  // 1. Handle arrays: find first valid image URL
  if (Array.isArray(imageSource)) {
    for (const item of imageSource) {
      const candidate = getImageUrl(item);
      if (candidate) return candidate;
    }
    return "";
  }

  // 2. Extract string from various object shapes
  let url = "";
  if (typeof imageSource === "string") {
    url = imageSource;
  } else if (typeof imageSource === "object" && imageSource !== null) {
    url =
      (imageSource.secure_url && String(imageSource.secure_url).trim()) ||
      (imageSource.url && String(imageSource.url).trim()) ||
      (imageSource.image && String(imageSource.image).trim()) ||
      (imageSource.src && String(imageSource.src).trim()) ||
      (imageSource.preview && String(imageSource.preview).trim()) ||
      (imageSource.path && String(imageSource.path).trim()) ||
      "";

    // If still empty, check nested thumbnail or images
    if (!url && imageSource.thumbnail) {
      url = getImageUrl(imageSource.thumbnail);
    }
    if (!url && imageSource.images) {
      url = getImageUrl(imageSource.images);
    }
  }

  if (typeof url !== "string") return "";
  url = url.trim();
  if (!url) return "";

  // 3. Protocol-relative URL (e.g. //res.cloudinary.com/...)
  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  // 4. If stored URL contains localhost/127.0.0.1 (e.g. from local DB seed or test upload), convert to clean relative path
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(url)) {
    const match = url.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)$/i);
    url = match && match[3] ? match[3] : "";
  }

  if (!url) return "";

  // 5. Cloudinary or external HTTPS/HTTP/Blob/Data URL
  if (/^https?:\/\//i.test(url)) {
    // Upgrade insecure HTTP URLs to secure HTTPS (e.g. Cloudinary, Unsplash, etc.)
    if (url.startsWith("http://res.cloudinary.com") || url.startsWith("http://images.unsplash.com")) {
      return url.replace(/^http:/, "https:");
    }
    return url;
  }

  if (/^(blob:|data:)/i.test(url)) {
    return url;
  }

  // 6. Local relative upload path (e.g. /uploads/image.jpg)
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  if (API_BASE) {
    return `${API_BASE}${cleanPath}`;
  }

  // Local development fallback
  return cleanPath;
}

export default getImageUrl;
