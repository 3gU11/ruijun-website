import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeSeriesWithPreview, unpublishedSeriesSummary } from '../shared/product-catalog-preview.mjs';

const published = [
  { id: 1, series_code: 'workstation', slug: 'workstation', name: '灵动切割工作站', positioning: '无人化加工解决方案', sort_order: 1 },
  { id: 2, series_code: 'fr-xs-auto', slug: 'fr-xs-auto', name: 'FR-XS (Auto)', positioning: '自动穿丝系列', sort_order: 2 }
];

test('a series that was never published does not change the public card count', () => {
  const preview = [{ id: 9, series_code: 'new-series', slug: 'new-series', name: '新系列', sort_order: 3 }];

  const { records, unpublishedDrafts } = mergeSeriesWithPreview(published, preview);

  assert.equal(records.length, published.length);
  assert.deepEqual(records.map((record) => record.id), [1, 2]);
  assert.deepEqual(unpublishedDrafts.map((record) => record.id), [9]);
});

test('a draft of a published series overrides its fields without moving it', () => {
  const preview = [{ id: 2, series_code: 'fr-xs-auto', slug: 'fr-xs-auto', name: 'FR-XS (Auto) 草稿名', positioning: '新的定位' }];

  const { records, unpublishedDrafts } = mergeSeriesWithPreview(published, preview);

  assert.equal(records.length, 2);
  assert.equal(records[1].name, 'FR-XS (Auto) 草稿名');
  assert.equal(records[1].positioning, '新的定位');
  assert.equal(unpublishedDrafts.length, 0);
});

test('the preview list is the catalog only before the first publication', () => {
  const preview = [
    { id: 7, series_code: 'ft-xs', slug: 'ft-xs', name: 'FT-XS', sort_order: 2 },
    { id: 8, series_code: 'fl-xs', slug: 'fl-xs', name: 'FL-XS', sort_order: 1 }
  ];

  const { records, unpublishedDrafts } = mergeSeriesWithPreview([], preview);

  assert.deepEqual(records.map((record) => record.id), [7, 8]);
  assert.equal(unpublishedDrafts.length, 0);
});

test('pagination in the canvas follows the published list', () => {
  const pageSize = 6;
  const sevenPublished = Array.from({ length: 7 }, (_, index) => ({
    id: index + 1,
    series_code: `series-${index + 1}`,
    slug: `series-${index + 1}`,
    name: `系列 ${index + 1}`,
    sort_order: index + 1
  }));
  const draft = [{ id: 99, series_code: 'draft', slug: 'draft', name: '未发布系列', sort_order: 0 }];

  const sitePages = Math.max(1, Math.ceil(sevenPublished.length / pageSize));
  const { records } = mergeSeriesWithPreview(sevenPublished, [...sevenPublished, ...draft]);
  const canvasPages = Math.max(1, Math.ceil(records.length / pageSize));

  assert.equal(canvasPages, sitePages);
  assert.equal(records.length, sevenPublished.length);
});

test('hidden drafts are summarised for the canvas notice', () => {
  const summary = unpublishedSeriesSummary([{ name: 'FR (pro)' }, { series_code: 'ft-xs' }, { slug: 'fr-g' }], 2);
  assert.equal(summary.count, 3);
  assert.equal(summary.text, 'FR (pro)、ft-xs 等 3 个系列');
  assert.deepEqual(unpublishedSeriesSummary([]), { count: 0, text: '' });
});
