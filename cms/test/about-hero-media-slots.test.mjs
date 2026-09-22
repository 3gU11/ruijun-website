import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('about hero keeps its background and machine foreground as distinct canvas media targets', async () => {
  const [page, module, schema] = await Promise.all([
    readFile(new URL('../../website/pages/about.vue', import.meta.url), 'utf8'),
    readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8'),
    readFile(new URL('../schema/directus-schema-plan.mjs', import.meta.url), 'utf8')
  ]);

  assert.match(page, /heroBackground\.fieldPath[\s\S]*?data-cms-preview-placement-key="about\.hero\.background"[\s\S]*?data-cms-preview-media-role="background"/);
  assert.match(page, /heroMachine\.fieldPath[\s\S]*?data-cms-preview-placement-key="about\.hero\.foreground"[\s\S]*?data-cms-preview-media-role="foreground"/);
  assert.match(module, /slug === 'about' && element\.mediaRole === 'foreground' \? 'about\.hero\.foreground'/);
  assert.match(module, /slug === 'about' \? 'about\.hero\.background'/);
  assert.match(schema, /\['about\.hero\.background',/);
  assert.match(schema, /\['about\.hero\.foreground',/);
});
