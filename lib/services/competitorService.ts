// Competitor Analysis Service
import { universalChat } from './aiService';
import { readFile, writeFile, PATHS } from './puterService';
import type { BrandKit, Platform } from '@/lib/types';

export interface Competitor {
  id: string;
  name: string;
  handles: Record<Platform, string>;
  website?: string;
  description?: string;
  addedAt: string;
  lastAnalyzed?: string;
}

export interface CompetitorAnalysis {
  competitorId: string;
  platform: Platform;
  analyzedAt: string;
  metrics: {
    estimatedFollowers: string;
    postingFrequency: string;
    avgEngagement: string;
    contentTypes: string[];
    topPerformingContent: string[];
    hashtags: string[];
    postingTimes: string[];
  };
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  contentStrategy: string;
}

export interface CompetitorComparison {
  competitors: string[];
  metrics: ComparisonMetric[];
  insights: string[];
  recommendations: string[];
}

export interface ComparisonMetric {
  metric: string;
  values: Record<string, string | number>;
  winner: string;
}

// Add a competitor
export async function addCompetitor(competitor: Omit<Competitor, 'id' | 'addedAt'>): Promise<Competitor> {
  const newCompetitor: Competitor = {
    ...competitor,
    id: `competitor_${Date.now()}`,
    addedAt: new Date().toISOString(),
  };
  
  const competitors = await getCompetitors();
  competitors.push(newCompetitor);
  await writeFile(`${PATHS.analytics}/competitors.json`, competitors);
  
  return newCompetitor;
}

// Get all competitors
export async function getCompetitors(): Promise<Competitor[]> {
  const data = await readFile<Competitor[]>(`${PATHS.analytics}/competitors.json`, true);
  return data || [];
}

// Get a single competitor
export async function getCompetitor(id: string): Promise<Competitor | null> {
  const competitors = await getCompetitors();
  return competitors.find(c => c.id === id) || null;
}

// Update a competitor
export async function updateCompetitor(id: string, updates: Partial<Competitor>): Promise<void> {
  const competitors = await getCompetitors();
  const index = competitors.findIndex(c => c.id === id);
  
  if (index >= 0) {
    competitors[index] = { ...competitors[index], ...updates };
    await writeFile(`${PATHS.analytics}/competitors.json`, competitors);
  }
}

// Delete a competitor
export async function deleteCompetitor(id: string): Promise<void> {
  const competitors = await getCompetitors();
  const filtered = competitors.filter(c => c.id !== id);
  await writeFile(`${PATHS.analytics}/competitors.json`, filtered);
}

// Analyze a competitor's social media presence
export async function analyzeCompetitor(
  competitor: Competitor,
  platform: Platform,
  brandKit: BrandKit | null
): Promise<CompetitorAnalysis> {
  const handle = competitor.handles[platform];
  
  const prompt = `Analyze this competitor's ${platform} strategy:

Competitor: ${competitor.name}
Handle: @${handle || 'unknown'}
Website: ${competitor.website || 'N/A'}
Description: ${competitor.description || 'N/A'}

Provide a comprehensive analysis. Return JSON:
{
  "metrics": {
    "estimatedFollowers": "estimated follower count range",
    "postingFrequency": "how often they post",
    "avgEngagement": "estimated engagement rate",
    "contentTypes": ["types of content they post"],
    "topPerformingContent": ["description of their best content"],
    "hashtags": ["commonly used hashtags"],
    "postingTimes": ["typical posting times"]
  },
  "strengths": ["what they do well"],
  "weaknesses": ["areas they could improve"],
  "opportunities": ["gaps you could exploit"],
  "contentStrategy": "summary of their overall strategy"
}

Be specific and actionable. Return ONLY valid JSON.`;

  try {
    const response = await universalChat(prompt, { brandKit });
    const parsed = JSON.parse(response);
    
    // Update last analyzed timestamp
    await updateCompetitor(competitor.id, { lastAnalyzed: new Date().toISOString() });
    
    return {
      competitorId: competitor.id,
      platform,
      analyzedAt: new Date().toISOString(),
      ...parsed,
    };
  } catch {
    return {
      competitorId: competitor.id,
      platform,
      analyzedAt: new Date().toISOString(),
      metrics: {
        estimatedFollowers: 'Unknown',
        postingFrequency: 'Unknown',
        avgEngagement: 'Unknown',
        contentTypes: [],
        topPerformingContent: [],
        hashtags: [],
        postingTimes: [],
      },
      strengths: [],
      weaknesses: [],
      opportunities: [],
      contentStrategy: 'Analysis failed',
    };
  }
}

// Compare multiple competitors
export async function compareCompetitors(
  competitorIds: string[],
  platform: Platform,
  brandKit: BrandKit | null
): Promise<CompetitorComparison> {
  const competitors = await getCompetitors();
  const selected = competitors.filter(c => competitorIds.includes(c.id));
  
  if (selected.length < 2) {
    throw new Error('Need at least 2 competitors to compare');
  }
  
  const competitorNames = selected.map(c => c.name).join(', ');
  const handles = selected.map(c => `${c.name}: @${c.handles[platform] || 'N/A'}`).join('\n');
  
  const prompt = `Compare these competitors on ${platform}:

${handles}

My brand: ${brandKit?.niche || 'general business'}

Return JSON:
{
  "metrics": [
    {
      "metric": "Metric name",
      "values": { "Competitor1": "value", "Competitor2": "value" },
      "winner": "Name of the winner"
    }
  ],
  "insights": ["key insight about the competitive landscape"],
  "recommendations": ["what I should do differently based on this analysis"]
}

Compare on: posting frequency, engagement style, content quality, audience interaction, brand consistency.
Return ONLY valid JSON.`;

  try {
    const response = await universalChat(prompt, { brandKit });
    const parsed = JSON.parse(response);
    
    return {
      competitors: selected.map(c => c.name),
      ...parsed,
    };
  } catch {
    return {
      competitors: selected.map(c => c.name),
      metrics: [],
      insights: ['Comparison analysis failed'],
      recommendations: ['Try analyzing competitors individually'],
    };
  }
}

// Get content inspiration from competitors
export async function getCompetitorInspiration(
  competitorId: string,
  platform: Platform,
  contentType: string,
  brandKit: BrandKit | null
): Promise<string[]> {
  const competitor = await getCompetitor(competitorId);
  if (!competitor) return [];
  
  const prompt = `Based on what typically works for competitors like "${competitor.name}" on ${platform}, generate 5 content ideas for ${contentType} content.

My brand: ${brandKit?.niche || 'general'}
My tone: ${brandKit?.tone || 'professional'}

The ideas should be inspired by competitor strategies but original and tailored to my brand.

Return JSON array:
["idea 1", "idea 2", ...]

Return ONLY valid JSON.`;

  try {
    const response = await universalChat(prompt, { brandKit });
    return JSON.parse(response);
  } catch {
    return [];
  }
}

// Track competitor content (manual entry)
export interface TrackedContent {
  id: string;
  competitorId: string;
  platform: Platform;
  contentUrl?: string;
  contentText: string;
  metrics?: {
    likes: number;
    comments: number;
    shares: number;
  };
  notes?: string;
  trackedAt: string;
}

export async function trackCompetitorContent(
  content: Omit<TrackedContent, 'id' | 'trackedAt'>
): Promise<TrackedContent> {
  const tracked = await getTrackedContent();
  
  const newContent: TrackedContent = {
    ...content,
    id: `tracked_${Date.now()}`,
    trackedAt: new Date().toISOString(),
  };
  
  tracked.push(newContent);
  await writeFile(`${PATHS.analytics}/tracked_content.json`, tracked);
  
  return newContent;
}

export async function getTrackedContent(competitorId?: string): Promise<TrackedContent[]> {
  const data = await readFile<TrackedContent[]>(`${PATHS.analytics}/tracked_content.json`, true);
  const content = data || [];
  
  if (competitorId) {
    return content.filter(c => c.competitorId === competitorId);
  }
  
  return content;
}

// Generate competitive positioning statement
export async function generatePositioning(
  brandKit: BrandKit | null
): Promise<{ statement: string; differentiators: string[]; targetAudience: string }> {
  const competitors = await getCompetitors();
  const competitorNames = competitors.map(c => c.name).join(', ');
  
  const prompt = `Create a competitive positioning statement for my brand.

My brand: ${brandKit?.niche || 'general business'}
My tone: ${brandKit?.tone || 'professional'}
Competitors: ${competitorNames || 'general market competitors'}

Return JSON:
{
  "statement": "Unlike [competitors], we [unique value proposition] for [target audience] who want [desired outcome]",
  "differentiators": ["3-5 key differentiators"],
  "targetAudience": "specific target audience description"
}

Return ONLY valid JSON.`;

  try {
    const response = await universalChat(prompt, { brandKit });
    return JSON.parse(response);
  } catch {
    return {
      statement: 'We provide unique value to our customers.',
      differentiators: [],
      targetAudience: 'Our target customers',
    };
  }
}
