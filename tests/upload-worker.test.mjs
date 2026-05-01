import test from 'node:test';
import assert from 'node:assert/strict';
import {
  routeQueuedJobToAdapters,
  selectNextQueuedPostJob,
  validateQueuedPostJob,
} from '../lib/services/uploadWorkerPrimitives.mjs';

function makeJob(overrides = {}) {
  return {
    id: overrides.id || 'job_1',
    text: overrides.text || 'This is the post #Brand #Launch',
    platforms: overrides.platforms || ['instagram'],
    mediaUrl: overrides.mediaUrl,
    generationId: overrides.generationId,
    pipelineRunId: overrides.pipelineRunId,
    niche: overrides.niche,
    hook: overrides.hook,
    scheduledAt: overrides.scheduledAt,
    status: overrides.status || 'queued',
    attempts: overrides.attempts ?? 0,
    lastError: overrides.lastError,
    createdAt: overrides.createdAt || '2026-04-30T10:00:00.000Z',
    updatedAt: overrides.updatedAt || '2026-04-30T10:00:00.000Z',
  };
}

test('selectNextQueuedPostJob picks the next queued or retryable job', () => {
  const next = selectNextQueuedPostJob([
    makeJob({ id: 'posted', status: 'posted' }),
    makeJob({ id: 'failed-max', status: 'failed', attempts: 3 }),
    makeJob({ id: 'later', scheduledAt: '2026-05-02T10:00:00.000Z' }),
    makeJob({ id: 'sooner', scheduledAt: '2026-05-01T10:00:00.000Z' }),
  ]);

  assert.equal(next?.id, 'sooner');
});

test('validateQueuedPostJob blocks invalid jobs before upload', () => {
  const empty = validateQueuedPostJob(makeJob({ text: '   ' }));
  assert.equal(empty.valid, false);
  assert.match(empty.errors.join(' '), /empty/i);

  const badMedia = validateQueuedPostJob(makeJob({ mediaUrl: 'blob:http://local/asset' }));
  assert.equal(badMedia.valid, false);
  assert.match(badMedia.errors.join(' '), /publicly reachable/i);
});

test('routeQueuedJobToAdapters formats one platform adapter per target', () => {
  const adapters = routeQueuedJobToAdapters(
    makeJob({
      text: 'Launch day starts now. Save this. #Brand #Launch',
      platforms: ['twitter', 'tiktok'],
      mediaUrl: 'https://cdn.example.com/video.mp4',
    })
  );

  assert.equal(adapters.length, 2);
  assert.deepEqual(adapters.map((adapter) => adapter.platform), ['twitter', 'tiktok']);
  assert.deepEqual(adapters[0].hashtags, ['brand', 'launch']);
  assert.equal(adapters[0].mediaUrl, 'https://cdn.example.com/video.mp4');
  assert.doesNotMatch(adapters[0].text, /#Brand/);
});
