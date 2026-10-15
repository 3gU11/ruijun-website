import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePageMediaReferences } from '../extensions/content-editor-workbench/src/page-media-references.js';
test('reusing an asset in a different slot preserves both persisted references', () => {
 const input=[{media_asset_id:50,role:''},{media_asset_id:'50',role:'equipment-1'},{media_asset_id:'50',role:'equipment-1'}];
 assert.deepEqual(normalizePageMediaReferences(input),[{media_asset_id:'50',role:''},{media_asset_id:'50',role:'equipment-1'}]);
 assert.equal(input.length,3);
});
