import assert from 'node:assert/strict';
import test from 'node:test';

import { previewTargetLocation, resolveCmsPreviewTarget } from '../server/services/cms-preview-target.mjs';

test('CMS preview targets the real Nuxt page and its content section', () => {
  assert.deepEqual(resolveCmsPreviewTarget('pages', { slug: 'home', title: '首页草稿' }), { path: '/', hash: 'home', label: '首页草稿' });
  assert.deepEqual(resolveCmsPreviewTarget('pages', { slug: 'manufacturing', section_key: 'core-equipment', title: '先进制造草稿' }), {
    path: '/manufacturing', hash: 'core-equipment', label: '先进制造草稿', selector: '[data-cms-preview-key="core-equipment"]', omitHash: true
  });
  assert.deepEqual(resolveCmsPreviewTarget('articles', { slug: 'draft-news', title: '草稿新闻' }), {
    path: '/news/draft-news', hash: '', label: '草稿新闻', selector: '[data-cms-preview-key="cms-preview-article"]'
  });
  assert.deepEqual(resolveCmsPreviewTarget('articles', { slug: 'draft-news', title: '草稿新闻', section_key: 'dynamic-news' }), {
    path: '/news', hash: '', label: '草稿新闻', selector: '[data-cms-preview-key="draft-news"]'
  });
  assert.deepEqual(resolveCmsPreviewTarget('articles', { slug: 'draft-video', title: '草稿视频', section_key: 'video-sharing' }), {
    path: '/news', hash: '', label: '草稿视频', selector: '[data-cms-preview-key="draft-video"]'
  });
  assert.equal(previewTargetLocation(resolveCmsPreviewTarget('articles', { slug: 'draft-news' })), '/news/draft-news?cmsPreview=1');
  assert.equal(previewTargetLocation(resolveCmsPreviewTarget('milestones', { year: 2026 })), '/about?cmsPreview=1#history');
  assert.equal(previewTargetLocation(resolveCmsPreviewTarget('knowledge_items', { category: 'fault_analysis' })), '/service/faults?cmsPreview=1#service-knowledge-list');
  assert.equal(previewTargetLocation(resolveCmsPreviewTarget('product_parameters', { model_code: 'FR7055XS' })), '/product/FR7055XS?cmsPreview=1#specifications');
});

test('list records carry a protected item selector without putting it in the URL', () => {
  const target = resolveCmsPreviewTarget('service_resources', { source_key: 'manual-a', type: 'manual', title: '说明书' });
  assert.equal(target.selector, '[data-cms-preview-key="manual-a"]');
  assert.equal(previewTargetLocation(target), '/service/download?cmsPreview=1#service-download-list');
});

test('page section preview uses its protected selector without navigating to a missing hash anchor', () => {
  const target = resolveCmsPreviewTarget('pages', { slug: 'home', section_key: 'hero', title: '首页首屏' });
  assert.equal(target.selector, '[data-cms-preview-key="hero"]');
  assert.equal(previewTargetLocation(target), '/?cmsPreview=1');
});

test('CMS preview locations never expose item ids, tokens, or server credentials', () => {
  const location = previewTargetLocation(resolveCmsPreviewTarget('service_resources', { id: 91, source_key: 'manual-a', type: 'manual' }));
  assert.equal(location, '/service/download?cmsPreview=1#service-download-list');
  assert.doesNotMatch(location, /91|manual-a|token|session|credential/i);
});

test('unsupported collections retain the isolated fallback preview', () => {
  assert.equal(previewTargetLocation(resolveCmsPreviewTarget('unknown_collection', {})), '/preview?cmsPreview=1');
});
