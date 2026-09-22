import assert from 'node:assert/strict';
import test from 'node:test';

import { editorialMediaAssets, isEditorialMediaAssetAllowed } from '../extensions/content-editor-workbench/src/editorial-media-assets.js';

const publishedVideo = {
  id: 'published-video', file_id: 'file-published', media_type: 'video', mime_type: 'video/mp4',
  usage_scope: 'article', status: 'published', publication_state: 'published'
};

const videoDraft = {
  id: 'draft-video', file_id: 'file-draft', media_type: 'video', mime_type: 'video/mp4',
  usage_scope: 'article', placement_key: 'news.video_share.list', page_key: 'news', section_key: 'video-sharing',
  enabled: true, status: 'draft', publication_state: 'unpublished'
};

test('video sharing can attach its own private draft video for authenticated preview', () => {
  const assets = editorialMediaAssets({ category: 'video', publishedAssets: [publishedVideo], candidates: [videoDraft] });
  assert.deepEqual(assets.map((asset) => asset.id), ['published-video', 'draft-video']);
  assert.equal(isEditorialMediaAssetAllowed('draft-video', { category: 'video', publishedAssets: [publishedVideo], candidates: [videoDraft] }), true);
});

test('video sharing draft candidates cannot cross the page, section, placement, or media-type boundary', () => {
  const rejected = [
    { ...videoDraft, id: 'wrong-page', page_key: 'home' },
    { ...videoDraft, id: 'wrong-section', section_key: 'dynamic-news' },
    { ...videoDraft, id: 'wrong-placement', placement_key: 'news.hero.video' },
    { ...videoDraft, id: 'wrong-type', media_type: 'image', mime_type: 'image/png' },
    { ...videoDraft, id: 'disabled', enabled: false }
  ];
  assert.deepEqual(editorialMediaAssets({ category: 'video', publishedAssets: [], candidates: rejected }), []);
});

const dynamicNewsCoverDraft = {
  id: 'draft-news-cover', file_id: 'file-news-cover', media_type: 'image', mime_type: 'image/png',
  usage_scope: 'article', placement_key: 'news.dynamic_news.cover', page_key: 'news', section_key: 'dynamic-news',
  enabled: true, status: 'draft', publication_state: 'unpublished'
};

test('dynamic news can attach its matching private cover image for authenticated preview', () => {
  const publishedImage = { ...publishedVideo, id: 'published-image', media_type: 'image', mime_type: 'image/png' };
  const assets = editorialMediaAssets({ category: 'news', publishedAssets: [publishedImage], candidates: [dynamicNewsCoverDraft] });

  assert.deepEqual(assets.map((asset) => asset.id), ['published-image', 'draft-news-cover']);
  assert.equal(isEditorialMediaAssetAllowed('draft-news-cover', {
    category: 'news', publishedAssets: [publishedImage], candidates: [dynamicNewsCoverDraft]
  }), true);
});

test('dynamic news private covers cannot cross the page, section, placement, media-type, or enabled boundary', () => {
  const rejected = [
    { ...dynamicNewsCoverDraft, id: 'wrong-page', page_key: 'home' },
    { ...dynamicNewsCoverDraft, id: 'wrong-section', section_key: 'video-sharing' },
    { ...dynamicNewsCoverDraft, id: 'wrong-placement', placement_key: 'default.image' },
    { ...dynamicNewsCoverDraft, id: 'wrong-type', media_type: 'video', mime_type: 'video/mp4' },
    { ...dynamicNewsCoverDraft, id: 'disabled', enabled: false }
  ];

  assert.deepEqual(editorialMediaAssets({ category: 'news', publishedAssets: [], candidates: rejected }), []);
  for (const asset of rejected) {
    assert.equal(isEditorialMediaAssetAllowed(asset.id, { category: 'news', publishedAssets: [], candidates: rejected }), false);
  }
});
