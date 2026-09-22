import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('core equipment keeps four visible PSD slots when its CMS media list is partial', async () => {
  const page = await readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8');
  const gallery = page.slice(page.indexOf('const equipmentGallery = computed'), page.indexOf('const equipmentSectionTitle = computed'));

  assert.match(gallery, /const equipmentPageEntryByIndex = new Map/);
  assert.match(gallery, /equipmentFallbackGallery\.map\(\(fallback, index\) =>/);
  assert.match(gallery, /equipmentPageEntryByIndex\.get\(index\)/);
  assert.match(gallery, /index, entry: fallbackMedia, role: fallback\.name/);
});

test('core equipment gives each declared visual slot its own governed media field and retains overflow for the gallery', async () => {
  const page = await readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8');
  const gallery = page.slice(page.indexOf('const equipmentGallery = computed'), page.indexOf('const equipmentSectionTitle = computed'));

  assert.match(gallery, /index, entry: fallbackMedia, role: fallback\.name/);
  assert.match(gallery, /const overflowEntries = entries\.filter\(\(\{ sourceIndex \}\) => sourceIndex >= equipmentFallbackGallery\.length\)/);
  assert.match(gallery, /return \[\.\.\.visibleEntries, \.\.\.overflowEntries\]/);
  assert.match(page, /index: layerIndex, entry: mediaEntry\(asset\(layer\.name\)\), role: normalizedLayer/);
  assert.doesNotMatch(page, /const nextSlotIndex = Array\.isArray\(pageMedia\) \? pageMedia\.length : 0/);
});
