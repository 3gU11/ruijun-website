import assert from 'node:assert/strict';
import test from 'node:test';
import { homeHeroVideoOptions, setHomeHeroVideoAsset } from '../extensions/content-editor-workbench/src/homepage-hero-video.js';

test('homepage hero video accepts only its governed video placement and writes the field Nuxt reads', () => {
  const assets = [
    { id: 'home-video', media_type: 'video', placement_key: 'home.hero.video' },
    { id: 'home-poster', media_type: 'image', placement_key: 'home.hero.poster' },
    { id: 'news-video', media_type: 'video', placement_key: 'news.hero.video' }
  ];
  const hero = { id: 'hero', media: [] };

  assert.deepEqual(homeHeroVideoOptions(assets).map((asset) => asset.id), ['home-video']);
  assert.equal(setHomeHeroVideoAsset(hero, 'home-video', assets), true);
  assert.equal(hero.hero_video_asset_id, 'home-video');
  assert.deepEqual(hero.media, []);
  assert.equal(setHomeHeroVideoAsset(hero, 'news-video', assets), false);
  assert.equal(hero.hero_video_asset_id, 'home-video');
  assert.equal(setHomeHeroVideoAsset(hero, '', assets), true);
  assert.equal(hero.hero_video_asset_id, '');
});
