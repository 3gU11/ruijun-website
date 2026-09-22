import assert from 'node:assert/strict';
import test from 'node:test';

const { getHeroState } = await import('../shared/home-hero-state.mjs');

test('home hero keeps CMS copy visible while the opening video is playing or blocked', () => {
  assert.deepEqual(getHeroState(false, false), { videoVisible: true, stageVisible: false, copyVisible: true });
  assert.deepEqual(getHeroState(true, false), { videoVisible: true, stageVisible: true, copyVisible: true });
  assert.deepEqual(getHeroState(false, true), { videoVisible: false, stageVisible: true, copyVisible: true });
});
