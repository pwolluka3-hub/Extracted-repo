// Content Repurposing Engine
import { universalChat } from './aiService';
import type { BrandKit, Platform } from '@/lib/types';

export type ContentFormat = 
  | 'thread'
  | 'carousel'
  | 'short_video_script'
  | 'long_video_script'
  | 'blog_post'
  | 'newsletter'
  | 'podcast_outline'
  | 'infographic'
  | 'quote_cards'
  | 'stories'
  | 'reel_script'
  | 'linkedin_article';

export interface RepurposedContent {
  format: ContentFormat;
  platform: Platform;
  content: string;
  title?: string;
  slides?: string[];      // For carousels
  scenes?: VideoScene[];  // For video scripts
  quotes?: string[];      // For quote cards
  estimatedTime?: string; // How long to create
}

export interface VideoScene {
  sceneNumber: number;
  duration: string;
  visual: string;
  audio: string;
  text?: string;
  transition?: string;
}

// Platform format compatibility
const PLATFORM_FORMATS: Record<Platform, ContentFormat[]> = {
  twitter: ['thread', 'quote_cards'],
  instagram: ['carousel', 'reel_script', 'stories', 'quote_cards'],
  linkedin: ['carousel', 'linkedin_article', 'quote_cards'],
  facebook: ['carousel', 'short_video_script', 'stories'],
  tiktok: ['short_video_script', 'reel_script'],
  youtube: ['long_video_script', 'short_video_script'],
  threads: ['thread'],
  pinterest: ['infographic', 'carousel'],
};

// Repurpose content to a specific format
export async function repurposeContent(
  originalContent: string,
  targetFormat: ContentFormat,
  targetPlatform: Platform,
  brandKit: BrandKit | null
): Promise<RepurposedContent> {
  const prompt = getRepurposePrompt(originalContent, targetFormat, targetPlatform, brandKit);
  
  try {
    const response = await universalChat(prompt, { brandKit });
    return parseRepurposedContent(response, targetFormat, targetPlatform);
  } catch (error) {
    throw new Error(`Failed to repurpose content: ${error}`);
  }
}

// Repurpose to multiple formats at once
export async function repurposeToMultipleFormats(
  originalContent: string,
  formats: Array<{ format: ContentFormat; platform: Platform }>,
  brandKit: BrandKit | null
): Promise<RepurposedContent[]> {
  const results = await Promise.all(
    formats.map(({ format, platform }) =>
      repurposeContent(originalContent, format, platform, brandKit)
    )
  );
  
  return results;
}

// Get suggested formats for content
export async function suggestFormats(
  content: string,
  brandKit: BrandKit | null
): Promise<Array<{ format: ContentFormat; platform: Platform; reason: string }>> {
  const prompt = `Analyze this content and suggest the best formats to repurpose it into:

Content: "${content}"

Available formats: thread, carousel, short_video_script, long_video_script, blog_post, newsletter, podcast_outline, infographic, quote_cards, stories, reel_script, linkedin_article

Return a JSON array of the top 5 suggestions:
[
  { "format": "thread", "platform": "twitter", "reason": "why this format works" },
  ...
]

Consider the content length, topic, and engagement potential.
Return ONLY valid JSON.`;

  try {
    const response = await universalChat(prompt, { brandKit });
    return JSON.parse(response);
  } catch {
    // Return default suggestions
    return [
      { format: 'thread', platform: 'twitter', reason: 'Great for breaking down ideas' },
      { format: 'carousel', platform: 'instagram', reason: 'Visual storytelling format' },
      { format: 'reel_script', platform: 'tiktok', reason: 'Short-form video potential' },
    ];
  }
}

// Get formats available for a platform
export function getAvailableFormats(platform: Platform): ContentFormat[] {
  return PLATFORM_FORMATS[platform] || ['thread', 'carousel'];
}

// Private helper functions
function getRepurposePrompt(
  content: string,
  format: ContentFormat,
  platform: Platform,
  brandKit: BrandKit | null
): string {
  const baseContext = `Brand voice: ${brandKit?.tone || 'professional'}
Niche: ${brandKit?.niche || 'general'}

Original content:
"${content}"`;

  switch (format) {
    case 'thread':
      return `${baseContext}

Convert this into a compelling ${platform} thread (5-10 tweets/posts).

Return JSON:
{
  "content": "Full thread with numbered posts separated by \\n\\n---\\n\\n",
  "title": "Thread hook/title"
}`;

    case 'carousel':
      return `${baseContext}

Convert this into a ${platform} carousel (5-10 slides).

Return JSON:
{
  "content": "Caption for the carousel",
  "title": "Carousel title",
  "slides": ["Slide 1 text", "Slide 2 text", ...]
}

Each slide should be concise (under 100 characters) and visually focused.`;

    case 'short_video_script':
    case 'reel_script':
      return `${baseContext}

Convert this into a 30-60 second ${platform} video script.

Return JSON:
{
  "content": "Full script",
  "title": "Video title/hook",
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": "0-5s",
      "visual": "What to show",
      "audio": "What to say",
      "text": "On-screen text (optional)"
    }
  ]
}`;

    case 'long_video_script':
      return `${baseContext}

Convert this into a 5-10 minute YouTube video script.

Return JSON:
{
  "content": "Full script with intro, main content, and outro",
  "title": "Video title",
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": "0-30s",
      "visual": "What to show",
      "audio": "What to say"
    }
  ]
}`;

    case 'quote_cards':
      return `${baseContext}

Extract 5 powerful quotes/statements that would work as standalone quote cards.

Return JSON:
{
  "content": "Context about these quotes",
  "quotes": ["Quote 1", "Quote 2", ...]
}

Each quote should be impactful and under 150 characters.`;

    case 'stories':
      return `${baseContext}

Convert this into 5-7 Instagram/Facebook Stories.

Return JSON:
{
  "content": "Story sequence description",
  "slides": ["Story 1 text/concept", "Story 2 text/concept", ...]
}

Each story should be a single idea with engaging elements (polls, questions, etc.).`;

    case 'linkedin_article':
      return `${baseContext}

Convert this into a professional LinkedIn article.

Return JSON:
{
  "content": "Full article with proper formatting (use ## for headings)",
  "title": "Article headline"
}

Include an engaging hook, clear sections, and a call to action.`;

    case 'infographic':
      return `${baseContext}

Create an infographic outline for this content.

Return JSON:
{
  "content": "Infographic description",
  "title": "Infographic title",
  "slides": ["Section 1: Key point and data", "Section 2: Key point and data", ...]
}

Focus on statistics, facts, and visual hierarchy.`;

    case 'blog_post':
      return `${baseContext}

Expand this into a full blog post (800-1200 words).

Return JSON:
{
  "content": "Full blog post with markdown formatting",
  "title": "Blog post title"
}`;

    case 'newsletter':
      return `${baseContext}

Convert this into a newsletter format.

Return JSON:
{
  "content": "Newsletter body with personal tone",
  "title": "Email subject line"
}`;

    case 'podcast_outline':
      return `${baseContext}

Create a podcast episode outline from this content.

Return JSON:
{
  "content": "Full outline with talking points",
  "title": "Episode title",
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": "2-3 min",
      "visual": "Segment name",
      "audio": "Key talking points"
    }
  ]
}`;

    default:
      return `${baseContext}

Repurpose this content for ${platform} in ${format} format.

Return JSON:
{
  "content": "Repurposed content",
  "title": "Title if applicable"
}`;
  }
}

function parseRepurposedContent(
  response: string,
  format: ContentFormat,
  platform: Platform
): RepurposedContent {
  try {
    const parsed = JSON.parse(response);
    
    return {
      format,
      platform,
      content: parsed.content || response,
      title: parsed.title,
      slides: parsed.slides,
      scenes: parsed.scenes,
      quotes: parsed.quotes,
      estimatedTime: getEstimatedTime(format),
    };
  } catch {
    return {
      format,
      platform,
      content: response,
      estimatedTime: getEstimatedTime(format),
    };
  }
}

function getEstimatedTime(format: ContentFormat): string {
  const times: Record<ContentFormat, string> = {
    thread: '10-15 min',
    carousel: '30-45 min',
    short_video_script: '1-2 hours',
    long_video_script: '3-5 hours',
    blog_post: '1-2 hours',
    newsletter: '30-45 min',
    podcast_outline: '15-20 min',
    infographic: '1-2 hours',
    quote_cards: '15-20 min',
    stories: '20-30 min',
    reel_script: '30-45 min',
    linkedin_article: '45-60 min',
  };
  
  return times[format] || '30 min';
}

// Quick repurpose functions
export async function toThread(content: string, brandKit: BrandKit | null): Promise<RepurposedContent> {
  return repurposeContent(content, 'thread', 'twitter', brandKit);
}

export async function toCarousel(content: string, platform: Platform, brandKit: BrandKit | null): Promise<RepurposedContent> {
  return repurposeContent(content, 'carousel', platform, brandKit);
}

export async function toReelScript(content: string, brandKit: BrandKit | null): Promise<RepurposedContent> {
  return repurposeContent(content, 'reel_script', 'instagram', brandKit);
}

export async function toQuoteCards(content: string, brandKit: BrandKit | null): Promise<RepurposedContent> {
  return repurposeContent(content, 'quote_cards', 'instagram', brandKit);
}
