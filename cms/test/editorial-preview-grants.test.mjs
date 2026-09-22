import test from 'node:test';
import assert from 'node:assert/strict';
import { editorialPreviewGrantIds, livePreviewGrantIds } from '../extensions/content-editor-workbench/src/editorial-preview-grants.js';

test('qualification grants collect explicit asset IDs, not static paths', () => {
 assert.deepEqual(livePreviewGrantIds('qualifications', {assets:[{media_asset_id:113},{media_asset_id:'113'},{path:'/api/preview/media/114'}]}), ['113']);
 assert.deepEqual(livePreviewGrantIds('qualifications', {assets:null}), []);
});
test('video previews authorize each selected video while news authorizes its cover',()=>{
 assert.deepEqual(editorialPreviewGrantIds({category:'video',media:[{media_asset_id:'12'},{media_asset_id:'12'},{media_asset_id:'13'}]}),['12','13']);
 assert.deepEqual(editorialPreviewGrantIds({category:'news',cover_media_asset_id:'14'}),['14']);
 assert.deepEqual(editorialPreviewGrantIds({category:'other',media:[{media_asset_id:'12'}]}),[]);
});

test('homepage preview authorizes only its hero video for the pages collection', () => {
 const preview = {slug:'home',sections:[{id:'hero',hero_video_asset_id:42},{id:'timeline',hero_video_asset_id:99}]};
 assert.deepEqual(livePreviewGrantIds('pages',preview),['42']);
 assert.deepEqual(livePreviewGrantIds('pages',{...preview,slug:'about'}),[]);
 assert.deepEqual(livePreviewGrantIds('products',preview),[]);
 assert.deepEqual(livePreviewGrantIds('pages',{slug:'home',sections:null}),[]);
 assert.deepEqual(livePreviewGrantIds('pages',{slug:'home',sections:[{id:'hero',hero_video_asset_id:''}]}),[]);
 assert.deepEqual(livePreviewGrantIds('articles',{category:'news',cover_media_asset_id:'14'}),['14']);
});

test('resource previews authorize selected attachments, not arbitrary URLs', () => {
 assert.deepEqual(livePreviewGrantIds('service_resources',{asset_media_asset_id:61,cover_media_asset_id:'62'}),['61','62']);
 assert.deepEqual(livePreviewGrantIds('product_series',{cover_asset:39}),['39']);
 assert.deepEqual(livePreviewGrantIds('product_series',{cover_asset:'/api/preview/media/39',cover_media_asset_id:'39'}),['39']);
 assert.deepEqual(livePreviewGrantIds('product_series',{cover_asset:'/assets/static-cover.png'}),[]);
 assert.deepEqual(livePreviewGrantIds('product_models',{resources:[{media_asset_id:71},{media_asset_id:'71'},{url:'https://example.test/file.pdf'}]}),['71']);
 assert.deepEqual(livePreviewGrantIds('service_resources',{asset:'/api/preview/media/61'}),[]);
});

test('all six page previews request section media grants without reading arbitrary URLs', () => {
 for(const slug of ['home','product','manufacturing','news','about','service']) {
  assert.deepEqual(livePreviewGrantIds('pages',{slug,sections:[{id:'hero',media:[{media_asset_id:88},{media_asset_id:'88'},{path:'/api/preview/media/99'}]}]}),['88']);
 }
});
