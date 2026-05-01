const MAX_UPLOAD_ATTEMPTS = 3;
const SUPPORTED_PLATFORMS = new Set([
  'twitter',
  'instagram',
  'tiktok',
  'linkedin',
  'facebook',
  'threads',
  'youtube',
  'pinterest',
]);

const PLATFORM_LIMITS = {
  twitter: 280,
  instagram: 2200,
  tiktok: 2200,
  linkedin: 3000,
  facebook: 63206,
  threads: 500,
  youtube: 5000,
  pinterest: 500,
};

function clampText(text, limit) {
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}...`;
}

function isPlatform(value) {
  return SUPPORTED_PLATFORMS.has(value);
}

function extractHashtags(text) {
  return Array.from(new Set((text.match(/#[\p{L}\p{N}_]+/gu) || []).map((tag) => tag.slice(1).toLowerCase())));
}

function removeInlineHashtags(text) {
  return text
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function adaptContentForPlatform(text, hashtags, platform) {
  const limit = PLATFORM_LIMITS[platform] || 2000;
  const platformHashtags = hashtags.slice(0, platform === 'twitter' ? 3 : 8);
  const durationHint =
    platform === 'tiktok' || platform === 'instagram' || platform === 'youtube'
      ? '7-25s short-form pacing with immediate hook'
      : undefined;

  return {
    platform,
    text: clampText(text, limit),
    hashtags: platformHashtags,
    durationHint,
  };
}

export function selectNextQueuedPostJob(queue) {
  return [...queue]
    .filter((job) => job.status === 'queued' || (job.status === 'failed' && job.attempts < MAX_UPLOAD_ATTEMPTS))
    .sort((a, b) => {
      const aSchedule = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.POSITIVE_INFINITY;
      const bSchedule = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.POSITIVE_INFINITY;
      if (aSchedule !== bSchedule) return aSchedule - bSchedule;
      return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    })[0] || null;
}

export function validateQueuedPostJob(job) {
  const errors = [];

  if (!job.text || !job.text.trim()) {
    errors.push('Post text is empty.');
  }

  if (!Array.isArray(job.platforms) || job.platforms.length === 0) {
    errors.push('No target platforms were provided.');
  } else {
    const invalidPlatforms = job.platforms.filter((platform) => !isPlatform(platform));
    if (invalidPlatforms.length > 0) {
      errors.push(`Unsupported platforms: ${invalidPlatforms.join(', ')}.`);
    }
  }

  if (job.attempts >= MAX_UPLOAD_ATTEMPTS) {
    errors.push('Maximum upload attempts reached.');
  }

  if (job.scheduledAt && Number.isNaN(new Date(job.scheduledAt).getTime())) {
    errors.push('Scheduled time is invalid.');
  }

  if (job.mediaUrl && /^(blob:|data:)|^browser-generated$/i.test(job.mediaUrl)) {
    errors.push('Media URL is not publicly reachable. Persist the asset to a hosted URL before uploading.');
  }

  return {
    valid: errors.length === 0,
    errors,
    terminal: errors.some((error) => /platform|attempts|publicly reachable|empty/i.test(error)),
  };
}

export function routeQueuedJobToAdapters(job) {
  const hashtags = extractHashtags(job.text);
  const cleanText = removeInlineHashtags(job.text) || job.text.trim();

  return job.platforms.map((platform) => ({
    ...adaptContentForPlatform(cleanText, hashtags, platform),
    mediaUrl: job.mediaUrl,
    scheduledAt: job.scheduledAt,
  }));
}
