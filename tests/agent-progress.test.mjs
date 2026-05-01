import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROCESS_UPDATE_PREFIX,
  buildProcessUpdate,
  isProcessUpdateMessage,
} from '../lib/context/agentProgress.mjs';

test('buildProcessUpdate formats user-visible agent phase updates', () => {
  assert.equal(
    buildProcessUpdate('I will call the video generation agent first.'),
    `${PROCESS_UPDATE_PREFIX} I will call the video generation agent first.`
  );
});

test('buildProcessUpdate does not duplicate the process prefix', () => {
  const message = `${PROCESS_UPDATE_PREFIX} Calling the music generation agent.`;
  assert.equal(buildProcessUpdate(message), message);
});

test('isProcessUpdateMessage detects persisted progress messages', () => {
  assert.equal(isProcessUpdateMessage('Process update: Calling the voice generation agent.'), true);
  assert.equal(isProcessUpdateMessage('Generated video provider: ltx23'), false);
});
