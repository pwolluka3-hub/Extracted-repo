import { puterService } from './puterService';
import { aiService } from './aiService';

interface AnalyticsData {
  engagementRates: { [platform: string]: number };
  topContent: Array<{ id: string; engagement: number; platform: string }>;
  followerGrowth: Array<{ date: string; count: number }>;
  topHashtags: Array<{ tag: string; uses: number }>;
  postingTimes: { [time: string]: number };
  pillarPerformance: { [pillar: string]: number };
}

class AnalyticsService {
  async fetchAnalytics(ayrshareKey: string): Promise<AnalyticsData> {
    try {
      // Placeholder - would call Ayrshare Analytics API in production
      const analyticsPath = '/NexusAI/analytics/data.json';
      let analytics = await puterService.readFile<AnalyticsData>(analyticsPath, true);

      if (!analytics) {
        analytics = {
          engagementRates: {},
          topContent: [],
          followerGrowth: [],
          topHashtags: [],
          postingTimes: {},
          pillarPerformance: {}
        };
        await puterService.writeFile(analyticsPath, JSON.stringify(analytics, null, 2));
      }

      return analytics;
    } catch (error) {
      console.error('[v0] Analytics fetch error:', error);
      return {
        engagementRates: {},
        topContent: [],
        followerGrowth: [],
        topHashtags: [],
        postingTimes: {},
        pillarPerformance: {}
      };
    }
  }

  async generateInsights(analyticsData: AnalyticsData, brandContext: any): Promise<string> {
    try {
      const prompt = `
        Based on this social media performance data, provide 2-3 key insights and recommendations.
        Keep it under 100 words.

        Engagement Rates: ${JSON.stringify(analyticsData.engagementRates)}
        Best performing times: ${Object.entries(analyticsData.postingTimes)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([time]) => time)
          .join(', ')}
        Brand: ${brandContext.brandName}

        Focus on actionable insights the user can apply immediately.
      `;

      const response = await aiService.chat(prompt, 'claude-sonnet-4-5');
      return response;
    } catch (error) {
      console.error('[v0] Insights generation error:', error);
      return 'Unable to generate insights at this time.';
    }
  }

  async updateAnalytics(postData: any): Promise<void> {
    try {
      const analyticsPath = '/NexusAI/analytics/data.json';
      let analytics = await puterService.readFile<AnalyticsData>(analyticsPath, true);

      if (!analytics) {
        analytics = {
          engagementRates: {},
          topContent: [],
          followerGrowth: [],
          topHashtags: [],
          postingTimes: {},
          pillarPerformance: {}
        };
      }

      // Update posting times heatmap
      const hour = new Date(postData.scheduledAt).getHours();
      analytics.postingTimes[`${hour}:00`] = (analytics.postingTimes[`${hour}:00`] || 0) + 1;

      await puterService.writeFile(analyticsPath, JSON.stringify(analytics, null, 2));
    } catch (error) {
      console.error('[v0] Analytics update error:', error);
    }
  }
}

export const analyticsService = new AnalyticsService();

export async function fetchAnalytics(ayrshareKey: string): Promise<AnalyticsData> {
  return analyticsService.fetchAnalytics(ayrshareKey);
}

export async function generateInsights(analyticsData: AnalyticsData, brandContext: any): Promise<string> {
  return analyticsService.generateInsights(analyticsData, brandContext);
}
