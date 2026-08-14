import { useState, useEffect, useCallback, useRef } from "react";
import {
  Palette, Trash2, ExternalLink, Search, CheckCircle, XCircle,
  Plus, Pencil, X, Upload, Star, ToggleLeft, ToggleRight, ImageIcon, Loader2, Check,
} from "lucide-react";
import api from "../../utils/api";
import { useApp } from "../../context/AppContext";

// --- Predefined Controlled Options for Studio Usability ---

const GARMENT_TYPES = [
  "Blouse",
  "Saree Blouse",
  "Lehenga",
  "Kurti",
  "Gown",
  "Dress",
  "Frock",
  "Nightie",
  "School Uniform",
  "Other",
];

// Exact 3 design/work level options shared with Tailoring Step 2
const WORK_LEVEL_OPTIONS = [
  { value: "Simple Design", label: "Simple Design", difficultyLevel: "simple" },
  { value: "Heavy — Embroidery", label: "Heavy — Embroidery", difficultyLevel: "heavy" },
  { value: "Heavy — Maggam Work", label: "Heavy — Maggam Work", difficultyLevel: "heavy" },
];

const FABRIC_OPTIONS = [
  "Cotton",
  "Silk",
  "Premium Silk",
  "Georgette",
  "Chiffon",
  "Velvet",
  "Satin",
  "Net",
  "Linen",
];

const OCCASION_OPTIONS = [
  "Wedding",
  "Bridal",
  "Reception",
  "Engagement",
  "Party",
  "Festival",
  "Traditional",
  "Casual",
  "Office",
  "Other",
];

const SUGGESTED_TAGS = [
  "bridal",
  "maggam",
  "heavy-work",
  "zardosi",
  "stone-work",
  "designer",
  "handloom",
  "party-wear",
  "festive",
  "custom",
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active (Visible in Gallery)" },
  { value: "draft", label: "Draft (Hidden from Public)" },
  { value: "archived", label: "Archived" },
];

const STANDARD_FABRIC_QTY = {
  "Blouse": 1,
  "Saree Blouse": 1,
  "Kurti": 2.5,
  "Lehenga": 4,
  "Gown": 4.5,
  "Dress": 3.5,
  "Frock": 3,
  "Nightie": 3,
  "School Uniform": 2.5,
  "Other": 2,
};

const EMPTY_FORM = {
  title: "",
  category: "",
  description: "",
  garment: "Blouse",
  designType: "Heavy — Embroidery",
  difficultyLevel: "heavy",
  designCost: "",
  standardFabricQty: "1",
  availableFabrics: ["Silk", "Cotton", "Premium Silk"],
  occasion: ["Wedding", "Bridal"],
  tags: ["designer"],
  status: "active",
  isFeatured: false,
  sortOrder: 0,
  estimatedStitchingDays: 5,
  images: [],
  thumbnail: null,
};

// ----- Multi-Select Pill Selector (for Fabrics & Occasions) -----

function MultiSelectPills({ label, options, selected, onChange, description }) {
  const toggle = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((item) => item !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-primary">{label}</label>
        {selected.length > 0 && (
          <span className="text-[11px] text-accent font-medium">{selected.length} selected</span>
        )}
      </div>
      {description && <p className="text-[11px] text-ink/50 mb-2">{description}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                isSelected
                  ? "bg-accent text-white border-accent shadow-xs font-medium"
                  : "bg-white border-primary/20 text-ink/70 hover:border-accent hover:text-primary"
              }`}
            >
              {isSelected && <Check size={12} className="stroke-[3]" />}
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ----- Tag Selector with Suggested Chips + Custom Add -----

function TagSelector({ selected, onChange }) {
  const [customInput, setCustomInput] = useState("");

  const toggleSuggested = (tag) => {
    const cleanTag = tag.toLowerCase().trim();
    if (selected.includes(cleanTag)) {
      onChange(selected.filter((t) => t !== cleanTag));
    } else {
      onChange([...selected, cleanTag]);
    }
  };

  const addCustomTag = () => {
    const clean = customInput.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    if (clean && !selected.includes(clean)) {
      onChange([...selected, clean]);
    }
    setCustomInput("");
  };

  const removeTag = (tagToRemove) => {
    onChange(selected.filter((t) => t !== tagToRemove));
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-primary mb-1">Tags / Search Keywords</label>
      <p className="text-[11px] text-ink/50 mb-2">Click suggested tags or type a custom keyword to help customers find this design.</p>

      {/* Suggested Quick-Select Chips */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {SUGGESTED_TAGS.map((tag) => {
          const isSelected = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleSuggested(tag)}
              className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                isSelected
                  ? "bg-primary text-highlight border-primary font-medium"
                  : "bg-bg/70 border-primary/15 text-ink/60 hover:border-primary/40 hover:text-primary"
              }`}
            >
              {isSelected ? `✓ #${tag}` : `+ #${tag}`}
            </button>
          );
        })}
      </div>

      {/* Active Selected Tags Display */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5 p-2.5 rounded-xl bg-bg/50 border border-primary/10">
          {selected.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-white text-primary text-xs px-2.5 py-1 rounded-lg border border-primary/15 shadow-2xs font-medium"
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-red-500 text-ink/40 transition-colors ml-0.5"
                title="Remove tag"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Custom Tag Input */}
      <div className="flex gap-2">
        <input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustomTag();
            }
          }}
          placeholder="Add custom keyword (e.g. zardozi-border)..."
          className="flex-1 px-3 py-2 text-xs rounded-xl border border-primary/15 focus:border-accent outline-none bg-white"
        />
        <button
          type="button"
          onClick={addCustomTag}
          className="px-3.5 py-2 text-xs bg-primary text-bg rounded-xl hover:bg-primary/85 transition-colors font-medium"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ----- Image Upload Strip with Main Thumbnail Selector -----

function ImageUploadZone({ images, onAdd, onRemove, onSetThumbnail, thumbnail, uploading }) {
  const inputRef = useRef(null);
  return (
    <div>
      <label className="block text-xs font-semibold text-primary mb-1.5">Design Photos</label>

      {/* Preview strip */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mb-2.5">
          {images.map((img, i) => {
            const isMain = thumbnail?.publicId ? thumbnail.publicId === img.publicId : i === 0;
            return (
              <div key={img.publicId || i} className="relative group w-20 h-24 rounded-xl overflow-hidden border-2 border-primary/15 shadow-2xs bg-bg">
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
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
                {isMain && (
                  <span className="absolute bottom-1 left-1 text-[9px] bg-accent text-white px-1.5 py-0.5 rounded font-semibold tracking-wider">
                    Cover
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
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-primary/20 text-xs text-ink/70 hover:border-accent hover:text-accent transition-colors disabled:opacity-50 bg-bg/40 hover:bg-bg/80"
      >
        {uploading ? <Loader2 size={15} className="animate-spin text-accent" /> : <Upload size={15} />}
        <span>{uploading ? "Uploading to Cloudinary..." : "Click to choose photos from your phone or computer (JPG / PNG / WEBP)"}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => onAdd(Array.from(e.target.files || []))}
      />
      <p className="text-[10px] text-ink/50 mt-1">Tap the ★ icon on any preview photo to make it the main front cover photo in the gallery.</p>
    </div>
  );
}

// ----- Main AdminDesigns Component -----

export default function AdminDesigns() {
  const { notify } = useApp();
  const [designs, setDesigns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch all designs (admin-list includes drafts/archived)
  const fetchDesigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/designs/admin-list?limit=200");
      setDesigns(res.data || []);
    } catch (err) {
      console.error(err);
      notify("Failed to fetch designs");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchDesigns();
    // Fetch categories suitable for Design Gallery (type !== "shop")
    api.get("/api/categories?limit=100")
      .then((res) => {
        const allCats = res.data || [];
        const designCats = allCats.filter((c) => c.type !== "shop" && c.isActive !== false);
        setCategories(designCats.length > 0 ? designCats : allCats);
      })
      .catch(() => {});
  }, [fetchDesigns]);

  const openAdd = () => {
    setEditingId(null);
    const defaultCatId = categories[0]?._id || "";
    setForm({
      ...EMPTY_FORM,
      category: defaultCatId,
    });
    setShowForm(true);
  };

  const openEdit = (design) => {
    setEditingId(design._id);

    // Resolve unified designType from design or difficultyLevel fallback
    let resolvedDesignType = design.designType;
    if (!resolvedDesignType) {
      if (design.difficultyLevel === "simple") resolvedDesignType = "Simple Design";
      else resolvedDesignType = "Heavy — Embroidery";
    }

    const matchedOpt = WORK_LEVEL_OPTIONS.find((o) => o.value === resolvedDesignType);

    setForm({
      title: design.title || "",
      category: design.category?._id || design.category || (categories[0]?._id || ""),
      description: design.description || "",
      garment: design.garment || "Blouse",
      designType: resolvedDesignType,
      difficultyLevel: matchedOpt ? matchedOpt.difficultyLevel : (design.difficultyLevel || "moderate"),
      designCost: design.designCost ?? design.estimatedPrice ?? "",
      standardFabricQty: design.standardFabricQty ?? "1",
      availableFabrics: design.availableFabrics || ["Silk", "Cotton", "Premium Silk"],
      occasion: design.occasion || ["Wedding"],
      tags: design.tags || [],
      status: design.status || "active",
      isFeatured: Boolean(design.isFeatured),
      sortOrder: design.sortOrder ?? 0,
      estimatedStitchingDays: design.estimatedStitchingDays ?? 5,
      images: design.images || [],
      thumbnail: design.thumbnail || null,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // When Garment changes: auto-suggest standard fabric quantity
  const handleGarmentChange = (newGarment) => {
    setForm((f) => ({
      ...f,
      garment: newGarment,
      standardFabricQty: STANDARD_FABRIC_QTY[newGarment] !== undefined
        ? String(STANDARD_FABRIC_QTY[newGarment])
        : f.standardFabricQty,
    }));
  };

  // Single dropdown handler for Design Type / Work Level
  const handleWorkLevelChange = (selectedVal) => {
    const matchedOpt = WORK_LEVEL_OPTIONS.find((o) => o.value === selectedVal);
    setForm((f) => ({
      ...f,
      designType: selectedVal,
      difficultyLevel: matchedOpt ? matchedOpt.difficultyLevel : "moderate",
    }));
  };

  // Upload image files → Cloudinary via /api/uploads/multiple
  const handleImageFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("images", f));
      fd.append("folder", "lucky-couture/designs");
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

  const handleSetThumbnail = (img) => {
    set("thumbnail", img);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      notify("Please enter a design name.");
      return;
    }
    if (!form.category) {
      notify("Please select a category.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        garment: form.garment,
        designType: form.designType,
        difficultyLevel: form.difficultyLevel,
        designCost: form.designCost !== "" ? Number(form.designCost) : undefined,
        standardFabricQty: form.standardFabricQty !== "" ? Number(form.standardFabricQty) : undefined,
        sortOrder: Number(form.sortOrder) || 0,
        estimatedStitchingDays: Number(form.estimatedStitchingDays) || 5,
        availableFabrics: form.availableFabrics,
        occasion: form.occasion,
        tags: form.tags,
      };

      if (editingId) {
        const res = await api.patch(`/api/designs/${editingId}`, payload);
        setDesigns((prev) => prev.map((d) => (d._id === editingId ? res.data : d)));
        notify("Design updated successfully.");
      } else {
        const res = await api.post("/api/designs", payload);
        setDesigns((prev) => [res.data, ...prev]);
        notify("Design added successfully.");
      }
      closeForm();
    } catch (err) {
      console.error(err);
      notify(err.message || "Unable to save design. Please check the entered information.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this design? This will permanently remove it from the gallery.")) return;
    try {
      await api.delete(`/api/designs/${id}`);
      setDesigns((prev) => prev.filter((d) => d._id !== id));
      notify("Design deleted successfully.");
    } catch (err) {
      notify("Unable to delete design. Please try again.");
    }
  };

  const handleToggleStatus = async (design) => {
    const newStatus = design.status === "active" ? "draft" : "active";
    try {
      const res = await api.patch(`/api/designs/${design._id}`, { status: newStatus });
      setDesigns((prev) => prev.map((d) => (d._id === design._id ? res.data : d)));
      notify(`Design ${newStatus === "active" ? "published to gallery" : "hidden from gallery"}.`);
    } catch (err) {
      notify("Unable to update design status.");
    }
  };

  const handleToggleFeatured = async (design) => {
    try {
      const res = await api.patch(`/api/designs/${design._id}`, { isFeatured: !design.isFeatured });
      setDesigns((prev) => prev.map((d) => (d._id === design._id ? res.data : d)));
      notify(design.isFeatured ? "Removed from featured designs." : "Marked as featured design.");
    } catch (err) {
      notify("Unable to update featured status.");
    }
  };

  const handleModerate = async (id, action) => {
    try {
      await api.patch(`/api/designs/${id}/moderate`, { action });
      notify(`Design ${action === "approve" ? "approved and published" : "rejected"}.`);
      fetchDesigns();
    } catch (err) {
      notify("Unable to moderate design.");
    }
  };

  const filtered = designs.filter((d) =>
    d.title?.toLowerCase().includes(search.toLowerCase()) ||
    (d.category?.name && d.category.name.toLowerCase().includes(search.toLowerCase())) ||
    (d.garment && d.garment.toLowerCase().includes(search.toLowerCase())) ||
    (d.designType && d.designType.toLowerCase().includes(search.toLowerCase()))
  );

  const StatusBadge = ({ status }) => {
    const colors = {
      active: "bg-green-100 text-green-700",
      draft: "bg-yellow-100 text-yellow-700",
      archived: "bg-gray-100 text-gray-500",
      pending_review: "bg-amber-100 text-amber-700",
      rejected: "bg-red-100 text-red-600",
    };
    return (
      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors[status] || "bg-gray-100 text-gray-500"}`}>
        {status === "active" ? "Active (Live)" : status?.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl shadow-card p-5 md:p-6 border-l-4 border-accent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Palette size={20} className="text-accent" />
              <h3 className="font-display text-xl font-semibold text-primary">Design Gallery Management</h3>
            </div>
            <p className="text-xs text-ink/60">Add, edit, enable/disable and manage all tailoring reference designs in your public gallery.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
              <input
                type="text"
                placeholder="Search by name, garment, work..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs rounded-xl border border-primary/15 focus:border-accent outline-none w-56"
              />
            </div>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 bg-accent text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-accent/85 transition-colors shadow-sm"
            >
              <Plus size={14} /> Add New Design
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
                {editingId ? "Edit Design" : "Add New Design"}
              </h4>
              <p className="text-xs text-ink/50 mt-0.5">Fill in the design details below. All dropdowns have clear preset options.</p>
            </div>
            <button onClick={closeForm} className="p-1.5 hover:bg-bg rounded-lg transition-colors text-ink/50 hover:text-primary">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Design Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-primary mb-1">Design Name *</label>
              <input
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Regal Zardozi Bridal Lehenga"
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
              />
            </div>

            {/* 2. Category (Gallery Section) */}
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">
                Category * <span className="font-normal text-ink/40">(Gallery Tab Section)</span>
              </label>
              <select
                required
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white cursor-pointer"
              >
                <option value="">— Select Category —</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Garment Type */}
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">
                Garment Type * <span className="font-normal text-ink/40">(What is being stitched?)</span>
              </label>
              <select
                required
                value={form.garment}
                onChange={(e) => handleGarmentChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white cursor-pointer"
              >
                {GARMENT_TYPES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Unified Single Field: Design Type / Work Level */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-primary mb-1">
                Design Type / Work Level * <span className="font-normal text-ink/40">(Matches Tailoring Step 2)</span>
              </label>
              <select
                required
                value={form.designType}
                onChange={(e) => handleWorkLevelChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white cursor-pointer font-medium"
              >
                {WORK_LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-ink/50 mt-1">
                This exact work style is shared with the customer tailoring booking flow.
              </p>
            </div>

            {/* 5. Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-primary mb-1">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Brief description about the stitching and embroidery on this piece..."
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm resize-none bg-white"
              />
            </div>

            {/* 6. Pricing & Fabric Requirements Box */}
            <div className="md:col-span-2">
              <div className="bg-bg/60 rounded-2xl p-4 sm:p-5 border border-primary/10">
                <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
                  Pricing &amp; Stitching Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">
                      Design / Work Cost (₹) *
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={form.designCost}
                      onChange={(e) => set("designCost", e.target.value)}
                      placeholder="e.g. 2200"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white font-medium"
                    />
                    <p className="text-[10px] text-ink/50 mt-0.5">Stitching/work cost only. Fabric price is calculated separately.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">
                      Fabric Required (Metres)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.standardFabricQty}
                      onChange={(e) => set("standardFabricQty", e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white font-medium"
                    />
                    <p className="text-[10px] text-ink/50 mt-0.5">Auto-filled based on garment type.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">
                      Est. Stitching Days
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.estimatedStitchingDays}
                      onChange={(e) => set("estimatedStitchingDays", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white font-medium"
                    />
                    <p className="text-[10px] text-ink/50 mt-0.5">Standard preparation duration.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 7. Available Fabrics Multi-Select */}
            <div className="md:col-span-2">
              <MultiSelectPills
                label="Available Fabrics"
                description="Select which fabrics customers can choose when booking this design."
                options={FABRIC_OPTIONS}
                selected={form.availableFabrics}
                onChange={(v) => set("availableFabrics", v)}
              />
            </div>

            {/* 8. Occasions Multi-Select */}
            <div className="md:col-span-2">
              <MultiSelectPills
                label="Occasions"
                description="Select which occasions this design suits best."
                options={OCCASION_OPTIONS}
                selected={form.occasion}
                onChange={(v) => set("occasion", v)}
              />
            </div>

            {/* 9. Tags / Search Keywords */}
            <div className="md:col-span-2">
              <TagSelector
                selected={form.tags}
                onChange={(v) => set("tags", v)}
              />
            </div>

            {/* 10. Status & Sort Order */}
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white cursor-pointer"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-primary mb-1">
                Display Order <span className="font-normal text-ink/40">(Lower = First in Gallery)</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm bg-white"
              />
            </div>

            {/* 11. Featured Checkbox */}
            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2.5 p-3 rounded-xl bg-bg/50 border border-primary/10 cursor-pointer hover:bg-bg transition-colors">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => set("isFeatured", e.target.checked)}
                  className="w-4 h-4 accent-accent rounded"
                />
                <span className="text-xs font-semibold text-primary">
                  Mark as Featured Design (Highlights this item on the homepage &amp; gallery)
                </span>
              </label>
            </div>

            {/* 12. Images Upload */}
            <div className="md:col-span-2">
              <ImageUploadZone
                images={form.images}
                onAdd={handleImageFiles}
                onRemove={handleRemoveImage}
                onSetThumbnail={handleSetThumbnail}
                thumbnail={form.thumbnail}
                uploading={uploading}
              />
            </div>

            {/* 13. Action buttons */}
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
                className="px-6 py-2.5 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/85 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                {saving ? "Saving..." : editingId ? "Update Design" : "Save & Publish Design"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Designs Grid / Catalog List */}
      <div className="bg-white rounded-2xl shadow-card p-5 md:p-6">
        {loading ? (
          <div className="py-16 text-center text-ink/50 text-sm flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-accent" />
            Loading design catalog...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-ink/40 text-sm flex flex-col items-center gap-3">
            <ImageIcon size={32} className="opacity-30" />
            {search ? `No designs match "${search}".` : "No designs in catalog yet. Click 'Add New Design' to get started."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((design) => (
              <div
                key={design._id}
                className="group bg-white rounded-2xl border border-primary/10 overflow-hidden shadow-sm hover:shadow-soft transition-all flex flex-col"
              >
                {/* Image */}
                <div className="relative aspect-[4/5] bg-bg overflow-hidden">
                  {design.thumbnail?.url || design.images?.[0]?.url ? (
                    <img
                      src={design.thumbnail?.url || design.images[0].url}
                      alt={design.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-ink/20 gap-1">
                      <ImageIcon size={28} />
                      <span className="text-[10px]">No photo</span>
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
                    <StatusBadge status={design.status} />
                    {design.isFeatured && (
                      <span className="px-2 py-0.5 bg-highlight text-primary text-[10px] font-bold uppercase tracking-wider rounded-full self-start shadow-2xs">
                        Featured
                      </span>
                    )}
                    {design.source === "customer" && (
                      <span className="px-2 py-0.5 bg-accent/90 text-white text-[10px] font-bold uppercase tracking-wider rounded-full self-start">
                        Community
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3.5 flex-1 flex flex-col">
                  <h4 className="font-semibold text-sm text-primary line-clamp-1 mb-0.5" title={design.title}>
                    {design.title}
                  </h4>
                  <p className="text-[11px] text-ink/60 mb-1 font-medium">
                    {design.category?.name || "Uncategorized"} {design.garment ? `· ${design.garment}` : ""}
                  </p>
                  {design.designType && (
                    <p className="text-[11px] text-ink/50 mb-1">
                      Work: <span className="font-medium text-primary">{design.designType}</span>
                    </p>
                  )}
                  {design.designCost != null && (
                    <p className="text-xs text-accent font-semibold mb-1">
                      ₹{design.designCost.toLocaleString("en-IN")} <span className="font-normal text-[10px] text-ink/60">work cost</span>
                    </p>
                  )}

                  {/* Action bar */}
                  <div className="pt-2.5 border-t border-primary/10 mt-auto flex items-center justify-between gap-1">
                    {/* Moderation actions for pending customer submissions */}
                    {design.source === "customer" && design.status === "pending_review" ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleModerate(design._id, "approve")}
                          title="Approve & Publish"
                          className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          <CheckCircle size={15} />
                        </button>
                        <button
                          onClick={() => handleModerate(design._id, "reject")}
                          title="Reject"
                          className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <XCircle size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        {/* Enable/Disable toggle */}
                        <button
                          onClick={() => handleToggleStatus(design)}
                          title={design.status === "active" ? "Hide from Gallery" : "Publish to Gallery"}
                          className={`p-1.5 rounded-lg transition-colors ${
                            design.status === "active"
                              ? "text-green-600 bg-green-50 hover:bg-green-100"
                              : "text-ink/40 bg-bg hover:bg-primary/10"
                          }`}
                        >
                          {design.status === "active" ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </button>
                        {/* Featured toggle */}
                        <button
                          onClick={() => handleToggleFeatured(design)}
                          title={design.isFeatured ? "Remove from Featured" : "Mark as Featured"}
                          className={`p-1.5 rounded-lg transition-colors ${
                            design.isFeatured ? "text-amber-500 bg-amber-50 hover:bg-amber-100" : "text-ink/40 bg-bg hover:bg-bg"
                          }`}
                        >
                          <Star size={15} fill={design.isFeatured ? "currentColor" : "none"} />
                        </button>
                      </div>
                    )}

                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(design)}
                        title="Edit design"
                        className="p-1.5 text-primary/60 hover:text-accent hover:bg-accent/5 rounded-lg transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      {design.slug && (
                        <a
                          href={`/design-gallery/${design.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          title="View on public website"
                          className="p-1.5 text-primary/50 hover:text-accent hover:bg-accent/5 rounded-lg transition-colors"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(design._id)}
                        title="Delete design"
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
