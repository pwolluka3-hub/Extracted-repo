'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { AgentProvider } from '@/lib/context/AgentContext';
import { BrandKitProvider } from '@/lib/context/BrandKitContext';
import { AppShell } from '@/components/layout/AppShell';
import { FullPageLoading } from '@/components/nexus/LoadingPulse';
import { CommandPaletteWrapper } from '@/components/CommandPalette';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, isAuthenticated, onboardingComplete } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/');
      } else if (!onboardingComplete) {
        router.push('/onboarding');
      }
    }
  }, [isLoading, isAuthenticated, onboardingComplete, router]);

  if (isLoading) {
    return <FullPageLoading text="Loading..." />;
  }

  if (!isAuthenticated || !onboardingComplete) {
    return <FullPageLoading text="Redirecting..." />;
  }

  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <BrandKitProvider>
        <AgentProvider>
          <AppShell>{children}</AppShell>
          <CommandPaletteWrapper />
        </AgentProvider>
      </BrandKitProvider>
    </AuthGuard>
  );
}
