/**
 * VIRAL ANALYTICS SERVICE
 * Transforms individual viral scores into long-term trends and intelligence
 * 
 * Responsibilities:
 * - Track score distributions across providers and agents
 * - Identify high-performing "viral windows" (time, platform)
 * - Aggregate brand-specific quality metrics
 * - Provide data for the LearningSystem to optimize prompts
 */

import { kvGet, kvSet } from '../services/puterService';
import { ViralScore } from './ViralScoringEngine';

export interface ViralTrend {
  platform: string;
  avgScore: number;
  growthRate: number;
  topPerformingHooks: string[];
  dominantEmotionalTriggers: string[];
}

export interface QualityReport {
  totalAnalyses: number;
  overallAvgScore: number;
  providerPerformance: Record<string, { avgScore: number; successRate: number }>;
  agentPerformance: Record<string, { avgScore: number; successRate: number }>;
  topViralContent: { content: string; score: number; provider: string }[];
}

export class ViralAnalyticsService {
  private storageKey = 'nexus_viral_insights_v1';

  /**
   * Record a new scored output and update aggregate analytics
   */
  async recordResult(
    agentId: string, 
    providerId: string, 
    score: ViralScore, 
    content: string,
    platform: string
  ): Promise<void> {
    const history = await this.getHistory();
    
    history.push({
      timestamp: new Date().toISOString(),
      agentId,
      providerId,
      score: score.total,
      breakdown: score.breakdown,
      content,
      platform,
    });

    // Keep last 5000 results for trend analysis
    const trimmed = history.slice(-5000);
    await kvSet(this.storageKey, JSON.stringify(trimmed));
  }

  /**
   * Generate a comprehensive quality report
   */
  async generateReport(): Promise<QualityReport> {
    const history = await this.getHistory();
    
    const total = history.length;
    if (total === 0) return this.createEmptyReport();

    const avgScore = history.reduce((sum, h) => sum + h.score, 0) / total;
    
    const providerPerf: Record<string, any> = {};
    const agentPerf: Record<string, any> = {};
    const topContent: any[] = [];

    history.forEach(h => {
      // Provider Perf
      if (!providerPerf[h.providerId]) {
        providerPerf[h.providerId] = { sum: 0, count: 0 };
      }
      providerPerf[h.providerId].sum += h.score;
      providerPerf[h.providerId].count++;

      // Agent Perf
      if (!agentPerf[h.agentId]) {
        agentPerf[h.agentId] = { sum: 0, count: 0 };
      }
      agentPerf[h.agentId].sum += h.score;
      agentPerf[h.agentId].count++;

      // Top content
      topContent.push({ content: h.content, score: h.score, provider: h.providerId });
    });

    const processedProviderPerf = {};
    for (const id in providerPerf) {
      processedProviderPerf[id] = {
        avgScore: Math.round(providerPerf[id].sum / providerPerf[id].count),
        successRate: 100, // Simplification for this version
      };
    }

    const processedAgentPerf = {};
    for (const id in agentPerf) {
      processedAgentPerf[id] = {
        avgScore: Math.round(agentPerf[id].sum / agentPerf[id].count),
        successRate: 100,
      };
    }

    return {
      totalAnalyses: total,
      overallAvgScore: Math.round(avgScore),
      providerPerformance: processedProviderPerf,
      agentPerformance: processedAgentPerf,
      topViralContent: topContent.sort((a, b) => b.score - a.score).slice(0, 10),
    };
  }

  /**
   * Extract viral trends for a specific platform
   */
  async getPlatformTrends(platform: string): Promise<ViralTrend> {
    const history = await this.getHistory();
    const platformData = history.filter(h => h.platform === platform);

    if (platformData.length === 0) {
      return {
        platform,
        avgScore: 0,
        growthRate: 0,
        topPerformingHooks: [],
        dominantEmotionalTriggers: [],
      };
    }

    const avgScore = platformData.reduce((sum, h) => sum + h.score, 0) / platformData.length;
    
    // Simple hook extraction (first line)
    const hooks = platformData
      .filter(h => h.score >= 80)
      .map(h => h.content.split('\n')[0]);

    return {
      platform,
      avgScore: Math.round(avgScore),
      growthRate: 0, // Would require time-series analysis
      topPerformingHooks: [...new Set(hooks)].slice(0, 10),
      dominantEmotionalTriggers: [], // Would require breakdown analysis
    };
  }

  private async getHistory(): Promise<any[]> {
    try {
      const data = await kvGet(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private createEmptyReport(): QualityReport {
    return {
      totalAnalyses: 0,
      overallAvgScore: 0,
      providerPerformance: {},
      agentPerformance: {},
      topViralContent: [],
    };
  }
}

export const viralAnalyticsService = new ViralAnalyticsService();
