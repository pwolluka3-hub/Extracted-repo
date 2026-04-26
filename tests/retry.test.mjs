import test from 'node:test';
import assert from 'node:assert/strict';
import { withRetry, fetchWithRetry } from '../lib/utils/retry.ts';

test('withRetry succeeds on first attempt', async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls += 1;
    return 'success';
  });

  assert.equal(result, 'success');
  assert.equal(calls, 1);
});

test('withRetry retries and eventually succeeds', async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error('fail');
      return 'success';
    },
    { maxRetries: 3, initialDelayMs: 1, maxDelayMs: 2 }
  );

  assert.equal(result, 'success');
  assert.equal(calls, 3);
});

test('withRetry throws when retries are exhausted', async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls += 1;
          throw new Error('always fails');
        },
        { maxRetries: 2, initialDelayMs: 1, maxDelayMs: 2 }
      ),
    /always fails/
  );
  assert.equal(calls, 2);
});

test('withRetry respects shouldRetry callback', async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls += 1;
          throw new Error('client error');
        },
        { maxRetries: 3, shouldRetry: () => false }
      ),
    /client error/
  );
  assert.equal(calls, 1);
});

test('fetchWithRetry retries after a network error', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    if (calls === 1) throw new Error('Network error');
    return {
      ok: true,
      json: async () => ({ data: 'success' }),
    };
  };

  try {
    const result = await fetchWithRetry(
      '/api/test',
      {},
      { maxRetries: 2, initialDelayMs: 1, maxDelayMs: 2 }
    );
    assert.deepEqual(result, { data: 'success' });
    assert.equal(calls, 2);
  } finally {
    global.fetch = originalFetch;
  }
});

test('fetchWithRetry respects a caller-provided shouldRetry policy', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    throw new Error('Network error');
  };

  try {
    await assert.rejects(
      () =>
        fetchWithRetry('/api/test', {}, {
          maxRetries: 3,
          initialDelayMs: 1,
          maxDelayMs: 2,
          shouldRetry: () => false,
        }),
      /Network error/
    );

    assert.equal(calls, 1);
  } finally {
    global.fetch = originalFetch;
  }
});
