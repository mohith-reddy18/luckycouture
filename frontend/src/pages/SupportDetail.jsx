import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  Package,
  Scissors,
  ExternalLink,
  Phone,
  Mail,
  RotateCcw,
  Sparkles,
  Paperclip,
  User,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import api from "../utils/api";
import SEO from "../components/SEO";

const statusBadges = {
  open: { label: "Open", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "In Progress", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  resolved: { label: "Resolved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  closed: { label: "Closed", cls: "bg-gray-50 text-gray-700 border-gray-200" },
};

export default function SupportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, notify } = useApp();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [orderSummary, setOrderSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [reopening, setReopening] = useState(false);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isInitialScrollDone = useRef(false);
  const lastMessageCountRef = useRef(0);
  const pollTimerRef = useRef(null);

  const fetchThread = async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.get(`/api/support/conversations/${id}`);
      if (res?.data) {
        setConversation(res.data.conversation);
        setMessages(res.data.messages || []);
        setOrderSummary(res.data.orderSummary || null);
        setError("");
      }
    } catch (err) {
      if (!silent) {
        setError(err.message || "Failed to load conversation thread");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    isInitialScrollDone.current = false;
    lastMessageCountRef.current = 0;
    fetchThread();
  }, [id]);

  // Real-time polling every 4s while viewing the active chat
  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchThread(true);
      }
    }, 4000);
    return () => clearInterval(pollTimerRef.current);
  }, [id]);

  // Auto scroll ONLY inside internal chat container without moving window/document
  useEffect(() => {
    if (!chatContainerRef.current || messages.length === 0) return;
    const container = chatContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    const isFirstLoad = !isInitialScrollDone.current;
    const hasNewMessages = messages.length > lastMessageCountRef.current;

    if (isFirstLoad || (hasNewMessages && isNearBottom)) {
      container.scrollTop = container.scrollHeight;
      isInitialScrollDone.current = true;
    }
    lastMessageCountRef.current = messages.length;
  }, [messages]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || sending || !id) return;

    const text = replyText.trim();
    setSending(true);
    try {
      const res = await api.post(`/api/support/conversations/${id}/messages`, {
        message: text,
      });

      if (res?.data?.message) {
        setMessages((prev) => [...prev, res.data.message]);
        if (res.data.conversation) {
          setConversation(res.data.conversation);
        }
        setReplyText("");
      }
    } catch (err) {
      notify(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleReopen = async () => {
    if (!id || reopening) return;
    setReopening(true);
    try {
      const res = await api.patch(`/api/support/conversations/${id}/reopen`);
      if (res?.data) {
        setConversation(res.data);
        notify("Conversation reopened — you can send new messages.");
      }
    } catch (err) {
      notify(err.message || "Failed to reopen conversation");
    } finally {
      setReopening(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-24 text-center">
        <Loader2 size={32} className="animate-spin text-accent mx-auto mb-4" />
        <p className="text-xs text-ink/60">Loading support conversation…</p>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <AlertCircle size={36} className="text-red-500 mx-auto mb-4" />
        <h2 className="font-display text-xl font-semibold text-primary mb-2">Conversation Unavailable</h2>
        <p className="text-xs text-ink/60 mb-6">{error || "We couldn't find this support thread."}</p>
        <button
          onClick={() => navigate("/support")}
          className="px-6 py-2.5 rounded-full bg-primary text-bg text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          Back to Support Hub
        </button>
      </div>
    );
  }

  const st = statusBadges[conversation.status] || statusBadges.open;
  const isResolved = conversation.status === "resolved" || conversation.status === "closed";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 flex flex-col h-[calc(100dvh-95px)] min-h-[520px]">
      <SEO
        title={`${conversation.subject || "Support Inquiry"} | Lucky Couture`}
        canonical={`/support/${conversation._id}`}
        robots="noindex, nofollow"
      />

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between gap-4 mb-3 sm:mb-4 shrink-0">
        <button
          onClick={() => navigate("/support")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-ink/70 hover:text-primary transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} /> Back to Support
        </button>

        <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${st.cls}`}>
          {st.label}
        </span>
      </div>

      {/* ── Chat Container ── */}
      <div className="bg-white rounded-3xl shadow-card border border-primary/10 overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Thread Header */}
        <div className="p-4 sm:p-5 border-b border-primary/10 bg-bg/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
              {conversation.category} Support
            </span>
            <h1 className="font-display text-lg sm:text-xl font-semibold text-primary mt-0.5">
              {conversation.subject || "Support Thread"}
            </h1>
            <p className="text-xs text-ink/50 mt-0.5">
              Started on {new Date(conversation.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {orderSummary && (
            <div className="bg-white p-3 rounded-2xl border border-primary/10 shadow-xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-accent">
                {orderSummary.type === "tailoring" ? <Scissors size={16} /> : <Package size={16} />}
              </div>
              <div className="text-xs">
                <div className="font-semibold text-primary font-mono">{orderSummary.orderId}</div>
                <div className="text-[11px] text-ink/60 capitalize">
                  {orderSummary.type} • {orderSummary.status}
                </div>
              </div>
              <Link
                to={`/orders/${orderSummary.type}/${orderSummary.orderId}`}
                target="_blank"
                className="text-accent hover:underline text-[11px] font-semibold ml-1 flex items-center gap-0.5"
              >
                View <ExternalLink size={10} />
              </Link>
            </div>
          )}
        </div>

        {/* Resolved Notice Banner */}
        {isResolved && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3 text-xs text-emerald-900 flex-wrap shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>This inquiry has been marked as resolved. If you need more help, you can reopen it anytime.</span>
            </div>
            <button
              type="button"
              disabled={reopening}
              onClick={handleReopen}
              className="px-3 py-1.5 rounded-full bg-emerald-700 text-white font-semibold text-[11px] hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              {reopening ? "Reopening…" : "Reopen Chat"}
            </button>
          </div>
        )}

        {/* Messages List */}
        <div ref={chatContainerRef} className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-bg/10 to-white">
          {messages.map((msg) => {
            const isAdminMsg = msg.senderRole === "admin";
            return (
              <div
                key={msg._id}
                className={`flex flex-col ${isAdminMsg ? "items-start" : "items-end"}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-ink/50 mb-1 px-1">
                  <span className="font-semibold">
                    {isAdminMsg ? "Lucky Couture Support" : msg.senderName || "You"}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isAdminMsg
                      ? "bg-white text-ink rounded-tl-xs border border-primary/10 shadow-xs"
                      : "bg-primary text-bg rounded-tr-xs shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                  {msg.attachments?.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2 pt-2 border-t border-primary/10">
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
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Box */}
        <form onSubmit={handleSendMessage} className="p-3.5 sm:p-4 border-t border-primary/10 bg-white flex items-end gap-3 shrink-0">
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
            placeholder="Type your message here (Press Enter to send)…"
            className="flex-1 p-3 rounded-2xl border border-primary/20 text-xs sm:text-sm text-ink bg-bg/20 focus:bg-white focus:border-accent outline-none resize-none leading-relaxed"
          />

          <button
            type="submit"
            disabled={sending || !replyText.trim()}
            className="p-3 sm:p-3.5 rounded-2xl bg-accent text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center shrink-0 cursor-pointer"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
