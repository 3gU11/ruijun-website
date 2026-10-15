import test from 'node:test'; import assert from 'node:assert/strict';
import { normalizeArticleBodyMedia } from '../shared/article-body-media.mjs';
import { readFile } from 'node:fs/promises';
import { previewContentRecord } from '../../cms/content-preview/content-preview-content.mjs';
import { sanitizeCmsLivePreviewRecord } from '../utils/cms-live-preview.mjs';
import { createCmsArticleReader } from '../server/services/cms-article-reader.mjs';
test('published article body images reach the renderer while draft assets stay absent', async () => {
 const article = {id:1,slug:'body-news',status:'published',publication_state:'published',body_media:[{media_asset_id:12},{media_asset_id:13},{path:'https://untrusted.example/assets/raw'}]};
 const reader = createCmsArticleReader({endpoint:'https://cms.example/items/articles',mediaAssetsEndpoint:'https://cms.example/items/media_assets',fetchImpl:async input => {
  const url = new URL(input);
  if(url.pathname.endsWith('/media_assets')) return Response.json({data:[
   {id:12,file_id:'cccccccc-cccc-4ccc-8ccc-cccccccccc01',media_type:'image',status:'published',publication_state:'published'},
   {id:13,file_id:'cccccccc-cccc-4ccc-8ccc-cccccccccc02',media_type:'image',status:'draft',publication_state:'unpublished'}
  ]});
  assert.ok(url.searchParams.get('fields').split(',').includes('body_media'));
  return Response.json({data:[article]});
 }});
 const result = await reader.get('body-news');
 assert.deepEqual(normalizeArticleBodyMedia(result.data.body_media).map(item=>item.path),['/api/public/v1/media/asset/cccccccc-cccc-4ccc-8ccc-cccccccccc01']);
 assert.equal(JSON.stringify(result).includes('cccccccc-cccc-4ccc-8ccc-cccccccccc02'),false);
 assert.equal(JSON.stringify(result).includes('untrusted'),false);
});
test('body media accepts only protected paths and bounded presentation options',()=>{
 const out=normalizeArticleBodyMedia([{path:'/api/preview/media/2',width:140,align:'bad',order:2},{path:'/assets/x.png',width:50,order:1},{path:'/api/preview/media/3',width:40,align:'left',order:1}]);
 assert.deepEqual(out.map(x=>x.path),['/api/preview/media/3','/api/preview/media/2']); assert.equal(out[0].width,40); assert.equal(out[1].width,100); assert.equal(out[1].align,'center');
});
test('article body references survive preview boundaries without exposing private top-level fields', () => {
 const body_media = [{media_asset_id:'12',caption:'正文图片'}];
 const server = previewContentRecord('articles', {id:42,body_media:JSON.stringify(body_media),source_document:'private'});
 assert.deepEqual(server.body_media,body_media);
 assert.equal(server.source_document,undefined);
 const client = sanitizeCmsLivePreviewRecord('articles', {...server,body_media:[{...body_media[0],path:'/api/preview/media/12'}],internal_note:'private'});
 assert.equal(client.internal_note,undefined);
 assert.equal(normalizeArticleBodyMedia(client.body_media)[0].path,'/api/preview/media/12');
});
test('article body media exposes a governed canvas binding distinct from the cover', async () => {
 const source = await readFile(new URL('../pages/news/[slug].vue', import.meta.url), 'utf8');
 assert.match(source, /body_media\.\$\{media\.sourceIndex\}\.media_asset_id/);
 assert.match(source, /data-cms-preview-media-role="image"/);
 assert.match(source, /data-cms-preview-placement-key="news\.article\.body"/);
});
test('filtered and sorted body media retains its original write target', () => {
 const records = [
  {path:'/api/preview/media/10',order:5,sourceIndex:99},
  {path:'/assets/unmanaged.png'},
  {path:'/api/preview/media/12',order:0}
 ];
 assert.deepEqual(normalizeArticleBodyMedia(records).map(item => item.sourceIndex), [2,0]);
 assert.equal(records[0].sourceIndex,99);
});
