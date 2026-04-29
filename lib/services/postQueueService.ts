'use client';

import type { Platform } from '@/lib/types';
import { generateId } from './memoryService';
import { kvGet, kvSet } from './puterService';

const POST_QUEUE_KEY = 'nexus_post_queue_v1';

export interface QueuedPostJob {
  id: string;
  text: string;
  platforms: Platform[];
  mediaUrl?: string;
  generationId?: string;
  pipelineRunId?: string;
  niche?: string;
  hook?: string;
  scheduledAt?: string;
  status: 'queued' | 'processing' | 'posted' | 'failed';
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

async function readQueue(): Promise<QueuedPostJob[]> {
  try {
    const raw = await kvGet(POST_QUEUE_KEY);
    if (!raw || typeof raw !== 'string') return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as QueuedPostJob[] : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedPostJob[]): Promise<void> {
  await kvSet(POST_QUEUE_KEY, JSON.stringify(queue.slice(-500)));
}

export async function enqueuePostJob(input: {
  text: string;
  platforms: Platform[];
  mediaUrl?: string;
  generationId?: string;
  pipelineRunId?: string;
  niche?: string;
  hook?: string;
  scheduledAt?: string;
}): Promise<QueuedPostJob> {
  const queue = await readQueue();
  const now = new Date().toISOString();
  const job: QueuedPostJob = {
    id: generateId(),
    text: input.text,
    platforms: input.platforms,
    mediaUrl: input.mediaUrl,
    generationId: input.generationId,
    pipelineRunId: input.pipelineRunId,
    niche: input.niche,
    hook: input.hook,
    scheduledAt: input.scheduledAt,
    status: 'queued',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
  queue.push(job);
  await writeQueue(queue);
  return job;
}

export async function loadQueuedPostJobs(): Promise<QueuedPostJob[]> {
  return readQueue();
}

export async function updateQueuedPostJob(jobId: string, updates: Partial<QueuedPostJob>): Promise<void> {
  const queue = await readQueue();
  const next = queue.map((job) =>
    job.id === jobId
      ? { ...job, ...updates, updatedAt: new Date().toISOString() }
      : job
  );
  await writeQueue(next);
}
