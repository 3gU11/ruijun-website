import assert from 'node:assert/strict';
import test from 'node:test';
import { videoPosterAssets } from '../extensions/content-editor-workbench/src/video-poster-assets.js';

test('home hero video accepts only a dedicated home poster, including a private draft for internal preview', () => {
  const assets = videoPosterAssets({
    placementKey: 'home.hero.video',
    publishedAssets: [{ id: 1, media_type: 'image', placement_key: 'default.image', status: 'published', publication_state: 'published' }],
    candidates: [
      { id: 2, media_type: 'image', placement_key: 'home.hero.poster', status: 'draft', publication_state: 'unpublished' },
      { id: 3, media_type: 'image', placement_key: 'default.image', status: 'draft', publication_state: 'unpublished' },
      { id: 4, media_type: 'video', placement_key: 'home.hero.poster', status: 'draft', publication_state: 'unpublished' }
    ]
  });

  assert.deepEqual(assets.map((asset) => asset.id), [2]);
});

test('other video placements keep published posters and offer matching private cover drafts', () => {
  const assets = videoPosterAssets({
    placementKey: 'news.hero.video',
    usageScope: 'article',
    publishedAssets: [
      { id: 1, media_type: 'image', status: 'published', publication_state: 'published' },
      { id: 2, media_type: 'video', status: 'published', publication_state: 'published' }
    ],
    candidates: [
      { id: 3, media_type: 'image', placement_key: 'news.article.poster', usage_scope: 'article', status: 'draft', publication_state: 'unpublished' },
      { id: 4, media_type: 'image', placement_key: 'brand.logo.image', usage_scope: 'brand', status: 'draft', publication_state: 'unpublished' },
      { id: 5, media_type: 'image', placement_key: 'news.article.poster', usage_scope: 'article', status: 'review', publication_state: 'unpublished' }
    ]
  });

  assert.deepEqual(assets.map((asset) => asset.id), [1, 3]);
});

test('service tutorial video accepts its matching private service poster draft', () => {
  const assets = videoPosterAssets({
    placementKey: 'service.tutorial.video',
    publishedAssets: [
      { id: 1, media_type: 'image', placement_key: 'default.image', status: 'published', publication_state: 'published' },
      { id: 2, media_type: 'image', placement_key: 'service.tutorial.poster', status: 'published', publication_state: 'published' }
    ],
    candidates: [
      { id: 3, media_type: 'image', placement_key: 'service.tutorial.poster', status: 'draft', publication_state: 'unpublished' },
      { id: 4, media_type: 'image', placement_key: 'home.hero.poster', status: 'draft', publication_state: 'unpublished' },
      { id: 5, media_type: 'video', placement_key: 'service.tutorial.poster', status: 'draft', publication_state: 'unpublished' }
    ]
  });

  assert.deepEqual(assets.map((asset) => asset.id), [2, 3]);
});
