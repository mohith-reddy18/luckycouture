import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  Truck,
  Calendar,
  Tag,
  Scissors,
  Package,
  Sparkles,
  Info,
  ChevronRight,
  Loader2,
} from "lucide-react";
import api from "../utils/api";
import { useApp } from "../context/AppContext";

export default function NotificationDropdown() {
  const { user } = useApp();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get("/api/notifications");
      if (res?.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // ignore in background
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // 20s background polling
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id, link) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
    setIsOpen(false);
    if (link) {
      navigate(link);
    }
  };

  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    try {
      await api.patch("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  if (!user) return null;

  const getNotificationIcon = (type) => {
    switch (type) {
      case "delivery_confirmed":
        return <Truck size={15} className="text-accent" />;
      case "price_confirmed":
        return <Tag size={15} className="text-emerald-600" />;
      case "tailoring_status":
        return <Scissors size={15} className="text-purple-600" />;
      case "order_status":
        return <Package size={15} className="text-blue-600" />;
      case "booking_confirmed":
        return <Sparkles size={15} className="text-amber-600" />;
      default:
        return <Info size={15} className="text-primary/70" />;
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 text-primary/75 hover:text-accent transition-colors rounded-full hover:bg-primary/5 cursor-pointer"
        aria-label="View notifications"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-accent text-white text-[10px] min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center font-bold shadow-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-primary/10 overflow-hidden z-[60]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-primary/10 bg-primary/5">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm text-primary">Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-accent/15 text-accent text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline cursor-pointer"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-primary/5">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-ink/50">
                  <Bell size={28} className="mx-auto text-ink/20 mb-2" />
                  <p className="text-xs font-medium text-primary/80">No notifications yet</p>
                  <p className="text-[11px] text-ink/50 mt-0.5">
                    We’ll notify you when the admin updates your delivery dates, charges, or order progress.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    onClick={() => handleMarkAsRead(n._id, n.link)}
                    className={`p-3.5 flex items-start gap-3 hover:bg-primary/5 transition-colors cursor-pointer text-left ${
                      !n.isRead ? "bg-accent/5 font-medium" : "bg-white"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-white shadow-2xs border border-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      {getNotificationIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-semibold text-primary truncate">
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-ink/40 shrink-0 font-normal">
                          {formatTimeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-ink/75 leading-snug line-clamp-2">
                        {n.message}
                      </p>
                    </div>

                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-accent shrink-0 self-center" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 bg-bg/50 border-t border-primary/5 text-center">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/orders");
                  }}
                  className="text-xs text-primary font-semibold hover:text-accent transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  View All Orders <ChevronRight size={13} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
