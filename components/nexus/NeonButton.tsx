'use client';

import { cn } from '@/lib/utils';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Spinner } from '@/components/ui/spinner';

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
      primary:
        'bg-gradient-to-r from-[var(--nexus-cyan)] to-[var(--nexus-violet)] text-background hover:shadow-[0_0_30px_rgba(0,245,255,0.5)] focus:ring-[var(--nexus-cyan)]',
      secondary:
        'bg-secondary/20 text-secondary-foreground border border-secondary/50 hover:bg-secondary/30 hover:border-secondary focus:ring-secondary',
      ghost:
        'bg-transparent text-foreground hover:bg-muted/50 focus:ring-muted',
      danger:
        'bg-destructive/20 text-destructive border border-destructive/50 hover:bg-destructive/30 focus:ring-destructive',
      outline:
        'bg-transparent text-foreground border border-border hover:bg-muted/50 focus:ring-muted',
    };

    const sizeClasses = {
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Spinner className="h-4 w-4" />
        ) : icon && iconPosition === 'left' ? (
          icon
        ) : null}
        {children}
        {!loading && icon && iconPosition === 'right' ? icon : null}
      </button>
    );
  }
);

NeonButton.displayName = 'NeonButton';
