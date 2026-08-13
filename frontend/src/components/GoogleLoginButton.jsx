import { Component } from "react";
import { useGoogleLogin } from "@react-oauth/google";

function GoogleButtonInner({ onSuccess, onError, disabled, isDark = false }) {
  const loginWithGoogle = useGoogleLogin({
    onSuccess,
    onError: () => onError("Google Sign-In failed or was cancelled"),
  });

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        try {
          loginWithGoogle();
        } catch {
          onError("Google Sign-In is currently unavailable");
        }
      }}
      className={`w-full text-sm font-medium transition-colors flex items-center justify-center gap-3 shadow-sm rounded-full py-3 px-4 ${
        isDark
          ? "bg-bg/10 hover:bg-bg/20 text-bg border border-bg/20 mb-1"
          : "bg-bg hover:bg-secondary/10 text-primary border border-primary/15 mb-4"
      }`}
    >
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
        <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
        <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z" />
        <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
      </svg>
      Continue with Google
    </button>
  );
}

class GoogleLoginButton extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err) {
    console.warn("Google OAuth component warning:", err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <button
          type="button"
          onClick={() => this.props.onError("Google Sign-In is currently unavailable")}
          className={`w-full text-sm font-medium transition-colors flex items-center justify-center gap-3 shadow-sm rounded-full py-3 px-4 opacity-80 ${
            this.props.isDark
              ? "bg-bg/10 text-bg border border-bg/20 mb-1"
              : "bg-bg text-primary border border-primary/15 mb-4"
          }`}
        >
          <svg className="w-4 h-4 shrink-0 opacity-50" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
            <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z" />
            <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
          </svg>
          Continue with Google
        </button>
      );
    }

    return <GoogleButtonInner {...this.props} />;
  }
}

export default GoogleLoginButton;
