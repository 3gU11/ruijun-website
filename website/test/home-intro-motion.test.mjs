import assert from 'node:assert/strict';
import test from 'node:test';

const { getIntroMotion } = await import('../shared/home-intro-motion.mjs');

test('home reason intro maps bounded scroll progress to a machine handoff and sequenced copy reveal', () => {
  assert.deepEqual(getIntroMotion(-1), getIntroMotion(0));
  assert.deepEqual(getIntroMotion(2), getIntroMotion(1));

  const start = getIntroMotion(0);
  const middle = getIntroMotion(.5);
  const end = getIntroMotion(1);
  assert.equal(start.machineScale, 1);
  assert.ok(middle.machineScale < start.machineScale && middle.machineScale > end.machineScale);
  assert.equal(end.machineScale, .48);
  assert.equal(start.copyOpacity, 0);
  assert.equal(end.copyOpacity, 1);
  assert.deepEqual(start.itemOpacity, [0, 0, 0]);
  assert.deepEqual(end.itemOpacity, [1, 1, 1]);
  assert.ok(middle.itemOpacity[0] > 0);
  assert.equal(middle.itemOpacity[2], 0);
});
