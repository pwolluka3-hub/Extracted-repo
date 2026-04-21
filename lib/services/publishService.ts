// Publishing Service - Ayrshare API integration
import type { Platform, ContentDraft } from '@/lib/types';
import { kvGet } from './puterService';

const AYRSHARE_API_BASE = 'https://app.ayrshare.com/api';

// Get Ayrshare API key from storage
async function getAyrshareKey(): Promise<string | null> {
  return kvGet('ayrshare_key');
}

// Check if Ayrshare is configured
export async function isAyrshareConfigured(): Promise<boolean> {
  const key = await getAyrshareKey();
  return !!key && key.length > 10;
}

// Fetch helper with auth
async function ayrshareRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const key = await getAyrshareKey();
  if (!key) {
    throw new Error('Ayrshare API key not configured');
  }

  const response = await fetch(`${AYRSHARE_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.message || 'Ayrshare API error');
  }

  return response.json();
}

// Platform mapping for Ayrshare
const PLATFORM_MAP: Record<Platform, string> = {
  twitter: 'twitter',
  instagram: 'instagram',
  tiktok: 'tiktok',
  linkedin: 'linkedin',
  facebook: 'facebook',
  threads: 'threads',
  youtube: 'youtube',
  pinterest: 'pinterest',
};

// Publish a post immediately
export async function publishPost(params: {
  text: string;
  platforms: Platform[];
  mediaUrl?: string;
  mediaUrls?: string[];
}): Promise<{
  success: boolean;
  postIds?: Record<string, string>;
  errors?: Record<string, string>;
}> {
  const { text, platforms, mediaUrl, mediaUrls } = params;

  const ayrshareplatforms = platforms.map(p => PLATFORM_MAP[p]);
  const media = mediaUrls || (mediaUrl ? [mediaUrl] : undefined);

  try {
    const result = await ayrshareRequest<{
      id?: string;
      postIds?: Record<string, string>;
      errors?: Record<string, string>;
    }>('/post', {
      method: 'POST',
      body: JSON.stringify({
        post: text,
        platforms: ayrshareplatforms,
        mediaUrls: media,
      }),
    });

    return {
      success: !result.errors || Object.keys(result.errors).length === 0,
      postIds: result.postIds,
      errors: result.errors,
    };
  } catch (error) {
    return {
      success: false,
      errors: { general: (error as Error).message },
    };
  }
}

// Schedule a post for later
export async function schedulePost(params: {
  text: string;
  platforms: Platform[];
  scheduledDate: string; // ISO 8601
  mediaUrl?: string;
  mediaUrls?: string[];
}): Promise<{
  success: boolean;
  postId?: string;
  error?: string;
}> {
  const { text, platforms, scheduledDate, mediaUrl, mediaUrls } = params;

  const ayrshareplatforms = platforms.map(p => PLATFORM_MAP[p]);
  const media = mediaUrls || (mediaUrl ? [mediaUrl] : undefined);

  try {
    const result = await ayrshareRequest<{
      id?: string;
      error?: string;
    }>('/post', {
      method: 'POST',
      body: JSON.stringify({
        post: text,
        platforms: ayrshareplatforms,
        mediaUrls: media,
        scheduleDate: scheduledDate,
      }),
    });

    return {
      success: !!result.id,
      postId: result.id,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

// Delete a scheduled post
export async function deleteScheduledPost(postId: string): Promise<boolean> {
  try {
    await ayrshareRequest(`/post/${postId}`, { method: 'DELETE' });
    return true;
  } catch {
    return false;
  }
}

// Get connected platforms
export async function getConnectedPlatforms(): Promise<{
  platforms: Platform[];
  details: Record<Platform, { connected: boolean; username?: string }>;
}> {
  try {
    const result = await ayrshareRequest<{
      activePlatforms?: string[];
      user?: Record<string, { username?: string }>;
    }>('/user');

    const activePlatforms = result.activePlatforms || [];
    const platformDetails: Record<Platform, { connected: boolean; username?: string }> = {
      twitter: { connected: false },
      instagram: { connected: false },
      tiktok: { connected: false },
      linkedin: { connected: false },
      facebook: { connected: false },
      threads: { connected: false },
      youtube: { connected: false },
      pinterest: { connected: false },
    };

    const connectedPlatforms: Platform[] = [];

    for (const [platform, ayrshareId] of Object.entries(PLATFORM_MAP)) {
      if (activePlatforms.includes(ayrshareId)) {
        const p = platform as Platform;
        connectedPlatforms.push(p);
        platformDetails[p] = {
          connected: true,
          username: result.user?.[ayrshareId]?.username,
        };
      }
    }

    return { platforms: connectedPlatforms, details: platformDetails };
  } catch {
    // Return empty if not configured
    return {
      platforms: [],
      details: {
        twitter: { connected: false },
        instagram: { connected: false },
        tiktok: { connected: false },
        linkedin: { connected: false },
        facebook: { connected: false },
        threads: { connected: false },
        youtube: { connected: false },
        pinterest: { connected: false },
      },
    };
  }
}

// Get post history
export async function getPostHistory(limit = 50): Promise<{
  posts: Array<{
    id: string;
    platforms: string[];
    post: string;
    created: string;
    status: string;
  }>;
}> {
  try {
    const result = await ayrshareRequest<{
      posts?: Array<{
        id: string;
        platforms: string[];
        post: string;
        created: string;
        status: string;
      }>;
    }>(`/history?limit=${limit}`);

    return { posts: result.posts || [] };
  } catch {
    return { posts: [] };
  }
}

// Get analytics for a post
export async function getPostAnalytics(postId: string): Promise<{
  analytics?: Record<string, {
    impressions?: number;
    engagements?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  }>;
}> {
  try {
    const result = await ayrshareRequest<{
      analytics?: Record<string, {
        impressions?: number;
        engagements?: number;
        likes?: number;
        comments?: number;
        shares?: number;
      }>;
    }>(`/analytics/post?id=${postId}`);

    return result;
  } catch {
    return {};
  }
}

// Publish draft (helper function)
export async function publishDraft(
  draft: ContentDraft,
  immediate = true
): Promise<{
  success: boolean;
  postIds?: Record<string, string>;
  errors?: Record<string, string>;
}> {
  const latestVersion = draft.versions[draft.versions.length - 1];
  if (!latestVersion) {
    return { success: false, errors: { general: 'No content version found' } };
  }

  if (immediate) {
    return publishPost({
      text: latestVersion.text,
      platforms: draft.platforms,
      mediaUrl: latestVersion.imageUrl,
    });
  } else if (draft.scheduledAt) {
    const result = await schedulePost({
      text: latestVersion.text,
      platforms: draft.platforms,
      scheduledDate: draft.scheduledAt,
      mediaUrl: latestVersion.imageUrl,
    });
    
    return {
      success: result.success,
      postIds: result.postId ? { scheduled: result.postId } : undefined,
      errors: result.error ? { general: result.error } : undefined,
    };
  }

  return { success: false, errors: { general: 'No schedule date provided' } };
}
