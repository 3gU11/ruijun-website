import assert from 'node:assert/strict';
import test from 'node:test';
const { getFaqRouteState, shouldShowFaq } = await import('../shared/faq-visibility.mjs');
test('FAQ remains hidden only during the homepage opening video', () => { assert.equal(shouldShowFaq('/', false), false); assert.equal(shouldShowFaq('/', true), true); assert.equal(shouldShowFaq('/about', false), true); });
test('FAQ closes and waits for the homepage opening video again after route navigation', () => {
  assert.deepEqual(getFaqRouteState('/about'), { homeHeroReady: true, closeDialog: false });
  assert.deepEqual(getFaqRouteState('/'), { homeHeroReady: false, closeDialog: true });
});
