// lib/services/mediaStackService.ts
import { API_CONFIG, getApiKey } from '@/lib/api-config';

export interface MediaStackNews {
  title: string;
  text: string;
  url: string;
  source: string;
  category: string;
  country: string;
}

export async function fetchTrendingNews(keywords: string, country = 'us'): Promise<MediaStackNews[]> {
  const key = getApiKey('mediaStack');
  const url = `${API_CONFIG.mediaStack.baseUrl}?access_key=${key}&keywords=${encodeURIComponent(keywords)}&countries=${country}&limit=10`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Mediastack API error: ${response.statusText}`);
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[MediaStackService] Error fetching news:', error);
    throw error;
  }
}
