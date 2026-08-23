import { Outlet, useLocation } from "react-router-dom";
import { useEffect, Suspense } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollToTopButton from "./ScrollToTopButton";
import WhatsAppButton from "./WhatsAppButton";
import Toast from "./Toast";

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
      <span className="text-xs font-medium text-ink/50 tracking-wide">Loading…</span>
    </div>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink font-body w-full overflow-x-hidden">
      {!isAdmin && <Navbar />}
      <main className={`flex-1 w-full max-w-full ${!isAdmin ? "pt-[72px]" : ""}`}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <ScrollToTopButton />
      <WhatsAppButton />
      <Toast />
    </div>
  );
}

