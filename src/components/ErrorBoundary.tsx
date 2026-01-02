import React, { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service in production
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background"
          role="alert"
          aria-live="assertive"
        >
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <span className="text-3xl" aria-hidden="true">!</span>
          </div>
          
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Something went wrong
          </h1>
          
          <p className="text-muted-foreground text-sm max-w-xs mb-8">
            We encountered an unexpected error. Your data is safe.
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button 
              onClick={this.handleRetry}
              className="w-full"
              aria-label="Try again without reloading"
            >
              Try Again
            </Button>
            
            <Button 
              variant="outline" 
              onClick={this.handleReload}
              className="w-full"
              aria-label="Reload the entire page"
            >
              ↻ Reload App
            </Button>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <details className="mt-8 text-left w-full max-w-md">
              <summary className="text-xs text-muted-foreground cursor-pointer">
                Error details (dev only)
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
