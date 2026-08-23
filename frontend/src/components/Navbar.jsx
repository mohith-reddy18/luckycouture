import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingBag, Menu, X, User, HelpCircle, ShieldCheck } from "lucide-react";
import { useApp } from "../context/AppContext";
import NotificationDropdown from "./NotificationDropdown";
import logo from "../assets/logo.jpg";

const links = [
  { to: "/", label: "Home" },
  { to: "/design-gallery", label: "Design Gallery" },
  { to: "/tailoring", label: "Tailoring" },
  { to: "/shop", label: "Shop" },
  { to: "/blog", label: "Blog" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

// Cream glass navbar — translucent so the page shows through slightly,
// but tinted light enough to stay readable over both the hero and the
// plain background sections underneath.
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { cartCount, wishlist, user, logout, authLoading } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkClass = ({ isActive }) =>
    `relative px-1 py-2 text-sm tracking-wide font-medium transition-colors ${
      isActive ? "text-accent" : "text-primary/80 hover:text-primary"
    }`;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md transition-all duration-300 ${
        scrolled
          ? "shadow-[0_6px_25px_-5px_rgba(68,55,66,0.12)]"
          : "shadow-[0_4px_20px_-4px_rgba(68,55,66,0.06)]"
      }`}
    >
      <div className="w-full px-3.5 sm:px-6 md:px-8 lg:px-12">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full ring-2 ring-accent/50 overflow-hidden shrink-0">
              <img src={logo} alt="Lucky Couture logo" className="w-full h-full object-cover" />
            </span>
            <span className="font-display text-lg sm:text-xl font-semibold text-primary tracking-tight">
              Lucky <span className="text-accent">Couture</span>
            </span>
          </Link>

          {/* Center nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === "/"} className={linkClass}>
                {({ isActive }) => (
                  <span className="relative">
                    {l.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute -bottom-1 left-0 right-0 h-[2px] bg-accent"
                      />
                    )}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3.5">
            <Link to="/contact" className="hidden sm:flex p-2 text-primary/75 hover:text-accent transition-colors" aria-label="Help Desk">
              <HelpCircle size={20} />
            </Link>
            <Link to="/wishlist" className="relative hidden sm:flex p-2 text-primary/75 hover:text-accent transition-colors" aria-label="Wishlist">
              <Heart size={20} />
              {wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-accent text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">
                  {wishlist.length}
                </span>
              )}
            </Link>
            <Link to="/cart" className="relative p-2 text-primary/75 hover:text-accent transition-colors" aria-label="Cart">
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-accent text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">
                  {cartCount}
                </span>
              )}
            </Link>

            {authLoading ? (
              <div className="hidden sm:block w-24 h-8 rounded-full bg-primary/10 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <NotificationDropdown />
                {user.role === "admin" && (
                  <Link
                    to="/admin"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent hover:bg-accent hover:text-white transition-colors text-xs font-semibold"
                  >
                    Admin Portal
                  </Link>
                )}
                <button
                  onClick={() => navigate("/profile")}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white border border-primary/15 shadow-sm hover:border-accent transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-primary text-highlight flex items-center justify-center text-xs font-semibold">
                    {user.name?.[0]?.toUpperCase()}
                  </span>
                  <span className="hidden sm:inline text-sm text-primary truncate max-w-[100px]">{user.name}</span>
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2.5">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-full text-sm font-medium text-primary bg-white border border-primary/20 shadow-sm transition-all duration-200 hover:bg-primary hover:text-bg hover:shadow-soft"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-full text-sm font-semibold text-primary bg-highlight shadow-sm transition-all duration-200 hover:bg-accent hover:text-white hover:shadow-soft"
                >
                  Sign up
                </Link>
              </div>
            )}

            <button
              className="lg:hidden p-2 text-primary"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden bg-white/98 backdrop-blur-md overflow-hidden"
          >
            <div className="px-5 py-4 flex flex-col gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `py-2.5 text-sm font-medium border-b border-primary/5 last:border-none ${
                      isActive ? "text-accent" : "text-primary"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              <Link
                to="/contact"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 py-2.5 text-sm font-medium text-primary border-b border-primary/5"
              >
                <HelpCircle size={16} /> Help Desk
              </Link>
              <div className="flex flex-col gap-3 pt-3">
                {user ? (
                  <>
                    {user.role === "admin" && (
                      <Link
                        to="/admin"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 text-sm font-semibold text-accent"
                      >
                        <ShieldCheck size={16} /> Admin Portal
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setOpen(false);
                        navigate("/profile");
                      }}
                      className="flex items-center gap-2 text-sm text-primary"
                    >
                      <span className="w-6 h-6 rounded-full bg-primary text-highlight flex items-center justify-center text-xs font-semibold">
                        {user.name?.[0]?.toUpperCase()}
                      </span>
                      {user.name}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="flex-1 text-center px-4 py-2 rounded-full text-sm font-medium text-primary border border-primary/20 transition-all hover:bg-primary hover:text-bg"
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setOpen(false)}
                      className="flex-1 text-center px-4 py-2 rounded-full text-sm font-semibold text-primary bg-highlight transition-all hover:bg-accent hover:text-white"
                    >
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
