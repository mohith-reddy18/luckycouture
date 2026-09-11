import { useState, useEffect } from "react";
import { Boxes, Edit2, Save, X, Search, AlertTriangle, Check, Layers, Loader2 } from "lucide-react";
import api from "../../utils/api";
import { useApp } from "../../context/AppContext";

export default function AdminInventory() {
  const { notify } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editVariants, setEditVariants] = useState([]);
  const [editSingleStock, setEditSingleStock] = useState("");
  const [search, setSearch] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let res;
      try {
        res = await api.get("/api/products/admin-list?limit=1000");
      } catch {
        res = await api.get("/api/products?limit=1000");
      }
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
      notify("Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleEdit = (product) => {
    setEditingId(product._id);
    setValidationErrors((prev) => ({ ...prev, [product._id]: null }));

    const hasColorVariants = Array.isArray(product.colorVariants) && product.colorVariants.length > 0;

    if (hasColorVariants) {
      // Deep clone colorVariants to ensure completely independent editing
      const cloned = product.colorVariants.map((cv) => {
        let inventoryList = [];
        if (Array.isArray(cv.inventory) && cv.inventory.length > 0) {
          inventoryList = cv.inventory.map((inv) => ({
            ...inv,
            size: inv.size ? String(inv.size).trim() : "",
            quantity: inv.quantity !== undefined && inv.quantity !== null ? String(inv.quantity) : "0",
          }));
        } else if (Array.isArray(cv.sizes) && cv.sizes.length > 0) {
          inventoryList = cv.sizes.map((s) => ({
            size: s,
            quantity: "0",
          }));
        } else if (Array.isArray(product.sizes) && product.sizes.length > 0) {
          inventoryList = product.sizes.map((s) => ({
            size: s,
            quantity: "0",
          }));
        }

        return {
          ...cv,
          color: cv.color ? String(cv.color).trim() : "Default",
          inventory: inventoryList,
        };
      });

      setEditVariants(cloned);
      setEditSingleStock(product.stock !== undefined && product.stock !== null ? String(product.stock) : "0");
    } else {
      setEditVariants([]);
      setEditSingleStock(product.stock !== undefined && product.stock !== null ? String(product.stock) : "0");
    }
  };

  const handleVariantStockChange = (colorIdx, sizeIdx, val) => {
    // Store raw string in state to allow Backspace / Delete to leave field temporarily empty while typing
    setEditVariants((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (copy[colorIdx] && copy[colorIdx].inventory && copy[colorIdx].inventory[sizeIdx]) {
        copy[colorIdx].inventory[sizeIdx].quantity = val;
      }
      return copy;
    });

    if (editingId) {
      setValidationErrors((prev) => ({ ...prev, [editingId]: null }));
    }
  };

  const handleSingleStockChange = (val) => {
    setEditSingleStock(val);
    if (editingId) {
      setValidationErrors((prev) => ({ ...prev, [editingId]: null }));
    }
  };

  const handleSave = async (id) => {
    const product = products.find((p) => p._id === id);
    if (!product) return;

    const hasColorVariants = Array.isArray(editVariants) && editVariants.length > 0;
    const invalidItems = [];

    if (hasColorVariants) {
      editVariants.forEach((cv) => {
        const colorName = cv.color ? String(cv.color).trim() : "Default";
        (cv.inventory || []).forEach((inv) => {
          const sizeName = String(inv.size || "").trim();
          const rawVal = inv.quantity;
          const strVal = String(rawVal ?? "").trim();

          if (strVal === "") {
            invalidItems.push({
              color: colorName,
              size: sizeName,
              reason: "Stock quantity is required.",
            });
          } else {
            const num = Number(strVal);
            if (isNaN(num) || !Number.isFinite(num)) {
              invalidItems.push({
                color: colorName,
                size: sizeName,
                reason: "Invalid stock quantity. Please enter a valid non-negative number.",
              });
            } else if (num < 0) {
              invalidItems.push({
                color: colorName,
                size: sizeName,
                reason: `Invalid stock quantity: ${strVal}. Stock cannot be negative.`,
              });
            }
          }
        });
      });
    } else {
      const strVal = String(editSingleStock ?? "").trim();
      if (strVal === "") {
        invalidItems.push({
          color: "General Stock",
          size: "General",
          reason: "Stock quantity is required.",
        });
      } else {
        const num = Number(strVal);
        if (isNaN(num) || !Number.isFinite(num)) {
          invalidItems.push({
            color: "General Stock",
            size: "General",
            reason: "Invalid stock quantity. Please enter a valid non-negative number.",
          });
        } else if (num < 0) {
          invalidItems.push({
            color: "General Stock",
            size: "General",
            reason: `Invalid stock quantity: ${strVal}. Stock cannot be negative.`,
          });
        }
      }
    }

    if (invalidItems.length > 0) {
      setValidationErrors((prev) => ({ ...prev, [id]: invalidItems }));
      notify("⚠ Inventory error — please check invalid stock values before saving.");
      return;
    }

    setValidationErrors((prev) => ({ ...prev, [id]: null }));
    setSavingId(id);
    try {
      let payload = {};

      if (hasColorVariants) {
        // Clean and prepare colorVariants with authoritative integer quantities (0 is accepted)
        const cleanVariants = editVariants.map((cv) => ({
          ...cv,
          color: cv.color ? cv.color.trim() : "",
          inventory: (cv.inventory || []).map((inv) => ({
            ...inv,
            size: String(inv.size || "").trim(),
            quantity: Math.max(0, Math.floor(Number(inv.quantity))),
          })),
          sizes: (cv.inventory || []).map((inv) => String(inv.size || "").trim()).filter(Boolean),
        }));

        payload = { colorVariants: cleanVariants };
      } else {
        payload = { stock: Math.max(0, Math.floor(Number(editSingleStock))) };
      }

      const res = await api.patch(`/api/products/${id}`, payload);
      const updatedProduct = res.data;

      notify("Inventory updated successfully!");
      setEditingId(null);

      // Update local state with latest authoritative backend document
      setProducts((prev) =>
        prev.map((p) => (p._id === id ? { ...p, ...updatedProduct } : p))
      );

      // Trigger global inventory update event for alerts & metrics
      window.dispatchEvent(new Event("inventory-updated"));
    } catch (err) {
      console.error(err);
      notify(err.message || "Failed to update inventory");
    } finally {
      setSavingId(null);
    }
  };

  // Helper to check if a product has any variant with stock < 5
  const hasLowStockVariant = (product) => {
    if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
      return product.colorVariants.some((cv) =>
        Array.isArray(cv.inventory) && cv.inventory.some((inv) => Number(inv.quantity) < 5)
      );
    }
    return Number(product.stock) < 5;
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
      (p.colors && p.colors.some((c) => c.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 md:p-8 border-l-4 border-accent space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Boxes size={20} className="text-accent" />
            <h3 className="font-display text-xl font-semibold text-primary">
              Inventory &amp; Stock Manager
            </h3>
          </div>
          <p className="text-xs text-ink/60">
            Monitor real-time stock levels and configure independent inventory for every Color + Size combination.
          </p>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            type="text"
            placeholder="Search products or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-primary/15 focus:border-accent outline-none w-full sm:w-64 bg-bg/40 focus:bg-white"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-bg/50 text-xs uppercase font-semibold text-primary">
            <tr>
              <th className="px-4 py-3 rounded-l-xl">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Total Stock</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">MRP</th>
              <th className="px-4 py-3 rounded-r-xl text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/5">
            {loading ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-ink/50 text-xs">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin text-accent" />
                    <span>Loading real-time catalog inventory...</span>
                  </div>
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-ink/50 text-xs">
                  No products found.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const isEditing = editingId === p._id;
                const isLow = hasLowStockVariant(p);

                return (
                  <tr key={p._id} className="group">
                    <td colSpan="6" className="p-0 border-b border-primary/10">
                      {/* Standard Product Row */}
                      <div
                        className={`flex items-center justify-between px-4 py-3.5 transition-colors ${
                          isEditing ? "bg-accent/5 border-l-4 border-accent" : "hover:bg-bg/30"
                        }`}
                      >
                        {/* Product Info */}
                        <div className="flex items-center gap-3 w-1/3 min-w-[200px]">
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-bg shrink-0 border border-primary/10">
                            {p.thumbnail?.url ? (
                              <img src={p.thumbnail.url} alt="" className="w-full h-full object-cover" />
                            ) : p.images?.[0]?.url ? (
                              <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-ink/30">
                                <Boxes size={18} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-primary block truncate">{p.name}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {p.colorVariants?.length > 0 ? (
                                <span className="text-[10px] text-ink/50 bg-bg px-2 py-0.5 rounded-md font-mono">
                                  {p.colorVariants.length} color{p.colorVariants.length === 1 ? "" : "s"}
                                </span>
                              ) : null}
                              {p.sizes?.length > 0 ? (
                                <span className="text-[10px] text-ink/50 bg-bg px-2 py-0.5 rounded-md font-mono">
                                  {p.sizes.length} size{p.sizes.length === 1 ? "" : "s"}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* SKU */}
                        <div className="w-1/6 px-4 text-xs font-mono text-ink/70">{p.sku || "—"}</div>

                        {/* Total Stock */}
                        <div className="w-1/6 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-display text-base font-bold ${
                                isLow ? "text-red-600" : "text-emerald-700"
                              }`}
                            >
                              {p.stock ?? 0}
                            </span>
                            {isLow ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                                <AlertTriangle size={10} />
                                <span>&lt; 5 Alert</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <Check size={10} />
                                <span>In Stock</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="w-1/6 px-4 text-xs font-semibold text-primary">₹{p.price}</div>

                        {/* MRP */}
                        <div className="w-1/6 px-4 text-xs text-ink/50 line-through">₹{p.mrp}</div>

                        {/* Action Button */}
                        <div className="w-1/12 text-right">
                          <button
                            type="button"
                            onClick={() => (isEditing ? setEditingId(null) : handleEdit(p))}
                            className={`p-2 rounded-xl transition-all cursor-pointer ${
                              isEditing
                                ? "bg-primary text-bg shadow-sm"
                                : "text-accent hover:bg-accent/10 border border-transparent hover:border-accent/20"
                            }`}
                            title={isEditing ? "Close editor" : "Edit variant inventory"}
                          >
                            {isEditing ? <X size={16} /> : <Edit2 size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Detailed Color + Size Variant Inventory Editor */}
                      {isEditing && (
                        <div className="bg-bg/50 border-t border-primary/10 p-5 sm:p-6 space-y-5 animate-fadeIn">
                          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-primary/10">
                            <div className="flex items-center gap-2">
                              <Layers size={18} className="text-accent" />
                              <h4 className="font-display text-sm sm:text-base font-bold text-primary">
                                Variant Inventory Editor — <span className="text-accent">{p.name}</span>
                              </h4>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs text-ink/60 font-medium">
                                Calculated Total:{" "}
                                <strong className="text-primary font-bold">
                                  {editVariants.length > 0
                                    ? editVariants.reduce(
                                        (sum, cv) =>
                                          sum +
                                          (cv.inventory || []).reduce(
                                            (s, inv) => s + (Number(inv.quantity) || 0),
                                            0
                                          ),
                                        0
                                      )
                                    : Number(editSingleStock) || 0}{" "}
                                  units
                                </strong>
                              </span>
                            </div>
                          </div>

                          {/* Render Color Variants Editor */}
                          {editVariants.length > 0 ? (
                            <div className="space-y-4">
                              {editVariants.map((cv, colorIdx) => {
                                const colorTotal = (cv.inventory || []).reduce(
                                  (sum, inv) => sum + (Number(inv.quantity) || 0),
                                  0
                                );

                                return (
                                  <div
                                    key={`color-${cv.color}-${colorIdx}`}
                                    className="bg-white rounded-xl p-4 border border-primary/15 shadow-2xs space-y-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="w-3.5 h-3.5 rounded-full bg-accent/80 border border-primary/20 shrink-0 inline-block" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                                          Color: {cv.color || "Default"}
                                        </span>
                                      </div>
                                      <span className="text-[11px] text-ink/60 font-medium">
                                        Subtotal: <strong className="text-primary">{colorTotal} pcs</strong>
                                      </span>
                                    </div>

                                    {cv.inventory && cv.inventory.length > 0 ? (
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
                                        {cv.inventory.map((inv, sizeIdx) => {
                                          const qty = Number(inv.quantity) || 0;
                                          const isVariantLow = qty < 5;

                                          return (
                                            <div
                                              key={`inv-${cv.color}-${inv.size}-${sizeIdx}`}
                                              className={`p-3 rounded-xl border transition-all ${
                                                isVariantLow
                                                  ? "bg-red-50/70 border-red-200"
                                                  : "bg-bg/40 border-primary/10 hover:border-primary/25"
                                              }`}
                                            >
                                              <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-bold text-primary font-mono">
                                                  Size {inv.size}
                                                </span>
                                                <span
                                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                                    qty === 0
                                                      ? "bg-red-200 text-red-900"
                                                      : isVariantLow
                                                      ? "bg-amber-200 text-amber-900"
                                                      : "bg-green-100 text-green-800"
                                                  }`}
                                                >
                                                  {qty === 0 ? "0 (Out)" : isVariantLow ? `${qty} (<5)` : "OK"}
                                                </span>
                                              </div>

                                              <div className="flex items-center gap-1.5">
                                                <input
                                                  type="number"
                                                  min="0"
                                                  value={inv.quantity ?? ""}
                                                  onChange={(e) =>
                                                    handleVariantStockChange(colorIdx, sizeIdx, e.target.value)
                                                  }
                                                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border font-bold text-primary bg-white outline-none focus:border-accent ${
                                                    isVariantLow ? "border-red-300" : "border-primary/20"
                                                  }`}
                                                  placeholder="0"
                                                />
                                                <span className="text-[10px] text-ink/50 shrink-0">pcs</span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-ink/50 italic py-2">
                                        No size variants configured for this color.
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            /* Fallback for products without color variants */
                            <div className="bg-white rounded-xl p-4 border border-primary/15 shadow-2xs space-y-3">
                              <label className="block text-xs font-semibold text-primary mb-1">
                                Product General Stock Quantity
                              </label>
                              <div className="flex items-center gap-2 max-w-xs">
                                <input
                                  type="number"
                                  min="0"
                                  value={editSingleStock ?? ""}
                                  onChange={(e) => handleSingleStockChange(e.target.value)}
                                  className="w-32 px-3 py-2 text-xs rounded-lg border border-primary/20 font-bold text-primary outline-none focus:border-accent"
                                  placeholder="0"
                                />
                                <span className="text-xs text-ink/60">units</span>
                              </div>
                            </div>
                          )}

                          {/* Validation Errors Alert Banner */}
                          {validationErrors[p._id] && validationErrors[p._id].length > 0 && (
                            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 space-y-2 text-xs text-red-950 shadow-sm animate-fadeIn">
                              <div className="flex items-center gap-2 font-bold text-red-700 uppercase tracking-wider text-[11px]">
                                <AlertTriangle size={16} className="shrink-0 text-red-600" />
                                <span>⚠ INVENTORY ERROR — IMMEDIATE ATTENTION REQUIRED</span>
                              </div>
                              <p className="text-red-900/90 font-semibold">
                                {validationErrors[p._id].length === 1
                                  ? "Please check the following inventory value:"
                                  : "Please check these inventory values:"}
                              </p>
                              <ul className="space-y-1.5 pl-1">
                                {validationErrors[p._id].map((errItem, errIdx) => (
                                  <li key={errIdx} className="bg-white border border-red-200 rounded-lg p-2.5 shadow-2xs">
                                    <strong className="block text-red-950 font-bold">
                                      {errItem.color ? `Color: ${errItem.color}` : ""}{errItem.color && errItem.size ? " · " : ""}{errItem.size ? `Size: ${errItem.size}` : ""}
                                    </strong>
                                    <span className="text-red-800 text-[11px] font-medium">{errItem.reason}</span>
                                  </li>
                                ))}
                              </ul>
                              <p className="text-red-800 text-[11px] font-bold pt-1">
                                Please enter a valid non-negative stock quantity before saving. Save is blocked until all fields are valid.
                              </p>
                            </div>
                          )}

                          {/* Save & Cancel Controls */}
                          <div className="flex items-center justify-end gap-3 pt-3 border-t border-primary/10">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              disabled={savingId === p._id}
                              className="px-4 py-2 text-xs font-semibold rounded-xl border border-primary/20 text-ink/70 hover:bg-bg transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSave(p._id)}
                              disabled={savingId === p._id}
                              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-accent hover:bg-accent/90 text-white shadow-card transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {savingId === p._id ? (
                                <Loader2 size={14} className="animate-spin text-white" />
                              ) : (
                                <Save size={14} />
                              )}
                              <span>{savingId === p._id ? "Saving Variant Stock..." : "Save Variant Stock"}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
