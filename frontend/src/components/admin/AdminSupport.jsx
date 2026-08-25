import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  User,
  Phone,
  Mail,
  ExternalLink,
  Package,
  Scissors,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Paperclip,
  Check,
  X,
  Laptop,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import api from "../../utils/api";

const categoryLabels = {
  order: { label: "Order Issue", color: "bg-blue-50 text-blue-700 border-blue-200" },
  payment: { label: "Payment Issue", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  delivery: { label: "Delivery Issue", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  refund: { label: "Refund Request", color: "bg-purple-50 text-purple-700 border-purple-200" },
  cancellation: { label: "Cancellation", color: "bg-rose-50 text-rose-700 border-rose-200" },
  tailoring: { label: "Tailoring / Fit", color: "bg-amber-50 text-amber-700 border-amber-200" },
  account: { label: "Account Issue", color: "bg-gray-50 text-gray-700 border-gray-200" },
  technical: { label: "Technical Issue", color: "bg-red-50 text-red-700 border-red-200" },
  other: { label: "General Query", color: "bg-slate-50 text-slate-700 border-slate-200" },
};

const statusBadges = {
  open: { label: "Open", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  in_progress: { label: "In Progress", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  resolved: { label: "Resolved", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  closed: { label: "Closed", cls: "bg-gray-100 text-gray-700 border-gray-200" },
};

const cannedResponses = [
  "Hello! Thank you for reaching out. We are currently looking into this for you.",
  "We have checked your order details and our workshop team has updated the status.",
  "Your alteration request has been noted. Please bring or courier the piece to our studio.",
  "Your refund has been initiated and will reflect in your account within 5–7 business days.",
  "Could you please share a quick photo or additional details to help us assist you faster?",
];

export default function AdminSupport() {
  const { notify, user } = useApp();
  const [conversations, setConversations] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, unreadAdminCount: 0 });
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [activeConvData, setActiveConvData] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingConv, setLoadingConv] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isInitialScrollDone = useRef(false);
  const lastMessageCountRef = useRef(0);
  const pollTimerRef = useRef(null);

  const fetchConversations = async (silent = false) => {
    if (!silent) setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const [listRes, statsRes] = await Promise.all([
        api.get(`/api/support/admin/conversations?${params.toString()}`),
        api.get("/api/support/admin/stats"),
      ]);

      if (listRes?.data) setConversations(listRes.data);
      if (statsRes?.data) setStats(statsRes.data);
    } catch (err) {
      if (!silent) notify(err.message || "Failed to load support conversations");
    } finally {
      if (!silent) setLoadingList(false);
    }
  };

  const fetchActiveConversation = async (id, silent = false) => {
    if (!id) return;
    if (!silent) setLoadingConv(true);
    try {
      const res = await api.get(`/api/support/conversations/${id}`);
      if (res?.data) {
        setActiveConvData(res.data);
      }
    } catch (err) {
      if (!silent) notify(err.message || "Failed to load conversation thread");
    } finally {
      if (!silent) setLoadingConv(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [statusFilter, categoryFilter, searchTerm]);

  useEffect(() => {
    isInitialScrollDone.current = false;
    lastMessageCountRef.current = 0;
    if (selectedConvId) {
      fetchActiveConversation(selectedConvId);
    } else {
      setActiveConvData(null);
    }
  }, [selectedConvId]);

  // Real-time polling every 5s for active conversation & list stats
  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchConversations(true);
        if (selectedConvId) {
          fetchActiveConversation(selectedConvId, true);
        }
      }
    }, 5000);
    return () => clearInterval(pollTimerRef.current);
  }, [selectedConvId, statusFilter, categoryFilter, searchTerm]);

  // Scroll ONLY inside the internal chat container, NEVER window/document
  useEffect(() => {
    const msgs = activeConvData?.messages;
    if (!chatContainerRef.current || !msgs || msgs.length === 0) return;

    const container = chatContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    const isFirstLoad = !isInitialScrollDone.current;
    const hasNewMessages = msgs.length > lastMessageCountRef.current;

    if (isFirstLoad || (hasNewMessages && isNearBottom)) {
      container.scrollTop = container.scrollHeight;
      isInitialScrollDone.current = true;
    }

    lastMessageCountRef.current = msgs.length;
  }, [activeConvData?.messages]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || sending || !selectedConvId) return;

    const text = replyText.trim();
    setSending(true);
    try {
      const res = await api.post(`/api/support/conversations/${selectedConvId}/messages`, {
        message: text,
      });

      if (res?.data?.message) {
        setActiveConvData((prev) => ({
          ...prev,
          messages: [...(prev?.messages || []), res.data.message],
          conversation: res.data.conversation || prev?.conversation,
        }));
        setReplyText("");
        // Refresh conversation list to update lastMessage
        fetchConversations(true);
      }
    } catch (err) {
      notify(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedConvId || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await api.patch(`/api/support/admin/conversations/${selectedConvId}/status`, {
        status: newStatus,
      });
      if (res?.data) {
        setActiveConvData((prev) => ({ ...prev, conversation: res.data }));
        setConversations((prev) =>
          prev.map((c) => (c._id === selectedConvId ? { ...c, status: newStatus } : c))
        );
        notify(`Conversation marked as ${statusBadges[newStatus]?.label || newStatus}`);
        fetchConversations(true);
      }
    } catch (err) {
      notify(err.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-4 flex flex-col h-full lg:h-[calc(100dvh-130px)] min-h-[500px]">
      {/* ── Top Metrics Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-card border border-primary/10">
          <p className="text-[11px] font-semibold uppercase text-ink/60 tracking-wider">All Inquiries</p>
          <p className="font-display text-xl sm:text-2xl font-bold text-primary mt-0.5 sm:mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-card border border-primary/10">
          <p className="text-[11px] font-semibold uppercase text-blue-600 tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Open
          </p>
          <p className="font-display text-xl sm:text-2xl font-bold text-blue-700 mt-0.5 sm:mt-1">{stats.open}</p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-card border border-primary/10">
          <p className="text-[11px] font-semibold uppercase text-amber-600 tracking-wider">In Progress</p>
          <p className="font-display text-xl sm:text-2xl font-bold text-amber-700 mt-0.5 sm:mt-1">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-card border border-primary/10">
          <p className="text-[11px] font-semibold uppercase text-emerald-600 tracking-wider">Resolved</p>
          <p className="font-display text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5 sm:mt-1">{stats.resolved}</p>
        </div>
      </div>

      {/* ── Main Two-Column Layout ── */}
      <div className="grid lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] bg-white rounded-3xl shadow-card border border-primary/10 overflow-hidden flex-1 min-h-0 w-full min-w-0 max-w-full">
        {/* ── Left Column: Conversation Directory & Filters ── */}
        <div className="border-r border-primary/10 flex flex-col h-full min-h-0 w-full min-w-0 bg-bg/20">
          {/* Search & Filter Header */}
          <div className="p-3 sm:p-3.5 border-b border-primary/10 bg-white space-y-2.5 shrink-0 w-full min-w-0">
            <div className="relative w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search subject, customer, order ID…"
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-primary/15 text-xs text-ink bg-bg/40 focus:bg-white focus:border-accent outline-none"
              />
            </div>

            <div className="flex gap-2 w-full">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-primary/15 text-xs text-ink bg-white cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-primary/15 text-xs text-ink bg-white cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="order">Order Issue</option>
                <option value="payment">Payment Issue</option>
                <option value="delivery">Delivery Issue</option>
                <option value="refund">Refund Request</option>
                <option value="cancellation">Cancellation</option>
                <option value="tailoring">Tailoring / Fit</option>
                <option value="technical">Technical Issue</option>
                <option value="account">Account Issue</option>
                <option value="other">General Query</option>
              </select>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-primary/5 p-2 space-y-1 w-full min-w-0">
            {loadingList ? (
              <div className="p-8 text-center text-ink/40 space-y-2">
                <Loader2 size={20} className="animate-spin mx-auto text-accent" />
                <p className="text-xs">Loading conversations…</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-ink/50 space-y-2">
                <MessageSquare size={28} className="mx-auto text-primary/20" />
                <p className="text-xs font-medium">No support conversations found</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConvId === conv._id;
                const cat = categoryLabels[conv.category] || categoryLabels.other;
                const st = statusBadges[conv.status] || statusBadges.open;
                const timeStr = conv.lastMessageAt
                  ? new Date(conv.lastMessageAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    })
                  : "—";

                return (
                  <button
                    key={conv._id}
                    onClick={() => setSelectedConvId(conv._id)}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex flex-col gap-1.5 cursor-pointer min-w-0 ${
                      isSelected
                        ? "bg-primary text-bg shadow-sm"
                        : "hover:bg-white bg-white/70 border border-primary/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full min-w-0">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${
                        isSelected ? "bg-white/20 text-white border-white/30" : cat.color
                      }`}>
                        {cat.label}
                      </span>
                      <span className={`text-[10px] shrink-0 ${isSelected ? "text-bg/60" : "text-ink/50"}`}>
                        {timeStr}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2 mt-0.5 w-full min-w-0">
                      <h4 className={`text-xs font-semibold truncate flex-1 min-w-0 ${isSelected ? "text-bg" : "text-primary"}`}>
                        {conv.subject || "Support Inquiry"}
                      </h4>
                      {conv.unreadByAdmin > 0 && (
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0 mt-1" />
                      )}
                    </div>

                    <p className={`text-[11px] truncate w-full min-w-0 ${isSelected ? "text-bg/80" : "text-ink/60"}`}>
                      {conv.lastMessage || "No messages yet"}
                    </p>

                    <div className="flex items-center justify-between gap-2 pt-1 mt-0.5 border-t border-primary/10 w-full min-w-0">
                      <span className={`text-[11px] font-medium truncate flex-1 min-w-0 ${isSelected ? "text-bg/90" : "text-primary"}`}>
                        {conv.user?.name || "Customer"}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border shrink-0 ${
                        isSelected ? "bg-white/20 text-white border-transparent" : st.cls
                      }`}>
                        {st.label}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Column: Interactive Chat Thread ── */}
        <div className="flex flex-col h-full min-h-0 w-full min-w-0 bg-white overflow-hidden">
          {selectedConvId && activeConvData ? (
            <>
              {/* Conversation Top Header */}
              <div className="p-3.5 sm:p-4 border-b border-primary/10 flex flex-wrap items-center justify-between gap-3 bg-bg/30 shrink-0 w-full min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${
                      (categoryLabels[activeConvData.conversation.category] || categoryLabels.other).color
                    }`}>
                      {(categoryLabels[activeConvData.conversation.category] || categoryLabels.other).label}
                    </span>
                    <span className="text-xs text-ink/50 font-mono">ID: {activeConvData.conversation._id.slice(-8)}</span>
                  </div>
                  <h3 className="font-display text-base font-semibold text-primary truncate max-w-full">
                    {activeConvData.conversation.subject || "Support Conversation"}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-ink/60 mt-0.5 flex-wrap">
                    <span className="font-medium text-primary flex items-center gap-1 truncate max-w-[180px]">
                      <User size={12} className="text-accent shrink-0" /> {activeConvData.conversation.user?.name || "Customer"}
                    </span>
                    {activeConvData.conversation.user?.phone && (
                      <span className="flex items-center gap-1 truncate shrink-0">
                        <Phone size={12} className="text-ink/40 shrink-0" /> {activeConvData.conversation.user.phone}
                      </span>
                    )}
                    {activeConvData.conversation.user?.email && (
                      <span className="flex items-center gap-1 truncate max-w-[220px] break-all">
                        <Mail size={12} className="text-ink/40 shrink-0" /> {activeConvData.conversation.user.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Switcher */}
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    disabled={updatingStatus}
                    value={activeConvData.conversation.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-primary/20 text-xs font-semibold text-primary bg-white cursor-pointer shadow-xs"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>

                  {activeConvData.conversation.status !== "resolved" ? (
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus("resolved")}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Check size={13} /> Resolve
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus("in_progress")}
                      className="px-3 py-1.5 rounded-xl bg-primary text-bg text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              {/* Order Context Banner (if linked) */}
              {activeConvData.orderSummary && (
                <div className="bg-primary/5 border-b border-primary/10 px-4 py-2 flex items-center justify-between text-xs text-primary flex-wrap gap-2 shrink-0 w-full min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {activeConvData.orderSummary.type === "tailoring" ? (
                      <Scissors size={14} className="text-accent shrink-0" />
                    ) : (
                      <Package size={14} className="text-accent shrink-0" />
                    )}
                    <span className="truncate">
                      Linked Order: <strong className="font-mono">{activeConvData.orderSummary.orderId}</strong>
                    </span>
                    <span className="text-ink/60 hidden sm:inline">({activeConvData.orderSummary.type} • Status: {activeConvData.orderSummary.status})</span>
                  </div>
                  <Link
                    to={`/orders/${activeConvData.orderSummary.type}/${activeConvData.orderSummary.orderId}`}
                    target="_blank"
                    className="text-accent hover:underline flex items-center gap-1 font-semibold text-[11px] shrink-0"
                  >
                    View Order <ExternalLink size={11} />
                  </Link>
                </div>
              )}

              {/* Technical Diagnostics Info (if available) */}
              {activeConvData.conversation.diagnostics?.pageUrl && (
                <div className="bg-amber-50/60 border-b border-amber-200/50 px-4 py-1.5 flex items-center gap-3 text-[11px] text-amber-900 flex-wrap shrink-0 w-full min-w-0">
                  <span className="flex items-center gap-1 font-semibold text-amber-800 shrink-0">
                    <Laptop size={12} /> Diagnostic:
                  </span>
                  <span className="truncate max-w-xs">{activeConvData.conversation.diagnostics.pageUrl}</span>
                  {activeConvData.conversation.diagnostics.browser && (
                    <span className="shrink-0">• Browser: {activeConvData.conversation.diagnostics.browser}</span>
                  )}
                  {activeConvData.conversation.diagnostics.device && (
                    <span className="shrink-0">• Device: {activeConvData.conversation.diagnostics.device}</span>
                  )}
                </div>
              )}

              {/* Messages Thread */}
              <div ref={chatContainerRef} className="flex-1 min-h-0 p-4 sm:p-5 overflow-y-auto space-y-4 bg-gradient-to-b from-bg/10 to-white w-full min-w-0">
                {loadingConv ? (
                  <div className="py-12 text-center text-ink/40 space-y-2">
                    <Loader2 size={20} className="animate-spin mx-auto text-accent" />
                    <p className="text-xs">Loading message history…</p>
                  </div>
                ) : activeConvData.messages?.length === 0 ? (
                  <p className="text-xs text-center text-ink/40 py-8">No messages in this conversation yet.</p>
                ) : (
                  activeConvData.messages.map((msg) => {
                    const isAdminMsg = msg.senderRole === "admin";
                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col ${isAdminMsg ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-ink/50 mb-1 px-1">
                          <span className="font-semibold">{isAdminMsg ? "Lucky Couture Support" : msg.senderName || "Customer"}</span>
                          <span>•</span>
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                            isAdminMsg
                              ? "bg-primary text-bg rounded-tr-xs shadow-sm"
                              : "bg-bg text-ink rounded-tl-xs border border-primary/10 shadow-xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          {msg.attachments?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2 pt-2 border-t border-white/20">
                              {msg.attachments.map((att, i) => (
                                <a
                                  key={i}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] underline text-accent"
                                >
                                  <Paperclip size={11} /> Attachment {i + 1}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Canned Responses Bar */}
              <div className="p-2 sm:p-2.5 bg-bg/40 border-t border-primary/10 flex flex-wrap gap-1.5 shrink-0 w-full min-w-0 max-w-full">
                {cannedResponses.map((cr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReplyText(cr)}
                    className="text-[11px] font-medium bg-white hover:bg-primary/5 text-ink/80 px-2.5 py-1 rounded-lg border border-primary/10 transition-colors cursor-pointer text-left line-clamp-1 max-w-full"
                  >
                    {cr.slice(0, 36)}…
                  </button>
                ))}
              </div>

              {/* Message Composer */}
              <form onSubmit={handleSendMessage} className="p-3 sm:p-3.5 border-t border-primary/10 bg-white flex items-end gap-2.5 shrink-0 w-full min-w-0 max-w-full">
                <textarea
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your reply to the customer (Press Enter to send)…"
                  className="flex-1 min-w-0 w-full p-2.5 rounded-xl border border-primary/20 text-xs sm:text-sm text-ink bg-bg/20 focus:bg-white focus:border-accent outline-none resize-none leading-relaxed"
                />

                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="p-3 rounded-xl bg-accent text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center shrink-0 cursor-pointer w-10 h-10"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-ink/50 space-y-3">
              <MessageSquare size={36} className="text-primary/20" />
              <h4 className="font-display text-base font-semibold text-primary">No Conversation Selected</h4>
              <p className="text-xs max-w-sm">Select an inquiry from the left directory to review messages, order details, and respond to customers.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
