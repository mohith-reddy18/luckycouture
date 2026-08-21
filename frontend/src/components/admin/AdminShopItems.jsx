import { useState, useEffect, useCallback, useRef } from "react";
import {
  ShoppingBag, Trash2, ExternalLink, Search, Plus, Pencil, X,
  Upload, Star, ToggleLeft, ToggleRight, ImageIcon, Loader2,
  ArrowUp, ArrowDown,
} from "lucide-react";
import api from "../../utils/api";
import getImageUrl from "../../utils/imageUrl";
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
  dimensions: "",
  netQuantity: "1 N",
  stock: "",
  sizes: [],
  colors: [],
  colorVariants: [],
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

// ----- Small helpers -----

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
              placeholder="Value (e.g. Kanjeevaram Silk)"
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-primary/15 focus:border-accent outline-none"
            />
            <button type="button" onClick={() => removeRow(i)} className="p-1 text-ink/40 hover:text-red-500">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageUploadZone({
  images,
  onAdd,
  onRemove,
  onSetThumbnail,
  thumbnail,
  uploading,
  label = "Product Images",
  helperText = "Supports any aspect ratio (4:3, 9:16, 1:1, 16:9, etc.). Original proportions will be preserved.",
}) {
  const inputRef = useRef(null);
  return (
    <div>
      <label className="block text-xs font-semibold text-primary mb-1.5">{label}</label>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mb-2.5">
          {images.map((img, i) => {
            const isMain = thumbnail
              ? (thumbnail.publicId && thumbnail.publicId === img.publicId) ||
                (thumbnail.url && thumbnail.url === img.url) ||
                (thumbnail.preview && thumbnail.preview === img.preview)
              : i === 0;

            const displayUrl = getImageUrl(img.preview || img.url || img);

            return (
              <div key={img.publicId || img._tempId || i} className="relative group w-20 h-24 rounded-xl overflow-hidden border-2 border-primary/15 shadow-2xs bg-bg flex items-center justify-center">
                {displayUrl ? (
                  <img
                    src={displayUrl}
                    alt=""
                    className="h-full w-auto max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink/30 bg-bg">
                    <ImageIcon size={20} />
                  </div>
                )}

                {/* Uploading overlay */}
                {img.isUploading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-1 z-20">
                    <Loader2 size={16} className="animate-spin text-accent" />
                    <span className="text-[9px] font-medium">Uploading</span>
                  </div>
                )}

                {/* Hover actions */}
                {!img.isUploading && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 z-10">
                    <button
                      type="button"
                      title={isMain ? "Current main cover photo" : "Set as cover photo"}
                      onClick={() => onSetThumbnail(img)}
                      className={`p-1.5 rounded-full text-white ${isMain ? "bg-accent" : "bg-white/30 hover:bg-accent"}`}
                    >
                      <Star size={12} fill={isMain ? "currentColor" : "none"} />
                    </button>
                    <button
                      type="button"
                      title="Remove photo"
                      onClick={() => onRemove(img)}
                      className="p-1.5 bg-white/30 hover:bg-red-500 rounded-full text-white transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {isMain && (
                  <span className="absolute bottom-1 left-1 text-[9px] bg-accent text-white px-1.5 py-0.5 rounded font-semibold tracking-wider z-10">
                    Main
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-primary/20 text-xs text-ink/70 hover:border-accent hover:text-accent transition-colors disabled:opacity-50 bg-bg/40 hover:bg-bg/80 cursor-pointer"
      >
        {uploading ? <Loader2 size={15} className="animate-spin text-accent" /> : <Upload size={15} />}
        <span>{uploading ? "Processing and uploading..." : "Click to select photos (JPG / PNG / WEBP)"}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          onAdd(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      {helperText && (
        <p className="text-[10px] text-ink/50 mt-1">
          {helperText}
        </p>
      )}
    </div>
  );
}

// ----- Main component -----

export default function AdminShopItems() {
  const { notify } = useApp();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([
    { _id: "wedding", name: "Wedding" },
    { _id: "sarees", name: "Sarees" },
    { _id: "dresses", name: "Dresses" },
    { _id: "nighties", name: "Nighties" },
    { _id: "blouses", name: "Blouses" },
    { _id: "casual", name: "Casual" },
  ]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isSubmittingRef = useRef(false);

  // Crop queue
  const [cropQueue, setCropQueue] = useState([]);
  const [currentCropFile, setCurrentCropFile] = useState(null);

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
    const orderMap = {
      wedding: 1,
      sarees: 2,
      dresses: 3,
      nighties: 4,
      blouses: 5,
      casual: 6,
    };
    api.get("/api/categories?limit=100")
      .then((res) => {
        const allCats = res.data || [];
        const shopCats = allCats.filter((c) => c.type !== "design" && c.isActive !== false);
        const list = shopCats.length > 0 ? shopCats : allCats;
        const sortedCats = [...list].sort((a, b) => {
          const aOrder = orderMap[(a.slug || a.name || "").toLowerCase()] ?? 99;
          const bOrder = orderMap[(b.slug || b.name || "").toLowerCase()] ?? 99;
          return aOrder - bOrder;
        });
        setCategories(sortedCats);
      })
      .catch(() => {});
  }, [fetchProducts]);

  const openAdd = () => {
    setEditingId(null);
    const defaultCatId = categories[0]?._id || "";
    setForm({
      ...EMPTY_FORM,
      category: defaultCatId,
      colorVariants: [
        { color: "", images: [], thumbnail: null, sizes: [] },
      ],
    });
    setShowForm(true);
  };

  const openEdit = (product) => {
    setEditingId(product._id);
    let existingVariants = [];
    if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
      existingVariants = product.colorVariants.map((cv) => ({
        color: cv.color || "",
        images: Array.isArray(cv.images) ? cv.images : [],
        thumbnail: cv.thumbnail || cv.images?.[0] || null,
        sizes: Array.isArray(cv.sizes) ? cv.sizes : (product.sizes || []),
      }));
    } else if (Array.isArray(product.colors) && product.colors.length > 0) {
      existingVariants = product.colors.map((c, idx) => ({
        color: typeof c === "string" ? c : c?.color || "",
        images: idx === 0 ? (product.images || []) : [],
        thumbnail: idx === 0 ? (product.thumbnail || product.images?.[0] || null) : null,
        sizes: product.sizes || [],
      }));
    } else {
      existingVariants = [
        {
          color: "Standard",
          images: product.images || [],
          thumbnail: product.thumbnail || product.images?.[0] || null,
          sizes: product.sizes || [],
        },
      ];
    }

    setForm({
      name: product.name || "",
      category: product.category?._id || product.category || "",
      description: product.description || "",
      price: product.price ?? "",
      mrp: product.mrp ?? "",
      sku: product.sku || "",
      fabric: product.fabric || "",
      dimensions: product.dimensions || "",
      netQuantity: product.netQuantity || "1 N",
      stock: product.stock ?? "",
      sizes: product.sizes || [],
      colors: product.colors || [],
      colorVariants: existingVariants,
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
    setCropQueue([]);
    setCurrentCropFile(null);
  };

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // Upload photos for a specific color variant
  const handleVariantFilesSelected = async (variantIdx, files) => {
    if (!files || !files.length) return;
    const valid = files.filter((f) => {
      if (!f.type.startsWith("image/")) {
        notify(`Skipped "${f.name}": Only JPG, PNG, WEBP files are supported.`);
        return false;
      }
      if (f.size > 15 * 1024 * 1024) {
        notify(`Skipped "${f.name}": File size exceeds 15 MB limit.`);
        return false;
      }
      return true;
    });
    if (!valid.length) return;

    const tempPreviews = valid.map((file) => ({
      _tempId: `temp_${Date.now()}_${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      url: URL.createObjectURL(file),
      isUploading: true,
    }));

    setForm((f) => {
      const variants = [...(f.colorVariants || [])];
      const target = variants[variantIdx] || { color: "", images: [], sizes: [] };
      const updatedImages = [...(target.images || []), ...tempPreviews];
      variants[variantIdx] = {
        ...target,
        images: updatedImages,
        thumbnail: target.thumbnail || updatedImages[0] || null,
      };
      return { ...f, colorVariants: variants };
    });

    setUploading(true);
    try {
      const fd = new FormData();
      valid.forEach((file) => fd.append("images", file));
      fd.append("folder", "lucky-couture/products");
      const res = await api.uploadFiles("/api/uploads/multiple", fd);
      const uploaded = res.data || [];

      setForm((f) => {
        tempPreviews.forEach((t) => {
          try { URL.revokeObjectURL(t.preview); } catch (_) {}
        });
        const tempIds = new Set(tempPreviews.map((t) => t._tempId));
        const variants = [...(f.colorVariants || [])];
        const target = variants[variantIdx];
        if (!target) return f;
        const existing = (target.images || []).filter((img) => !tempIds.has(img._tempId));
        const allPermanent = [...existing, ...uploaded];
        variants[variantIdx] = {
          ...target,
          images: allPermanent,
          thumbnail: target.thumbnail && !tempIds.has(target.thumbnail._tempId)
            ? target.thumbnail
            : (allPermanent[0] || null),
        };
        return { ...f, colorVariants: variants };
      });
      notify("Variant photos uploaded successfully.");
    } catch (err) {
      setForm((f) => {
        const tempIds = new Set(tempPreviews.map((t) => t._tempId));
        const variants = [...(f.colorVariants || [])];
        const target = variants[variantIdx];
        if (target) {
          const remaining = (target.images || []).filter((img) => !tempIds.has(img._tempId));
          variants[variantIdx] = {
            ...target,
            images: remaining,
            thumbnail: tempIds.has(target.thumbnail?._tempId) ? (remaining[0] || null) : target.thumbnail,
          };
        }
        return { ...f, colorVariants: variants };
      });
      tempPreviews.forEach((t) => {
        try { URL.revokeObjectURL(t.preview); } catch (_) {}
      });
      notify(`Photo upload failed: ${err.message || "Please try again."}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveVariantImage = (variantIdx, img) => {
    setForm((f) => {
      const variants = [...(f.colorVariants || [])];
      const target = variants[variantIdx];
      if (!target) return f;
      const newImages = (target.images || []).filter((i) =>
        img.publicId ? i.publicId !== img.publicId : i._tempId !== img._tempId && i.url !== img.url
      );
      variants[variantIdx] = {
        ...target,
        images: newImages,
        thumbnail: target.thumbnail?.publicId === img.publicId || target.thumbnail?.url === img.url
          ? (newImages[0] || null)
          : target.thumbnail,
      };
      return { ...f, colorVariants: variants };
    });
  };

  const handleSetVariantThumbnail = (variantIdx, img) => {
    setForm((f) => {
      const variants = [...(f.colorVariants || [])];
      if (!variants[variantIdx]) return f;
      variants[variantIdx] = { ...variants[variantIdx], thumbnail: img };
      return { ...f, colorVariants: variants };
    });
  };

  const handleMoveVariant = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= (form.colorVariants || []).length) return;
    setForm((f) => {
      const list = [...(f.colorVariants || [])];
      const [item] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, item);
      const newColors = list.map((cv) => cv.color).filter(Boolean);
      return { ...f, colorVariants: list, colors: newColors.length > 0 ? newColors : f.colors };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || isSubmittingRef.current) return;

    if (!form.name.trim()) { notify("Please enter a product name."); return; }
    if (!form.category) { notify("Please select a category."); return; }
    if (form.price === "" || isNaN(Number(form.price))) { notify("Please enter a valid selling price."); return; }

    if (form.images.some((img) => img.isUploading) || (form.colorVariants || []).some((cv) => cv.images?.some((img) => img.isUploading))) {
      notify("Please wait for photos to finish uploading before saving.");
      return;
    }

    isSubmittingRef.current = true;
    setSaving(true);
    try {
      const cleanImages = form.images.map((img) => ({
        url: img.url,
        publicId: img.publicId || img.url,
      }));

      const cleanColorVariants = (form.colorVariants || [])
        .filter((cv) => cv.color && cv.color.trim())
        .map((cv) => {
          const cleanImgs = (cv.images || []).map((img) => ({
            url: img.url,
            publicId: img.publicId || img.url,
          }));
          const cleanThumb = cv.thumbnail
            ? { url: cv.thumbnail.url, publicId: cv.thumbnail.publicId || cv.thumbnail.url }
            : (cleanImgs[0] || null);
          return {
            color: cv.color.trim(),
            images: cleanImgs,
            thumbnail: cleanThumb,
            sizes: Array.isArray(cv.sizes) ? cv.sizes : [],
          };
        });

      let finalImages = cleanImages;
      let finalThumbnail = form.thumbnail
        ? { url: form.thumbnail.url, publicId: form.thumbnail.publicId || form.thumbnail.url }
        : (cleanImages[0] || null);

      // If generic images weren't uploaded but color variants have images, use the variant images directly
      if (cleanColorVariants.length > 0) {
        const allVariantImages = cleanColorVariants.flatMap((cv) => cv.images || []);
        if (finalImages.length === 0 && allVariantImages.length > 0) {
          finalImages = allVariantImages;
        }
        if (!finalThumbnail && (cleanColorVariants[0]?.thumbnail || cleanColorVariants[0]?.images?.[0])) {
          finalThumbnail = cleanColorVariants[0]?.thumbnail || cleanColorVariants[0]?.images?.[0];
        }
      }

      const allColorNames = cleanColorVariants.length > 0
        ? cleanColorVariants.map((cv) => cv.color).filter(Boolean)
        : Array.from(new Set(form.colors || [])).filter(Boolean);

      const allSizes = Array.from(
        new Set([
          ...(form.sizes || []),
          ...cleanColorVariants.flatMap((cv) => cv.sizes || []),
        ])
      ).filter(Boolean);

      const payload = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        mrp: form.mrp !== "" ? Number(form.mrp) : undefined,
        sku: form.sku?.trim() || undefined,
        fabric: form.fabric?.trim() || undefined,
        dimensions: form.dimensions?.trim() || undefined,
        netQuantity: form.netQuantity?.trim() || undefined,
        stock: form.stock !== "" ? Number(form.stock) : 0,
        colors: allColorNames,
        sizes: allSizes,
        colorVariants: cleanColorVariants,
        images: finalImages,
        thumbnail: finalThumbnail,
      };

      if (editingId) {
        const res = await api.patch(`/api/products/${editingId}`, payload);
        setProducts((prev) => prev.map((p) => p._id === editingId ? res.data : p));
        notify("Shop item updated successfully.");
      } else {
        const res = await api.post("/api/products", payload);
        setProducts((prev) => {
          if (prev.some((p) => p._id === res.data._id)) return prev;
          return [res.data, ...prev];
        });
        notify("Shop item added successfully.");
      }
      closeForm();
    } catch (err) {
      console.error(err);
      notify(err.message || "Unable to save shop item.");
    } finally {
      setSaving(false);
      isSubmittingRef.current = false;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this shop item? This cannot be undone.")) return;
    try {
      await api.delete(`/api/products/${id}`);
      setProducts((prev) => prev.filter((d) => d._id !== id));
      notify("Shop item deleted.");
    } catch (err) {
      notify("Unable to delete item.");
    }
  };

  const handleToggleStatus = async (product) => {
    const newStatus = product.status === "active" ? "draft" : "active";
    try {
      const res = await api.patch(`/api/products/${product._id}`, { status: newStatus });
      setProducts((prev) => prev.map((p) => p._id === product._id ? res.data : p));
      notify(`Item ${newStatus === "active" ? "published" : "hidden"}.`);
    } catch (err) {
      notify("Unable to update item status.");
    }
  };

  const handleToggleFeatured = async (product) => {
    try {
      const res = await api.patch(`/api/products/${product._id}`, { isFeatured: !product.isFeatured });
      setProducts((prev) => prev.map((p) => p._id === product._id ? res.data : p));
      notify(product.isFeatured ? "Removed from featured." : "Marked as featured.");
    } catch (err) {
      notify("Unable to update featured status.");
    }
  };

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    (p.category?.name && p.category.name.toLowerCase().includes(search.toLowerCase())) ||
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const discountPct = form.mrp && Number(form.mrp) > Number(form.price)
    ? Math.round(100 - (Number(form.price) / Number(form.mrp)) * 100)
    : 0;

  const StatusBadge = ({ status }) => {
    const colors = {
      active: "bg-green-100 text-green-700",
      draft: "bg-yellow-100 text-yellow-700",
      archived: "bg-gray-100 text-gray-500",
    };
    return (
      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors[status] || "bg-gray-100 text-gray-500"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-card p-5 md:p-6 border-l-4 border-accent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <ShoppingBag size={20} className="text-accent" />
              <h3 className="font-display text-xl font-semibold text-primary">Shop Item Management</h3>
            </div>
            <p className="text-xs text-ink/60">Add, edit, manage pricing, stock, specs and publish products in the Shop catalog.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs rounded-xl border border-primary/15 focus:border-accent outline-none w-52"
              />
            </div>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 bg-accent text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-accent/85 transition-colors shadow-sm"
            >
              <Plus size={14} /> Add Shop Item
            </button>
          </div>
        </div>
      </div>



      {/* Add / Edit Form Panel */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-card border border-primary/15 p-5 md:p-7">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-primary/10">
            <div>
              <h4 className="font-display text-lg font-semibold text-primary">
                {editingId ? "Edit Shop Item" : "Add New Shop Item"}
              </h4>
              <p className="text-xs text-ink/50 mt-0.5">Fill in product details, pricing, inventory and specifications.</p>
            </div>
            <button onClick={closeForm} className="p-1.5 hover:bg-bg rounded-lg transition-colors text-ink/50 hover:text-primary">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-primary mb-1">Product Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Hand-embroidered Bridal Lehenga"
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Shop Category *</label>
              <select
                required
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white cursor-pointer"
              >
                <option value="">— Select Category —</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* SKU */}
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">SKU / Item Code</label>
              <input
                value={form.sku}
                onChange={(e) => set("sku", e.target.value)}
                placeholder="e.g. LC-WED-001"
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
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
                placeholder="Detailed description of this product..."
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm resize-none bg-white"
              />
            </div>

            {/* Pricing box */}
            <div className="md:col-span-2">
              <div className="bg-bg/60 rounded-2xl p-4 sm:p-5 border border-primary/10 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Pricing &amp; Inventory</p>
                  {discountPct > 0 && (
                    <span className="text-xs font-bold bg-accent text-white px-2 py-0.5 rounded-full">
                      {discountPct}% OFF preview
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Selling Price (₹) *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(e) => set("price", e.target.value)}
                      placeholder="e.g. 8999"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">MRP / Strikethrough Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.mrp}
                      onChange={(e) => set("mrp", e.target.value)}
                      placeholder="e.g. 12999"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white font-medium"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fabric name */}
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Primary Fabric</label>
              <input
                value={form.fabric}
                onChange={(e) => set("fabric", e.target.value)}
                placeholder="e.g. Pure Kanjeevaram Silk"
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white cursor-pointer"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Product Dimensions */}
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Product Dimensions</label>
              <input
                value={form.dimensions}
                onChange={(e) => set("dimensions", e.target.value)}
                placeholder="e.g. 45 x 30 x 5 cm or 5.5m Saree, 0.8m Blouse"
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
              />
            </div>

            {/* Net Quantity */}
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Net Quantity</label>
              <input
                value={form.netQuantity}
                onChange={(e) => set("netQuantity", e.target.value)}
                placeholder="e.g. 1 N or 1 Piece or 1 Set"
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
              />
            </div>

            {/* Sizes & Colors */}
            <div>
              <TagInput label="Available Sizes (All Variants)" values={form.sizes} onChange={(v) => set("sizes", v)} placeholder="e.g. M, L, XL, Free Size" />
            </div>
            <div>
              <TagInput
                label="Available Colors"
                values={form.colors}
                onChange={(v) => {
                  set("colors", v);
                  // Ensure variants exist for colors
                  setForm((f) => {
                    const existingVars = [...(f.colorVariants || [])];
                    const existingNames = new Set(existingVars.map((x) => x.color));
                    v.forEach((colName) => {
                      if (!existingNames.has(colName)) {
                        existingVars.push({ color: colName, images: [], thumbnail: null, sizes: [...(f.sizes || [])] });
                      }
                    });
                    return { ...f, colors: v, colorVariants: existingVars };
                  });
                }}
                placeholder="e.g. Royal Blue, Crimson"
              />
            </div>

            {/* Color Variants with dedicated photos */}
            <div className="md:col-span-2 bg-bg/60 rounded-2xl p-4 sm:p-5 border border-primary/10 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-primary">Color Variants &amp; Assigned Photos</h5>
                  <p className="text-[11px] text-ink/60">Upload dedicated photos and assign specific sizes for each color variant.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForm((f) => ({
                      ...f,
                      colorVariants: [
                        ...(f.colorVariants || []),
                        { color: "", images: [], thumbnail: null, sizes: [...(f.sizes || [])] },
                      ],
                    }));
                  }}
                  className="inline-flex items-center gap-1 bg-accent/10 border border-accent/30 text-accent text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-accent hover:text-white transition-colors"
                >
                  <Plus size={12} /> Add Color Variant
                </button>
              </div>

              {(!form.colorVariants || form.colorVariants.length === 0) && (
                <p className="text-xs text-ink/50 py-2">
                  No dedicated color photos configured yet. The main product photos will be shown for all selections.
                </p>
              )}

              <div className="space-y-4">
                {(form.colorVariants || []).map((cv, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-4 border border-primary/15 shadow-2xs space-y-3">
                    {/* Section Header with Reorder Controls */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-primary/10 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-0.5 rounded-md">
                          Section {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-primary">
                          {cv.color ? `Color: ${cv.color}` : "Untitled Color"}
                        </span>
                        {idx === 0 && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent px-2 py-0.5 rounded-full">
                            First / Default Variant
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveVariant(idx, idx - 1)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-bg border border-primary/15 rounded-lg text-primary hover:bg-primary hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                          title="Move section up (earlier in order)"
                        >
                          <ArrowUp size={12} /> Up
                        </button>
                        <button
                          type="button"
                          disabled={idx === (form.colorVariants || []).length - 1}
                          onClick={() => handleMoveVariant(idx, idx + 1)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-bg border border-primary/15 rounded-lg text-primary hover:bg-primary hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                          title="Move section down (later in order)"
                        >
                          <ArrowDown size={12} /> Down
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((f) => ({
                              ...f,
                              colorVariants: (f.colorVariants || []).filter((_, i) => i !== idx),
                            }));
                          }}
                          className="p-1.5 text-ink/40 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors ml-1 cursor-pointer"
                          title="Remove color variant section"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-primary mb-1">Color Name *</label>
                        <input
                          value={cv.color}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm((f) => {
                              const list = [...(f.colorVariants || [])];
                              list[idx] = { ...list[idx], color: val };
                              return { ...f, colorVariants: list };
                            });
                          }}
                          placeholder="e.g. Royal Blue, Crimson"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-primary/15 focus:border-accent outline-none"
                        />
                      </div>
                      <div>
                        <TagInput
                          label="Sizes for this Color (leave empty to use all sizes)"
                          values={cv.sizes || []}
                          onChange={(s) => {
                            setForm((f) => {
                              const list = [...(f.colorVariants || [])];
                              list[idx] = { ...list[idx], sizes: s };
                              return { ...f, colorVariants: list };
                            });
                          }}
                          placeholder="e.g. S, M, L"
                        />
                      </div>
                    </div>

                    <ImageUploadZone
                      label={`Photos for Section ${idx + 1} (${cv.color || `Variant ${idx + 1}`})`}
                      images={cv.images || []}
                      onAdd={(files) => handleVariantFilesSelected(idx, files)}
                      onRemove={(img) => handleRemoveVariantImage(idx, img)}
                      onSetThumbnail={(img) => handleSetVariantThumbnail(idx, img)}
                      thumbnail={cv.thumbnail}
                      uploading={uploading}
                      helperText="Images uploaded here are the exact photos for this color. Customers will see these photos when this color is selected."
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="md:col-span-2">
              <TagInput label="Search Tags" values={form.tags} onChange={(v) => set("tags", v)} placeholder="e.g. bridal, festive, handloom" />
            </div>

            {/* Specifications */}
            <div className="md:col-span-2">
              <SpecificationRows specs={form.specifications} onChange={(v) => set("specifications", v)} />
            </div>

            {/* Badges / Flags */}
            <div className="md:col-span-2 flex flex-wrap gap-4 p-3.5 bg-bg/50 rounded-xl border border-primary/10">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-primary">
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} className="w-4 h-4 accent-accent rounded" />
                Featured
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-primary">
                <input type="checkbox" checked={form.isBestseller} onChange={(e) => set("isBestseller", e.target.checked)} className="w-4 h-4 accent-accent rounded" />
                Bestseller
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-primary">
                <input type="checkbox" checked={form.isNewArrival} onChange={(e) => set("isNewArrival", e.target.checked)} className="w-4 h-4 accent-accent rounded" />
                New Arrival
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-primary">
                <input type="checkbox" checked={form.tailoringAvailable} onChange={(e) => set("tailoringAvailable", e.target.checked)} className="w-4 h-4 accent-accent rounded" />
                Custom Stitching / Alteration Available
              </label>
            </div>

            {/* Form actions */}
            <div className="md:col-span-2 flex gap-3 justify-end pt-3 border-t border-primary/10">
              <button
                type="button"
                onClick={closeForm}
                className="px-5 py-2.5 text-sm rounded-xl border border-primary/20 text-ink/70 hover:bg-bg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="px-6 py-2.5 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/85 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm active:scale-98"
              >
                {saving && <Loader2 size={16} className="animate-spin text-white" />}
                <span>
                  {saving
                    ? (editingId ? "Updating Product..." : "Saving Product...")
                    : (editingId ? "Update Product" : "Save & Publish Product")}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products list grid */}
      <div className="bg-white rounded-2xl shadow-card p-5 md:p-6">
        {loading ? (
          <div className="py-16 text-center text-ink/50 text-sm flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-accent" />
            Loading shop catalog...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-ink/40 text-sm flex flex-col items-center gap-3">
            <ImageIcon size={32} className="opacity-30" />
            {search ? `No items match "${search}".` : "No shop items yet. Click 'Add Shop Item' to get started."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((product) => {
              const categoryName = product.category?.name || (typeof product.category === "string" ? product.category : "") || "";
              const cleanCatKey = categoryName.toLowerCase().replace(/[\s_]+/g, "-");
              const fallbackImg =
                {
                  wedding: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80",
                  sarees: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80",
                  dresses: "https://images.unsplash.com/photo-1596783074418-47953288d926?w=800&auto=format&fit=crop&q=80",
                  nighties: "https://images.unsplash.com/photo-1518049362265-d5b2a6467637?w=800&auto=format&fit=crop&q=80",
                  blouses: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80",
                  men: "https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=800&auto=format&fit=crop&q=80",
                  kids: "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=800&auto=format&fit=crop&q=80",
                  casual: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80",
                  customised: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&auto=format&fit=crop&q=80",
                  school: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80",
                  festive: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80",
                }[cleanCatKey] || "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80";

              const rawImg =
                (product.thumbnail?.url && String(product.thumbnail.url).trim()) ||
                (product.images?.[0]?.url && String(product.images[0].url).trim()) ||
                (typeof product.thumbnail === "string" && product.thumbnail.trim()) ||
                (typeof product.images?.[0] === "string" && product.images[0].trim()) ||
                product.thumbnail ||
                product.images ||
                product.image;
              const mainImageUrl = getImageUrl(rawImg) || fallbackImg;

              const discountPctCard = product.mrp && product.mrp > product.price
                ? Math.round(100 - (product.price / product.mrp) * 100)
                : 0;

              return (
                <div key={product._id} className="group bg-white rounded-2xl border border-primary/10 overflow-hidden shadow-sm hover:shadow-soft transition-all flex flex-col">
                  {/* Image */}
                  <div className="relative aspect-[4/5] bg-bg overflow-hidden flex items-center justify-center">
                    {mainImageUrl ? (
                      <img
                        src={mainImageUrl}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.style.display = "flex";
                          }
                        }}
                      />
                    ) : null}

                    <div
                      style={{ display: mainImageUrl ? "none" : "flex" }}
                      className="w-full h-full flex flex-col items-center justify-center text-ink/30 gap-1 bg-bg/80"
                    >
                      <ImageIcon size={28} className="opacity-40" />
                      <span className="text-[10px] font-medium">No image</span>
                    </div>

                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
                      <StatusBadge status={product.status} />
                      {product.isFeatured && (
                        <span className="px-2 py-0.5 bg-highlight text-primary text-[10px] font-bold uppercase rounded-full self-start shadow-2xs">Featured</span>
                      )}
                      {product.isBestseller && (
                        <span className="px-2 py-0.5 bg-amber-400 text-primary text-[10px] font-bold uppercase rounded-full self-start shadow-2xs">Bestseller</span>
                      )}
                      {product.isNewArrival && (
                        <span className="px-2 py-0.5 bg-accent text-white text-[10px] font-bold uppercase rounded-full self-start">New</span>
                      )}
                    </div>
                    {discountPctCard > 0 && (
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-accent text-white text-[10px] font-bold rounded-full shadow-2xs z-10">
                        {discountPctCard}% OFF
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3.5 flex-1 flex flex-col">
                    <h4 className="font-semibold text-sm text-primary line-clamp-1 mb-0.5" title={product.name}>
                      {product.name}
                    </h4>
                    <p className="text-[11px] text-ink/60 mb-2 font-medium">
                      {product.category?.name || "Uncategorized"} {product.fabric ? `· ${product.fabric}` : ""}
                    </p>

                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-sm font-bold text-primary">₹{Number(product.price || 0).toLocaleString("en-IN")}</span>
                      {product.mrp && Number(product.mrp) > Number(product.price) && (
                        <span className="text-xs text-ink/40 line-through">₹{Number(product.mrp).toLocaleString("en-IN")}</span>
                      )}
                      {product.stock != null && (
                        <span className={`text-[10px] ml-auto font-medium ${Number(product.stock) > 0 ? "text-green-600" : "text-red-500"}`}>
                          {Number(product.stock) > 0 ? `${product.stock} in stock` : "Out of stock"}
                        </span>
                      )}
                    </div>

                    {/* Action bar */}
                    <div className="pt-2.5 border-t border-primary/10 mt-auto flex items-center justify-between">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleToggleStatus(product)}
                          title={product.status === "active" ? "Hide from Shop" : "Publish to Shop"}
                          className={`p-1.5 rounded-lg transition-colors ${
                            product.status === "active" ? "text-green-600 bg-green-50 hover:bg-green-100" : "text-ink/40 bg-bg hover:bg-primary/10"
                          }`}
                        >
                          {product.status === "active" ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </button>
                        <button
                          onClick={() => handleToggleFeatured(product)}
                          title={product.isFeatured ? "Remove from Featured" : "Mark as Featured"}
                          className={`p-1.5 rounded-lg transition-colors ${
                            product.isFeatured ? "text-amber-500 bg-amber-50 hover:bg-amber-100" : "text-ink/40 bg-bg hover:bg-bg"
                          }`}
                        >
                          <Star size={15} fill={product.isFeatured ? "currentColor" : "none"} />
                        </button>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(product)}
                          title="Edit product"
                          className="p-1.5 text-primary/60 hover:text-accent hover:bg-accent/5 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        {product.slug && (
                          <a
                            href={`/shop/${product.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            title="View in shop"
                            className="p-1.5 text-primary/50 hover:text-accent hover:bg-accent/5 rounded-lg transition-colors"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(product._id)}
                          title="Delete product"
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
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
