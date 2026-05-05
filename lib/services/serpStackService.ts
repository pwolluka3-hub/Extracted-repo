// lib/services/serpStackService.ts
import { API_CONFIG, getApiKey } from '@/lib/api-config';

export interface SerpStackResult {
  title: string;
  link: string;
  snippet: string;
}

export async function searchTrends(query: string): Promise<SerpStackResult[]> {
  const key = getApiKey('serpStack');
  const url = `${API_CONFIG.serpStack.baseUrl}?access_key=${key}&query=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Serpstack API error: ${response.statusText}`);
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('[SerpStackService] Error searching trends:', error);
    throw error;
  }
}
