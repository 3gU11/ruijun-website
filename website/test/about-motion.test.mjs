import assert from 'node:assert/strict';
import test from 'node:test';

const { clamp, getSequentialLineReveal, getStoryMotion, getTimelineMotion, nextSlideIndex } = await import('../shared/about-motion.mjs');

const timelineMetrics = {
  panelWidth: 1440,
  trackDistance: 1560,
  cursorStart: 259.2,
  cursorWidth: 44,
  copyLeft: 702.72,
  copyWidth: 648
};

test('about timeline motion matches the legacy five-state composition', () => {
  assert.equal(clamp(-2, 0, 1), 0);
  assert.equal(clamp(2, 0, 1), 1);
  const states = [0, .25, .5, .75, 1].map((progress) => getTimelineMotion({ progress, ...timelineMetrics }));
  const oneDecimal = (value) => Math.round(value * 10) / 10;
  assert.deepEqual(states.map(({ trackX }) => oneDecimal(trackX)), [1267.2, 560.4, -146.4, -853.2, -1560]);
  assert.deepEqual(states.map(({ cursorX }) => oneDecimal(cursorX)), [0, 313.7, 627.4, 941.1, 1254.8]);
  assert.deepEqual(states.map(({ copyX }) => oneDecimal(copyX)), [0, -706.8, -1413.6, -2120.4, -2827.2]);
  assert.equal(states[0].titleRevealProgress, 0);
  assert.ok(states[1].titleRevealProgress > .98);
  assert.equal(states[2].titleRevealProgress, 1);
});

test('about timeline title reveals line by line using each rendered line width', () => {
  assert.deepEqual(getSequentialLineReveal(0, [452, 444, 460, 502]), [0, 0, 0, 0]);
  assert.deepEqual(getSequentialLineReveal(.5, [100, 100, 100, 100]), [1, 1, 0, 0]);
  assert.deepEqual(getSequentialLineReveal(1, [452, 444, 460, 502]), [1, 1, 1, 1]);
});

test('factory slider wraps around in either direction', () => {
  assert.equal(nextSlideIndex(3, 1, 4), 0);
  assert.equal(nextSlideIndex(0, -1, 4), 3);
  assert.equal(nextSlideIndex(0, 1, 1), 0);
});

test('about story motion keeps its backdrop and title within intended scroll bounds', () => {
  assert.deepEqual(getStoryMotion(-1), {
    backdropY: 0,
    backdropScale: 1,
    backdropRotation: 0,
    copyY: 0,
    copyOpacity: 1
  });
  assert.deepEqual(getStoryMotion(1), {
    backdropY: -44,
    backdropScale: 1.045,
    backdropRotation: -0.3,
    copyY: -28,
    copyOpacity: 0.84
  });
});
