import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applyVisualMediaReplacement } from '../extensions/content-editor-workbench/src/visual-editing-fields.js';
test('canvas body replacement updates the persisted JSON and preserves neighbouring slots and unsaved captions', () => {
 const entries = [{media_asset_id:'12',caption:'未保存说明',width:60},{media_asset_id:'13',caption:'第二张'}];
 const draft = {body_media:[{media_asset_id:'12',caption:'旧说明'}],body_media_text:JSON.stringify(entries)};
 assert.equal(applyVisualMediaReplacement(draft,'body_media.0.media_asset_id','14'),true);
 const saved = JSON.parse(draft.body_media_text);
 assert.deepEqual(saved,[{...entries[0],media_asset_id:'14'},entries[1]]);
 assert.deepEqual(draft.body_media,saved);
 for (const path of ['body_media.9.media_asset_id','body_media.__proto__.media_asset_id']) {
  const before=structuredClone(draft);
  assert.equal(applyVisualMediaReplacement(draft,path,'15'),false);
  assert.deepEqual(draft,before);
 }
 draft.body_media_text='{invalid';
 const before=structuredClone(draft);
 assert.equal(applyVisualMediaReplacement(draft,'body_media.0.media_asset_id','15'),false);
 assert.deepEqual(draft,before);
});
test('article save includes structured body_media and rejects malformed JSON', async () => {
 const source=await readFile(new URL('../extensions/content-editor-workbench/src/module.vue',import.meta.url),'utf8');
 assert.match(source,/JSON\.parse\(String\(editorialDraft\.value\.body_media_text/);
 assert.match(source,/body_media: bodyMedia/);
 assert.match(source,/正文图片配置必须是合法的 JSON 数组/);
});
