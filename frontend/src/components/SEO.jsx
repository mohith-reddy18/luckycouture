import { useEffect } from "react";

const SITE_URL = "https://www.luckycouture.in";
const DEFAULT_TITLE = "Lucky Couture | Bespoke Tailoring & Fashion";
const DEFAULT_DESCRIPTION =
  "Lucky Couture is a bespoke tailoring studio and women's fashion boutique in Guntur, Andhra Pradesh. Specializing in bridal lehengas, maggam work blouses, designer sarees, and custom stitching.";
const DEFAULT_IMAGE = `${SITE_URL}/logo.jpg`;

/**
 * Helper to update or create a <meta> tag in document.head
 */
function setMetaTag(attrName, attrVal, content) {
  if (!content) return;
  let element = document.querySelector(`meta[${attrName}="${attrVal}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attrName, attrVal);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

/**
 * Helper to update or create a <link rel="..."> tag in document.head
 */
function setLinkTag(rel, href) {
  if (!href) return;
  let element = document.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

/**
 * Lightweight, zero-dependency SEO component for React SPA.
 * Manages document.title, description, canonical link, Open Graph, Twitter cards,
 * and page-specific JSON-LD structured data schemas on route changes.
 */
export default function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonical = "/",
  image = DEFAULT_IMAGE,
  type = "website",
  schema = null,
}) {
  useEffect(() => {
    // 1. Page Title
    const formattedTitle = title.includes("Lucky Couture") ? title : `${title} | Lucky Couture`;
    document.title = formattedTitle;

    // 2. Meta Description
    setMetaTag("name", "description", description);

    // 3. Canonical URL
    const cleanPath = canonical.startsWith("/") ? canonical : `/${canonical}`;
    const fullCanonical = canonical.startsWith("http") ? canonical : `${SITE_URL}${cleanPath === "/" ? "/" : cleanPath}`;
    setLinkTag("canonical", fullCanonical);

    // 4. Open Graph Tags
    const fullImage = image.startsWith("http") ? image : `${SITE_URL}${image.startsWith("/") ? image : `/${image}`}`;
    setMetaTag("property", "og:site_name", "Lucky Couture");
    setMetaTag("property", "og:type", type);
    setMetaTag("property", "og:title", formattedTitle);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:url", fullCanonical);
    setMetaTag("property", "og:image", fullImage);

    // 5. Twitter Card Tags
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", formattedTitle);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:image", fullImage);

    // 6. Dynamic JSON-LD Structured Data Schema
    const scriptId = "page-specific-structured-data";
    let scriptTag = document.getElementById(scriptId);

    if (schema) {
      if (!scriptTag) {
        scriptTag = document.createElement("script");
        scriptTag.id = scriptId;
        scriptTag.type = "application/ld+json";
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schema);
    } else if (scriptTag) {
      scriptTag.remove();
    }

    return () => {
      // Clean up dynamic page-level script on unmount
      const existing = document.getElementById(scriptId);
      if (existing) {
        existing.remove();
      }
    };
  }, [title, description, canonical, image, type, schema]);

  return null;
}
