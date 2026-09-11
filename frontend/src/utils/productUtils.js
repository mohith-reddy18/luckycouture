/**
 * Utility functions for product presentation & color-variant splitting.
 */

/**
 * Safely extracts the image specifically belonging to a color variant.
 * Strictly avoids borrowing another color's image when multiple colorVariants exist.
 */
export function extractColorImage(cv, product) {
  if (cv) {
    const cvThumb = cv.thumbnail?.url || (typeof cv.thumbnail === "string" ? cv.thumbnail : null);
    if (cvThumb && cvThumb.trim().length > 0) return cvThumb.trim();

    const cvImg0 =
      cv.images?.[0]?.url ||
      (typeof cv.images?.[0] === "string" ? cv.images[0] : null) ||
      (cv.image?.url || (typeof cv.image === "string" ? cv.image : null));
    if (cvImg0 && cvImg0.trim().length > 0) return cvImg0.trim();
  }

  // If this product has multiple colorVariants, DO NOT fall back to product.thumbnail or product.images[0]
  // because product-level images in backend/DB are often borrowed from colorVariant[0]!
  if (Array.isArray(product?.colorVariants) && product.colorVariants.length > 1) {
    return null;
  }

  // Fallback for single-variant or legacy products
  const mainThumb = product?.thumbnail?.url || (typeof product?.thumbnail === "string" ? product.thumbnail : null);
  if (mainThumb && mainThumb.trim().length > 0) return mainThumb.trim();

  const mainImg0 =
    product?.images?.[0]?.url ||
    (typeof product?.images?.[0] === "string" ? product.images[0] : null) ||
    product?.image;
  if (mainImg0 && mainImg0.trim().length > 0) return mainImg0.trim();

  return null;
}

/**
 * Extract color-wise card representations from a product document.
 * If a product has multiple configured colors/colorVariants,
 * returns one card representation per color for customer-facing Shop presentation.
 */
export function getProductColorCards(product) {
  if (!product) return [];

  // Check if product has colorVariants
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
      } else if (Array.isArray(cv.sizes) && cv.sizes.length > 0) {
        colorStock = Number(product.stock) || 0;
        allSizes = cv.sizes.map((s) => ({ size: String(s).trim(), quantity: colorStock }));
      } else if (Array.isArray(product.sizes) && product.sizes.length > 0) {
        colorStock = Number(product.stock) || 0;
        allSizes = product.sizes.map((s) => ({ size: String(s).trim(), quantity: colorStock }));
      }

      const availableSizes = allSizes.filter((s) => s.quantity > 0).map((s) => s.size);
      // Default size MUST be the first available size (quantity > 0)
      const defaultSize = allSizes.find((s) => s.quantity > 0)?.size || null;

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

  // Fallback if product.colors array exists without colorVariants
  if (Array.isArray(product.colors) && product.colors.length > 1) {
    return product.colors.map((c) => {
      const colorName = (typeof c === "string" ? c : c?.color || c?.name || "").trim();
      const colorStock = Number(product.stock) || 0;
      const allSizes = (Array.isArray(product.sizes) ? product.sizes : []).map((s) => ({
        size: String(s).trim(),
        quantity: colorStock,
      }));
      const availableSizes = colorStock > 0 ? allSizes.map((s) => s.size) : [];
      const defaultSize = allSizes.find((s) => s.quantity > 0)?.size || null;

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

  // Single color / default card
  const colorStock = Number(product.stock) || 0;
  const allSizes = (Array.isArray(product.sizes) ? product.sizes : []).map((s) => ({
    size: String(s).trim(),
    quantity: colorStock,
  }));
  const availableSizes = colorStock > 0 ? allSizes.map((s) => s.size) : [];
  const defaultSize = allSizes.find((s) => s.quantity > 0)?.size || null;

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
