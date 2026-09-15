/**
 * Utility functions for product presentation & color-variant splitting.
 */

/**
 * Safely extracts a non-empty trimmed URL string from an image object or string.
 *
 * @param {string|object} imgSource - Image string or object with url property
 * @returns {string|null}
 */
function getValidImageString(imgSource) {
  if (!imgSource) return null;
  if (typeof imgSource === "string" && imgSource.trim().length > 0) return imgSource.trim();
  if (typeof imgSource?.url === "string" && imgSource.url.trim().length > 0) return imgSource.url.trim();
  return null;
}

/**
 * Normalizes an array of size strings into structured size-quantity objects.
 */
function resolveSizesFromList(rawSizes, stock) {
  const list = Array.isArray(rawSizes) ? rawSizes : [];
  return list
    .map((s) => ({
      size: String(s).trim(),
      quantity: stock,
    }))
    .filter((s) => Boolean(s.size));
}

/**
 * Computes available sizes (quantity > 0) and the first available default size.
 */
function buildSizeProfile(allSizes) {
  const availableSizes = allSizes.filter((s) => s.quantity > 0).map((s) => s.size);
  // Default size MUST be the first available size (quantity > 0)
  const defaultSize = allSizes.find((s) => s.quantity > 0)?.size || null;
  return { allSizes, availableSizes, defaultSize };
}

/**
 * Safely extracts the image specifically belonging to a color variant.
 * Strictly avoids borrowing another color's image when multiple colorVariants exist.
 */
export function extractColorImage(cv, product) {
  if (cv) {
    const cvThumb = getValidImageString(cv.thumbnail);
    if (cvThumb) return cvThumb;

    const cvImg0 = getValidImageString(cv.images?.[0]) || getValidImageString(cv.image);
    if (cvImg0) return cvImg0;
  }

  // If this product has multiple colorVariants, DO NOT fall back to product.thumbnail or product.images[0]
  // because product-level images in backend/DB are often borrowed from colorVariant[0]!
  if (Array.isArray(product?.colorVariants) && product.colorVariants.length > 1) {
    return null;
  }

  // Fallback for single-variant or legacy products
  const mainThumb = getValidImageString(product?.thumbnail);
  if (mainThumb) return mainThumb;

  const mainImg0 = getValidImageString(product?.images?.[0]) || getValidImageString(product?.image);
  if (mainImg0) return mainImg0;

  return null;
}

/**
 * Extract color-wise card representations from a product document.
 * If a product has multiple configured colors/colorVariants,
 * returns one card representation per color for customer-facing Shop presentation.
 */
export function getProductColorCards(product) {
  if (!product) return [];

  // 1. Product has configured colorVariants
  if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
    return product.colorVariants.map((cv) => {
      const colorName = (cv.color || "").trim() || "Default";

      let colorStock = 0;
      let allSizes = [];

      if (Array.isArray(cv.inventory) && cv.inventory.length > 0) {
        cv.inventory.forEach((inv) => {
          const qty = Math.max(0, Number(inv.quantity) || 0);
          const sz = String(inv.size || "").trim();
          if (sz) {
            allSizes.push({ size: sz, quantity: qty });
            colorStock += qty;
          }
        });
      } else {
        colorStock = Number(product.stock) || 0;
        const rawSizes = (Array.isArray(cv.sizes) && cv.sizes.length > 0) ? cv.sizes : product.sizes;
        allSizes = resolveSizesFromList(rawSizes, colorStock);
      }

      const { availableSizes, defaultSize } = buildSizeProfile(allSizes);
      const rawImage = extractColorImage(cv, product);

      return {
        ...product,
        cardKey: `${product._id || product.id}-${colorName}`,
        selectedColor: colorName,
        selectedColorVariant: cv,
        colorStock,
        allSizes,
        availableSizes,
        defaultSize,
        cardImage: rawImage,
        hasMultipleColors: product.colorVariants.length > 1,
      };
    });
  }

  // 2. Fallback if product.colors array exists without colorVariants
  if (Array.isArray(product.colors) && product.colors.length > 1) {
    return product.colors.map((c) => {
      const colorName = (typeof c === "string" ? c : c?.color || c?.name || "").trim();
      const colorStock = Number(product.stock) || 0;
      const allSizes = resolveSizesFromList(product.sizes, colorStock);
      const { availableSizes, defaultSize } = buildSizeProfile(allSizes);

      return {
        ...product,
        cardKey: `${product._id || product.id}-${colorName}`,
        selectedColor: colorName,
        colorStock,
        allSizes,
        availableSizes,
        defaultSize,
        cardImage: extractColorImage(null, product),
        hasMultipleColors: true,
      };
    });
  }

  // 3. Single color / default card
  const colorStock = Number(product.stock) || 0;
  const allSizes = resolveSizesFromList(product.sizes, colorStock);
  const { availableSizes, defaultSize } = buildSizeProfile(allSizes);

  return [
    {
      ...product,
      cardKey: `${product._id || product.id}`,
      selectedColor: (product.colors?.[0] || "").trim() || null,
      colorStock,
      allSizes,
      availableSizes,
      defaultSize,
      cardImage: extractColorImage(null, product),
      hasMultipleColors: false,
    },
  ];
}
