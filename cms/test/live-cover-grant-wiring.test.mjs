import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('live cover updates issue a grant and the canvas waits for redemption before rendering', async () => {
 const cms=await readFile(new URL('../extensions/content-editor-workbench/src/module.vue',import.meta.url),'utf8');
 const nuxt=await readFile(new URL('../../website/composables/useCmsDraftPreview.ts',import.meta.url),'utf8');
 assert.match(cms,/api\.post\('\/content-preview-tokens\/media\/issue'/);
 assert.match(cms,/const visualRecord = selectedVisualRecord\.value;/);
 assert.match(cms,/const collection = visualRecord\?\.collection \|\| websitePreviewTarget\.value\?\.collection \|\| '';/);
 assert.match(cms,/type: 'ruijun:cms-preview:media-replace',[\s\S]{0,80}\n\s+collection,/);
 assert.match(cms,/queueLivePreviewUpdate\(visualRecord\);/);
 assert.match(cms,/record\.cover_media_asset_id = coverAssetId;/);
 assert.match(nuxt,/await \$fetch\('\/api\/preview\/media-grant'/);
 assert.ok(nuxt.indexOf("await $fetch('/api/preview/media-grant'") < nuxt.indexOf('liveRecord.value = preview;'));
});
