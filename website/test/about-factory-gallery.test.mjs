import assert from 'node:assert/strict';
import test from 'node:test';
import { clientGalleryAssets, factoryGalleryAssets, hydrateFactoryMediaSlots, partnerGalleryAssets } from '../shared/about-factory-gallery.mjs';
import { applyVisualMediaReplacement } from '../../cms/extensions/content-editor-workbench/src/visual-editing-fields.js';

const fallback = Array.from({ length: 4 }, (_, index) => ({ path: `/assets/factory-${index + 1}.jpg`, alt: `Factory ${index + 1}` }));

test('partner composite image supports a persisted media replacement', () => {
  const section = hydrateFactoryMediaSlots({ id: 'partners', media: [] });
  assert.equal(partnerGalleryAssets(section, fallback)[0].fieldPath, 'media.0');
  assert.equal(applyVisualMediaReplacement(section, 'media.0', '102'), true);
  section.media[0].path = '/api/preview/media/102';
  const reloaded = hydrateFactoryMediaSlots(structuredClone(section));
  assert.equal(reloaded.media.length, 1);
  assert.equal(partnerGalleryAssets(reloaded, fallback)[0].path, '/api/preview/media/102');
});

test('factory defaults have independent writable slots without changing unrelated sections', () => {
  const section = hydrateFactoryMediaSlots({ id: 'factory', media: [] });
  const gallery = factoryGalleryAssets(section, fallback);
  assert.deepEqual(gallery.map((asset) => asset.fieldPath), ['media.0', 'media.1', 'media.2', 'media.3']);
  assert.equal(applyVisualMediaReplacement(section, gallery[2].fieldPath, '98', { mediaSlot: gallery[2].mediaSlot }), true);
  section.media[2].path = '/api/preview/media/98';
  assert.deepEqual(factoryGalleryAssets(section, fallback).map((asset) => asset.path), [fallback[0].path, fallback[1].path, '/api/preview/media/98', fallback[3].path]);
  const other = { id: 'hero' };
  assert.deepEqual(hydrateFactoryMediaSlots(other), { id: 'hero' });
});

test('saved sparse roles keep their image positions after empty slots are normalized away', () => {
  const section = { id: 'factory', media: [{ role: 'factory-3', media_asset_id: '98', path: '/api/preview/media/98' }] };
  const original = structuredClone(section);
  const gallery = factoryGalleryAssets(section, fallback);
  assert.deepEqual(section, original);
  assert.equal(gallery.length, 4);
  assert.equal(gallery[2].fieldPath, 'media.0');
  assert.equal(gallery[2].path, '/api/preview/media/98');
  assert.equal(gallery[0].path, fallback[0].path);
  hydrateFactoryMediaSlots(section);
  hydrateFactoryMediaSlots(section);
  assert.equal(section.media.length, 4);
  assert.equal(section.media[0].media_asset_id, '98');
});

test('legacy unlabelled and custom gallery images are not discarded', () => {
  const gallery = factoryGalleryAssets({ media: [{ path: '/assets/custom.jpg' }, { role: 'extra', path: '/assets/extra.jpg' }] }, fallback);
  assert.equal(gallery[0].path, '/assets/custom.jpg');
  assert.equal(gallery.length, 5);
  assert.equal(gallery[4].path, '/assets/extra.jpg');
});

test('domestic and global client defaults have independent writable media slots', () => {
  const clientFallback = Array.from({ length: 5 }, (_, index) => ({ path: `/assets/client-${index + 1}.jpg`, alt: `Client ${index + 1}` }));
  const domestic = hydrateFactoryMediaSlots({ id: 'clients-domestic', media: [] });
  const global = hydrateFactoryMediaSlots({ id: 'clients-global', media: [] });
  const domesticGallery = clientGalleryAssets(domestic, clientFallback);
  const globalGallery = clientGalleryAssets(global, clientFallback);

  assert.deepEqual(domesticGallery.map((asset) => asset.mediaSlot), ['domestic-1', 'domestic-2', 'domestic-3', 'domestic-4', 'domestic-5']);
  assert.deepEqual(globalGallery.map((asset) => asset.mediaSlot), ['global-1', 'global-2', 'global-3', 'global-4', 'global-5']);
  assert.equal(applyVisualMediaReplacement(domestic, domesticGallery[2].fieldPath, '105', { mediaSlot: domesticGallery[2].mediaSlot }), true);
  domestic.media[2].path = '/api/preview/media/105';
  assert.equal(clientGalleryAssets(domestic, clientFallback)[2].path, '/api/preview/media/105');
  assert.deepEqual(clientGalleryAssets(global, clientFallback).map((asset) => asset.path), clientFallback.map((asset) => asset.path));
});

test('sparse client roles retain visual order after save normalization', () => {
  const clientFallback = Array.from({ length: 5 }, (_, index) => ({ path: `/assets/client-${index + 1}.jpg` }));
  const section = { id: 'clients-global', media: [{ role: 'global-4', media_asset_id: '111', path: '/api/preview/media/111' }] };
  const gallery = clientGalleryAssets(section, clientFallback);

  assert.equal(gallery[3].fieldPath, 'media.0');
  assert.equal(gallery[3].path, '/api/preview/media/111');
  assert.equal(gallery[0].path, clientFallback[0].path);
});
