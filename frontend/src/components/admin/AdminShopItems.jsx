import { useState, useEffect, useCallback, useRef } from "react";
import {
  ShoppingBag, Trash2, ExternalLink, Search, Plus, Pencil, X,
  Upload, Star, ToggleLeft, ToggleRight, ImageIcon, Loader2, Tag,
} from "lucide-react";
import api from "../../utils/api";
import { useApp } from "../../context/AppContext";

const STATUS_OPTIONS = [
  { value: "active", label: "Active (Visible in Shop)" },
  { value: "draft", label: "Draft (Hidden)" },
  { value: "archived", label: "Archived" },
];

const EMPTY_FORM = {
  name: "",
  category: "",
  description: "",
  price: "",
  mrp: "",
  sku: "",
  fabric: "",
  stock: "",
  sizes: [],
  colors: [],
  tags: [],
  specifications: [], // [{label, value}]
  isFeatured: false,
  isBestseller: false,
  isNewArrival: false,
  tailoringAvailable: true,
  status: "active",
  images: [],
  thumbnail: null,
};

// ----- Small helpers (inline so the file is self-contained) -----

function TagInput({ label, values, onChange, placeholder }) {
  const [input, setInput] = useState("");
  const addTag = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  };
  return (
    <div>
      <label className="block text-xs font-semibold text-primary mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-full">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="hover:text-red-500">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-xs rounded-xl border border-primary/15 focus:border-accent outline-none"
        />
        <button type="button" onClick={addTag} className="px-3 py-2 text-xs bg-primary text-bg rounded-xl hover:bg-primary/80 transition-colors">Add</button>
      </div>
    </div>
  );
}

function SpecificationRows({ specs, onChange }) {
  const addRow = () => onChange([...specs, { label: "", value: "" }]);
  const removeRow = (i) => onChange(specs.filter((_, idx) => idx !== i));
  const updateRow = (i, key, val) => onChange(specs.map((s, idx) => idx === i ? { ...s, [key]: val } : s));

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-primary">Product Specifications</label>
        <button type="button" onClick={addRow} className="text-xs text-accent hover:underline flex items-center gap-1">
          <Plus size={11} /> Add Row
        </button>
      </div>
      {specs.length === 0 && (
        <p className="text-[11px] text-ink/40 mb-1">No specs added yet. E.g. Fabric: Pure Silk, Wash Care: Dry clean only.</p>
      )}
      <div className="space-y-2">
        {specs.map((spec, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              value={spec.label}
              onChange={(e) => updateRow(i, "label", e.target.value)}
              placeholder="Label (e.g. Fabric)"
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-primary/15 focus:border-accent outline-none"
            />
            <input
              value={spec.value}
              onChange={(e) => updateRow(i, "value", e.target.value)}
              placeholder="Value (e.g. Pure Silk)"
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-primary/15 focus:border-accent outline-none"
            />
            <button type="button" onClick={() => removeRow(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageUploadZone({ images, onAdd, onRemove, onSetThumbnail, thumbnail, uploading }) {
  const inputRef = useRef(null);
  return (
    <div>
      <label className="block text-xs font-semibold text-primary mb-1.5">Product Images</label>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {images.map((img, i) => (
            <div key={img.publicId || i} className="relative group w-20 h-20 rounded-xl overflow-hidden border-2 border-primary/10">
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <button
                  type="button"
                  title="Set as main image"
                  onClick={() => onSetThumbnail(img)}
                  className={`p-1 rounded-full text-white ${thumbnail?.publicId === img.publicId ? "bg-accent" : "bg-white/30 hover:bg-accent"}`}
                >
                  <Star size={11} />
                </button>
                <button type="button" title="Remove" onClick={() => onRemove(img)} className="p-1 bg-white/30 hover:bg-red-500 rounded-full text-white">
                  <X size={11} />
                </button>
              </div>
              {thumbnail?.publicId === img.publicId && (
                <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-accent text-white px-1 rounded">Main</span>
              )}
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary/20 text-xs text-ink/60 hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {uploading ? "Uploading..." : "Click to upload images (JPG / PNG / WEBP, max 10 MB each)"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => onAdd(Array.from(e.target.files || []))}
      />
      <p className="text-[10px] text-ink/40 mt-1">Click ★ on a preview to set the main product image.</p>
    </div>
  );
}

// ----- Main component -----

export default function AdminShopItems() {
  const { notify } = useApp();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/products/admin-list?limit=200");
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
      notify("Failed to load shop items.");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchProducts();
    api.get("/api/categories?limit=100")
      .then((res) => {
        const allCats = res.data || [];
        const shopCats = allCats.filter((c) => c.type !== "design" && c.isActive !== false);
        setCategories(shopCats.length > 0 ? shopCats : allCats);
      })
      .catch(() => {});
  }, [fetchProducts]);

  const openAdd = () => {
    setEditingId(null);
    const defaultCatId = categories[0]?._id || "";
    setForm({
      ...EMPTY_FORM,
      category: defaultCatId,
    });
    setShowForm(true);
  };

  const openEdit = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name || "",
      category: product.category?._id || product.category || "",
      description: product.description || "",
      price: product.price ?? "",
      mrp: product.mrp ?? "",
      sku: product.sku || "",
      fabric: product.fabric || "",
      stock: product.stock ?? "",
      sizes: product.sizes || [],
      colors: product.colors || [],
      tags: product.tags || [],
      specifications: product.specifications || [],
      isFeatured: Boolean(product.isFeatured),
      isBestseller: Boolean(product.isBestseller),
      isNewArrival: Boolean(product.isNewArrival),
      tailoringAvailable: Boolean(product.tailoringAvailable ?? true),
      status: product.status || "active",
      images: product.images || [],
      thumbnail: product.thumbnail || null,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleImageFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("images", f));
      fd.append("folder", "lucky-couture/products");
      const res = await api.uploadFiles("/api/uploads/multiple", fd);
      const uploaded = res.data || [];
      const newImages = [...form.images, ...uploaded];
      setForm((f) => ({
        ...f,
        images: newImages,
        thumbnail: f.thumbnail || newImages[0] || null,
      }));
    } catch (err) {
      notify(`Image upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (img) => {
    const newImages = form.images.filter((i) => i.publicId !== img.publicId);
    setForm((f) => ({
      ...f,
      images: newImages,
      thumbnail: f.thumbnail?.publicId === img.publicId ? (newImages[0] || null) : f.thumbnail,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { notify("Please enter a product name."); return; }
    if (!form.category) { notify("Please select a category."); return; }
    if (form.price === "" || Number(form.price) < 0) { notify("Please enter a valid price."); return; }
    if (form.mrp === "" || Number(form.mrp) < 0) { notify("Please enter a valid MRP."); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        mrp: Number(form.mrp),
        stock: form.stock !== "" ? Number(form.stock) : 0,
        // Filter out empty spec rows
        specifications: form.specifications.filter((s) => s.label.trim() && s.value.trim()),
      };

      if (editingId) {
        const res = await api.patch(`/api/products/${editingId}`, payload);
        setProducts((prev) => prev.map((p) => p._id === editingId ? res.data : p));
        notify("Shop item updated successfully.");
      } else {
        const res = await api.post("/api/products", payload);
        setProducts((prev) => [res.data, ...prev]);
        notify("Shop item added successfully.");
      }
      closeForm();
    } catch (err) {
      console.error(err);
      notify(err.message || "Unable to save shop item. Please check the entered information.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this shop item? This cannot be undone.")) return;
    try {
      await api.delete(`/api/products/${id}`);
      setProducts((prev) => prev.filter((p) => p._id !== id));
      notify("Shop item deleted successfully.");
    } catch {
      notify("Unable to delete shop item. Please try again.");
    }
  };

  const handleToggleStatus = async (product) => {
    const newStatus = product.status === "active" ? "draft" : "active";
    try {
      const res = await api.patch(`/api/products/${product._id}`, { status: newStatus });
      setProducts((prev) => prev.map((p) => p._id === product._id ? res.data : p));
      notify(`Item ${newStatus === "active" ? "enabled" : "disabled"}.`);
    } catch {
      notify("Unable to update status.");
    }
  };

  const handleToggleFeatured = async (product) => {
    try {
      const res = await api.patch(`/api/products/${product._id}`, { isFeatured: !product.isFeatured });
      setProducts((prev) => prev.map((p) => p._id === product._id ? res.data : p));
      notify(product.isFeatured ? "Removed from featured." : "Marked as featured.");
    } catch {
      notify("Unable to update featured status.");
    }
  };

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    (p.category?.name && p.category.name.toLowerCase().includes(search.toLowerCase()))
  );

  const StatusBadge = ({ status }) => {
    const colors = { active: "bg-green-100 text-green-700", draft: "bg-yellow-100 text-yellow-700", archived: "bg-gray-100 text-gray-500" };
    return (
      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors[status] || "bg-gray-100 text-gray-500"}`}>
        {status}
      </span>
    );
  };

  const discountPct = form.price && form.mrp && Number(form.mrp) > Number(form.price)
    ? Math.round(100 - (Number(form.price) / Number(form.mrp)) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-card p-5 md:p-6 border-l-4 border-accent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <ShoppingBag size={20} className="text-accent" />
              <h3 className="font-display text-xl font-semibold text-primary">Shop Items Management</h3>
            </div>
            <p className="text-xs text-ink/60">Add, edit, enable/disable and manage all items in the public shop.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs rounded-xl border border-primary/15 focus:border-accent outline-none w-52"
              />
            </div>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 bg-accent text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-accent/85 transition-colors shadow-sm"
            >
              <Plus size={14} /> Add Item
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form Panel */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-card border border-primary/10 p-5 md:p-7">
          <div className="flex items-center justify-between mb-5">
            <h4 className="font-display text-base font-semibold text-primary">
              {editingId ? "Edit Shop Item" : "Add New Shop Item"}
            </h4>
            <button onClick={closeForm} className="p-1.5 hover:bg-bg rounded-lg transition-colors text-ink/50">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-primary mb-1">Product Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Kanjeevaram Silk Saree"
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Category *</label>
              <select
                required
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
              >
                <option value="">— Select Category —</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* SKU */}
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">SKU / Product Code</label>
              <input
                value={form.sku}
                onChange={(e) => set("sku", e.target.value)}
                placeholder="e.g. SILK-SAR-001"
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-primary mb-1">Description *</label>
              <textarea
                required
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Describe this product..."
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm resize-none"
              />
            </div>

            {/* Pricing section */}
            <div className="md:col-span-2">
              <div className="bg-bg/60 rounded-2xl p-4 border border-primary/10">
                <p className="text-xs font-bold text-primary mb-3">Pricing</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Selling Price (₹) *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(e) => set("price", e.target.value)}
                      placeholder="e.g. 6999"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">MRP / Original Price (₹) *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={form.mrp}
                      onChange={(e) => set("mrp", e.target.value)}
                      placeholder="e.g. 9999"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Stock Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(e) => set("stock", e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
                    />
                  </div>
                </div>
                {discountPct > 0 && (
                  <p className="text-xs text-green-700 font-semibold mt-2">Discount: {discountPct}% off</p>
                )}
              </div>
            </div>

            {/* Fabric */}
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Fabric / Material</label>
              <input
                value={form.fabric}
                onChange={(e) => set("fabric", e.target.value)}
                placeholder="e.g. Pure Kanjeevaram Silk"
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Sizes & Colors */}
            <div>
              <TagInput label="Available Sizes" values={form.sizes} onChange={(v) => set("sizes", v)} placeholder="e.g. S, M, L, XL — press Enter" />
            </div>
            <div>
              <TagInput label="Available Colors" values={form.colors} onChange={(v) => set("colors", v)} placeholder="e.g. Red, Navy Blue — press Enter" />
            </div>

            {/* Tags */}
            <div className="md:col-span-2">
              <TagInput label="Tags" values={form.tags} onChange={(v) => set("tags", v)} placeholder="Add tag, press Enter" />
            </div>

            {/* Specifications */}
            <div className="md:col-span-2">
              <SpecificationRows specs={form.specifications} onChange={(v) => set("specifications", v)} />
            </div>

            {/* Flags */}
            <div className="md:col-span-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: "isFeatured", label: "Featured" },
                  { key: "isBestseller", label: "Bestseller" },
                  { key: "isNewArrival", label: "New Arrival" },
                  { key: "tailoringAvailable", label: "Tailoring Available" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer bg-bg/50 rounded-xl p-3 border border-primary/10">
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) => set(key, e.target.checked)}
                      className="w-4 h-4 accent-accent"
                    />
                    <span className="text-xs font-semibold text-primary">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Images */}
            <div className="md:col-span-2">
              <ImageUploadZone
                images={form.images}
                onAdd={handleImageFiles}
                onRemove={handleRemoveImage}
                onSetThumbnail={(img) => set("thumbnail", img)}
                thumbnail={form.thumbnail}
                uploading={uploading}
              />
            </div>

            {/* Action buttons */}
            <div className="md:col-span-2 flex gap-3 justify-end pt-2">
              <button type="button" onClick={closeForm} className="px-5 py-2.5 text-sm rounded-xl border border-primary/20 text-ink/70 hover:bg-bg transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="px-6 py-2.5 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/85 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Saving…" : editingId ? "Update Item" : "Add Item"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Grid */}
      <div className="bg-white rounded-2xl shadow-card p-5 md:p-6">
        {loading ? (
          <div className="py-16 text-center text-ink/50 text-sm flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-accent" />
            Loading shop items…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-ink/40 text-sm flex flex-col items-center gap-3">
            <ShoppingBag size={32} className="opacity-30" />
            {search ? `No items match "${search}".` : "No shop items yet. Click 'Add Item' to get started."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((product) => {
              const discountPctCard = product.mrp && product.mrp > product.price
                ? Math.round(100 - (product.price / product.mrp) * 100)
                : 0;
              return (
                <div key={product._id} className="group bg-white rounded-2xl border border-primary/10 overflow-hidden shadow-sm hover:shadow-soft transition-all flex flex-col">
                  {/* Image */}
                  <div className="relative aspect-[4/5] bg-bg overflow-hidden">
                    {product.thumbnail?.url || product.images?.[0]?.url ? (
                      <img
                        src={product.thumbnail?.url || product.images[0].url}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-ink/20 gap-1">
                        <ImageIcon size={28} />
                        <span className="text-[10px]">No image</span>
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
                      <StatusBadge status={product.status} />
                      {product.isFeatured && (
                        <span className="px-2 py-0.5 bg-highlight text-primary text-[10px] font-bold uppercase rounded-full self-start">Featured</span>
                      )}
                      {product.isBestseller && (
                        <span className="px-2 py-0.5 bg-amber-400 text-primary text-[10px] font-bold uppercase rounded-full self-start">Bestseller</span>
                      )}
                      {product.isNewArrival && (
                        <span className="px-2 py-0.5 bg-accent text-white text-[10px] font-bold uppercase rounded-full self-start">New</span>
                      )}
                    </div>
                    {discountPctCard > 0 && (
                      <span className="absolute top-2.5 right-2.5 bg-[#CC0C39] text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">{discountPctCard}% OFF</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 flex-1 flex flex-col">
                    <h4 className="font-semibold text-sm text-primary line-clamp-1 mb-0.5" title={product.name}>{product.name}</h4>
                    <p className="text-[11px] text-ink/50 mb-1">{product.category?.name || "—"}</p>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-sm font-bold text-primary">₹{Number(product.price).toLocaleString("en-IN")}</span>
                      {product.mrp > product.price && (
                        <span className="text-[11px] text-ink/40 line-through">₹{Number(product.mrp).toLocaleString("en-IN")}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink/50">Stock: {product.stock ?? "—"}</p>

                    {/* Actions */}
                    <div className="pt-2.5 border-t border-primary/5 mt-auto flex items-center justify-between gap-1">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleToggleStatus(product)}
                          title={product.status === "active" ? "Disable item" : "Enable item"}
                          className={`p-1.5 rounded-lg transition-colors ${product.status === "active" ? "text-green-600 bg-green-50 hover:bg-green-100" : "text-ink/40 bg-bg hover:bg-primary/10"}`}
                        >
                          {product.status === "active" ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </button>
                        <button
                          onClick={() => handleToggleFeatured(product)}
                          title={product.isFeatured ? "Remove from featured" : "Mark as featured"}
                          className={`p-1.5 rounded-lg transition-colors ${product.isFeatured ? "text-amber-500 bg-amber-50 hover:bg-amber-100" : "text-ink/40 bg-bg hover:bg-bg"}`}
                        >
                          <Star size={15} fill={product.isFeatured ? "currentColor" : "none"} />
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(product)} title="Edit" className="p-1.5 text-primary/60 hover:text-accent hover:bg-accent/5 rounded-lg transition-colors">
                          <Pencil size={14} />
                        </button>
                        {product.slug && (
                          <a href={`/shop/${product.slug}`} target="_blank" rel="noreferrer" title="View in shop" className="p-1.5 text-primary/50 hover:text-accent hover:bg-accent/5 rounded-lg transition-colors">
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button onClick={() => handleDelete(product._id)} title="Delete" className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
