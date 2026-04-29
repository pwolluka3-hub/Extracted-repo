export type WorkerName = 'upload_worker' | 'monitor_retry';

export interface WorkerHeartbeatRecord {
  worker: WorkerName;
  lastRunAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastDurationMs?: number;
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  lastError?: string;
  details?: Record<string, unknown>;
}

export interface WorkerHealthAssessment {
  status: 'healthy' | 'degraded' | 'offline';
  message: string;
  details: Record<string, unknown>;
}

const STALE_WARNING_MS = 20 * 60 * 1000;

function parseTime(value?: string): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function assessWorkerHealth(
  record: WorkerHeartbeatRecord | null | undefined,
  nowIso = new Date().toISOString()
): WorkerHealthAssessment {
  if (!record) {
    return {
      status: 'offline',
      message: 'No worker heartbeat has been recorded yet.',
      details: {},
    };
  }

  const now = parseTime(nowIso) || Date.now();
  const lastRun = parseTime(record.lastRunAt);
  const staleMs = lastRun ? now - lastRun : Number.POSITIVE_INFINITY;

  if (record.consecutiveFailures >= 3) {
    return {
      status: 'offline',
      message: `Worker has ${record.consecutiveFailures} consecutive failures.`,
      details: {
        staleMs,
        lastError: record.lastError,
        failureCount: record.failureCount,
      },
    };
  }

  if (staleMs > STALE_WARNING_MS) {
    return {
      status: 'degraded',
      message: 'Worker heartbeat is stale.',
      details: {
        staleMs,
        lastRunAt: record.lastRunAt,
        lastSuccessAt: record.lastSuccessAt,
      },
    };
  }

  if (record.consecutiveFailures > 0) {
    return {
      status: 'degraded',
      message: 'Worker recovered but has recent failures.',
      details: {
        consecutiveFailures: record.consecutiveFailures,
        lastError: record.lastError,
        lastDurationMs: record.lastDurationMs,
      },
    };
  }

  return {
    status: 'healthy',
    message: 'Worker heartbeat is healthy.',
    details: {
      lastRunAt: record.lastRunAt,
      lastDurationMs: record.lastDurationMs,
      successCount: record.successCount,
    },
  };
}

