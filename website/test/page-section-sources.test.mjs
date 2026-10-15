import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dataListSourceKeys,
  getDataListSource,
  resolveDataListItems
} from '../shared/page-section-sources.mjs';

test('only catalogued sources are addressable', () => {
  assert.deepEqual([...dataListSourceKeys].sort(), ['articles', 'product_series', 'qualifications']);
  assert.equal(getDataListSource('articles').endpoint, '/api/public/v1/articles');
  assert.equal(getDataListSource('nope'), null);
  assert.equal(getDataListSource(''), null);
});

test('records are mapped onto cards using tolerant field candidates', () => {
  // A product series reader uses name/positioning, an article uses title/summary.
  const series = [{ slug: 'fl', name: 'FL 系列', positioning: '中走丝', cover: '/fl.jpg' }];
  assert.deepEqual(resolveDataListItems('product_series', series, 3), [
    { title: 'FL 系列', body: '中走丝', image: '/fl.jpg', href: '/product/fl' }
  ]);

  const articles = [{ slug: 'news-1', title: '新闻标题', summary: '摘要', cover_asset: '/n.jpg' }];
  assert.deepEqual(resolveDataListItems('articles', articles, 3), [
    { title: '新闻标题', body: '摘要', image: '/n.jpg', href: '/news/news-1' }
  ]);
});

test('mapping drops unusable records and honours the limit', () => {
  const records = [
    { slug: 'a', title: 'A' },
    { slug: 'b' },                       // no title → dropped
    null,                                 // not an object → dropped
    { slug: 'c', title: 'C' },
    { slug: 'd', title: 'D' }
  ];
  assert.deepEqual(resolveDataListItems('articles', records, 2).map((item) => item.title), ['A', 'C']);
  assert.deepEqual(resolveDataListItems('articles', records, 10).map((item) => item.title), ['A', 'C', 'D']);
});

test('an unknown source or malformed input yields nothing rather than throwing', () => {
  assert.deepEqual(resolveDataListItems('nope', [{ title: 'x' }], 3), []);
  assert.deepEqual(resolveDataListItems('articles', null, 3), []);
  assert.deepEqual(resolveDataListItems('articles', 'not-an-array', 3), []);
  // A qualifications entry has no link prefix, so it renders without an href.
  const certificates = [{ source_key: 'iso', name: 'ISO 认证', image: '/iso.jpg' }];
  assert.deepEqual(resolveDataListItems('qualifications', certificates, 3), [
    { title: 'ISO 认证', body: '', image: '/iso.jpg', href: '' }
  ]);
});
