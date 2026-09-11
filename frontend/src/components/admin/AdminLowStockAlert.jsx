import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ArrowRight, RefreshCw } from "lucide-react";
import api from "../../utils/api";

export default function AdminLowStockAlert({ onNavigateSection }) {
  const [lowStockVariants, setLowStockVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchLowStockData = useCallback(async () => {
    setLoading(true);
    try {
      // Use admin-list endpoint (protected admin route) to get all current catalog products
      let res;
      try {
        res = await api.get("/api/products/admin-list?limit=1000");
      } catch {
        res = await api.get("/api/products?limit=1000");
      }
      const products = res?.data || [];
      const alerts = [];

      products.forEach((product) => {
        const hasColorVariants = Array.isArray(product.colorVariants) && product.colorVariants.length > 0;

        if (hasColorVariants) {
          product.colorVariants.forEach((cv) => {
            const colorName = cv.color ? String(cv.color).trim() : "";
            const hasInventory = Array.isArray(cv.inventory) && cv.inventory.length > 0;

            if (hasInventory) {
              cv.inventory.forEach((inv) => {
                const sizeName = inv.size ? String(inv.size).trim() : "";
                const qty = Number(inv.quantity);

                // Strict threshold: stock < 5 (0, 1, 2, 3, 4 trigger alert; >= 5 do not)
                if (!isNaN(qty) && qty < 5 && qty >= 0) {
                  alerts.push({
                    productId: product._id,
                    productName: product.name,
                    sku: product.sku,
                    color: colorName || "Default",
                    size: sizeName || "Standard",
                    stock: qty,
                  });
                }
              });
            } else if (Array.isArray(cv.sizes) && cv.sizes.length > 0) {
              // Legacy fallback if inventory array missing but sizes list present
              cv.sizes.forEach((s) => {
                const qty = Number(product.stock);
                if (!isNaN(qty) && qty < 5 && qty >= 0) {
                  alerts.push({
                    productId: product._id,
                    productName: product.name,
                    sku: product.sku,
                    color: colorName || "Default",
                    size: s,
                    stock: qty,
                  });
                }
              });
            }
          });
        } else {
          // Product without colorVariants (top-level stock)
          const qty = Number(product.stock);
          if (!isNaN(qty) && qty < 5 && qty >= 0) {
            alerts.push({
              productId: product._id,
              productName: product.name,
              sku: product.sku,
              color: null,
              size: null,
              stock: qty,
            });
          }
        }
      });

      setLowStockVariants(alerts);
    } catch (err) {
      console.error("Failed to load low stock inventory data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLowStockData();

    // Listen for real-time inventory updates across admin components
    const handleInventoryUpdate = () => {
      fetchLowStockData();
    };

    window.addEventListener("inventory-updated", handleInventoryUpdate);
    return () => {
      window.removeEventListener("inventory-updated", handleInventoryUpdate);
    };
  }, [fetchLowStockData]);

  // If no variants are under 5 stock, do not render the alert
  if (lowStockVariants.length === 0) {
    return null;
  }

  const isSingle = lowStockVariants.length === 1;
  const single = lowStockVariants[0];

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-4 sm:p-5 shadow-lg border-2 border-red-400/40 relative overflow-hidden transition-all animate-fadeIn">
      {/* Background Accent Graphics */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute right-20 -top-10 w-24 h-24 bg-amber-300/20 rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-3">
        {/* Top Alert Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-white shadow-xs shrink-0 mt-0.5 animate-pulse">
              <AlertTriangle size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-widest bg-white text-red-700 px-2.5 py-0.5 rounded-full shadow-2xs">
                  LOW STOCK — ACTION REQUIRED
                </span>
                <span className="text-xs font-semibold text-white/90">
                  {isSingle
                    ? "1 variant has stock below 5"
                    : `${lowStockVariants.length} variants have stock below 5`}
                </span>
              </div>

              {isSingle ? (
                <div className="mt-1.5 text-sm sm:text-base font-semibold text-white flex items-center gap-2 flex-wrap">
                  <span className="underline decoration-white/50 underline-offset-2">{single.productName}</span>
                  {single.color && single.size && (
                    <span className="text-white/90 font-medium text-xs sm:text-sm bg-black/20 px-2.5 py-0.5 rounded-lg border border-white/15">
                      {single.color} — {single.size}
                    </span>
                  )}
                  <span className="font-bold text-amber-200 bg-red-950/40 px-2 py-0.5 rounded-md text-xs sm:text-sm border border-amber-300/30">
                    {single.stock === 0 ? "Out of stock (0 left)" : `Only ${single.stock} left`}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-white/85 mt-1">
                  Urgent restock needed. The items listed below have strictly less than 5 units available.
                </p>
              )}
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={fetchLowStockData}
              disabled={loading}
              title="Refresh stock status"
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>

            {onNavigateSection && (
              <button
                type="button"
                onClick={() => onNavigateSection("inventory")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-red-700 hover:bg-red-50 text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                <span>Manage in Inventory</span>
                <ArrowRight size={14} />
              </button>
            )}

            {!isSingle && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>{expanded ? "Hide List" : `View All (${lowStockVariants.length})`}</span>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
        </div>

        {/* Detailed Variant List for Multiple Low-Stock Items */}
        {!isSingle && (expanded || lowStockVariants.length <= 3) && (
          <div className="pt-2 border-t border-white/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {lowStockVariants.map((item, idx) => (
                <div
                  key={`${item.productId}-${item.color}-${item.size}-${idx}`}
                  onClick={() => onNavigateSection && onNavigateSection("inventory")}
                  className="bg-black/25 hover:bg-black/35 backdrop-blur-md rounded-xl p-2.5 text-xs flex items-center justify-between gap-2 border border-white/15 cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{item.productName}</p>
                    <p className="text-[11px] text-white/80 truncate">
                      {item.color && item.size ? `${item.color} — ${item.size}` : item.sku || "All variants"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                        item.stock === 0
                          ? "bg-red-950/80 text-red-200 border-red-400/50"
                          : "bg-amber-400 text-amber-950 border-amber-300"
                      }`}
                    >
                      {item.stock === 0 ? "0 left" : `${item.stock} left`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
