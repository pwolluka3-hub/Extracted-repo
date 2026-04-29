'use client';

import { publishPost, schedulePost } from './publishService';
import { loadQueuedPostJobs, updateQueuedPostJob, type QueuedPostJob } from './postQueueService';
import { trackGenerationPosted, trackGenerationPostFailure } from './generationTrackerService';
import { recordWorkerCompletion, recordWorkerStart } from './workerHeartbeatService';

const MAX_UPLOAD_ATTEMPTS = 3;

export interface UploadWorkerReport {
  processed: number;
  posted: number;
  failed: number;
  errors: Array<{ jobId: string; error: string }>;
}

async function processJob(
  job: QueuedPostJob
): Promise<{ ok: boolean; postIds?: Record<string, string>; error?: string }> {
  try {
    if (job.scheduledAt) {
      const scheduled = await schedulePost({
        text: job.text,
        platforms: job.platforms,
        scheduledDate: job.scheduledAt,
        mediaUrl: job.mediaUrl,
        source: 'agent',
        generationId: job.generationId,
      });
      if (!scheduled.success) {
        return { ok: false, error: scheduled.error || 'Scheduling failed' };
      }
      const postIds = scheduled.postId ? { scheduled: scheduled.postId } : undefined;
      return { ok: true, postIds };
    }

    const posted = await publishPost({
      text: job.text,
      platforms: job.platforms,
      mediaUrl: job.mediaUrl,
      source: 'agent',
      generationId: job.generationId,
    });

    if (!posted.success) {
      return { ok: false, error: JSON.stringify(posted.errors || { general: 'Publish failed' }) };
    }
    return { ok: true, postIds: posted.postIds };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown upload worker error' };
  }
}

export async function runUploadWorker(limit = 5): Promise<UploadWorkerReport> {
  const start = Date.now();
  await recordWorkerStart('upload_worker', { limit });
  try {
    const queue = await loadQueuedPostJobs();
    const pending = queue
      .filter(
        (job) =>
          job.status === 'queued' ||
          (job.status === 'failed' && job.attempts < MAX_UPLOAD_ATTEMPTS)
      )
      .slice(0, limit);

    const report: UploadWorkerReport = {
      processed: 0,
      posted: 0,
      failed: 0,
      errors: [],
    };

    for (const job of pending) {
      report.processed++;
      await updateQueuedPostJob(job.id, { status: 'processing' });

      const result = await processJob(job);
      if (result.ok) {
        report.posted++;
        await updateQueuedPostJob(job.id, { status: 'posted', lastError: undefined });
        if (job.generationId) {
          await trackGenerationPosted(job.generationId, result.postIds);
        }
        continue;
      }

      report.failed++;
      report.errors.push({ jobId: job.id, error: result.error || 'Unknown error' });
      await updateQueuedPostJob(job.id, {
        status: 'failed',
        attempts: job.attempts + 1,
        lastError: result.error,
      });
      if (job.generationId) {
        await trackGenerationPostFailure(job.generationId, result.error || 'Upload worker failed');
      }
    }

    await recordWorkerCompletion('upload_worker', {
      success: report.failed === 0,
      durationMs: Date.now() - start,
      details: {
        processed: report.processed,
        posted: report.posted,
        failed: report.failed,
      },
      error: report.errors[0]?.error,
    });

    return report;
  } catch (error) {
    await recordWorkerCompletion('upload_worker', {
      success: false,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Upload worker crashed',
    });
    throw error;
  }
}
