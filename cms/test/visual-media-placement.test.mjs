import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveHomepageReasonMediaPlacement, resolveNewsCoverMediaPlacement, resolveQualificationMediaPlacement, qualificationDraftAssets } from '../extensions/content-editor-workbench/src/visual-media-placement.js';
import { applyVisualMediaReplacement } from '../extensions/content-editor-workbench/src/visual-editing-fields.js';

test('qualification replacement preserves legacy slots and updates the persistable reference', () => {
  const original = [{ path: '/assets/old.jpg', alt: 'Certificate' }, { media_asset_id: 114 }];
  const assets = qualificationDraftAssets(original);
  const draft = { assets, mediaReferences: assets };
  assert.equal(applyVisualMediaReplacement(draft, 'assets.0', '113'), true);
  assert.deepEqual(draft.mediaReferences, [{ media_asset_id: '113', alt: 'Certificate' }, { media_asset_id: 114 }]);
  assert.equal(original[0].path, '/assets/old.jpg');
  assert.equal(applyVisualMediaReplacement(draft, 'assets.8', '113'), false);
});

test('qualification canvas uses the gallery section instead of the individual record key', () => {
  for (const [type, sectionKey] of [['certificate', 'certificates'], ['honor', 'honors'], ['patent', 'patents']]) {
    assert.deepEqual(resolveQualificationMediaPlacement({ collection: 'qualifications', type, fieldPath: 'assets.0', elementType: 'image' }), {
      scope: 'qualification', placementKey: 'qualification.image', elementType: 'image', pageKey: 'about', sectionKey
    });
  }
  for (const change of [{ type: 'unknown' }, { collection: 'pages' }, { fieldPath: 'name' }, { elementType: 'video' }]) {
    assert.equal(resolveQualificationMediaPlacement({ collection: 'qualifications', type: 'certificate', fieldPath: 'assets.0', elementType: 'image', ...change }), null);
  }
});

test('news canvas cover uses news placement instead of the individual article slug', () => {
  for (const fieldPath of ['cover_asset', 'media.0.path']) {
    assert.deepEqual(resolveNewsCoverMediaPlacement({ collection: 'articles', category: 'news', fieldPath, elementType: 'image' }), {
      scope: 'article', placementKey: 'news.dynamic_news.cover', elementType: 'image', pageKey: 'news', sectionKey: 'dynamic-news'
    });
  }
  for (const change of [{ category: 'video' }, { collection: 'pages' }, { fieldPath: 'body' }, { elementType: 'video' }]) {
    assert.equal(resolveNewsCoverMediaPlacement({ collection: 'articles', category: 'news', fieldPath: 'cover_asset', elementType: 'image', ...change }), null);
  }
});

test('homepage reason icon selections use the icon placement for all three sections', () => {
  for (const sectionKey of ['performance', 'advanced-manufacturing', 'industry-leadership']) {
    assert.deepEqual(resolveHomepageReasonMediaPlacement({
      collection: 'pages', slug: 'home', sectionKey, mediaRole: 'icon', elementType: 'image'
    }), {
      scope: 'homepage', placementKey: 'home.reason.icon', elementType: 'image', pageKey: 'home', sectionKey
    });
  }
});

test('homepage reason background and foreground keep their separate placements', () => {
  assert.equal(resolveHomepageReasonMediaPlacement({ collection: 'pages', slug: 'home', sectionKey: 'performance', mediaRole: 'foreground' }).placementKey, 'home.reason.machine');
  assert.equal(resolveHomepageReasonMediaPlacement({ collection: 'pages', slug: 'home', sectionKey: 'advanced-manufacturing', mediaRole: 'background' }).placementKey, 'home.reason.background');
  assert.equal(resolveHomepageReasonMediaPlacement({ collection: 'pages', slug: 'about', sectionKey: 'performance', mediaRole: 'icon' }), null);
});
