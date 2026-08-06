import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollToTopButton from "./ScrollToTopButton";
import WhatsAppButton from "./WhatsAppButton";
import Toast from "./Toast";

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink font-body">
      <Navbar />
      <main className="flex-1 pt-[72px]">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTopButton />
      <WhatsAppButton />
      <Toast />
    </div>
  );
}
