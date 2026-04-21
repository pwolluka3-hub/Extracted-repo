'use client';

import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { NexusAgentFAB } from '@/components/agent/NexusAgentFAB';
import { NexusAgentPanel } from '@/components/agent/NexusAgentPanel';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - desktop */}
      <Sidebar />

      {/* Main content */}
      <main
        className={cn(
          'min-h-screen',
          'lg:pl-64', // Sidebar width on desktop
          'pb-20 lg:pb-0' // Bottom nav space on mobile
        )}
      >
        <div className="container mx-auto px-4 py-6 lg:py-8 max-w-6xl">
          {children}
        </div>
      </main>

      {/* Bottom navigation - mobile */}
      <BottomNav />

      {/* Agent FAB and Panel */}
      <NexusAgentFAB />
      <NexusAgentPanel />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}
