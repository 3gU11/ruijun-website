import assert from 'node:assert/strict';
import test from 'node:test';

const {
  MediaAssetGovernanceError,
  assertMediaAssetUpload,
  assertMediaAssetRecord,
  collectMediaAssetReferenceIds,
  assertPublishedMediaReferences
} = await import('../content-workflow/media-asset-governance.mjs');

test('public media upload validation accepts supported files but rejects spoofed extensions and oversized payloads', () => {
  assert.deepEqual(assertMediaAssetUpload({
    filename_download: 'machine.webp', type: 'image/webp', filesize: 2_000_000
  }), {
    filename_download: 'machine.webp', type: 'image/webp', filesize: 2_000_000
  });

  assert.throws(() => assertMediaAssetUpload({
    filename_download: 'manual.exe', type: 'application/pdf', filesize: 200
  }), (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_EXTENSION_INVALID');
  assert.throws(() => assertMediaAssetUpload({
    filename_download: 'factory.jpg', type: 'image/jpeg', filesize: 30 * 1024 * 1024
  }), (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_FILE_TOO_LARGE');
});

test('media asset records must match the server-side uploaded file and declare an eligible review scope', () => {
  const input = {
    file_id: 'file-1', original_file_name: 'machine.webp', mime_type: 'image/webp', byte_size: 1_024,
    usage_scope: 'product', copyright_status: 'authorized'
  };
  const file = { id: 'file-1', filename_download: 'machine.webp', type: 'image/webp', filesize: 1_024 };

  assert.doesNotThrow(() => assertMediaAssetRecord(input, file));
  assert.throws(() => assertMediaAssetRecord({ ...input, byte_size: 1_025 }, file),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_FILE_METADATA_MISMATCH');
  assert.throws(() => assertMediaAssetRecord({ ...input, usage_scope: 'unknown' }, file),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_USAGE_SCOPE_INVALID');
});

test('reviewable content has an explicit, backwards-compatible media asset reference format', () => {
  assert.deepEqual(collectMediaAssetReferenceIds({
    cover_asset: 'cover-asset',
    media: [{ media_asset_id: 'machine-asset', alt: '机床' }],
    assets: [{ media_asset_id: 'certificate-asset', alt: '证书' }],
    brand: { logo_asset: 'brand-logo-asset' }
  }), ['cover-asset', 'machine-asset', 'certificate-asset', 'brand-logo-asset']);

  assert.throws(() => collectMediaAssetReferenceIds({ media: [{ path: '/assets/legacy.jpg' }] }),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_REFERENCE_INVALID');
  assert.throws(() => collectMediaAssetReferenceIds({ brand: { logo_asset: { id: 'not-an-id' } } }),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_REFERENCE_INVALID');
});

test('media asset references support Directus numeric primary keys without weakening validation', () => {
  assert.deepEqual(collectMediaAssetReferenceIds({ media: [{ media_asset_id: 42 }] }), ['42']);
  assert.doesNotThrow(() => assertPublishedMediaReferences(
    { status: 'review', media: [{ media_asset_id: 42 }] },
    new Map([[42, { id: 42, status: 'published', publication_state: 'published' }]])
  ));
});

test('content entering review or publication cannot reference missing, draft, or unpublished media assets', () => {
  const record = { status: 'review', cover_asset: 'published-asset', media: [{ media_asset_id: 'draft-asset' }] };
  const available = new Map([
    ['published-asset', { id: 'published-asset', status: 'published', publication_state: 'published' }],
    ['draft-asset', { id: 'draft-asset', status: 'draft', publication_state: 'unpublished' }]
  ]);

  assert.throws(() => assertPublishedMediaReferences(record, available),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_NOT_PUBLISHED');
  assert.doesNotThrow(() => assertPublishedMediaReferences({ status: 'draft', media: [{ path: '/assets/legacy.jpg' }] }, available));
});

test('site settings Logo is governed as a protected media reference', () => {
  const draftLogo = new Map([['brand-logo', { id: 'brand-logo', status: 'draft', publication_state: 'unpublished' }]]);
  assert.throws(() => assertPublishedMediaReferences(
    { status: 'review', brand: { logo_asset: 'brand-logo' } }, draftLogo
  ), (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_NOT_PUBLISHED');
  assert.doesNotThrow(() => assertPublishedMediaReferences(
    { status: 'published', brand: JSON.stringify({ logo_asset: 'brand-logo' }) },
    new Map([['brand-logo', { id: 'brand-logo', status: 'published', publication_state: 'published' }]])
  ));
});
