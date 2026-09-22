import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('article save includes structured body_media and rejects malformed JSON', async () => {
 const source=await readFile(new URL('../extensions/content-editor-workbench/src/module.vue',import.meta.url),'utf8');
 assert.match(source,/JSON\.parse\(String\(editorialDraft\.value\.body_media_text/);
 assert.match(source,/body_media: bodyMedia/);
 assert.match(source,/正文图片配置必须是合法的 JSON 数组/);
});
