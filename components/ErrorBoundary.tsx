'use client';

import { Component, ReactNode, useState } from 'react';
import { GlassCard } from '@/components/nexus/GlassCard';
import { NeonButton } from '@/components/nexus/NeonButton';
import { AlertTriangle, RefreshCw, Home, Copy, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    
    this.setState({ errorInfo });
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorDisplay
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

// Reusable error display component
interface ErrorDisplayProps {
  error: Error | null;
  errorInfo?: React.ErrorInfo | null;
  onRetry?: () => void;
  onGoHome?: () => void;
  compact?: boolean;
}

export function ErrorDisplay({ error, errorInfo, onRetry, onGoHome, compact = false }: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyError = () => {
    const errorText = `Error: ${error?.message}\n\nStack: ${error?.stack}\n\nComponent Stack: ${errorInfo?.componentStack}`;
    navigator.clipboard.writeText(errorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get user-friendly message
  const getUserMessage = () => {
    const msg = error?.message?.toLowerCase() || '';
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Connection issue. Check your internet and try again.';
    }
    if (msg.includes('401') || msg.includes('auth')) {
      return 'Session expired. Please sign in again.';
    }
    if (msg.includes('429') || msg.includes('rate')) {
      return 'Too many requests. Please wait a moment.';
    }
    if (msg.includes('puter')) {
      return 'Storage service temporarily unavailable.';
    }
    return 'Something went wrong. Try again or return home.';
  };

  if (compact) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground font-medium">{getUserMessage()}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <GlassCard className="p-8 max-w-lg w-full">
        <div className="text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          
          {/* Title */}
          <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
          
          {/* User-friendly message */}
          <p className="text-muted-foreground mb-6">
            {getUserMessage()}
          </p>
          
          {/* Action buttons */}
          <div className="flex gap-3 justify-center mb-6">
            {onRetry && (
              <NeonButton onClick={onRetry} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </NeonButton>
            )}
            {onGoHome && (
              <NeonButton onClick={onGoHome} className="gap-2">
                <Home className="w-4 h-4" />
                Go to Dashboard
              </NeonButton>
            )}
          </div>
          
          {/* Technical details (collapsible) */}
          {error && (
            <div className="text-left">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground py-2 border-t border-border"
              >
                <span>Technical Details</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {showDetails && (
                <div className="mt-2 space-y-3">
                  <div className="bg-muted/30 border border-border rounded-lg p-3 max-h-40 overflow-auto">
                    <code className="text-xs text-destructive/80 break-all whitespace-pre-wrap">
                      {error.message}
                    </code>
                  </div>
                  
                  <button
                    onClick={copyError}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? 'Copied!' : 'Copy error details'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// Inline error display for use within components
export function InlineError({
  message,
  onRetry,
  className = '',
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 ${className}`}>
      <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
      <span className="text-sm text-foreground flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      )}
    </div>
  );
}
