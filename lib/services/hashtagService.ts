// Hashtag Research & Generator Service
import { universalChat } from './aiService';
import { kvGet, kvSet } from './puterService';
import type { BrandKit, Platform } from '@/lib/types';

export interface HashtagSet {
  hashtags: string[];
  category: 'trending' | 'niche' | 'branded' | 'community';
  reach: 'high' | 'medium' | 'low';
  competition: 'high' | 'medium' | 'low';
}

export interface HashtagAnalysis {
  hashtag: string;
  estimatedReach: number;
  competition: number;
  relevanceScore: number;
  trending: boolean;
  relatedTags: string[];
}

export interface HashtagStrategy {
  primary: string[];      // 3-5 high-reach hashtags
  secondary: string[];    // 5-10 medium-reach hashtags
  niche: string[];        // 5-10 low-competition niche hashtags
  branded: string[];      // Your brand hashtags
  total: number;
  platformLimit: number;
}

// Platform hashtag limits
const PLATFORM_HASHTAG_LIMITS: Record<Platform, number> = {
  twitter: 3,
  instagram: 30,
  linkedin: 5,
  facebook: 10,
  tiktok: 5,
  threads: 5,
  youtube: 15,
  pinterest: 20,
};

// Generate hashtags for content
export async function generateHashtags(
  content: string,
  platform: Platform,
  brandKit: BrandKit | null,
  options: {
    includeEmoji?: boolean;
    maxHashtags?: number;
    focusOnTrending?: boolean;
  } = {}
): Promise<HashtagStrategy> {
  const { includeEmoji = false, maxHashtags, focusOnTrending = false } = options;
  const limit = maxHashtags || PLATFORM_HASHTAG_LIMITS[platform] || 10;
  
  const prompt = `Generate a strategic hashtag set for this ${platform} post.

Content: "${content}"

Brand/Niche: ${brandKit?.niche || 'general'}
${focusOnTrending ? 'FOCUS: Include trending hashtags relevant to this content' : ''}

Return a JSON object:
{
  "primary": ["3-5 high-reach hashtags with millions of posts"],
  "secondary": ["5-10 medium-reach hashtags with hundreds of thousands of posts"],
  "niche": ["5-10 specific niche hashtags with lower competition"],
  "branded": ["1-2 brand-specific hashtags if applicable"]
}

Rules:
- Total hashtags should not exceed ${limit}
- ${platform === 'twitter' ? 'Keep it minimal, 1-3 max' : ''}
- ${platform === 'instagram' ? 'Mix popular and niche for best reach' : ''}
- ${platform === 'linkedin' ? 'Use professional, industry-specific tags' : ''}
- Don't include the # symbol
- ${includeEmoji ? 'Can include emoji hashtags' : 'No emoji hashtags'}

Return ONLY valid JSON.`;

  try {
    const response = await universalChat(prompt, { brandKit });
    const parsed = JSON.parse(response);
    
    // Ensure we don't exceed limit
    const allTags = [
      ...(parsed.primary || []),
      ...(parsed.secondary || []),
      ...(parsed.niche || []),
      ...(parsed.branded || []),
    ].slice(0, limit);
    
    return {
      primary: parsed.primary || [],
      secondary: parsed.secondary || [],
      niche: parsed.niche || [],
      branded: parsed.branded || [],
      total: allTags.length,
      platformLimit: limit,
    };
  } catch {
    // Fallback
    return {
      primary: [],
      secondary: [],
      niche: [],
      branded: [],
      total: 0,
      platformLimit: limit,
    };
  }
}

// Research a specific hashtag
export async function researchHashtag(
  hashtag: string,
  brandKit: BrandKit | null
): Promise<HashtagAnalysis> {
  const prompt = `Analyze this hashtag: #${hashtag}

Return a JSON object:
{
  "hashtag": "${hashtag}",
  "estimatedReach": number (estimated posts using this tag, e.g., 1000000),
  "competition": number (1-100, how competitive),
  "relevanceScore": number (1-100, relevance for brand),
  "trending": boolean (is it currently trending?),
  "relatedTags": ["5 related hashtags without #"]
}

Brand context: ${brandKit?.niche || 'general'}

Return ONLY valid JSON.`;

  try {
    const response = await universalChat(prompt, { brandKit });
    return JSON.parse(response);
  } catch {
    return {
      hashtag,
      estimatedReach: 0,
      competition: 50,
      relevanceScore: 50,
      trending: false,
      relatedTags: [],
    };
  }
}

// Get trending hashtags for a niche
export async function getTrendingHashtags(
  niche: string,
  platform: Platform
): Promise<string[]> {
  const cacheKey = `trending_${platform}_${niche.toLowerCase().replace(/\s+/g, '_')}`;
  const cached = await kvGet(cacheKey);
  
  // Cache for 1 hour
  if (cached) {
    try {
      const { hashtags, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 3600000) {
        return hashtags;
      }
    } catch {}
  }
  
  const prompt = `What are the top 20 trending hashtags on ${platform} right now for the "${niche}" niche?

Return ONLY a JSON array of hashtags without the # symbol:
["hashtag1", "hashtag2", ...]`;

  try {
    const response = await universalChat(prompt);
    const hashtags = JSON.parse(response);
    
    // Cache the result
    await kvSet(cacheKey, JSON.stringify({
      hashtags,
      timestamp: Date.now(),
    }));
    
    return hashtags;
  } catch {
    return [];
  }
}

// Get hashtag suggestions based on content
export async function getHashtagSuggestions(
  partialTag: string,
  context: string,
  brandKit: BrandKit | null
): Promise<string[]> {
  const prompt = `Suggest 10 hashtag completions starting with "${partialTag}".

Context: ${context}
Brand: ${brandKit?.niche || 'general'}

Return ONLY a JSON array of complete hashtags without #:
["${partialTag}example1", "${partialTag}example2", ...]`;

  try {
    const response = await universalChat(prompt, { brandKit });
    return JSON.parse(response);
  } catch {
    return [];
  }
}

// Analyze hashtag performance over time (mock data for now)
export async function getHashtagPerformance(
  hashtags: string[]
): Promise<Record<string, { impressions: number; engagement: number; trend: 'up' | 'down' | 'stable' }>> {
  const result: Record<string, { impressions: number; engagement: number; trend: 'up' | 'down' | 'stable' }> = {};
  
  for (const tag of hashtags) {
    // In production, this would fetch real analytics
    result[tag] = {
      impressions: Math.floor(Math.random() * 10000) + 1000,
      engagement: Math.floor(Math.random() * 500) + 50,
      trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable',
    };
  }
  
  return result;
}

// Save favorite hashtag sets
export async function saveFavoriteHashtags(name: string, hashtags: string[]): Promise<void> {
  const favorites = await getFavoriteHashtags();
  favorites[name] = hashtags;
  await kvSet('favorite_hashtags', JSON.stringify(favorites));
}

export async function getFavoriteHashtags(): Promise<Record<string, string[]>> {
  const data = await kvGet('favorite_hashtags');
  if (data) {
    try {
      return JSON.parse(data);
    } catch {}
  }
  return {};
}

// Format hashtags for a specific platform
export function formatHashtags(hashtags: string[], platform: Platform): string {
  const limit = PLATFORM_HASHTAG_LIMITS[platform] || 10;
  const limited = hashtags.slice(0, limit);
  
  switch (platform) {
    case 'twitter':
      return limited.map(t => `#${t}`).join(' ');
    case 'instagram':
      return '\n.\n.\n.\n' + limited.map(t => `#${t}`).join(' ');
    case 'linkedin':
      return '\n\n' + limited.map(t => `#${t}`).join(' ');
    default:
      return limited.map(t => `#${t}`).join(' ');
  }
}
