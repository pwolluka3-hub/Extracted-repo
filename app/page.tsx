'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { NeonButton } from '@/components/nexus/NeonButton';
import { GlassCard } from '@/components/nexus/GlassCard';

function LandingContent() {
  const router = useRouter();
  const { isAuthenticated, onboardingComplete, login } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Redirect authenticated users - only once
  useEffect(() => {
    if (isAuthenticated && !hasRedirected) {
      setHasRedirected(true);
      try {
        if (onboardingComplete) {
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
      } catch (error) {
        console.error('[v0] Navigation error:', error);
      }
    }
  }, [isAuthenticated, onboardingComplete, hasRedirected, router]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const success = await login();
      if (success) {
        // Auth context will handle the redirect
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // Don't show loading screen - page loads instantly
  // Auth check happens in background

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--nexus-cyan)] to-[var(--nexus-violet)] flex items-center justify-center neon-glow">
            <span className="text-background font-bold text-xl">N</span>
          </div>
          <span className="font-bold text-xl gradient-text">NexusAI</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          {/* Hero */}
          <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
            <span className="gradient-text">AI-Powered</span> Social Media Automation
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Create, validate, and publish high-quality content across all major platforms with your personal AI assistant.
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center justify-center gap-4 mb-12">
            <NeonButton
              onClick={handleSignIn}
              loading={isSigningIn}
              size="lg"
              className="px-10"
            >
              {isSigningIn ? 'Signing In...' : 'Get Started with Puter'}
            </NeonButton>
            <p className="text-sm text-muted-foreground">
              Free to use - pay only for AI credits
            </p>
          </div>

          {/* Features */}
          <div className="grid sm:grid-cols-2 gap-4">
            <GlassCard className="p-4">
              <h3 className="font-semibold mb-2 text-[var(--nexus-cyan)]">AI Content Generation</h3>
              <p className="text-sm text-muted-foreground">
                Generate engaging posts, images, and scripts with advanced AI models.
              </p>
            </GlassCard>

            <GlassCard className="p-4">
              <h3 className="font-semibold mb-2 text-[var(--nexus-violet)]">Quality Validation</h3>
              <p className="text-sm text-muted-foreground">
                AI validates every piece of content before publishing.
              </p>
            </GlassCard>

            <GlassCard className="p-4">
              <h3 className="font-semibold mb-2 text-[var(--nexus-success)]">Multi-Platform</h3>
              <p className="text-sm text-muted-foreground">
                Publish to Twitter, Instagram, TikTok, LinkedIn, and more.
              </p>
            </GlassCard>

            <GlassCard className="p-4">
              <h3 className="font-semibold mb-2 text-[var(--nexus-warning)]">Zero Backend</h3>
              <p className="text-sm text-muted-foreground">
                Runs entirely in your browser with Puter.js.
              </p>
            </GlassCard>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-border text-center text-sm text-muted-foreground">
        <p>Powered by Puter.js - Users pay their own AI credits</p>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return <LandingContent />;
}
