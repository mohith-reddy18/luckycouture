import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Scissors,
  Users,
  Palette,
  Star,
  Boxes,
  CreditCard,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import logo from "../../assets/logo.jpg";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "tailoring", label: "Tailoring Orders", icon: Scissors },
  { id: "customers", label: "Customers", icon: Users },
  { id: "designs", label: "Design Gallery", icon: Palette },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "payments", label: "Payments", icon: CreditCard },
];

export default function AdminLayout({ activeSection, onSelectSection, children }) {
  const { user, logout } = useApp();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleNavClick = (id) => {
    if (id === "logout") {
      logout();
      return;
    }
    onSelectSection(id);
    setMobileDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-bg/50 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-primary text-bg shadow-md border-b border-highlight/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand & Drawer Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen((v) => !v)}
              className="lg:hidden p-2 rounded-xl text-bg/80 hover:text-bg hover:bg-bg/10 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileDrawerOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-full ring-2 ring-highlight/60 overflow-hidden block shrink-0">
                <img src={logo} alt="Lucky Couture logo" className="w-full h-full object-cover" />
              </span>
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-highlight block leading-none">
                  Admin Portal
                </span>
                <span className="font-display text-base font-semibold text-bg leading-tight">
                  Lucky Couture
                </span>
              </div>
            </div>
          </div>

          {/* Admin User Badge & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 bg-bg/10 px-3.5 py-1.5 rounded-full border border-bg/15">
              <span className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">
                {user?.name ? user.name[0].toUpperCase() : "A"}
              </span>
              <div className="text-left">
                <span className="text-xs font-semibold text-bg block leading-tight truncate max-w-[120px]">
                  {user?.name || "Administrator"}
                </span>
                <span className="text-[9px] text-bg/60 block leading-none">Admin</span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-highlight hover:text-white bg-bg/10 hover:bg-red-900/30 px-3 py-1.5 rounded-full transition-colors border border-highlight/20"
              aria-label="Log out of admin"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full flex-1 grid lg:grid-cols-[256px_1fr] px-4 sm:px-6 lg:px-8 py-6 md:py-8 gap-8">
        {/* Desktop Fixed Sidebar Navigation */}
        <aside className="hidden lg:block w-64 shrink-0 lg:self-start">
          <div className="bg-white rounded-2xl p-4 shadow-card border border-primary/5 lg:sticky lg:top-[120px] flex flex-col justify-between max-h-[calc(100vh-140px)] overflow-y-auto">
            <div>
              <div className="px-3 py-2 mb-2 border-b border-primary/10 flex items-center gap-2 text-primary">
                <ShieldCheck size={16} className="text-accent" />
                <span className="text-xs font-bold uppercase tracking-wider">Navigation</span>
              </div>

              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        active
                          ? "bg-primary text-bg font-semibold shadow-sm"
                          : "text-ink/75 hover:bg-bg hover:text-primary"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} className={active ? "text-highlight" : "text-ink/50"} />
                        <span>{item.label}</span>
                      </div>
                      {active && <ChevronRight size={13} className="text-highlight" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-primary/10 mt-3 shrink-0">
              <button
                onClick={() => handleNavClick("logout")}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile / Tablet Drawer Navigation */}
        <AnimatePresence>
          {mobileDrawerOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-primary/40 backdrop-blur-sm"
                onClick={() => setMobileDrawerOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 bottom-0 left-0 w-72 bg-white shadow-soft z-50 flex flex-col"
              >
                <div className="p-5 bg-primary text-bg flex items-center justify-between border-b border-highlight/20">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-highlight" />
                    <span className="font-display font-semibold text-sm">Admin Navigation</span>
                  </div>
                  <button onClick={() => setMobileDrawerOpen(false)} className="text-bg/70 hover:text-bg">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-medium transition-all ${
                          active
                            ? "bg-primary text-bg font-semibold shadow-sm"
                            : "text-ink/75 hover:bg-bg hover:text-primary"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={18} className={active ? "text-highlight" : "text-ink/50"} />
                          <span>{item.label}</span>
                        </div>
                        {active && <ChevronRight size={14} className="text-highlight" />}
                      </button>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-primary/10 bg-bg/40">
                  <button
                    onClick={() => handleNavClick("logout")}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold text-red-600 border border-red-200 bg-white"
                  >
                    <LogOut size={16} />
                    <span>Logout Admin Session</span>
                  </button>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
