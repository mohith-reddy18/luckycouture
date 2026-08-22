const mongoose = require("mongoose");
const Product = require("../models/Product");
const ApiError = require("./ApiError");

/**
 * Case-insensitive string matcher
 */
const matches = (a, b) => {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
};

/**
 * Validates inventory for a list of items and atomically decrements the exact
 * color + size combination stock from the database.
 * Throws an ApiError if any variant is out of stock or requested quantity exceeds available stock.
 */
async function validateAndDeductStock(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const processedItems = [];

  for (const item of items) {
    const prodId = item.product || item._id || item.id;
    let dbProduct = null;

    if (prodId && /^[0-9a-fA-F]{24}$/.test(String(prodId))) {
      dbProduct = await Product.findById(prodId);
    } else if (item.name) {
      dbProduct = await Product.findOne({ name: item.name });
    }

    const qty = Number(item.quantity || item.qty) || 1;
    const reqColor = item.color ? String(item.color).trim() : "";
    const reqSize = item.size ? String(item.size).trim() : "";

    if (!dbProduct) {
      // Product may not be in DB (e.g. mock or custom) — allow checkout with snapshot
      processedItems.push({
        product: undefined,
        name: item.name || "Custom Item",
        image: item.image || "",
        price: Number(item.price) || 0,
        quantity: qty,
        size: reqSize,
        color: reqColor,
      });
      continue;
    }

    if (dbProduct.status !== "active") {
      throw new ApiError(400, `"${dbProduct.name}" is no longer available`);
    }

    // ── Variant-level stock check (Color + Size) ──
    const hasColorVariants = Array.isArray(dbProduct.colorVariants) && dbProduct.colorVariants.length > 0;

    if (hasColorVariants && reqColor) {
      const cv = dbProduct.colorVariants.find((v) => matches(v.color, reqColor));

      if (cv && Array.isArray(cv.inventory) && cv.inventory.length > 0 && reqSize) {
        const inv = cv.inventory.find((i) => matches(i.size, reqSize));

        if (!inv || Number(inv.quantity) <= 0) {
          throw new ApiError(
            400,
            `Size "${reqSize}" in "${reqColor}" for "${dbProduct.name}" is currently out of stock`
          );
        }

        const availableQty = Number(inv.quantity);
        if (availableQty < qty) {
          throw new ApiError(
            400,
            `Only ${availableQty} ${availableQty === 1 ? "item is" : "items are"} available in ${reqColor} / ${reqSize}.`
          );
        }

        // Deduct variant stock
        inv.quantity = Math.max(0, availableQty - qty);
      } else if (cv && Array.isArray(cv.sizes) && cv.sizes.length > 0 && reqSize) {
        // Fallback for color variants without detailed inventory map
        const totalStock = Number(dbProduct.stock) || 0;
        if (totalStock < qty) {
          throw new ApiError(400, `Not enough stock for ${dbProduct.name} (${reqColor}, ${reqSize})`);
        }
        dbProduct.stock = Math.max(0, totalStock - qty);
      }
    } else {
      // Fallback: Product without color variants
      const totalStock = Number(dbProduct.stock) || 0;
      if (totalStock < qty) {
        throw new ApiError(400, `Only ${totalStock} items available for "${dbProduct.name}"`);
      }
      dbProduct.stock = Math.max(0, totalStock - qty);
    }

    // Increment sales count
    dbProduct.unitsSold = (Number(dbProduct.unitsSold) || 0) + qty;

    // Save product (pre-save hook recalculates total stock and synchronizes variant size lists)
    await dbProduct.save();

    processedItems.push({
      product: dbProduct._id,
      name: dbProduct.name,
      image: item.image || dbProduct.thumbnail?.url || dbProduct.images?.[0]?.url || "",
      price: Number(dbProduct.price || item.price),
      quantity: qty,
      size: reqSize,
      color: reqColor,
    });
  }

  return processedItems;
}

/**
 * Restores inventory for an order upon cancellation.
 * Ensures strict idempotency: if already restored, does nothing.
 */
async function restoreOrderStock(order) {
  if (!order || order.stockRestored) {
    return { restored: false, alreadyRestored: true };
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    order.stockRestored = true;
    await order.save();
    return { restored: true, itemsRestored: 0 };
  }

  for (const item of order.items) {
    if (!item.product) continue;

    const prodId = item.product._id || item.product;
    if (!mongoose.Types.ObjectId.isValid(prodId)) continue;

    const dbProduct = await Product.findById(prodId);
    if (!dbProduct) continue;

    const qty = Number(item.quantity) || 1;
    const reqColor = item.color ? String(item.color).trim() : "";
    const reqSize = item.size ? String(item.size).trim() : "";

    const hasColorVariants = Array.isArray(dbProduct.colorVariants) && dbProduct.colorVariants.length > 0;

    if (hasColorVariants && reqColor) {
      const cv = dbProduct.colorVariants.find((v) => matches(v.color, reqColor));

      if (cv && Array.isArray(cv.inventory) && cv.inventory.length > 0 && reqSize) {
        const inv = cv.inventory.find((i) => matches(i.size, reqSize));
        if (inv) {
          inv.quantity = (Number(inv.quantity) || 0) + qty;
        } else {
          // If size was somehow missing, recreate size slot in this color variant
          cv.inventory.push({ size: reqSize, quantity: qty });
        }
      } else if (cv) {
        dbProduct.stock = (Number(dbProduct.stock) || 0) + qty;
      }
    } else {
      dbProduct.stock = (Number(dbProduct.stock) || 0) + qty;
    }

    // Decrement units sold safely
    dbProduct.unitsSold = Math.max(0, (Number(dbProduct.unitsSold) || 0) - qty);

    await dbProduct.save();
  }

  order.stockRestored = true;
  await order.save();

  return { restored: true, itemsRestored: order.items.length };
}


/**
 * Validates inventory availability for a list of items WITHOUT deducting stock.
 * Used for Razorpay orders where stock deduction is deferred to payment verification.
 * Throws an ApiError if any variant is out of stock or quantity exceeds available stock.
 * Returns a snapshot of item data (same shape as validateAndDeductStock).
 */
async function validateStockAvailability(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const processedItems = [];

  for (const item of items) {
    const prodId = item.product || item._id || item.id;
    let dbProduct = null;

    if (prodId && /^[0-9a-fA-F]{24}$/.test(String(prodId))) {
      dbProduct = await Product.findById(prodId);
    } else if (item.name) {
      dbProduct = await Product.findOne({ name: item.name });
    }

    const qty = Number(item.quantity || item.qty) || 1;
    const reqColor = item.color ? String(item.color).trim() : "";
    const reqSize = item.size ? String(item.size).trim() : "";

    if (!dbProduct) {
      // Product not in DB (e.g. custom) — allow with snapshot
      processedItems.push({
        product: undefined,
        name: item.name || "Custom Item",
        image: item.image || "",
        price: Number(item.price) || 0,
        quantity: qty,
        size: reqSize,
        color: reqColor,
      });
      continue;
    }

    if (dbProduct.status !== "active") {
      throw new ApiError(400, `"${dbProduct.name}" is no longer available`);
    }

    const hasColorVariants = Array.isArray(dbProduct.colorVariants) && dbProduct.colorVariants.length > 0;

    if (hasColorVariants && reqColor) {
      const cv = dbProduct.colorVariants.find((v) => matches(v.color, reqColor));

      if (cv && Array.isArray(cv.inventory) && cv.inventory.length > 0 && reqSize) {
        const inv = cv.inventory.find((i) => matches(i.size, reqSize));

        if (!inv || Number(inv.quantity) <= 0) {
          throw new ApiError(
            400,
            `Size "${reqSize}" in "${reqColor}" for "${dbProduct.name}" is currently out of stock`
          );
        }

        const availableQty = Number(inv.quantity);
        if (availableQty < qty) {
          throw new ApiError(
            400,
            `Only ${availableQty} ${availableQty === 1 ? "item is" : "items are"} available in ${reqColor} / ${reqSize}.`
          );
        }
        // NOTE: No deduction — this is a read-only check
      } else if (cv && Array.isArray(cv.sizes) && cv.sizes.length > 0 && reqSize) {
        const totalStock = Number(dbProduct.stock) || 0;
        if (totalStock < qty) {
          throw new ApiError(400, `Not enough stock for ${dbProduct.name} (${reqColor}, ${reqSize})`);
        }
        // NOTE: No deduction
      }
    } else {
      const totalStock = Number(dbProduct.stock) || 0;
      if (totalStock < qty) {
        throw new ApiError(400, `Only ${totalStock} items available for "${dbProduct.name}"`);
      }
      // NOTE: No deduction
    }

    processedItems.push({
      product: dbProduct._id,
      name: dbProduct.name,
      image: item.image || dbProduct.thumbnail?.url || dbProduct.images?.[0]?.url || "",
      price: Number(dbProduct.price || item.price),
      quantity: qty,
      size: reqSize,
      color: reqColor,
    });
  }

  return processedItems;
}

module.exports = {
  validateAndDeductStock,
  validateStockAvailability,
  restoreOrderStock,
};
