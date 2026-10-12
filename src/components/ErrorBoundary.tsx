"use client";

import { Component, ReactNode, ErrorInfo, useReducer } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Bug, X } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service in production
    if (process.env.NODE_ENV === "production") {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReset = () => {
    // Could trigger a full app reset or navigation
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // If custom fallback provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          role="alert"
        >
          <Card className="w-full max-w-md bg-[#1a1a22] border border-red-500/50 shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <CardTitle className="text-white">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-gray-400">
                <p className="mb-2">An unexpected error occurred. The error has been logged.</p>
                {process.env.NODE_ENV === "development" && this.state.error && (
                  <details className="text-left text-xs bg-[#0b0c0e] p-3 rounded text-red-300 max-h-40 overflow-auto">
                    <summary className="font-mono cursor-pointer mb-2">Error Details (Development)</summary>
                    <pre>{this.state.error.message}</pre>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="mt-2 text-gray-500">{this.state.errorInfo.componentStack}</pre>
                    )}
                  </details>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={this.handleRetry}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button className="flex-1" onClick={this.handleReset}>
                  <X className="w-4 h-4 mr-2" />
                  Reload App
                </Button>
              </div>

              <div className="text-center text-xs text-gray-500">
                <Bug className="w-3 h-3 inline mr-1" />
                Report this issue if it persists
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to throw errors to the nearest boundary
export function useErrorHandler() {
  const [, setError] = useReducer((state: Error, action: Error) => action, new Error());

  const throwError = (error: Error) => {
    setError(error);
  };

  return { throwError };
}

// For use in event handlers where we can't throw
export function captureError(error: Error, errorInfo?: ErrorInfo) {
  console.error("Captured error:", error, errorInfo);
  // In production, send to error tracking service
  if (process.env.NODE_ENV === "production") {
    // Sentry.captureException(error, { extra: errorInfo });
  }
}

// HOC to wrap any component with error boundary
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}