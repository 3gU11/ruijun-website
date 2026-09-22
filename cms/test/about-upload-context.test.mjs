import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('choosing either about opening image fills its actual page and section', async () => {
 const source=await readFile(new URL('../extensions/content-editor-workbench/src/module.vue',import.meta.url),'utf8');
 const start=source.indexOf('const mediaPlacementContexts = Object.freeze(');
 const end=source.indexOf('\nfunction applyMediaPlacementContext',start);
 const contexts=new Function(`${source.slice(start,end)}; return mediaPlacementContexts;`)();
 for(const placement of ['about.hero.background','about.hero.foreground']) {
  assert.deepEqual(contexts[placement],{pageKey:'about',sectionKey:'hero'});
 }
 assert.deepEqual(contexts['service.tutorial.video'],{pageKey:'service',sectionKey:'download'});
});
