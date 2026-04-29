import { kvGet, kvSet } from './puterService';
import { getPostingEvents, recordGenerationPerformance } from './generationTrackerService';
import { getPostAnalytics } from './publishService';
import { learningSystem } from '@/lib/core/LearningSystem';

const ENGAGEMENT_SYNC_STATE_KEY = 'nexus_engagement_sync_state';
const MAX_TRACKED_POSTS = 1500;

interface EngagementSyncState {
  posts: Record<string, {
    impressions: number;
    engagements: number;
    updatedAt: string;
  }>;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

async function loadSyncState(): Promise<EngagementSyncState> {
  const data = await kvGet(ENGAGEMENT_SYNC_STATE_KEY);
  if (!data) return { posts: {} };

  try {
    const parsed = JSON.parse(data) as EngagementSyncState;
    if (!parsed || typeof parsed !== 'object' || !parsed.posts || typeof parsed.posts !== 'object') {
      return { posts: {} };
    }
    return parsed;
  } catch {
    return { posts: {} };
  }
}

async function saveSyncState(state: EngagementSyncState): Promise<void> {
  const entries = Object.entries(state.posts)
    .sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt))
    .slice(0, MAX_TRACKED_POSTS);
  await kvSet(ENGAGEMENT_SYNC_STATE_KEY, JSON.stringify({
    posts: Object.fromEntries(entries),
  }));
}

export async function syncPostedEngagements(options: { limit?: number } = {}): Promise<{
  checked: number;
  updated: number;
  skipped: number;
  errors: string[];
}> {
  const limit = Math.max(1, Math.min(100, options.limit || 20));
  const errors: string[] = [];
  let checked = 0;
  let updated = 0;
  let skipped = 0;

  const state = await loadSyncState();
  const events = (await getPostingEvents())
    .filter((event) => event.status === 'published' && event.postIds && Object.keys(event.postIds).length > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

  for (const event of events) {
    const postEntries = Object.entries(event.postIds || {});
    for (const [platformKey, postId] of postEntries) {
      if (!postId || !postId.trim()) {
        skipped++;
        continue;
      }

      checked++;
      try {
        const analyticsResult = await getPostAnalytics(postId);
        const analyticsMap = analyticsResult.analytics || {};
        const normalizedPlatform = platformKey.toLowerCase();
        const metrics =
          analyticsMap[platformKey] ||
          analyticsMap[normalizedPlatform] ||
          Object.values(analyticsMap)[0];

        if (!metrics) {
          skipped++;
          continue;
        }

        const impressions = toNumber(metrics.impressions);
        const likes = toNumber(metrics.likes);
        const comments = toNumber(metrics.comments);
        const shares = toNumber(metrics.shares);
        const engagements = toNumber(metrics.engagements) || likes + comments + shares;
        if (impressions <= 0 && engagements <= 0) {
          skipped++;
          continue;
        }

        const previous = state.posts[postId];
        if (previous && previous.impressions === impressions && previous.engagements === engagements) {
          skipped++;
          continue;
        }

        await learningSystem.recordEngagementFeedback({
          postId,
          platform: normalizedPlatform || 'general',
          content: event.textPreview,
          impressions,
          engagements,
          likes,
          comments,
          shares,
          generationId: event.generationId,
        });

        if (event.generationId) {
          const engagementRate = impressions > 0 ? (engagements / impressions) * 100 : 0;
          await recordGenerationPerformance(event.generationId, {
            impressions,
            engagements,
            engagementRate: Number(engagementRate.toFixed(2)),
            likes,
            comments,
            shares,
          });
        }

        state.posts[postId] = {
          impressions,
          engagements,
          updatedAt: new Date().toISOString(),
        };
        updated++;
      } catch (error) {
        errors.push(
          `Analytics sync failed for ${platformKey}/${postId}: ${error instanceof Error ? error.message : 'unknown error'}`
        );
      }
    }
  }

  await saveSyncState(state);
  return { checked, updated, skipped, errors };
}
