'use client';

import { useState, useEffect } from 'react';
import { setupPWAInstallPrompt, triggerPWAInstall, isPWAInstalled } from '@/lib/services/pwaService';
import { GlassCard } from '@/components/nexus/GlassCard';
import { NeonButton } from '@/components/nexus/NeonButton';
import { X, Download } from 'lucide-react';

export function PWAInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (isPWAInstalled()) return;

    setupPWAInstallPrompt(setCanInstall);

    // Show prompt after 10 seconds if not dismissed
    const timer = setTimeout(() => {
      if (!isDismissed && canInstall) {
        setShowPrompt(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [canInstall, isDismissed]);

  if (!canInstall || !showPrompt || isDismissed || isPWAInstalled()) {
    return null;
  }

  const handleInstall = async () => {
    const success = await triggerPWAInstall();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowPrompt(false);
  };

  return (
    <div className="fixed bottom-20 right-6 z-40 md:bottom-24">
      <GlassCard className="w-80 p-4 border border-[var(--nexus-cyan)]/30 animate-in slide-in-from-bottom-2">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-[var(--nexus-cyan)]" />
            <h3 className="font-semibold">Install NexusAI</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-muted/50 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Install NexusAI as an app for faster access and offline functionality.
        </p>
        <div className="flex gap-2">
          <NeonButton
            onClick={handleInstall}
            className="flex-1 py-2 text-sm"
          >
            Install
          </NeonButton>
          <button
            onClick={handleDismiss}
            className="flex-1 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-sm transition-colors"
          >
            Later
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
