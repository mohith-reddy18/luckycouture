import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import OnboardingModal from "./components/OnboardingModal";
import Home from "./pages/Home";

import ProtectedRoute from "./components/ProtectedRoute";

const DesignGallery     = lazy(() => import("./pages/DesignGallery"));
const DesignDetail      = lazy(() => import("./pages/DesignDetail"));
const Tailoring         = lazy(() => import("./pages/Tailoring"));
const Shop              = lazy(() => import("./pages/Shop"));
const ProductDetail     = lazy(() => import("./pages/ProductDetail"));
const Cart              = lazy(() => import("./pages/Cart"));
const Wishlist          = lazy(() => import("./pages/Wishlist"));
const Orders            = lazy(() => import("./pages/Orders"));
const OrderDetail        = lazy(() => import("./pages/OrderDetail"));
const Profile           = lazy(() => import("./pages/Profile"));
const Admin             = lazy(() => import("./pages/Admin"));
const About             = lazy(() => import("./pages/About"));
const Contact           = lazy(() => import("./pages/Contact"));
const PriorityStitching = lazy(() => import("./pages/PriorityStitching"));
const PrivacyPolicy     = lazy(() => import("./pages/PrivacyPolicy"));
const Terms             = lazy(() => import("./pages/Terms"));
const Login             = lazy(() => import("./pages/Login"));
const Signup            = lazy(() => import("./pages/Signup"));
const NotFound          = lazy(() => import("./pages/NotFound"));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <>
      {/* Global post-signup onboarding — shown once after fresh registration */}
      <OnboardingModal />

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
            <Route path="/orders/:type/:id"    element={<OrderDetail />} />
            <Route path="/profile"              element={<Profile />} />
            <Route path="/admin"                element={<Admin />} />
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
    </>
  );
}
