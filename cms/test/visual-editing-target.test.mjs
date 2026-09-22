import assert from 'node:assert/strict';
import test from 'node:test';
import { preferVisualDraftRecord, resolveActiveVisualEditingTarget, resolveVisualEditingRecord } from '../extensions/content-editor-workbench/src/visual-editing-target.js';

const state = {
  pages: [{ id: 'page-1', slug: 'news', sections: [] }],
  series: [{ id: 'series-1', series_code: 'FR', name: '系列' }],
  parameters: [{ id: 'parameter-1', model_code: 'fl1180', field_name: 'XY 行程', value: '1100*800' }],
  editorial: { articles: [{ id: 'article-1', slug: 'story-1', title: '新闻' }], case_studies: [] },
  company: { milestones: [{ id: 'mile-1', source_key: 'm-2024', year: '2024' }], qualifications: [], manufacturing_evidence: [] },
  service: { service_resources: [], service_locations: [{ id: 'loc-1', source_key: 'suzhou', city: '苏州' }], external_service_entries: [] }
};

test('visual selection resolves a cross-collection record without guessing field names', () => {
  assert.deepEqual(resolveVisualEditingRecord(state, { collection: 'articles', itemId: 'article-1' }), { collection: 'articles', record: state.editorial.articles[0] });
  assert.deepEqual(resolveVisualEditingRecord(state, { collection: 'product_series', itemId: 'series-1' }), { collection: 'product_series', record: state.series[0] });
  assert.deepEqual(resolveVisualEditingRecord(state, { collection: 'product_parameters', itemId: 'parameter-1', fieldPath: 'value' }), { collection: 'product_parameters', record: state.parameters[0] });
  assert.deepEqual(resolveVisualEditingRecord(state, { collection: 'service_locations', itemId: 'loc-1' }), { collection: 'service_locations', record: state.service.service_locations[0] });
});

test('visual selection resolves a read-only media target without inventing a writable field path', () => {
  assert.deepEqual(
    resolveVisualEditingRecord(state, { collection: 'pages', itemId: 'page-1', fieldPath: '' }),
    { collection: 'pages', record: state.pages[0] }
  );
});

test('visual selection rejects unknown collections and records', () => {
  assert.equal(resolveVisualEditingRecord(state, { collection: 'articles', itemId: 'missing' }), null);
  assert.equal(resolveVisualEditingRecord(state, { collection: 'users', itemId: '1' }), null);
  assert.equal(resolveVisualEditingRecord(state, { collection: 'articles', itemId: 'article-1', fieldPath: '__proto__.x' }), null);
});

test('visual selection prefers the active draft for the selected record id', () => {
  const loaded = { id: 'page-1', title: '保存前快照' };
  const draft = { id: 'page-1', title: '正在编辑的草稿' };
  const records = preferVisualDraftRecord([loaded, { id: 'page-2' }], draft);

  assert.equal(records[0], draft);
  assert.equal(records.length, 2);
  assert.deepEqual(preferVisualDraftRecord([loaded], null), [loaded]);
});

test('page canvas writes use the matching normalized active draft instead of a legacy list record', () => {
  const legacyRecord = { id: 'page-1', sections: [{ id: 'support', content: {} }] };
  const draft = { id: 'page-1', sections: [{ id: 'support', content: { faq_1_question: '报修前需要准备哪些资料？' } }] };
  const resolved = { collection: 'pages', record: legacyRecord };
  const selection = { collection: 'pages', itemId: 'page-1', sectionKey: 'support', fieldPath: 'content.faq_1_question' };

  assert.deepEqual(
    resolveActiveVisualEditingTarget({ collection: 'pages', record: draft }, resolved, selection),
    { collection: 'pages', record: draft }
  );
  assert.equal(
    resolveActiveVisualEditingTarget({ collection: 'pages', record: { ...draft, id: 'page-2' } }, resolved, selection),
    resolved
  );
});
