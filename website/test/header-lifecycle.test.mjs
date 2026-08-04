import assert from 'node:assert/strict';
import test from 'node:test';

const { getHeaderLifecycle } = await import('../shared/header-lifecycle.mjs');

test('header stays compact throughout the opening panel and expands only after it', () => {
  assert.deepEqual(
    getHeaderLifecycle({ scrollY: 720, firstPanelTop: 78, firstPanelHeight: 842, headerHeight: 78 }),
    { expandAt: 842, isWide: false }
  );
  assert.deepEqual(
    getHeaderLifecycle({ scrollY: 842, firstPanelTop: 78, firstPanelHeight: 842, headerHeight: 78 }),
    { expandAt: 842, isWide: true }
  );
});

test('header lifecycle fails closed when the first visual panel cannot be measured', () => {
  assert.deepEqual(
    getHeaderLifecycle({ scrollY: 900, firstPanelTop: Number.NaN, firstPanelHeight: 0, headerHeight: 78 }),
    { expandAt: 0, isWide: false }
  );
});
