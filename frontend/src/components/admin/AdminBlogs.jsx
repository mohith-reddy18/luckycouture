import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Save,
  X,
  Tag,
  Image as ImageIcon,
  ExternalLink,
  Layers,
} from "lucide-react";
import api from "../../utils/api";
import { useApp } from "../../context/AppContext";
import { BLOG_CATEGORIES, CATEGORY_STYLES, initialBlogPosts } from "../../data/blogData";

export default function AdminBlogs() {
  const { notify } = useApp();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal editor state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCategory, setFormCategory] = useState("Fashion & Trends");
  const [formExcerpt, setFormExcerpt] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formImageAlt, setFormImageAlt] = useState("");
  const [formAuthor, setFormAuthor] = useState("Lucky Couture Studio");
  const [formReadTime, setFormReadTime] = useState("5 min read");
  const [formTags, setFormTags] = useState("");
  const [formStatus, setFormStatus] = useState("published");
  const [formPublishedAt, setFormPublishedAt] = useState("");

  const fetchAdminBlogs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/blogs/admin/all?limit=100");
      if (res?.data && Array.isArray(res.data)) {
        setPosts(res.data);
      } else {
        setPosts(initialBlogPosts);
      }
    } catch (err) {
      console.warn("Could not fetch admin blogs from API, using client fallback:", err.message);
      setPosts(initialBlogPosts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminBlogs();
  }, []);

  const openCreateModal = () => {
    setEditingPost(null);
    setFormTitle("");
    setFormSlug("");
    setFormCategory("Fashion & Trends");
    setFormExcerpt("");
    setFormContent("");
    setFormImageUrl("https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200");
    setFormImageAlt("");
    setFormAuthor("Lucky Couture Studio");
    setFormReadTime("5 min read");
    setFormTags("Fashion, Styling, Blouse");
    setFormStatus("published");
    setFormPublishedAt(new Date().toISOString().slice(0, 10));
    setIsModalOpen(true);
  };

  const openEditModal = (post) => {
    setEditingPost(post);
    setFormTitle(post.title || "");
    setFormSlug(post.slug || "");
    setFormCategory(post.category || "Fashion & Trends");
    setFormExcerpt(post.excerpt || "");
    setFormContent(post.content || "");
    setFormImageUrl(post.featuredImage?.url || "");
    setFormImageAlt(post.featuredImage?.alt || "");
    setFormAuthor(post.author || "Lucky Couture Studio");
    setFormReadTime(post.readTime || "5 min read");
    setFormTags(Array.isArray(post.tags) ? post.tags.join(", ") : "");
    setFormStatus(post.status || "published");
    setFormPublishedAt(
      post.publishedAt
        ? new Date(post.publishedAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    );
    setIsModalOpen(true);
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      notify("Please enter an article title");
      return;
    }
    if (!formExcerpt.trim()) {
      notify("Please enter a short excerpt");
      return;
    }
    if (!formContent.trim()) {
      notify("Please enter the article content");
      return;
    }

    setSaving(true);
    const payload = {
      title: formTitle.trim(),
      slug: formSlug.trim(),
      category: formCategory,
      excerpt: formExcerpt.trim(),
      content: formContent.trim(),
      featuredImage: {
        url: formImageUrl.trim() || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200",
        alt: formImageAlt.trim() || formTitle.trim(),
      },
      author: formAuthor.trim() || "Lucky Couture Studio",
      readTime: formReadTime.trim() || "5 min read",
      tags: formTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: formStatus,
      publishedAt: formPublishedAt ? new Date(formPublishedAt) : new Date(),
    };

    try {
      if (editingPost && editingPost._id) {
        await api.patch(`/api/blogs/${editingPost._id}`, payload);
        notify("Article updated successfully!");
      } else {
        await api.post("/api/blogs", payload);
        notify("New article created and published successfully!");
      }
      setIsModalOpen(false);
      fetchAdminBlogs();
    } catch (err) {
      notify(err.message || "Failed to save article");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async (post) => {
    if (!window.confirm(`Are you sure you want to delete "${post.title}"?`)) return;

    try {
      if (post._id) {
        await api.delete(`/api/blogs/${post._id}`);
      }
      notify(`Deleted "${post.title}"`);
      setPosts((prev) => prev.filter((p) => (p._id ? p._id !== post._id : p.slug !== post.slug)));
    } catch (err) {
      notify(err.message || "Failed to delete article");
    }
  };

  const handleToggleStatus = async (post) => {
    const nextStatus = post.status === "published" ? "draft" : "published";
    try {
      if (post._id) {
        await api.patch(`/api/blogs/${post._id}`, { status: nextStatus });
      }
      notify(`Article status updated to ${nextStatus}!`);
      setPosts((prev) =>
        prev.map((p) =>
          (p._id === post._id || p.slug === post.slug) ? { ...p, status: nextStatus } : p
        )
      );
    } catch (err) {
      notify(err.message || "Failed to update status");
    }
  };

  const filteredList = posts.filter((post) => {
    const matchCat =
      categoryFilter === "all" ||
      (post.category || "").toLowerCase() === categoryFilter.toLowerCase();
    const matchStatus =
      statusFilter === "all" ||
      (post.status || "published").toLowerCase() === statusFilter.toLowerCase();

    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      (post.title || "").toLowerCase().includes(q) ||
      (post.slug || "").toLowerCase().includes(q) ||
      (post.category || "").toLowerCase().includes(q);

    return matchCat && matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-card border border-primary/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={22} className="text-accent" />
            <h2 className="font-display text-xl font-bold text-primary">Blog &amp; Article CMS</h2>
          </div>
          <p className="text-xs text-ink/60">
            Publish fashion guides, measurement tutorials, and trend articles for the Lucky Couture Journal.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-white font-semibold text-xs hover:bg-accent/90 shadow-sm transition-colors cursor-pointer"
        >
          <Plus size={16} /> New Article
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card border border-primary/10 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles by title or slug..."
            className="w-full pl-10 pr-4 py-2 bg-bg/50 border border-primary/15 rounded-xl text-xs outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-bg/50 border border-primary/15 rounded-xl text-xs text-primary outline-none focus:border-accent"
          >
            <option value="all">All Categories</option>
            {BLOG_CATEGORIES.filter((c) => c !== "All").map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-bg/50 border border-primary/15 rounded-xl text-xs text-primary outline-none focus:border-accent"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-white rounded-2xl shadow-card border border-primary/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-primary/5 border-b border-primary/10 text-primary font-semibold">
                <th className="p-4">Article</th>
                <th className="p-4">Category</th>
                <th className="p-4">Status</th>
                <th className="p-4">Published Date</th>
                <th className="p-4">Views</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {filteredList.length > 0 ? (
                filteredList.map((post) => {
                  const isPub = post.status === "published";
                  const badgeClass =
                    CATEGORY_STYLES[post.category]?.badge || "bg-primary/10 text-primary border-primary/15";

                  return (
                    <tr key={post._id || post.slug} className="hover:bg-primary/5 transition-colors">
                      <td className="p-4 max-w-xs">
                        <div className="flex items-center gap-3">
                          <img
                            src={post.featuredImage?.url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200"}
                            alt={post.title}
                            className="w-12 h-12 rounded-xl object-cover border border-primary/10 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-primary block truncate hover:text-accent">
                              {post.title}
                            </span>
                            <span className="font-mono text-[10px] text-ink/50 block truncate">
                              /blog/{post.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}>
                          {post.category}
                        </span>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(post)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                            isPub
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200"
                              : "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200"
                          }`}
                        >
                          {post.status || "published"}
                        </button>
                      </td>

                      <td className="p-4 whitespace-nowrap text-ink/70">
                        {new Date(post.publishedAt || Date.now()).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="p-4 whitespace-nowrap font-mono text-ink/70">
                        {post.views || 0}
                      </td>

                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/blog/${post.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-ink/60 hover:text-primary hover:bg-primary/5 transition-colors"
                            title="Preview Public Article"
                          >
                            <ExternalLink size={15} />
                          </Link>
                          <button
                            onClick={() => openEditModal(post)}
                            className="p-1.5 rounded-lg text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                            title="Edit Article"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeletePost(post)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Article"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-ink/50 text-xs">
                    No articles found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Article Modal Drawer */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/80 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-primary/15 my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-primary/10 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <BookOpen size={20} className="text-accent" />
                  <h3 className="font-display text-lg font-bold text-primary">
                    {editingPost ? "Edit Article" : "Create New Article"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full text-ink/60 hover:bg-primary/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSavePost} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">Article Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. 10 Latest Blouse Design Ideas for 2026"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 text-xs text-primary bg-bg/50 outline-none focus:border-accent"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Custom Slug (optional)</label>
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      placeholder="e.g. 10-latest-blouse-designs-2026"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 text-xs text-primary bg-white outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Category *</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 text-xs text-primary bg-white outline-none focus:border-accent"
                    >
                      {BLOG_CATEGORIES.filter((c) => c !== "All").map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Featured Image URL *</label>
                    <input
                      type="url"
                      required
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 text-xs text-primary bg-white outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Image Alt Text</label>
                    <input
                      type="text"
                      value={formImageAlt}
                      onChange={(e) => setFormImageAlt(e.target.value)}
                      placeholder="Descriptive caption for SEO"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 text-xs text-primary bg-white outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {formImageUrl && (
                  <div className="h-28 rounded-xl overflow-hidden border border-primary/10 bg-primary/5">
                    <img src={formImageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">Short Excerpt *</label>
                  <textarea
                    required
                    rows={2}
                    value={formExcerpt}
                    onChange={(e) => setFormExcerpt(e.target.value)}
                    placeholder="Brief 2-sentence summary displayed on cards..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 text-xs text-primary bg-white outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Full Article Content (Markdown format supported) *
                  </label>
                  <textarea
                    required
                    rows={8}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="### Heading 3&#10;&#10;Paragraph text goes here...&#10;&#10;- Bullet point 1&#10;- Bullet point 2"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 font-mono text-xs text-primary bg-white outline-none focus:border-accent leading-relaxed"
                  />
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Author</label>
                    <input
                      type="text"
                      value={formAuthor}
                      onChange={(e) => setFormAuthor(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 text-xs text-primary bg-white outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Read Time</label>
                    <input
                      type="text"
                      value={formReadTime}
                      onChange={(e) => setFormReadTime(e.target.value)}
                      placeholder="e.g. 5 min read"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 text-xs text-primary bg-white outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 text-xs text-primary bg-white outline-none focus:border-accent"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Tags (comma separated)</label>
                    <input
                      type="text"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      placeholder="Bridal, Blouse, Saree, Fit"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 text-xs text-primary bg-white outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Publish Date</label>
                    <input
                      type="date"
                      value={formPublishedAt}
                      onChange={(e) => setFormPublishedAt(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 text-xs text-primary bg-white outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-primary/10">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-full border border-primary/15 text-primary text-xs font-semibold hover:bg-primary/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-full bg-accent text-white text-xs font-semibold hover:bg-accent/90 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={14} />
                    {saving ? "Saving..." : editingPost ? "Update Article" : "Publish Article"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
