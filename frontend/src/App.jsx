import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import OnboardingModal from "./components/OnboardingModal";
import ProfileCompletionModal from "./components/ProfileCompletionModal";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import { trackPageView } from "./utils/analytics";

// Robust lazy loader with chunk load error retry logic
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    try {
      const component = await componentImport();
      return component;
    } catch (error) {
      const isChunkError =
        error?.message?.includes("dynamically imported module") ||
        error?.message?.includes("Loading chunk") ||
        error?.name === "ChunkLoadError" ||
        error?.message?.includes("Importing a module script failed");

      const reloadKey = `lc_chunk_${window.location.pathname}`;
      const alreadyReloaded = sessionStorage.getItem(reloadKey);

      if (isChunkError && !alreadyReloaded) {
        sessionStorage.setItem(reloadKey, "1");
        // Force refresh to pull newest compiled chunks from server
        window.location.reload();
        return new Promise(() => {});
      }

      throw error;
    }
  });

const DesignGallery     = lazyWithRetry(() => import("./pages/DesignGallery"));
const DesignDetail      = lazyWithRetry(() => import("./pages/DesignDetail"));
const Tailoring         = lazyWithRetry(() => import("./pages/Tailoring"));
const Shop              = lazyWithRetry(() => import("./pages/Shop"));
const ProductDetail     = lazyWithRetry(() => import("./pages/ProductDetail"));
const Cart              = lazyWithRetry(() => import("./pages/Cart"));
const Wishlist          = lazyWithRetry(() => import("./pages/Wishlist"));
const Orders            = lazyWithRetry(() => import("./pages/Orders"));
const OrderDetail       = lazyWithRetry(() => import("./pages/OrderDetail"));
const Profile           = lazyWithRetry(() => import("./pages/Profile"));
const Admin             = lazyWithRetry(() => import("./pages/Admin"));
const About             = lazyWithRetry(() => import("./pages/About"));
const Contact           = lazyWithRetry(() => import("./pages/Contact"));
const PriorityStitching = lazyWithRetry(() => import("./pages/PriorityStitching"));
const PrivacyPolicy     = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const Terms             = lazyWithRetry(() => import("./pages/Terms"));
const Login             = lazyWithRetry(() => import("./pages/Login"));
const Signup            = lazyWithRetry(() => import("./pages/Signup"));
const NotFound          = lazyWithRetry(() => import("./pages/NotFound"));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
    </div>
  );
}

function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    // Slight timeout allows page SEO components to update document.title
    const timer = setTimeout(() => {
      trackPageView(location.pathname + location.search, document.title);
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      {/* Google Analytics 4 route tracker */}
      <RouteTracker />
      {/* Global post-signup onboarding — shown once after fresh registration */}
      <OnboardingModal />
      {/* Google login profile completion — shown when phone/name is missing */}
      <ProfileCompletionModal />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/"                     element={<Home />} />
            <Route path="/design-gallery"       element={<DesignGallery />} />
            <Route path="/design-gallery/:id"   element={<DesignDetail />} />
            <Route
              path="/tailoring"
              element={
                <ProtectedRoute message="Please sign in to book a tailoring order">
                  <Tailoring />
                </ProtectedRoute>
              }
            />
            <Route path="/shop"                 element={<Shop />} />
            <Route path="/shop/:id"             element={<ProductDetail />} />
            <Route path="/cart"                 element={<Cart />} />
            <Route path="/wishlist"             element={<Wishlist />} />
            <Route path="/orders"              element={<Orders />} />
            <Route
              path="/orders/:type/:id"
              element={
                <ProtectedRoute message="Please sign in to view your order details">
                  <OrderDetail />
                </ProtectedRoute>
              }
            />
            <Route path="/admin"                element={<Admin />} />
            <Route
              path="/admin/orders/:type/:id"
              element={
                <ProtectedRoute adminOnly message="Please sign in as admin to access admin order controls">
                  <OrderDetail isAdmin={true} />
                </ProtectedRoute>
              }
            />
            <Route path="/profile"              element={<Profile />} />
            <Route path="/about"               element={<About />} />
            <Route path="/contact"             element={<Contact />} />
            <Route path="/priority-stitching"  element={<PriorityStitching />} />
            <Route path="/privacy-policy"      element={<PrivacyPolicy />} />
            <Route path="/terms"               element={<Terms />} />
            <Route path="/login"               element={<Login />} />
            <Route path="/signup"              element={<Signup />} />
            <Route path="*"                    element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
