'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useAgent } from '@/lib/context/AgentContext';
import { GlassCard } from '@/components/nexus/GlassCard';
import { NeonButton } from '@/components/nexus/NeonButton';
import { LoadingPulse } from '@/components/nexus/LoadingPulse';
import Link from 'next/link';
import { loadBrandKit } from '@/lib/services/memoryService';

export default function DashboardPage() {
  const { user } = useAuth();
  const agent = useAgent();
  const [dailyActions, setDailyActions] = useState<Array<{ title: string; description: string; action: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [brandKit, setBrandKit] = useState<any>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const brand = await loadBrandKit();
        setBrandKit(brand);

        const suggestions = [
          {
            title: 'Generate Content',
            description: 'Create a new post for your primary platform',
            action: '/studio'
          },
          {
            title: 'View Schedule',
            description: 'Check your upcoming scheduled posts',
            action: '/calendar'
          },
          {
            title: 'Complete Brand Setup',
            description: 'Finish configuring your brand guidelines',
            action: '/brand'
          }
        ];
        setDailyActions(suggestions);
      } catch (error) {
        console.error('[v0] Dashboard load error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingPulse />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-primary to-violet-900/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Welcome back, <span className="text-cyan">{brandKit?.brandName || user.username}</span>
          </h1>
          <p className="text-gray-400">Your AI content command center</p>
        </div>

        {/* Quick Stats */}
        {brandKit && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <GlassCard className="p-6">
              <div className="text-cyan text-sm font-semibold mb-2">BRAND NICHE</div>
              <p className="text-2xl font-bold text-white">{brandKit.niche}</p>
            </GlassCard>
            <GlassCard className="p-6">
              <div className="text-violet text-sm font-semibold mb-2">TONE</div>
              <p className="text-2xl font-bold text-white capitalize">{brandKit.tone}</p>
            </GlassCard>
            <GlassCard className="p-6">
              <div className="text-success text-sm font-semibold mb-2">CONTENT PILLARS</div>
              <p className="text-xl font-bold text-white">{brandKit.contentPillars?.length || 0}</p>
            </GlassCard>
          </div>
        )}

        {/* Daily Actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loading ? (
              <LoadingPulse />
            ) : (
              dailyActions.map((action, idx) => (
                <GlassCard key={idx} className="p-6 flex flex-col">
                  <h3 className="text-lg font-semibold text-white mb-2">{action.title}</h3>
                  <p className="text-gray-400 text-sm mb-4 flex-1">{action.description}</p>
                  <Link href={action.action} className="w-full">
                    <NeonButton className="w-full">
                      Go
                    </NeonButton>
                  </Link>
                </GlassCard>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Getting Started</h2>
          <GlassCard className="p-8">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-cyan/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-cyan text-sm font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Set up your brand kit</h3>
                  <p className="text-gray-400 text-sm">Define your niche, tone, and content pillars</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-violet/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-violet text-sm font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Connect your social platforms</h3>
                  <p className="text-gray-400 text-sm">Head to Settings to add your Ayrshare API key</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-success text-sm font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Generate your first post</h3>
                  <p className="text-gray-400 text-sm">Visit Content Studio to create AI-powered content</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
