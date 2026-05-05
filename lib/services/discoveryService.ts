// lib/services/discoveryService.ts
import { fetchTrendingNews } from './mediaStackService';
import { searchTrends } from './serpStackService';
import { getUserLocation } from './ipStackService';

export interface DiscoveryContext {
  trends: any[];
  searchResults: any[];
  location: any;
  summary: string;
}

export async function gatherNexusContext(query: string): Promise<DiscoveryContext> {
  console.log(`[DiscoveryService] Gathering context for: ${query}`);

  try {
    // Parallel fetch for efficiency
    const [news, search, location] = await Promise.allSettled([
      fetchTrendingNews(query),
      searchTrends(query),
      getUserLocation(),
    ]);

    const trends = news.status === 'fulfilled' ? news.value : [];
    const searchResults = search.status === 'fulfilled' ? search.value : [];
    const locationData = location.status === 'fulfilled' ? location.value : null;

    // Synthesize a summary for the AI agents
    const trendSummary = trends.length > 0 
      ? trends.map(n => `${n.title} (${n.source})`).join('; ')
      : 'No specific trending news found.';
    
    const searchSummary = searchResults.length > 0
      ? searchResults.map(r => `${r.title}: ${r.snippet}`).join('; ')
      : 'No real-time search results found.';
    
    const locationSummary = locationData 
      ? `${locationData.city}, ${locationData.country_name}`
      : 'Unknown location';

    return {
      trends,
      searchResults,
      location: locationData,
      summary: `Real-time Context:\nTrends: ${trendSummary}\nSearch: ${searchSummary}\nLocation: ${locationSummary}`,
    };
  } catch (error) {
    console.error('[DiscoveryService] Critical error gathering context:', error);
    return {
      trends: [],
      searchResults: [],
      location: null,
      summary: 'Context gathering failed. Proceeding with internal knowledge.',
    };
  }
}
