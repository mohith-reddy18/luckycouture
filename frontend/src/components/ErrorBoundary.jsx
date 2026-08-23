import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary] Uncaught UI Rendering Error:", error, errorInfo?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  handleReload = () => {
    try {
      sessionStorage.clear();
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch (_) {}
    window.location.reload();
  };

  handleGoHome = (e) => {
    e.preventDefault();
    try {
      sessionStorage.clear();
    } catch (_) {}
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env?.DEV;

      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-5 text-center py-16">
          <h2 className="font-display text-2xl font-semibold text-primary mb-2">
            Something went wrong loading this page
          </h2>
          <p className="text-sm text-ink/60 max-w-md mb-6">
            Please refresh the page to reload the latest components.
          </p>

          {isDev && this.state.error && (
            <div className="mb-6 max-w-xl w-full text-left bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs font-mono text-rose-900 overflow-x-auto">
              <strong className="block mb-1 text-rose-950 font-bold">{this.state.error.name}: {this.state.error.message}</strong>
              <pre className="text-[11px] opacity-80 whitespace-pre-wrap">{this.state.error.stack}</pre>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReload}
              className="bg-primary text-bg px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Refresh Page
            </button>
            <a
              href="/"
              onClick={this.handleGoHome}
              className="border border-primary/20 text-primary px-6 py-2.5 rounded-full text-sm font-medium hover:bg-primary/5 transition-colors"
            >
              Go to Homepage
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

