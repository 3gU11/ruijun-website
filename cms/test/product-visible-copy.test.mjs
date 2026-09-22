import assert from 'node:assert/strict';
import test from 'node:test';

import { materializeProductPageProofCopy, materializeProductVisibleCopy } from '../scripts/materialize-product-visible-copy.mjs';

test('product visible copy materializes the existing auto-series text without changing its static image layout', () => {
  const record = {
    id: 1,
    series_code: 'fr-xs-auto',
    model_code: 'fr400xs-auto',
    configuration: {
      intro: { title: '', subtitle: '', scene: '', body: '' },
      features: []
    }
  };

  const result = materializeProductVisibleCopy(record);

  assert.equal(result.changed, true);
  assert.equal(result.record.configuration.visible_copy_materialized, true);
  assert.equal(result.record.configuration.machineImage, '/assets/psd/product-detail/auto-machine.png');
  assert.deepEqual(result.record.configuration.features[0], {
    label: '自动穿丝',
    detail: '全自动穿丝模式\n半自动穿丝模式\n带动态感知穿丝功能',
    note: '',
    image: '/assets/psd/product-detail/auto-threading.png',
    media_asset_id: null
  });
});

test('product visible copy keeps user edits and never refills a deliberately cleared materialized record', () => {
  const original = {
    id: 20,
    series_code: 'fr-pro',
    model_code: 'fr400xs-pro',
    configuration: {
      visible_copy_materialized: true,
      machineImage: '/assets/psd/product-detail/pro-machine.png',
      features: []
    }
  };

  const result = materializeProductVisibleCopy(original);

  assert.deepEqual(result, { changed: false, record: original });
});

test('product visible copy does not invent content for an unmapped series', () => {
  const original = { id: 99, series_code: 'unknown', configuration: { features: [] } };
  assert.deepEqual(materializeProductVisibleCopy(original), { changed: false, record: original });
});

test('product page proof copy materializes the visible numeric values without replacing custom CMS copy', () => {
  const page = {
    id: 7,
    slug: 'product',
    sections: [
      { id: 'proof-efficiency', title: '增效降损', body: '效能提升50%，丝损降低30%', requires_claim_review: true, value: '', unit: '' },
      { id: 'proof-years', title: '30 YEARS', body: '30年技术沉淀，先进智造工厂', requires_claim_review: true },
      { id: 'proof-champion', title: 'Champion', body: '销量持续领先，品质始终如一', requires_claim_review: true }
    ]
  };

  const result = materializeProductPageProofCopy(page);

  assert.equal(result.changed, true);
  assert.equal(result.record.sections[0].title, '增效降损');
  assert.equal(result.record.sections[0].value, 50);
  assert.equal(result.record.sections[0].unit, '%');
  assert.equal(result.record.sections[1].value, 30);
  assert.equal(result.record.sections[1].unit, 'YEARS');
  assert.equal(result.record.sections[2].value, undefined);
});
