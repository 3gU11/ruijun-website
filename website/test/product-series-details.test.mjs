import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultModelConfiguration, defaultSeriesDetail, normalizeSeriesDetail, productSeriesDetails, seriesDetailKey } from '../shared/product-series-details.mjs';

test('series cards resolve to their detail key', () => {
  assert.equal(seriesDetailKey({ id: 'workstation' }), 'workstation');
  assert.equal(seriesDetailKey({ slug: 'fr-xs-auto' }), 'auto');
  assert.equal(seriesDetailKey({ series_code: 'fr-pro' }), 'pro');
  assert.equal(seriesDetailKey({ slug: 'ft-xs' }), 'ft');
  assert.equal(seriesDetailKey({ series_code: 'ft-pro' }), 'ft-pro');
  assert.equal(seriesDetailKey({ series_code: 'fr-g' }), 'fr-g');
  assert.equal(seriesDetailKey({ slug: 'fl-xs' }), 'fl');
  assert.equal(seriesDetailKey({ slug: 'fr-y' }), 'fr-y');
  assert.equal(seriesDetailKey({ id: 'unknown-card', name: '自动穿丝系列' }), 'auto');
  assert.equal(seriesDetailKey(null), 'pro');
});

test('the workstation seeds a series-level detail with the original copy', () => {
  const detail = defaultSeriesDetail({ slug: 'workstation' });

  assert.equal(detail.intro.title, '灵动切割工作站');
  assert.equal(detail.intro.subtitle, '无人化加工解决方案');
  assert.equal(detail.features.length, 4);
  assert.deepEqual(detail.features.map((feature) => feature.label), ['自动穿丝系统', '六轴协作机器人', '多工位零点夹具', '精密中走丝机床']);
  assert.equal(detail.features[1].note, '多种方式可供选择');
});

test('machine families seed a model configuration with their feature copy and thumbnails', () => {
  const configuration = defaultModelConfiguration({ slug: 'fr-xs-auto' });

  assert.equal(configuration.intro, undefined);
  assert.equal(configuration.features.length, 3);
  assert.equal(configuration.features[0].label, '自动穿丝');
  assert.match(configuration.features[0].detail, /全自动穿丝模式/);
  assert.equal(configuration.features[0].image, '/assets/psd/product-detail/auto-threading.png');
});

test('every seeded detail only uses keys the page renders', () => {
  for (const key of Object.keys(productSeriesDetails)) {
    const detail = defaultSeriesDetail({ slug: key });
    for (const feature of detail.features) {
      assert.deepEqual(Object.keys(feature).sort(), Object.keys(feature).filter((field) => ['label', 'detail', 'note', 'image'].includes(field)).sort());
    }
  }
});

test('stored series detail is normalized and keeps the canvas media selection', () => {
  const detail = normalizeSeriesDetail({
    intro: { title: ' 标题 ', subtitle: '', scene: '场景', body: '正文', arbitrary: 'drop me' },
    features: [
      { label: ' 特点一 ', detail: '说明', note: '', image: '/assets/a.png', media_asset_id: '12', injected: 'x' },
      { label: '   ' },
      { label: '特点二', media_asset_id: 34 }
    ],
    extra: true
  });

  assert.deepEqual(detail.intro, { title: '标题', scene: '场景', body: '正文' });
  assert.equal(detail.features.length, 2);
  assert.equal(detail.features[0].media_asset_id, '12');
  assert.equal(detail.features[0].injected, undefined);
  assert.equal(detail.features[1].media_asset_id, '34');
});

test('empty or malformed series detail normalizes to null', () => {
  assert.equal(normalizeSeriesDetail(null), null);
  assert.equal(normalizeSeriesDetail('text'), null);
  assert.equal(normalizeSeriesDetail([]), null);
  assert.equal(normalizeSeriesDetail({ intro: {}, features: [] }), null);
  assert.equal(normalizeSeriesDetail({ features: [{ label: '' }] }), null);
});

test('a series detail may own just the machine photo asset', () => {
  const detail = normalizeSeriesDetail({ machine_asset_id: 12 });

  assert.equal(detail.machine_asset_id, '12');
  assert.deepEqual(detail.features, []);
  // The resolved path is produced by the reader/preview, never persisted.
  assert.equal(Object.hasOwn(detail, 'machine_image'), false);
});
