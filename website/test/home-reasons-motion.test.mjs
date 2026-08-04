import assert from 'node:assert/strict';
import test from 'node:test';

const { getReasonMotion } = await import('../shared/home-reasons-motion.mjs');

test('home reason motion maps scroll progress to a bounded active reason and cover distance', () => {
  assert.deepEqual(getReasonMotion(-.1, 3), { activeIndex: 0, coverProgress: 0 });
  assert.deepEqual(getReasonMotion(.51, 3), { activeIndex: 1, coverProgress: .51 });
  assert.deepEqual(getReasonMotion(1.2, 3), { activeIndex: 2, coverProgress: 1 });
});
