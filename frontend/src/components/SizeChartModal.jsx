import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info, Ruler } from "lucide-react";
import {
  getVariantMeasurements,
  normalizeSizeName,
} from "../data/sizeChartData";

export default function SizeChartModal({
  isOpen,
  onClose,
  product,
  selectedVariant,
  selectedColor,
  selectedSize,
  availableSizes = [],
}) {
  // Prevent background page scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const { rows, activeColumns } = useMemo(() => {
    return getVariantMeasurements(product, selectedVariant);
  }, [product, selectedVariant]);

  const normSelected = normalizeSizeName(selectedSize);
  const normAvailable = new Set((availableSizes || []).map(normalizeSizeName));

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 sm:py-8 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="size-chart-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-primary/25 backdrop-blur-[4px] transition-opacity"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-soft border border-primary/10 flex flex-col z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-primary/10 bg-white/95 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <Ruler size={18} />
                </div>
                <div>
                  <h2
                    id="size-chart-title"
                    className="font-display text-xl sm:text-2xl font-semibold text-primary"
                  >
                    Size Chart
                  </h2>
                  <p className="text-xs text-ink/60 truncate max-w-xs sm:max-w-md">
                    {product?.name || "Product"}
                    {selectedColor ? ` · Color: ${selectedColor}` : ""}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink/45 hover:text-primary hover:bg-primary/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
                aria-label="Close size chart"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Area with Vertical Scroll */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-ink">
              {/* Unit Notice / Subtitle */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 bg-bg/70 rounded-xl px-4 py-2.5 border border-primary/5">
                <div className="flex items-center gap-2 text-xs text-ink/75">
                  <Info size={14} className="text-accent shrink-0" />
                  <span>
                    Measurements are displayed in <strong>inches (in)</strong> for this item.
                  </span>
                </div>
                {selectedSize && (
                  <span className="text-xs font-semibold text-primary bg-white px-2.5 py-1 rounded-md border border-primary/10 shadow-2xs">
                    Current selection: <span className="text-accent font-bold">{selectedSize}</span>
                  </span>
                )}
              </div>

              {/* Horizontally Scrollable Table Container */}
              {rows.length === 0 ? (
                <div className="text-center py-8 bg-bg/40 rounded-xl border border-dashed border-primary/15 text-xs text-ink/60">
                  No size measurements configured for this selection.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-primary/15 shadow-2xs bg-white">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[500px]">
                    <thead>
                      <tr className="bg-[#FAF7F2] text-primary font-semibold border-b border-primary/15">
                        <th
                          scope="col"
                          className="py-3.5 px-3.5 sm:px-4 font-bold text-accent text-[11px] sm:text-xs uppercase tracking-wider bg-accent/5 border-r border-primary/10"
                        >
                          Size
                        </th>
                        {activeColumns.map((col, idx) => (
                          <th
                            key={col.key}
                            scope="col"
                            className={`py-3.5 px-3.5 sm:px-4 font-semibold text-[11px] sm:text-xs uppercase tracking-wider text-primary ${
                              idx < activeColumns.length - 1 ? "border-r border-primary/10" : ""
                            }`}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/10">
                      {rows.map((row) => {
                        const isCurrentRow = normSelected === normalizeSizeName(row.size);
                        const isAvailable =
                          normAvailable.size === 0 ||
                          normAvailable.has(normalizeSizeName(row.size));

                        return (
                          <tr
                            key={row.size}
                            className={`transition-colors ${
                              isCurrentRow
                                ? "bg-accent/10 font-medium"
                                : "hover:bg-primary/[0.02]"
                            }`}
                          >
                            {/* Size Name */}
                            <td className="py-3 px-3.5 sm:px-4 border-r border-primary/10 whitespace-nowrap bg-accent/[0.02]">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-primary text-xs sm:text-sm">
                                  {row.size}
                                </span>
                                {isCurrentRow && (
                                  <span className="text-[10px] bg-accent text-white font-bold px-1.5 py-0.5 rounded leading-none">
                                    Selected
                                  </span>
                                )}
                                {!isAvailable && normAvailable.size > 0 && (
                                  <span className="text-[10px] text-ink/40 font-normal">
                                    (Out of Stock)
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Active Measurement Columns */}
                            {activeColumns.map((col, idx) => (
                              <td
                                key={col.key}
                                className={`py-3 px-3.5 sm:px-4 whitespace-nowrap text-ink/80 ${
                                  idx < activeColumns.length - 1 ? "border-r border-primary/10" : ""
                                }`}
                              >
                                {row[col.key] || "—"}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Measuring Guidelines */}
              <div className="mt-5 p-4 rounded-xl bg-bg border border-primary/10 text-xs text-ink/75 space-y-1.5">
                <p className="font-semibold text-primary text-xs uppercase tracking-wide">
                  How to Measure
                </p>
                <ul className="list-disc list-inside space-y-1 text-ink/70">
                  <li><strong>Bust:</strong> Measure around the fullest part across chest.</li>
                  <li><strong>Waist:</strong> Measure around your natural waistline.</li>
                  <li><strong>Hip:</strong> Measure around the fullest part of your hips.</li>
                  <li><strong>Shoulder:</strong> Measure straight across the back from shoulder to shoulder.</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 sm:px-7 py-3 bg-bg/60 border-t border-primary/10 flex justify-end shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors focus:outline-none cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
