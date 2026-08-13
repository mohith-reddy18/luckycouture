import { useLocation, Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function ProtectedRoute({
  children,
  adminOnly = false,
  message = "Please sign in to access this page",
}) {
  const { user, authLoading, notify } = useApp();
  const location = useLocation();

  // Show page loader while authentication status is restoring
  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  // If user is not authenticated, redirect to Login with intended destination
  if (!user) {
    if (message) notify(message);
    return (
      <Navigate
        to="/login"
        state={{
          from: location.pathname + location.search,
          intendedState: location.state,
        }}
        replace
      />
    );
  }

  // Admin access check if required
  if (adminOnly && user.role !== "admin") {
    notify("Access denied — admin privileges required");
    return <Navigate to="/" replace />;
  }

  return children;
}
