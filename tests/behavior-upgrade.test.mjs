import test from 'node:test';
import assert from 'node:assert/strict';
import { assessWorkerHealth } from '../lib/services/workerHeartbeatPrimitives.ts';
import { createCharacterLock, scoreCharacterConsistency } from '../lib/services/characterLockAgentService.ts';

test('assessWorkerHealth reports offline when heartbeat is missing', () => {
  const result = assessWorkerHealth(null, '2026-04-29T00:00:00.000Z');
  assert.equal(result.status, 'offline');
});

test('assessWorkerHealth reports degraded when heartbeat is stale', () => {
  const result = assessWorkerHealth(
    {
      worker: 'upload_worker',
      lastRunAt: '2026-04-28T22:00:00.000Z',
      successCount: 5,
      failureCount: 0,
      consecutiveFailures: 0,
    },
    '2026-04-29T00:30:00.000Z'
  );
  assert.equal(result.status, 'degraded');
});

test('character lock consistency score remains strong for aligned script', () => {
  const character = createCharacterLock(
    'Ayo the Wanderer, dark skin, short twisted hair, torn indigo robe, serious expression, holding a lantern.'
  );

  const script = [
    'Ayo steps into the mist with the lantern raised.',
    'His torn indigo robe drags across the wet soil.',
    'The serious look on his face never breaks.',
  ].join('\n');

  const score = scoreCharacterConsistency(script, character);
  assert.ok(score >= 70);
});

test('character lock consistency score drops for conflicting characters', () => {
  const character = createCharacterLock(
    'Ayo the Wanderer, dark skin, short twisted hair, torn indigo robe, serious expression.'
  );

  const script = [
    'A new man arrives and takes the lead.',
    'Another character smiles while the crowd cheers.',
  ].join('\n');

  const score = scoreCharacterConsistency(script, character);
  assert.ok(score < 70);
});

