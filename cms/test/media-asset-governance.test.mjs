import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const {
  MediaAssetGovernanceError,
  assertMediaAssetUpload,
  assertMediaAssetRecord,
  assertMediaAssetPlacement,
  reviewerRoleForMediaUsageScope,
  collectMediaAssetReferenceIds,
  assertPublishedMediaReferences
} = await import('../content-workflow/media-asset-governance.mjs');

test('media governance E2E resolves the current unified review role instead of retired role labels', async () => {
  const script = await readFile(new URL('../scripts/verify-media-asset-governance-e2e.mjs', import.meta.url), 'utf8');
  assert.match(script, /import \{ resolvePublicationWorkflowRoles \} from '\.\/publication-e2e-roles\.mjs';/);
  assert.match(script, /const \{ editorRoleId, reviewerRoleId, publisherRoleId \} = resolvePublicationWorkflowRoles\(roles\.data\);/);
  assert.doesNotMatch(script, /byName\.get\('技术审核人员'\)/);
  assert.doesNotMatch(script, /byName\.get\('发布人员'\)/);
});

test('media governance E2E creates a schema-complete, placement-valid image candidate', async () => {
  const script = await readFile(new URL('../scripts/verify-media-asset-governance-e2e.mjs', import.meta.url), 'utf8');
  assert.match(script, /reason-factory-full\.jpg/);
  assert.match(script, /mime_type: 'image\/jpeg'/);
  assert.match(script, /media_type: 'image'/);
  assert.match(script, /width: 3840, height: 1880/);
  assert.match(script, /placement_key: 'default\.image'/);
  assert.match(script, /enabled: true/);
});

test('media governance E2E verifies a governed article cover through the public article endpoint', async () => {
  const script = await readFile(new URL('../scripts/verify-media-asset-governance-e2e.mjs', import.meta.url), 'utf8');
  assert.match(script, /\/items\/articles/);
  assert.match(script, /cover_asset: assetId/);
  assert.match(script, /\/api\/public\/v1\/articles\/\$\{encodeURIComponent\(articleSlug\)\}/);
  assert.match(script, /\['media_assets', assetId\], \['articles', articleId\]/);
});

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

test('media placement specifications enforce dimensions, duration, poster and muted autoplay', () => {
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'image', width: 1920, height: 1080, byte_size: 10_000_000 }, 'home.hero.poster'));
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'image', width: 1920, height: 960, byte_size: 10_000_000 }, 'service.hero.image'));
  assert.throws(() => assertMediaAssetPlacement({ media_type: 'image', width: 1920, height: 959, byte_size: 10_000_000 }, 'service.hero.image'),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_DIMENSIONS_INVALID');
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'image', width: 740, height: 415, byte_size: 700_000 }, 'manufacturing.equipment.image'));
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'image', width: 452, height: 254, byte_size: 700_000 }, 'manufacturing.layer.image'));
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'image', width: 34, height: 42, byte_size: 10_000 }, 'service.action.icon'));
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'image', width: 1600, height: 900, byte_size: 10_000 }, 'home.reason.background'));
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'image', width: 209, height: 305, byte_size: 10_000 }, 'home.reason.machine'));
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'image', width: 96, height: 96, byte_size: 10_000 }, 'home.reason.icon'));
  assert.throws(() => assertMediaAssetPlacement({ media_type: 'image', width: 79, height: 96, byte_size: 10_000 }, 'home.reason.icon'),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_DIMENSIONS_INVALID');
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'image', width: 792, height: 446, byte_size: 10_000 }, 'about.gallery.image'));
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'image', width: 542, height: 406, byte_size: 10_000 }, 'about.client.image'));
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'image', width: 365, height: 410, byte_size: 10_000 }, 'qualification.image'));
  assert.throws(() => assertMediaAssetPlacement({ media_type: 'image', width: 791, height: 446, byte_size: 10_000 }, 'about.gallery.image'),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_DIMENSIONS_INVALID');
  assert.throws(() => assertMediaAssetPlacement({ media_type: 'image', width: 33, height: 42, byte_size: 10_000 }, 'service.action.icon'),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_DIMENSIONS_INVALID');
  assert.throws(() => assertMediaAssetPlacement({ media_type: 'image', width: 451, height: 254, byte_size: 700_000 }, 'manufacturing.layer.image'),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_DIMENSIONS_INVALID');
  assert.throws(() => assertMediaAssetPlacement({ media_type: 'image', width: 740, height: 416, byte_size: 700_000 }, 'manufacturing.gallery.image'),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_DIMENSIONS_INVALID');
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'video', width: 1920, height: 1080, byte_size: 10_000_000, duration_seconds: 30, poster_asset_id: 'poster-1', autoplay: true, muted: true }, 'home.hero.video'));
  assert.throws(() => assertMediaAssetPlacement({ media_type: 'video', width: 1280, height: 720, byte_size: 10_000_000, poster_asset_id: 'poster-1' }, 'home.hero.video'),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_DIMENSIONS_INVALID');
  assert.throws(() => assertMediaAssetPlacement({ media_type: 'video', width: 1920, height: 1080, byte_size: 10_000_000 }, 'news.hero.video'),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_POSTER_REQUIRED');
  assert.throws(() => assertMediaAssetPlacement({ media_type: 'video', width: 1920, height: 1080, byte_size: 10_000_000, poster_asset_id: 'poster-1', autoplay: true, muted: false }, 'news.hero.video'),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_PLAYBACK_INVALID');
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'video', width: 1280, height: 720, byte_size: 10_000_000 }, 'news.video_share.list'));
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'video', width: 1280, height: 720, byte_size: 10_000_000, poster_asset_id: 'poster-1', transcript: '字幕文字稿' }, 'news.video_share.list'));
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'video', width: 1280, height: 720, byte_size: 10_000_000, duration_seconds: 90, poster_asset_id: 'poster-1', transcript: '工艺字幕' }, 'manufacturing.process.video'));
  assert.throws(() => assertMediaAssetPlacement({ media_type: 'video', width: 1280, height: 720, byte_size: 10_000_000, duration_seconds: 90, poster_asset_id: 'poster-1' }, 'manufacturing.gallery.video'),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_TRANSCRIPT_REQUIRED');
});

test('video media records only require a poster for placements that need one', () => {
  const file = { id: 'video-1', filename_download: 'share.mp4', type: 'video/mp4', filesize: 10_000 };
  const base = {
    file_id: 'video-1', original_file_name: 'share.mp4', mime_type: 'video/mp4', byte_size: 10_000,
    usage_scope: 'article', copyright_status: 'owned', media_type: 'video', width: 1280, height: 720,
    placement_key: 'news.video_share.list'
  };
  assert.doesNotThrow(() => assertMediaAssetRecord(base, file));
  assert.throws(() => assertMediaAssetRecord({ ...base, placement_key: 'news.hero.video' }, file),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_POSTER_REQUIRED');
});

test('media asset records must match the server-side uploaded file and declare an eligible review scope', () => {
  const input = {
    file_id: 'file-1', original_file_name: 'machine.webp', mime_type: 'image/webp', byte_size: 1_024,
    usage_scope: 'product', copyright_status: 'authorized', media_type: 'image', width: 1600, height: 900
  };
  const file = { id: 'file-1', filename_download: 'machine.webp', type: 'image/webp', filesize: 1_024 };

  assert.doesNotThrow(() => assertMediaAssetRecord(input, file));
  assert.throws(() => assertMediaAssetRecord({ ...input, byte_size: 1_025 }, file),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_FILE_METADATA_MISMATCH');
  assert.throws(() => assertMediaAssetRecord({ ...input, usage_scope: 'unknown' }, file),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_USAGE_SCOPE_INVALID');
  assert.equal(reviewerRoleForMediaUsageScope('homepage'), 'brand_reviewer');
});

test('PDF records use the document media type and document placements', () => {
  const input = { file_id: 'file-pdf', original_file_name: 'manual.pdf', mime_type: 'application/pdf', byte_size: 10_000, usage_scope: 'service', copyright_status: 'owned', media_type: 'document' };
  const file = { id: 'file-pdf', filename_download: 'manual.pdf', type: 'application/pdf', filesize: 10_000 };
  assert.doesNotThrow(() => assertMediaAssetRecord(input, file));
  assert.doesNotThrow(() => assertMediaAssetPlacement(input, 'service.document'));
  assert.throws(() => assertMediaAssetPlacement(input, 'default.image'), (error) => error.code === 'MEDIA_PLACEMENT_TYPE_INVALID');
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

test('page section media and presentation poster references are included in publication governance', () => {
  assert.deepEqual(collectMediaAssetReferenceIds({
    sections: [{
      id: 'hero',
      media: [{ media_asset_id: 'hero-video', poster_asset_id: 'hero-poster' }],
      media_presentation: { poster_asset_id: 'section-poster' },
      content: { items: [{ media_asset_id: 42 }] }
    }]
  }), ['hero-video', 'hero-poster', 'section-poster', '42']);
  assert.throws(() => assertPublishedMediaReferences({
    status: 'review', sections: [{ id: 'hero', media: [{ media_asset_id: 'draft-hero' }] }]
  }, new Map([['draft-hero', { id: 'draft-hero', status: 'draft', publication_state: 'unpublished' }]])),
  (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_NOT_PUBLISHED');
  assert.deepEqual(collectMediaAssetReferenceIds({
    sections: JSON.stringify([{ id: 'hero', content: JSON.stringify({ media: [{ media_asset_id: 'string-media' }] }) }])
  }), ['string-media']);
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

test('site settings footer wordmark and contact icons are governed media references', () => {
  assert.deepEqual(collectMediaAssetReferenceIds({
    brand: { logo_asset: 'brand-logo', footer_logo_asset: 'footer-logo' },
    footer: { address_icon_asset: 'address-icon', phone_icon_asset: 'phone-icon', email_icon_asset: 'email-icon' }
  }), ['brand-logo', 'footer-logo', 'address-icon', 'phone-icon', 'email-icon']);
});

test('milestone timeline icon is a published controlled media reference', () => {
  assert.deepEqual(collectMediaAssetReferenceIds({ icon_asset: 'timeline-icon' }), ['timeline-icon']);
  assert.doesNotThrow(() => assertPublishedMediaReferences(
    { status: 'published', icon_asset: 'timeline-icon' },
    new Map([['timeline-icon', { id: 'timeline-icon', status: 'published', publication_state: 'published' }]])
  ));
  assert.throws(() => assertPublishedMediaReferences(
    { status: 'published', icon_asset: 'timeline-icon' },
    new Map([['timeline-icon', { id: 'timeline-icon', status: 'draft', publication_state: 'unpublished' }]])
  ), (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_NOT_PUBLISHED');
});
test('dynamic news cover accepts a correctly sized image and rejects undersized covers', () => {
  const image = { media_type: 'image', width: 1600, height: 900, byte_size: 100000 };
  assert.doesNotThrow(() => assertMediaAssetPlacement(image, 'news.dynamic_news.cover'));
  assert.throws(() => assertMediaAssetPlacement({ ...image, width: 800 }, 'news.dynamic_news.cover'));
});
