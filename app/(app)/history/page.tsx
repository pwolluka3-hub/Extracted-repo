'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/nexus/GlassCard';
import { NeonButton } from '@/components/nexus/NeonButton';
import { 
  loadAgentRuns, 
  getRunStatistics,
  getAgentRun,
  loadAuditLog,
  type AgentRun,
  type AuditEvent 
} from '@/lib/services/auditService';
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ChevronDown,
  ChevronUp,
  Zap,
  Timer,
  Coins,
  TrendingUp,
} from 'lucide-react';

export default function HistoryPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getRunStatistics>> | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'runs' | 'audit'>('runs');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [runsData, statsData, auditData] = await Promise.all([
        loadAgentRuns(50),
        getRunStatistics(30),
        loadAuditLog(100),
      ]);
      setRuns(runsData);
      setStats(statsData);
      setAuditLog(auditData);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: AgentRun['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-yellow-400" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-400 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const renderRunCard = (run: AgentRun) => (
    <GlassCard key={run.id} className="p-4 mb-3">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon(run.status)}
          <div>
            <div className="font-medium text-foreground">{run.taskType}</div>
            <div className="text-sm text-muted-foreground truncate max-w-[300px]">
              {run.taskDescription}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">
              {new Date(run.startedAt).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDuration(run.metrics.duration)} | {run.metrics.stepsCompleted} steps
            </div>
          </div>
          {expandedRunId === run.id ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {expandedRunId === run.id && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Tokens Used</div>
              <div className="text-lg font-semibold text-foreground">
                {run.metrics.totalTokens.toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Cost</div>
              <div className="text-lg font-semibold text-foreground">
                ${run.metrics.totalCost.toFixed(4)}
              </div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Duration</div>
              <div className="text-lg font-semibold text-foreground">
                {formatDuration(run.metrics.duration)}
              </div>
            </div>
          </div>

          {run.error && (
            <div className="p-3 bg-red-400/10 border border-red-400/20 rounded-lg mb-4">
              <div className="text-sm font-medium text-red-400 mb-1">Error</div>
              <div className="text-sm text-red-400/80">{run.error}</div>
            </div>
          )}

          {run.events.length > 0 && (
            <div>
              <div className="text-sm font-medium text-foreground mb-2">Events ({run.events.length})</div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {run.events.slice(0, 10).map(event => (
                  <div key={event.id} className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        event.result === 'success' ? 'bg-green-400' : 
                        event.result === 'failure' ? 'bg-red-400' : 'bg-yellow-400'
                      }`} />
                      <span className="text-muted-foreground">{event.action}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );

  const renderAuditEvent = (event: AuditEvent) => (
    <div key={event.id} className="flex items-center justify-between p-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${
          event.result === 'success' ? 'bg-green-400' : 
          event.result === 'failure' ? 'bg-red-400' : 'bg-yellow-400'
        }`} />
        <div>
          <div className="font-medium text-sm text-foreground">
            {event.eventType.replace(/_/g, ' ')}
          </div>
          <div className="text-xs text-muted-foreground">
            {event.actor} | {event.resource}
            {event.resourceId && ` (${event.resourceId.slice(0, 8)}...)`}
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {new Date(event.timestamp).toLocaleString()}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading history...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Run History</h1>
          <p className="text-muted-foreground">Track agent activity and audit trail</p>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[var(--nexus-cyan)]" />
              <span className="text-sm text-muted-foreground">Total Runs</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.totalRuns}</div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm text-muted-foreground">Success Rate</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.successRate.toFixed(1)}%</div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="w-4 h-4 text-[var(--nexus-violet)]" />
              <span className="text-sm text-muted-foreground">Avg Duration</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{formatDuration(stats.averageDuration)}</div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-muted-foreground">Total Tokens</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.totalTokens.toLocaleString()}</div>
          </GlassCard>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('runs')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'runs' 
              ? 'bg-[var(--nexus-cyan)]/20 text-[var(--nexus-cyan)]' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Agent Runs ({runs.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'audit' 
              ? 'bg-[var(--nexus-cyan)]/20 text-[var(--nexus-cyan)]' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Audit Log ({auditLog.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'runs' ? (
        runs.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No runs yet</h3>
            <p className="text-muted-foreground">Agent activity will appear here.</p>
          </GlassCard>
        ) : (
          <div>{runs.map(run => renderRunCard(run))}</div>
        )
      ) : (
        auditLog.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No audit events</h3>
            <p className="text-muted-foreground">System events will be logged here.</p>
          </GlassCard>
        ) : (
          <GlassCard padding="none">
            {auditLog.map(event => renderAuditEvent(event))}
          </GlassCard>
        )
      )}
    </div>
  );
}
