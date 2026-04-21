'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { GlassCard } from '@/components/nexus/GlassCard';
import { LoadingPulse } from '@/components/nexus/LoadingPulse';
import { fetchAnalytics, generateInsights } from '@/lib/services/analyticsService';
import { loadBrandKit } from '@/lib/services/memoryService';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [brandKit, setBrandKit] = useState<any>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const brand = await loadBrandKit();
        setBrandKit(brand);

        // In a real app, would fetch from Ayrshare API with user's key
        const analyticsData = await fetchAnalytics('');
        setAnalytics(analyticsData);

        if (brand) {
          const userInsights = await generateInsights(analyticsData, brand);
          setInsights(userInsights);
        }
      } catch (error) {
        console.error('[v0] Analytics load error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-primary to-violet-900/20 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-gray-400">Performance insights and AI recommendations</p>
        </div>

        {loading ? (
          <LoadingPulse />
        ) : (
          <div className="space-y-6">
            {/* AI Insights */}
            {insights && (
              <GlassCard className="p-8 bg-gradient-to-r from-cyan/10 to-violet/10">
                <h2 className="text-2xl font-bold text-cyan mb-4">AI Insights</h2>
                <p className="text-gray-300 leading-relaxed">{insights}</p>
              </GlassCard>
            )}

            {/* Engagement Rates */}
            {analytics?.engagementRates && Object.keys(analytics.engagementRates).length > 0 && (
              <GlassCard className="p-8">
                <h2 className="text-2xl font-bold text-violet mb-6">Engagement by Platform</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(analytics.engagementRates as Record<string, number>).map(([platform, rate]) => (
                    <div key={platform} className="p-4 bg-bg-glass rounded-lg border border-border">
                      <p className="text-gray-400 text-sm capitalize mb-2">{platform}</p>
                      <p className="text-3xl font-bold text-cyan">{(rate as number).toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Best Posting Times */}
            {analytics?.postingTimes && Object.keys(analytics.postingTimes).length > 0 && (
              <GlassCard className="p-8">
                <h2 className="text-2xl font-bold text-success mb-6">Best Posting Times</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(analytics.postingTimes as Record<string, number>)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 4)
                    .map(([time, count]) => (
                      <div key={time} className="p-4 bg-bg-glass rounded-lg border border-border">
                        <p className="text-gray-400 text-sm mb-2">{time}</p>
                        <p className="text-2xl font-bold text-success">{count as number}</p>
                        <p className="text-xs text-gray-500">posts</p>
                      </div>
                    ))}
                </div>
              </GlassCard>
            )}

            {/* Placeholder Message */}
            {!analytics || Object.keys(analytics).every(k => !analytics[k] || (Array.isArray(analytics[k]) && analytics[k].length === 0) || (typeof analytics[k] === 'object' && Object.keys(analytics[k]).length === 0)) && (
              <GlassCard className="p-8 text-center">
                <p className="text-gray-400 mb-4">No analytics data yet. Start posting to see your performance metrics.</p>
                <p className="text-sm text-gray-500">Connect your Ayrshare account in Settings to sync platform analytics.</p>
              </GlassCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
