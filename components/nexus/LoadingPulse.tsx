'use client';

import { cn } from '@/lib/utils';

interface LoadingPulseProps {
  className?: string;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingPulse({ className, text, size = 'md' }: LoadingPulseProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className="relative">
        {/* Outer pulse ring */}
        <div
          className={cn(
            sizeClasses[size],
            'absolute inset-0 rounded-full bg-gradient-to-r from-[var(--nexus-cyan)] to-[var(--nexus-violet)] opacity-30 pulse-ring'
          )}
        />
        {/* Inner gradient circle */}
        <div
          className={cn(
            sizeClasses[size],
            'relative rounded-full bg-gradient-to-r from-[var(--nexus-cyan)] to-[var(--nexus-violet)] animate-pulse'
          )}
        />
      </div>
      {text && (
        <p className={cn('text-muted-foreground', textSizeClasses[size])}>
          {text}
        </p>
      )}
    </div>
  );
}

// Skeleton variant for content loading
export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-muted/50',
        className
      )}
    />
  );
}

// Full page loading state
export function FullPageLoading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <LoadingPulse size="lg" text={text} />
    </div>
  );
}

export default LoadingPulse;
