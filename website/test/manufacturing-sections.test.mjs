import assert from 'node:assert/strict';
import test from 'node:test';

const { buildManufacturingSections } = await import('../shared/manufacturing-sections.mjs');

test('manufacturing sections rebuild from the latest live page snapshot', () => {
  const fallback = { title: '', description: '', body: '', detail: '', items: [], media: [] };
  const initial = buildManufacturingSections({
    id: 8,
    sections: [{ id: 'hero', processTitle: 'World\'s top class\nproduction process', outputText: '年产量可达10000台' }]
  }, fallback);
  const updated = buildManufacturingSections({
    id: 8,
    sections: [{ id: 'hero', processTitle: 'World-class TDD preview', outputText: '年产量可达12000台' }]
  }, fallback);

  assert.equal(initial.get('hero').processTitle, 'World\'s top class\nproduction process');
  assert.equal(updated.get('hero').processTitle, 'World-class TDD preview');
  assert.equal(updated.get('hero').outputText, '年产量可达12000台');
  assert.equal(updated.get('hero').cms_collection, 'pages');
  assert.equal(updated.get('hero').cms_item_id, '8');
});
