import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Package,
  CreditCard,
  Truck,
  RotateCcw,
  Ban,
  Scissors,
  User,
  Laptop,
  HelpCircle,
  Plus,
  Clock,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Send,
  AlertCircle,
  Sparkles,
  Paperclip,
  X,
  Phone,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import SectionHeading from "../components/SectionHeading";
import StarDivider from "../components/StarDivider";
import api from "../utils/api";
import SEO from "../components/SEO";
import { contactInfo } from "../data/mockData";

const categories = [
  {
    id: "order",
    title: "Order Issue",
    desc: "Order status, item details, modifications",
    icon: Package,
    color: "bg-blue-50 text-blue-600 border-blue-150",
  },
  {
    id: "payment",
    title: "Payment Issue",
    desc: "Failed transactions, 30% advance, balance",
    icon: CreditCard,
    color: "bg-emerald-50 text-emerald-600 border-emerald-150",
  },
  {
    id: "delivery",
    title: "Delivery & Shipping",
    desc: "Tracking, courier dispatch, store pickup",
    icon: Truck,
    color: "bg-cyan-50 text-cyan-600 border-cyan-150",
  },
  {
    id: "refund",
    title: "Refunds",
    desc: "Refund eligibility, processing timeline",
    icon: RotateCcw,
    color: "bg-purple-50 text-purple-600 border-purple-150",
  },
  {
    id: "cancellation",
    title: "Cancellation",
    desc: "24-hour window, policy conditions",
    icon: Ban,
    color: "bg-rose-50 text-rose-600 border-rose-150",
  },
  {
    id: "tailoring",
    title: "Tailoring & Alterations",
    desc: "Fit adjustments, measurement updates",
    icon: Scissors,
    color: "bg-amber-50 text-amber-600 border-amber-150",
  },
  {
    id: "technical",
    title: "Technical Issues",
    desc: "Website errors, cart, checkout glitches",
    icon: Laptop,
    color: "bg-red-50 text-red-600 border-red-150",
  },
  {
    id: "account",
    title: "Account & Profile",
    desc: "Saved addresses, measurements, login",
    icon: User,
    color: "bg-indigo-50 text-indigo-600 border-indigo-150",
  },
  {
    id: "other",
    title: "Other Inquiries",
    desc: "General questions and custom requests",
    icon: HelpCircle,
    color: "bg-slate-50 text-slate-600 border-slate-150",
  },
];

const statusStyles = {
  open: { label: "Open", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "In Progress", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  resolved: { label: "Resolved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  closed: { label: "Closed", cls: "bg-gray-50 text-gray-700 border-gray-200" },
};

function getSafeClientDiagnostics() {
  if (typeof window === "undefined") return {};
  const ua = navigator.userAgent || "";
  let browser = "Other";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";

  let device = "Desktop";
  if (/Mobi|Android/i.test(ua)) device = "Mobile";
  else if (/Tablet|iPad/i.test(ua)) device = "Tablet";

  return {
    pageUrl: window.location.href,
    browser,
    device,
    timestamp: new Date().toISOString(),
  };
}

export default function Support() {
  const { user, notify } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const prefilledOrderId = searchParams.get("orderId") || "";
  const prefilledOrderType = searchParams.get("type") || "none";
  const prefilledCategory = searchParams.get("category") || (prefilledOrderId ? "order" : "other");

  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [showNewModal, setShowNewModal] = useState(Boolean(prefilledOrderId || searchParams.get("new") === "true"));

  // New conversation form state
  const [category, setCategory] = useState(prefilledCategory);
  const [subject, setSubject] = useState(
    prefilledOrderId ? `Support for Order #${prefilledOrderId}` : ""
  );
  const [orderId, setOrderId] = useState(prefilledOrderId);
  const [orderType, setOrderType] = useState(prefilledOrderType);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchConversations = async () => {
    if (!user) return;
    setLoadingConversations(true);
    try {
      const res = await api.get("/api/support/conversations");
      if (res?.data) {
        setConversations(res.data);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const handleStartInquiry = (catId) => {
    setCategory(catId);
    if (!subject && !orderId) {
      const found = categories.find((c) => c.id === catId);
      setSubject(found ? `${found.title} Inquiry` : "Help Request");
    }
    setShowNewModal(true);
  };

  const handleSubmitNewConversation = async (e) => {
    e.preventDefault();
    if (!user) {
      notify("Please sign in to start a support conversation");
      navigate("/login");
      return;
    }

    if (!message.trim()) {
      notify("Please describe your issue or question");
      return;
    }

    setSubmitting(true);
    try {
      const diagnostics = category === "technical" ? getSafeClientDiagnostics() : undefined;

      const payload = {
        category,
        subject: subject.trim() || `${category.toUpperCase()} Support Request`,
        orderId: orderId.trim() || undefined,
        orderType: orderType || "none",
        initialMessage: message.trim(),
        diagnostics,
      };

      const res = await api.post("/api/support/conversations", payload);
      if (res?.data?.conversation?._id) {
        notify("Conversation started — a support specialist will reply shortly! ✨");
        navigate(`/support/${res.data.conversation._id}`);
      }
    } catch (err) {
      notify(err.message || "Failed to start support conversation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-8 py-12 md:py-20">
      <SEO
        title="Help & Support | Lucky Couture"
        description="Get direct customer assistance for custom tailoring, boutique orders, alterations, refunds, and technical queries at Lucky Couture."
        canonical="/support"
      />

      <SectionHeading
        align="left"
        eyebrow="Help Center"
        title="How can we assist you today?"
      />

      {/* ── Active / Past Conversations Section (if user logged in) ── */}
      {user && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-primary flex items-center gap-2">
              <MessageSquare size={18} className="text-accent" /> Your Support Conversations
            </h2>
            <button
              type="button"
              onClick={() => {
                setCategory("other");
                setSubject("");
                setOrderId("");
                setMessage("");
                setShowNewModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-bg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
            >
              <Plus size={14} /> New Conversation
            </button>
          </div>

          {loadingConversations ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-primary/10 shadow-card">
              <Loader2 size={22} className="animate-spin text-accent mx-auto mb-2" />
              <p className="text-xs text-ink/60">Loading your conversations…</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-2xl border border-primary/10 shadow-card text-ink/60">
              <p className="text-xs">You have no open support conversations.</p>
              <p className="text-[11px] text-ink/40 mt-1">Select a category below or click "New Conversation" to chat with our team.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3.5">
              {conversations.map((conv) => {
                const st = statusStyles[conv.status] || statusStyles.open;
                const catObj = categories.find((c) => c.id === conv.category) || categories[categories.length - 1];
                const IconComponent = catObj.icon;

                return (
                  <Link
                    key={conv._id}
                    to={`/support/${conv._id}`}
                    className="p-4 rounded-2xl bg-white border border-primary/10 shadow-card hover:shadow-soft hover:border-accent/40 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${st.cls}`}>
                          {st.label}
                        </span>
                        <span className="text-[11px] text-ink/50 flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(conv.lastMessageAt || conv.updatedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>

                      <h3 className="font-display text-sm font-semibold text-primary group-hover:text-accent transition-colors truncate">
                        {conv.subject || catObj.title}
                      </h3>

                      <p className="text-xs text-ink/60 mt-1 line-clamp-2 leading-relaxed">
                        {conv.lastMessage || "No messages yet"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-primary/5 text-xs">
                      <span className="text-[11px] text-ink/50 flex items-center gap-1.5">
                        <IconComponent size={13} className="text-accent" />
                        {conv.orderId ? `Order #${conv.orderId}` : catObj.title}
                      </span>
                      <span className="text-accent font-semibold text-xs flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        Chat <ChevronRight size={13} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Support Categories Grid ── */}
      <div className="mb-14">
        <h2 className="font-display text-lg font-semibold text-primary mb-2">Browse Support Topics</h2>
        <p className="text-xs text-ink/60 mb-6">Select a category to start a personalized support inquiry with our boutique team.</p>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleStartInquiry(cat.id)}
                className="p-5 rounded-2xl bg-white border border-primary/10 shadow-card hover:shadow-soft hover:border-accent/40 text-left transition-all group flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 border ${cat.color}`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="font-display text-sm font-semibold text-primary group-hover:text-accent transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-ink/60 mt-1 leading-relaxed">{cat.desc}</p>
                </div>

                <div className="flex items-center justify-between pt-4 mt-2 text-xs font-semibold text-accent">
                  <span>Start Chat</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Alternative Contact Info ── */}
      <div className="bg-bg/70 rounded-3xl p-6 sm:p-8 border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <h3 className="font-display text-base font-semibold text-primary">Need immediate assistance?</h3>
          <p className="text-xs text-ink/70 max-w-md leading-relaxed">
            Our boutique team is available Monday to Saturday, 10:00 AM – 8:00 PM IST for urgent tailoring queries and order assistance.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={contactInfo.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#25D366] text-white text-xs font-semibold hover:bg-[#1ebd59] transition-colors shadow-xs"
          >
            <Phone size={14} /> WhatsApp Support
          </a>
          <a
            href={`mailto:${contactInfo.email}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-bg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Mail size={14} /> Email Us
          </a>
        </div>
      </div>

      {/* ── New Inquiry Modal / Drawer ── */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-primary/10 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-ink/40 hover:text-primary hover:bg-bg transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>

              <div className="mb-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Human Support</span>
                <h3 className="font-display text-xl font-semibold text-primary mt-0.5">Start Support Chat</h3>
                <p className="text-xs text-ink/60 mt-1">Our support specialists will reply directly to your inquiry.</p>
              </div>

              <form onSubmit={handleSubmitNewConversation} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-primary uppercase tracking-wider mb-1.5">
                    Topic / Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 text-xs text-ink bg-white cursor-pointer focus:border-accent outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-primary uppercase tracking-wider mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Blouse fitting query"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 text-xs text-ink bg-white focus:border-accent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-primary uppercase tracking-wider mb-1.5">
                      Order ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="e.g. SHOP-123456"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-primary/20 text-xs text-ink bg-white font-mono focus:border-accent outline-none"
                    />
                  </div>
                </div>

                {category === "technical" && (
                  <div className="p-3 bg-red-50/70 rounded-xl border border-red-200 text-xs text-red-900 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Laptop size={13} /> Technical Diagnostics Active
                    </p>
                    <p className="text-[11px] text-red-800 leading-relaxed">
                      Non-sensitive browser and device metadata will be attached to help our developers resolve your issue faster.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-primary uppercase tracking-wider mb-1.5">
                    How can we help? <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your question or issue in detail…"
                    className="w-full p-3.5 rounded-xl border border-primary/20 text-xs text-ink bg-white focus:border-accent outline-none resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="px-4 py-2.5 rounded-full text-xs font-semibold text-ink/70 hover:bg-bg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !message.trim()}
                    className="px-6 py-2.5 rounded-full bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Starting Chat…
                      </>
                    ) : (
                      <>
                        <Send size={13} /> Send Message
                      </>
                    )}
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
