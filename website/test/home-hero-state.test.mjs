import assert from 'node:assert/strict';
import test from 'node:test';

const { getHeroState } = await import('../shared/home-hero-state.mjs');

test('home hero hides title and actions until the opening video has completed', () => {
  assert.deepEqual(getHeroState(false, false), { videoVisible: true, stageVisible: false, copyVisible: false });
  assert.deepEqual(getHeroState(true, false), { videoVisible: false, stageVisible: true, copyVisible: true });
  assert.deepEqual(getHeroState(false, true), { videoVisible: false, stageVisible: true, copyVisible: true });
});
