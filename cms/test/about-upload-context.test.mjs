import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaPlacementContexts } from '../extensions/content-editor-workbench/src/media-placement-catalog.js';

test('choosing either about opening image fills its actual page and section', async () => {
 for(const placement of ['about.hero.background','about.hero.foreground']) {
  assert.deepEqual(mediaPlacementContexts[placement],{pageKey:'about',sectionKey:'hero'});
 }
 assert.deepEqual(mediaPlacementContexts['service.tutorial.video'],{pageKey:'service',sectionKey:'download'});
});
