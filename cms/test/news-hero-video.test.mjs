import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  newsHeroVideoAssetId,
  newsHeroVideoOptions,
  setNewsHeroVideoAsset
} from '../extensions/content-editor-workbench/src/news-hero-video.js';

const validAsset = {
  id: '201',
  usage_scope: 'article',
  media_type: 'video',
  placement_key: 'news.hero.video'
};

test('news hero selector only accepts its governed video placement', () => {
  assert.deepEqual(newsHeroVideoOptions([
    validAsset,
    { ...validAsset, id: '202', media_type: 'image' },
    { ...validAsset, id: '203', placement_key: 'news.video_share.list' },
    { ...validAsset, id: '204', usage_scope: 'homepage' }
  ]), [validAsset]);
});

test('news hero video replacement creates a real media slot and preserves other media', () => {
  const section = {
    id: 'hero',
    media: [
      { media_asset_id: '88', role: 'poster' },
      { media_asset_id: '199', role: 'video' }
    ]
  };

  assert.equal(setNewsHeroVideoAsset(section, '201', [validAsset]), true);
  assert.deepEqual(section.media, [
    { media_asset_id: '88', role: 'poster' },
    { media_asset_id: '201', role: 'video' }
  ]);
  assert.equal(newsHeroVideoAssetId(section), '201');

  assert.equal(setNewsHeroVideoAsset(section, '', [validAsset]), true);
  assert.deepEqual(section.media, [{ media_asset_id: '88', role: 'poster' }]);
  assert.equal(newsHeroVideoAssetId(section), '');
});

test('news hero video rejects unrelated assets without mutating the section', () => {
  const section = { id: 'hero', media: [{ media_asset_id: '199', role: 'video' }] };
  assert.equal(setNewsHeroVideoAsset(section, '999', [validAsset]), false);
  assert.deepEqual(section.media, [{ media_asset_id: '199', role: 'video' }]);
});

test('workbench exposes the dedicated news hero video editor without hiding poster media controls', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  assert.match(module, /aria-label="视频新闻首屏视频"/);
  assert.match(module, /newsHeroVideoOptionsForSection\(section\)/);
  assert.match(module, /@change="setNewsHeroVideo\(section, \$event\.target\.value\)"/);
  assert.match(module, /v-if="!isHomeHeroSection\(section\)" class="media-reference-editor"/);
});
