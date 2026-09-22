import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { productResourceDownloadName } from '../shared/product-resource-download.mjs';

test('detail section record owners use the actual product binding attribute keys', () => {
 const source = readFileSync(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');
 assert.doesNotMatch(source, /productBinding\([^)]*\)\.(?:collection|itemId)/);
 for (const field of ['title', 'resources']) {
  assert.ok(source.includes(`productBinding('${field}')['data-cms-preview-collection']`));
  assert.ok(source.includes(`productBinding('${field}')['data-cms-preview-item-id']`));
 }
});

test('uploaded product documents download independently of their editable type label', () => {
 assert.equal(productResourceDownloadName({title:'产品说明书',type:'说明书',media_asset_id:8,url:'/api/preview/media/8'}),'产品说明书');
 assert.equal(productResourceDownloadName({title:'产品说明书',type:'手册',media_asset_id:8,path:'/api/public/v1/media/8'}),'产品说明书');
 assert.equal(productResourceDownloadName({title:'参数',type:'PDF',url:'/assets/data.pdf'}),'参数');
 assert.equal(productResourceDownloadName({type:'手册',url:'/assets/data.PDF?version=2'}),'产品资料');
 assert.equal(productResourceDownloadName({title:'介绍',type:'网页',url:'https://example.test/info'}),undefined);
 assert.equal(productResourceDownloadName({title:'无文件',type:'PDF'}),undefined);
});
