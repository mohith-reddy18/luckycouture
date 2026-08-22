// Standard Ready-to-wear / Ethnic Apparel Size Chart Data & Dynamic Product Extraction
// Sourced from standard Indian garment tailoring & retail standards (in inches)

export const DEFAULT_STANDARDS = {
  "XS": { inSize: "34", bust: "32 - 34", waist: "26 - 28", topWaist: "26 - 28", shoulder: "13.5 - 14", bottomWaist: "26 - 28", hip: "34 - 36", inseam: "28", length: "38", bottomLength: "38" },
  "S": { inSize: "36", bust: "34 - 36", waist: "28 - 30", topWaist: "28 - 30", shoulder: "14 - 14.5", bottomWaist: "28 - 30", hip: "36 - 38", inseam: "28.5", length: "38.5", bottomLength: "38.5" },
  "M": { inSize: "38", bust: "36 - 38", waist: "30 - 32", topWaist: "30 - 32", shoulder: "14.5 - 15", bottomWaist: "30 - 32", hip: "38 - 40", inseam: "29", length: "39", bottomLength: "39" },
  "L": { inSize: "40", bust: "38 - 40", waist: "32 - 34", topWaist: "32 - 34", shoulder: "15 - 15.5", bottomWaist: "32 - 34", hip: "40 - 42", inseam: "29.5", length: "39.5", bottomLength: "39.5" },
  "XL": { inSize: "42", bust: "40 - 42", waist: "34 - 36", topWaist: "34 - 36", shoulder: "15.5 - 16", bottomWaist: "34 - 36", hip: "42 - 44", inseam: "30", length: "40", bottomLength: "40" },
  "2XL": { inSize: "44", bust: "42 - 44", waist: "36 - 38", topWaist: "36 - 38", shoulder: "16 - 16.5", bottomWaist: "36 - 38", hip: "44 - 46", inseam: "30", length: "40.5", bottomLength: "40.5" },
  "XXL": { inSize: "44", bust: "42 - 44", waist: "36 - 38", topWaist: "36 - 38", shoulder: "16 - 16.5", bottomWaist: "36 - 38", hip: "44 - 46", inseam: "30", length: "40.5", bottomLength: "40.5" },
  "3XL": { inSize: "46", bust: "44 - 46", waist: "38 - 40", topWaist: "38 - 40", shoulder: "16.5 - 17", bottomWaist: "38 - 40", hip: "46 - 48", inseam: "30.5", length: "41", bottomLength: "41" },
  "4XL": { inSize: "48", bust: "46 - 48", waist: "40 - 42", topWaist: "40 - 42", shoulder: "17 - 17.5", bottomWaist: "40 - 42", hip: "48 - 50", inseam: "30.5", length: "41.5", bottomLength: "41.5" },
  "5XL": { inSize: "50", bust: "48 - 50", waist: "42 - 44", topWaist: "42 - 44", shoulder: "17.5 - 18", bottomWaist: "42 - 44", hip: "50 - 52", inseam: "31", length: "42", bottomLength: "42" },
  "FREE SIZE": { inSize: "Universal", bust: "34 - 42", waist: "28 - 36", topWaist: "28 - 36", shoulder: "14 - 16", bottomWaist: "28 - 36", hip: "36 - 44", inseam: "29", length: "39", bottomLength: "39" },
};

export const ALL_MEASUREMENT_KEYS = [
  { key: "inSize", label: "IN Size" },
  { key: "bust", label: "Bust (in)" },
  { key: "topWaist", label: "Top Waist (in)" },
  { key: "waist", label: "Waist (in)" },
  { key: "shoulder", label: "Shoulder (in)" },
  { key: "bottomWaist", label: "Bottom Waist (in)" },
  { key: "hip", label: "Hip (in)" },
  { key: "length", label: "Length (in)" },
  { key: "inseam", label: "Inseam (in)" },
  { key: "bottomLength", label: "Bottom Length (in)" },
];

/**
 * Normalizes size string comparison (e.g. 'XXL' -> '2XL')
 */
export function normalizeSizeName(size) {
  if (!size) return "";
  const s = String(size).trim().toUpperCase();
  if (s === "XXL") return "2XL";
  if (s === "XXXL") return "3XL";
  if (s === "XXXXL") return "4XL";
  if (s === "XXXXXL") return "5XL";
  return s;
}

/**
 * Extracts and maps the dynamic measurement data for the active product/variant.
 * Returns only the sizes that belong to this variant/product and dynamically
 * includes only columns with populated values.
 */
export function getVariantMeasurements(product, selectedVariant) {
  let rawItems = [];

  if (selectedVariant?.inventory && Array.isArray(selectedVariant.inventory) && selectedVariant.inventory.length > 0) {
    rawItems = selectedVariant.inventory;
  } else if (Array.isArray(product?.sizeChart) && product.sizeChart.length > 0) {
    rawItems = product.sizeChart;
  } else if (Array.isArray(product?.sizes) && product.sizes.length > 0) {
    rawItems = product.sizes.map((s) => (typeof s === "string" ? { size: s } : s));
  }

  const rows = rawItems
    .filter((item) => item && (item.size || typeof item === "string"))
    .map((item) => {
      const sizeStr = String(typeof item === "string" ? item : item.size || "").trim();
      const norm = normalizeSizeName(sizeStr);
      const std = DEFAULT_STANDARDS[norm] || {};

      const m = item.measurements
        ? item.measurements instanceof Map
          ? Object.fromEntries(item.measurements)
          : item.measurements
        : {};

      const quantity = Number(item.quantity);
      const isConfigured = !isNaN(quantity);
      const inStock = isConfigured ? quantity > 0 : (Number(product?.stock) || 0) > 0;

      // Extract custom entered measurements or fall back to standard
      const bust = item.bust || m.bust || m["Chest/Bust"] || m["chest"] || std.bust || "";
      const topWaist = item.topWaist || m.topWaist || m["Top Waist"] || std.topWaist || "";
      const waist = item.waist || m.waist || m["Waist"] || std.waist || "";
      const shoulder = item.shoulder || m.shoulder || m["Shoulder"] || std.shoulder || "";
      const bottomWaist = item.bottomWaist || m.bottomWaist || m["Bottom Waist"] || std.bottomWaist || "";
      const hip = item.hip || m.hip || m.hips || m["Hip"] || std.hip || "";
      const length = item.length || m.length || m["Body Length"] || m["Length"] || std.length || "";
      const inseam = item.inseam || m.inseam || m["Inseam"] || std.inseam || "";
      const bottomLength = item.bottomLength || m.bottomLength || m["Bottom Length"] || std.bottomLength || "";
      const inSize = item.inSize || m.inSize || std.inSize || "";

      return {
        size: sizeStr,
        normSize: norm,
        quantity: isConfigured ? quantity : undefined,
        inStock,
        inSize,
        bust,
        topWaist,
        waist,
        shoulder,
        bottomWaist,
        hip,
        length,
        inseam,
        bottomLength,
        customFields: m,
      };
    });

  // Dynamically calculate which columns actually have data across the rows
  const activeColumns = ALL_MEASUREMENT_KEYS.filter((col) =>
    rows.some((r) => r[col.key] && String(r[col.key]).trim().length > 0)
  );

  return {
    rows,
    activeColumns,
  };
}
