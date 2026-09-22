import test from 'node:test'; import assert from 'node:assert/strict';
import { normalizeArticleBodyMedia } from '../shared/article-body-media.mjs';
test('body media accepts only protected paths and bounded presentation options',()=>{
 const out=normalizeArticleBodyMedia([{path:'/api/preview/media/2',width:140,align:'bad',order:2},{path:'/assets/x.png',width:50,order:1},{path:'/api/preview/media/3',width:40,align:'left',order:1}]);
 assert.deepEqual(out.map(x=>x.path),['/api/preview/media/3','/api/preview/media/2']); assert.equal(out[0].width,40); assert.equal(out[1].width,100); assert.equal(out[1].align,'center');
});
