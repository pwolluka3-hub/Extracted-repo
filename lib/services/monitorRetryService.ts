'use client';

import { loadQueuedPostJobs, updateQueuedPostJob } from './postQueueService';
import { runUploadWorker, type UploadWorkerReport } from './uploadWorkerService';
import { recordWorkerCompletion, recordWorkerStart } from './workerHeartbeatService';

const MAX_ATTEMPTS = 3;

export interface MonitorRetryReport {
  queued: number;
  requeued: number;
  dropped: number;
  worker: UploadWorkerReport;
}

export async function runMonitorAndRetry(limit = 5): Promise<MonitorRetryReport> {
  const start = Date.now();
  await recordWorkerStart('monitor_retry', { limit });
  try {
    const queue = await loadQueuedPostJobs();
    const failed = queue.filter((job) => job.status === 'failed');
    let requeued = 0;
    let dropped = 0;

    for (const job of failed) {
      if (job.attempts >= MAX_ATTEMPTS) {
        dropped++;
        continue;
      }
      requeued++;
      await updateQueuedPostJob(job.id, { status: 'queued' });
    }

    const worker = await runUploadWorker(limit);
    const refreshed = await loadQueuedPostJobs();

    await recordWorkerCompletion('monitor_retry', {
      success: worker.failed === 0,
      durationMs: Date.now() - start,
      details: {
        requeued,
        dropped,
        processedByWorker: worker.processed,
        failedByWorker: worker.failed,
      },
      error: worker.errors[0]?.error,
    });

    return {
      queued: refreshed.filter((job) => job.status === 'queued').length,
      requeued,
      dropped,
      worker,
    };
  } catch (error) {
    await recordWorkerCompletion('monitor_retry', {
      success: false,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Monitor/retry worker crashed',
    });
    throw error;
  }
}
