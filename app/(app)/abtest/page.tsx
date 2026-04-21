'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { GlassCard } from '@/components/nexus/GlassCard';
import { NeonButton } from '@/components/nexus/NeonButton';
import { LoadingPulse } from '@/components/nexus/LoadingPulse';
import { TestTube2, BarChart3, TrendingUp } from 'lucide-react';
import { createABTest, getABTests, updateABTestMetrics } from '@/lib/services/abTestService';
import type { ABTest, ABTestVariant } from '@/lib/types';

export default function ABTestPage() {
  const { user } = useAuth();
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTest, setNewTest] = useState({
    name: '',
    description: '',
    contentA: '',
    contentB: '',
    platform: 'twitter' as const,
    duration: 7,
  });

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      const allTests = await getABTests();
      setTests(allTests);
    } catch (error) {
      console.error('Error loading tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async () => {
    if (!newTest.name || !newTest.contentA || !newTest.contentB) return;

    try {
      const test = await createABTest({
        name: newTest.name,
        description: newTest.description,
        variants: [
          { label: 'A', content: newTest.contentA, metrics: { impressions: 0, engagements: 0, engagement: 0, clicks: 0, shares: 0, saves: 0, comments: 0, engagementRate: 0, clickThroughRate: 0 } },
          { label: 'B', content: newTest.contentB, metrics: { impressions: 0, engagements: 0, engagement: 0, clicks: 0, shares: 0, saves: 0, comments: 0, engagementRate: 0, clickThroughRate: 0 } },
        ],
        platform: newTest.platform,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + newTest.duration * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
      });

      setTests([...tests, test]);
      setShowCreate(false);
      setNewTest({ name: '', description: '', contentA: '', contentB: '', platform: 'twitter', duration: 7 });
    } catch (error) {
      console.error('Error creating test:', error);
    }
  };

  if (loading) {
    return <LoadingPulse text="Loading A/B tests..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TestTube2 className="w-8 h-8 text-[var(--nexus-cyan)]" />
            A/B Testing
          </h1>
          <p className="text-muted-foreground mt-1">Compare content performance across variants</p>
        </div>
        <NeonButton onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Test'}
        </NeonButton>
      </div>

      {showCreate && (
        <GlassCard className="p-6 border border-[var(--nexus-cyan)]/30">
          <h2 className="text-xl font-semibold mb-4">Create New A/B Test</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Test name"
              value={newTest.name}
              onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-[var(--nexus-cyan)] outline-none"
            />
            <textarea
              placeholder="Description (optional)"
              value={newTest.description}
              onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-[var(--nexus-cyan)] outline-none min-h-20"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Variant A</label>
                <textarea
                  placeholder="Content for variant A"
                  value={newTest.contentA}
                  onChange={(e) => setNewTest({ ...newTest, contentA: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-[var(--nexus-cyan)] outline-none min-h-24"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Variant B</label>
                <textarea
                  placeholder="Content for variant B"
                  value={newTest.contentB}
                  onChange={(e) => setNewTest({ ...newTest, contentB: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-[var(--nexus-cyan)] outline-none min-h-24"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Platform</label>
                <select
                  value={newTest.platform}
                  onChange={(e) => setNewTest({ ...newTest, platform: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-[var(--nexus-cyan)] outline-none"
                >
                  <option value="twitter">Twitter/X</option>
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Duration (days)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={newTest.duration}
                  onChange={(e) => setNewTest({ ...newTest, duration: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-[var(--nexus-cyan)] outline-none"
                />
              </div>
            </div>
            <NeonButton onClick={handleCreateTest} className="w-full">
              Create Test
            </NeonButton>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 gap-4">
        {tests.length === 0 ? (
          <GlassCard className="p-8 text-center border border-border/50">
            <TestTube2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No A/B tests yet. Create one to compare content performance.</p>
          </GlassCard>
        ) : (
          tests.map((test) => (
            <GlassCard key={test.id} className="p-6 border border-border/50 hover:border-[var(--nexus-cyan)]/50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{test.name}</h3>
                  <p className="text-sm text-muted-foreground">{test.description || 'No description provided'}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${test.status === 'active' ? 'bg-[var(--nexus-success)]/20 text-[var(--nexus-success)]' : 'bg-muted/50 text-muted-foreground'}`}>
                  {test.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {test.variants.map((variant) => (
                  <div key={variant.label || variant.name} className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm font-medium mb-2">Variant {variant.label || variant.name}</p>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{variant.content}</p>
                    <div className="space-y-1 text-xs">
                      <p>Impressions: <span className="font-semibold">{variant.metrics?.impressions ?? 0}</span></p>
                      <p>Clicks: <span className="font-semibold">{variant.metrics?.clicks ?? 0}</span></p>
                      <p>Engagement: <span className="font-semibold">{((variant.metrics?.engagement ?? 0) * 100).toFixed(1)}%</span></p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Ends: {test.endDate ? new Date(test.endDate).toLocaleDateString() : 'TBD'}
              </p>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}
