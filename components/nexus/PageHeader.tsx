import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  icon?: React.ReactNode | React.ElementType<any>;
  action?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  subtitle,
  icon,
  action,
  actions,
  className,
}: PageHeaderProps) {
  const resolvedDescription = description || subtitle;
  const resolvedAction = action || actions;
  const Icon = typeof icon === 'function' ? icon : null;
  const renderedIcon: React.ReactNode = Icon
    ? React.createElement(Icon as React.ElementType, { className: 'size-8' })
    : (icon as React.ReactNode);

  return (
    <div className={cn('mb-8', className)}>
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="text-2xl">
              {renderedIcon}
            </div>
          )}
          <h1 className="text-4xl font-bold text-balance">{title}</h1>
        </div>
        {resolvedAction && <div>{resolvedAction}</div>}
      </div>
      {resolvedDescription && (
        <p className="text-muted-foreground text-lg">{resolvedDescription}</p>
      )}
    </div>
  );
}
