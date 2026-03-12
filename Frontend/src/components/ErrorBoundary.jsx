import React from 'react';

/**
 * Global Error Boundary constraint for React component tree.
 * Catches rendering errors, logs them in dev, and displays a fallback UI
 * to prevent the entire app from crashing to a white screen.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary caught error]', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
          <h2 className="text-3xl font-bold mb-4">Something went wrong</h2>
          <p className="text-gray-400 mb-6 max-w-lg text-center">
            We're sorry, but an unexpected error occurred while rendering this page.
            Try refreshing the page or navigating back.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-full font-medium transition-colors"
          >
            Refresh Page
          </button>
          
          {import.meta.env.DEV && this.state.error && (
            <div className="mt-8 p-4 bg-gray-900 rounded border border-red-900/50 text-left w-full max-w-3xl overflow-auto text-sm">
              <pre className="text-red-400">{this.state.error.stack}</pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
