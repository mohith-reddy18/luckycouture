import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught UI Error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-5 text-center py-16">
          <h2 className="font-display text-2xl font-semibold text-primary mb-2">
            Something went wrong loading this page
          </h2>
          <p className="text-sm text-ink/60 max-w-md mb-6">
            Please refresh the page to reload the latest components.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReload}
              className="bg-primary text-bg px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Refresh Page
            </button>
            <a
              href="/"
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
