'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wand2,
  Calendar,
  Share2,
  Settings,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/studio', label: 'Create', icon: Wand2 },
  { href: '/calendar', label: 'Schedule', icon: Calendar },
  { href: '/social', label: 'Social', icon: Share2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'lg:hidden fixed bottom-0 left-0 right-0 z-40',
        'bg-sidebar/95 backdrop-blur-xl',
        'border-t border-sidebar-border',
        'safe-area-bottom'
      )}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2',
                'transition-colors duration-200',
                isActive
                  ? 'text-[var(--nexus-cyan)]'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
