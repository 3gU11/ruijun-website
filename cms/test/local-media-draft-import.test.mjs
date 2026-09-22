import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const importer = await import('../scripts/import-local-media-drafts.mjs');

test('local media draft manifest stays within the user-provided material directory or the exact existing service asset allowlist', () => {
  assert.equal(importer.localMediaDraftManifest.length, 113);
  for (const item of importer.localMediaDraftManifest) {
    assert.doesNotThrow(() => importer.resolveLocalMediaSource(item.sourcePath));
    assert.equal(item.copyright_status, 'pending_review');
    assert.equal(item.status, 'draft');
    assert.equal(item.publication_state, 'unpublished');
  }
});

test('service office map and region images are governed candidates for the office-directory canvas', async () => {
  const office = importer.localMediaDraftManifest.filter((item) => item.sectionKey === 'office-directory');
  assert.equal(office.length, 11);
  assert.equal(office.find((item) => item.role === 'map')?.placementKey, 'service.office.map');
  assert.equal(office.filter((item) => item.placementKey === 'service.office.image').length, 10);
  for (const item of office) {
    const bytes = await readFile(importer.resolveLocalMediaSource(item.sourcePath));
    const dimensions = importer.readImageDimensions(bytes, 'image/jpeg');
    assert.equal(importer.assessLocalMediaCandidate(item, { byteSize: bytes.length, ...dimensions }).importable, true, item.sourcePath);
  }
});

test('existing about-page galleries and certificates are private governed candidates for their exact editable sections', async () => {
  const factory = importer.localMediaDraftManifest.filter((item) => item.placementKey === 'about.gallery.image');
  const partners = importer.localMediaDraftManifest.filter((item) => item.placementKey === 'about.partner.image');
  const clients = importer.localMediaDraftManifest.filter((item) => item.placementKey === 'about.client.image');
  const qualifications = importer.localMediaDraftManifest.filter((item) => item.placementKey === 'qualification.image');
  assert.equal(factory.length, 4);
  assert.equal(partners.length, 1);
  assert.equal(clients.length, 10);
  assert.equal(qualifications.length, 20);
  assert.ok(factory.every((item) => item.pageKey === 'about' && item.sectionKey === 'factory' && item.usageScope === 'brand'));
  assert.ok(partners.every((item) => item.pageKey === 'about' && item.sectionKey === 'partners' && item.usageScope === 'brand'));
  assert.deepEqual([...new Set(clients.map((item) => item.sectionKey))], ['clients-domestic', 'clients-global']);
  assert.deepEqual([...new Set(qualifications.map((item) => item.sectionKey))], ['certificates', 'honors', 'patents']);
  for (const item of [...factory, ...partners, ...clients, ...qualifications]) {
    const bytes = await readFile(importer.resolveLocalMediaSource(item.sourcePath));
    const dimensions = importer.readImageDimensions(bytes, 'image/jpeg');
    assert.equal(importer.assessLocalMediaCandidate(item, { byteSize: bytes.length, ...dimensions }).importable, true, item.sourcePath);
  }
});

test('the explicitly allowed about timeline JPEG is a governed draft candidate', async () => {
  const source = importer.localMediaDraftManifest.find((item) => item.placementKey === 'about.timeline.background');
  assert.equal(source?.sourcePath, 'website\\public\\assets\\timeline-paper-texture.jpg');
  assert.equal(source?.usageScope, 'brand');
  assert.equal(source?.pageKey, 'about');
  assert.equal(source?.sectionKey, 'history');
  const bytes = await readFile(importer.resolveLocalMediaSource(source.sourcePath));
  assert.deepEqual(importer.readImageDimensions(bytes, 'image/jpeg'), { width: 3840, height: 1800 });
  assert.equal(importer.assessLocalMediaCandidate(source, { byteSize: bytes.length, width: 3840, height: 1800 }).importable, true);
});

test('the explicitly allowed service hero JPEG is a governed draft candidate for the service hero canvas', async () => {
  const source = importer.localMediaDraftManifest.find((item) => item.placementKey === 'service.hero.image');
  assert.equal(source?.sourcePath, 'website\\public\\assets\\service-library-hero-v3.jpg');
  assert.equal(source?.usageScope, 'service');
  assert.equal(source?.pageKey, 'service');
  assert.equal(source?.sectionKey, 'hero');
  const bytes = await readFile(importer.resolveLocalMediaSource(source.sourcePath));
  assert.deepEqual(importer.readImageDimensions(bytes, 'image/jpeg'), { width: 2126, height: 1030 });
  assert.equal(importer.assessLocalMediaCandidate(source, { byteSize: bytes.length, width: 2126, height: 1030 }).importable, true);
});

test('about hero background and foreground candidates use separate governed placements and their real source dimensions', async () => {
  const source = importer.localMediaDraftManifest.find((item) => item.placementKey === 'about.hero.background');
  const foreground = importer.localMediaDraftManifest.find((item) => item.placementKey === 'about.hero.foreground');
  assert.equal(source?.sourcePath, 'website\\public\\assets\\about-psd\\hero-machine.jpg');
  assert.equal(source?.usageScope, 'brand');
  assert.equal(source?.pageKey, 'about');
  assert.equal(source?.sectionKey, 'hero');
  assert.equal(source?.role, 'background');
  assert.equal(source?.status, 'draft');
  assert.equal(source?.publication_state, 'unpublished');
  assert.equal(source?.copyright_status, 'pending_review');
  const bytes = await readFile(importer.resolveLocalMediaSource(source.sourcePath));
  assert.deepEqual(importer.readImageDimensions(bytes, 'image/jpeg'), { width: 3839, height: 1900 });
  assert.equal(importer.assessLocalMediaCandidate(source, { byteSize: bytes.length, width: 3839, height: 1900 }).importable, true);

  assert.equal(foreground?.sourcePath, 'website\\public\\assets\\psd\\reason-intro-machine.png');
  assert.equal(foreground?.usageScope, 'brand');
  assert.equal(foreground?.pageKey, 'about');
  assert.equal(foreground?.sectionKey, 'hero');
  assert.equal(foreground?.role, 'foreground');
  const foregroundBytes = await readFile(importer.resolveLocalMediaSource(foreground.sourcePath));
  assert.deepEqual(importer.readImageDimensions(foregroundBytes, 'image/png'), { width: 938, height: 711 });
  assert.equal(importer.assessLocalMediaCandidate(foreground, { byteSize: foregroundBytes.length, width: 938, height: 711 }).importable, true);
});

test('only a private about-hero background draft is migrated from the retired shared placement', () => {
  const background = importer.localMediaDraftManifest.find((item) => item.placementKey === 'about.hero.background');
  assert.equal(importer.needsPlacementMigration({ placement_key: 'about.hero.image', status: 'draft', publication_state: 'unpublished' }, background), true);
  assert.equal(importer.needsPlacementMigration({ placement_key: 'about.hero.image', status: 'published', publication_state: 'published' }, background), false);
  assert.equal(importer.needsPlacementMigration({ placement_key: 'about.hero.image', status: 'draft', publication_state: 'unpublished' }, { ...background, placementKey: 'about.hero.foreground' }), false);
  assert.equal(importer.needsPlacementMigration({ placement_key: 'about.hero.foreground', status: 'draft', publication_state: 'unpublished' }, background), false);
});

test('the explicitly allowed about timeline icon is a governed draft candidate', async () => {
  const source = importer.localMediaDraftManifest.find((item) => item.placementKey === 'about.timeline.icon');
  assert.equal(source?.sourcePath, 'website\\public\\assets\\about-psd\\history-guide-wheel.png');
  assert.equal(source?.usageScope, 'brand');
  assert.equal(source?.pageKey, 'about');
  assert.equal(source?.sectionKey, 'history');
  const bytes = await readFile(importer.resolveLocalMediaSource(source.sourcePath));
  const dimensions = importer.readImageDimensions(bytes, 'image/png');
  assert.ok(dimensions.width >= 96 && dimensions.height >= 96);
  assert.equal(importer.assessLocalMediaCandidate(source, { byteSize: bytes.length, ...dimensions }).importable, true);
});

test('homepage reason media candidates use exact section-owned placements', async () => {
  const candidates = importer.localMediaDraftManifest.filter((item) => item.placementKey.startsWith('home.reason.'));
  assert.equal(candidates.length, 6);
  assert.deepEqual(candidates.slice(0, 3).map((item) => [item.sectionKey, item.placementKey]), [
    ['performance', 'home.reason.machine'],
    ['advanced-manufacturing', 'home.reason.background'],
    ['industry-leadership', 'home.reason.background']
  ]);
  assert.deepEqual(candidates.slice(3).map((item) => [item.sectionKey, item.placementKey]), [
    ['performance', 'home.reason.icon'],
    ['advanced-manufacturing', 'home.reason.icon'],
    ['industry-leadership', 'home.reason.icon']
  ]);
  for (const item of candidates) {
    const bytes = await readFile(importer.resolveLocalMediaSource(item.sourcePath));
    const dimensions = importer.readImageDimensions(bytes, item.sourcePath.endsWith('.png') ? 'image/png' : 'image/jpeg');
    assert.equal(importer.assessLocalMediaCandidate(item, { byteSize: bytes.length, ...dimensions }).importable, true);
  }
});

test('existing service action icons are private, governed candidates for their exact canvas slots', async () => {
  const icons = importer.localMediaDraftManifest.filter((item) => item.placementKey === 'service.action.icon');
  assert.equal(icons.length, 8);
  for (const [index, item] of icons.entries()) {
    assert.equal(item.usageScope, 'service');
    assert.equal(item.pageKey, 'service');
    assert.equal(item.sectionKey, 'support-actions');
    assert.equal(item.role, `action-${index + 1}`);
    const bytes = await readFile(importer.resolveLocalMediaSource(item.sourcePath));
    const dimensions = importer.readPngDimensions(bytes);
    assert.equal(importer.assessLocalMediaCandidate(item, { byteSize: bytes.length, ...dimensions }).importable, true);
  }
});

test('the product technical-drawing batch and manufacturing equipment batch use explicit source folders', () => {
  const drawings = importer.localMediaDraftManifest.filter((item) => item.placementKey === 'product.gallery.image');
  const equipment = importer.localMediaDraftManifest.filter((item) => item.placementKey === 'manufacturing.equipment.image');
  assert.equal(drawings.length, 23);
  assert.ok(drawings.every((item) => item.sourcePath.startsWith('素材\\技术参数\\')));
  assert.ok(drawings.some((item) => item.sourcePath.endsWith('FRAUTO\\8060.png')));
  assert.ok(drawings.some((item) => item.sourcePath.endsWith('PRO\\1080.png')));
  assert.equal(equipment.length, 4);
  assert.ok(equipment.every((item) => item.sourcePath.startsWith('素材\\先进制造\\设备照片\\')));
  assert.ok(equipment.every((item) => item.usageScope === 'manufacturing'));
});

test('manufacturing equipment candidates accept the actual extracted PSD layer dimensions', () => {
  const source = importer.localMediaDraftManifest.find((item) => item.sourcePath.endsWith('设备照片\\equipment-2.png'));
  assert.ok(source, 'the second equipment image candidate is required');
  const assessment = importer.assessLocalMediaCandidate(source, { byteSize: 474_509, width: 740, height: 415 });
  assert.equal(assessment.importable, true);
});

test('manufacturing hero candidate retains its exact page placement and source role', () => {
  const source = importer.localMediaDraftManifest.find((item) => item.sourcePath.endsWith('先进制造\\首屏图片\\hero-building.png'));
  assert.ok(source, 'the manufacturing hero candidate is required');
  assert.equal(source.usageScope, 'manufacturing');
  assert.equal(source.placementKey, 'manufacturing.hero.image');
  assert.equal(source.pageKey, 'manufacturing');
  assert.equal(source.sectionKey, 'hero');
  assert.equal(source.role, 'hero-building');
  const assessment = importer.assessLocalMediaCandidate(source, { byteSize: 12_728_903, width: 3840, height: 2156 });
  assert.equal(assessment.importable, true);
});

test('manufacturing hero PNG dimensions are read from the extracted user source', async () => {
  const source = importer.localMediaDraftManifest.find((item) => item.sourcePath.endsWith('先进制造\\首屏图片\\hero-building.png'));
  assert.ok(source, 'the manufacturing hero candidate is required');
  const bytes = await readFile(importer.resolveLocalMediaSource(source.sourcePath));
  assert.deepEqual(importer.readPngDimensions(bytes), { width: 3840, height: 2156 });
});

test('manufacturing PSD page-layer candidates retain their section and layer roles', async () => {
  const source = importer.localMediaDraftManifest.find((item) => item.sourcePath.endsWith('先进制造\\页面图层\\cnc-main.png'));
  assert.ok(source, 'the CNC main PSD layer candidate is required');
  assert.equal(source.usageScope, 'manufacturing');
  assert.equal(source.placementKey, 'manufacturing.layer.image');
  assert.equal(source.pageKey, 'manufacturing');
  assert.equal(source.sectionKey, 'precision-machining');
  assert.equal(source.role, 'cnc-main');
  const bytes = await readFile(importer.resolveLocalMediaSource(source.sourcePath));
  assert.deepEqual(importer.readPngDimensions(bytes), { width: 926, height: 527 });
  assert.equal(importer.assessLocalMediaCandidate(source, { byteSize: bytes.length, width: 926, height: 527 }).importable, true);
});

test('PNG metadata is read from the file rather than guessed from its filename', async () => {
  const source = importer.localMediaDraftManifest.find((item) => item.sourcePath.endsWith('技术参数\\FL\\1180.png'));
  assert.ok(source, 'the FL1180 technical drawing candidate is required');
  const bytes = await readFile(importer.resolveLocalMediaSource(source.sourcePath));
  assert.deepEqual(importer.readPngDimensions(bytes), { width: 1489, height: 1419 });
});

test('draft asset payloads are never created as public or copyright-approved', () => {
  const input = importer.localMediaDraftManifest[0];
  const payload = importer.buildDraftAssetPayload(input, {
    fileId: 'file-1', fileName: '1180.png', byteSize: 123, width: 1000, height: 800
  });
  assert.equal(payload.status, 'draft');
  assert.equal(payload.publication_state, 'unpublished');
  assert.equal(payload.copyright_status, 'pending_review');
  assert.equal(payload.source_document, input.sourcePath.replaceAll('\\', '/'));
  assert.equal(payload.file_id, 'file-1');
});

test('a JPEG draft candidate keeps its verified MIME type in the asset record', () => {
  const input = importer.localMediaDraftManifest.find((item) => item.placementKey === 'service.hero.image');
  const payload = importer.buildDraftAssetPayload(input, {
    fileId: 'hero-file', fileName: 'service-library-hero-v3.jpg', byteSize: 314_277, width: 2126, height: 1030
  });
  assert.equal(payload.mime_type, 'image/jpeg');
  assert.equal(payload.placement_key, 'service.hero.image');
});

test('media below its selected placement specification is skipped before any upload', () => {
  const input = importer.localMediaDraftManifest[0];
  const assessment = importer.assessLocalMediaCandidate(input, { byteSize: 123, width: 1000, height: 800 });
  assert.equal(assessment.importable, false);
  assert.match(assessment.reason, /1200x900/);
});
