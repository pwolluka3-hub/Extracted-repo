'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type Status =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'pending'
  | 'connected'
  | 'disconnected'
  | 'checking'
  | 'default'
  | 'neutral'
  | 'scheduled';

interface StatusBadgeProps {
  status: Status;
  label?: string;
  dot?: boolean;
  size?: 'sm' | 'md';
  platform?: string;
  children?: ReactNode;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  dot = false,
  size = 'md',
  platform,
  children,
  className,
}: StatusBadgeProps) {
  const statusConfig: Record<string, { bg: string; text: string; border: string; dot: string; defaultLabel: string }> = {
    success: {
      bg: 'bg-[var(--nexus-success)]/20',
      text: 'text-[var(--nexus-success)]',
      border: 'border-[var(--nexus-success)]/30',
      dot: 'bg-[var(--nexus-success)]',
      defaultLabel: 'Success',
    },
    connected: {
      bg: 'bg-[var(--nexus-success)]/20',
      text: 'text-[var(--nexus-success)]',
      border: 'border-[var(--nexus-success)]/30',
      dot: 'bg-[var(--nexus-success)]',
      defaultLabel: 'Connected',
    },
    warning: {
      bg: 'bg-[var(--nexus-warning)]/20',
      text: 'text-[var(--nexus-warning)]',
      border: 'border-[var(--nexus-warning)]/30',
      dot: 'bg-[var(--nexus-warning)]',
      defaultLabel: 'Warning',
    },
    checking: {
      bg: 'bg-[var(--nexus-warning)]/20',
      text: 'text-[var(--nexus-warning)]',
      border: 'border-[var(--nexus-warning)]/30',
      dot: 'bg-[var(--nexus-warning)]',
      defaultLabel: 'Checking',
    },
    error: {
      bg: 'bg-[var(--nexus-error)]/20',
      text: 'text-[var(--nexus-error)]',
      border: 'border-[var(--nexus-error)]/30',
      dot: 'bg-[var(--nexus-error)]',
      defaultLabel: 'Error',
    },
    disconnected: {
      bg: 'bg-[var(--nexus-error)]/20',
      text: 'text-[var(--nexus-error)]',
      border: 'border-[var(--nexus-error)]/30',
      dot: 'bg-[var(--nexus-error)]',
      defaultLabel: 'Disconnected',
    },
    info: {
      bg: 'bg-[var(--nexus-cyan)]/20',
      text: 'text-[var(--nexus-cyan)]',
      border: 'border-[var(--nexus-cyan)]/30',
      dot: 'bg-[var(--nexus-cyan)]',
      defaultLabel: 'Info',
    },
    pending: {
      bg: 'bg-muted/50',
      text: 'text-muted-foreground',
      border: 'border-muted',
      dot: 'bg-muted-foreground',
      defaultLabel: 'Pending',
    },
    default: {
      bg: 'bg-muted/50',
      text: 'text-muted-foreground',
      border: 'border-muted',
      dot: 'bg-muted-foreground',
      defaultLabel: 'Default',
    },
    neutral: {
      bg: 'bg-muted/50',
      text: 'text-muted-foreground',
      border: 'border-muted',
      dot: 'bg-muted-foreground',
      defaultLabel: 'Neutral',
    },
    scheduled: {
      bg: 'bg-[var(--nexus-cyan)]/20',
      text: 'text-[var(--nexus-cyan)]',
      border: 'border-[var(--nexus-cyan)]/30',
      dot: 'bg-[var(--nexus-cyan)]',
      defaultLabel: 'Scheduled',
    },
  };

  // Fallback to 'info' if status not found
  const config = statusConfig[status] || statusConfig.info;
  const displayLabel = children ?? label ?? config.defaultLabel;
  const badgeSize = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs';

  if (dot) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5',
          config.text,
          className
        )}
      >
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            config.dot,
            status === 'pending' && 'animate-pulse'
          )}
        />
        {displayLabel}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        badgeSize,
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {platform ? `${displayLabel}${displayLabel ? ' • ' : ''}${platform}` : displayLabel}
    </span>
  );
}

// Platform status indicator
export function PlatformStatus({
  platform,
  connected,
  username,
}: {
  platform: string;
  connected: boolean;
  username?: string;
}) {
  const platformColors: Record<string, string> = {
    twitter: 'text-[#1DA1F2]',
    instagram: 'text-[#E4405F]',
    tiktok: 'text-[#00F2EA]',
    linkedin: 'text-[#0A66C2]',
    facebook: 'text-[#1877F2]',
    threads: 'text-foreground',
    youtube: 'text-[#FF0000]',
    pinterest: 'text-[#E60023]',
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <span className={cn('font-medium capitalize', platformColors[platform])}>
          {platform}
        </span>
        {username && (
          <span className="text-xs text-muted-foreground">@{username}</span>
        )}
      </div>
      <StatusBadge
        status={connected ? 'success' : 'error'}
        label={connected ? 'Connected' : 'Disconnected'}
        dot
      />
    </div>
  );
}
