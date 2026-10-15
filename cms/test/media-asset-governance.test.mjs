import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const {
  MediaAssetGovernanceError,
  assertMediaAssetUpload,
  assertMediaAssetRecord,
  assertMediaAssetPlacement,
  mediaPlacementQualityNotice,
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

test('media placement keeps the checks whose absence breaks a page, and drops the quality guardrails', () => {
  // 尺寸 / 体积 / 时长不再是硬约束：运营手里常常只有一种素材，卡尺寸等于没法上线。
  // 画质提示改由 mediaPlacementQualityNotice() 给出（见下一个测试）。
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'image', width: 1920, height: 1080, byte_size: 10_000_000 }, 'home.hero.poster'));
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'image', width: 1920, height: 959, byte_size: 10_000_000 }, 'service.hero.image'));
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'image', width: 79, height: 96, byte_size: 10_000 }, 'home.reason.icon'));
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'image', width: 451, height: 254, byte_size: 700_000 }, 'manufacturing.layer.image'));
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'image', width: 740, height: 416, byte_size: 700_000 }, 'manufacturing.gallery.image'));
  assert.doesNotThrow(() => assertMediaAssetPlacement({ media_type: 'image', width: 365, height: 410, byte_size: 10_000 }, 'qualification.image'));

  // 1080×1920 竖屏视频：宽 1080 小于推荐的 1280，但不再被拒。
  assert.doesNotThrow(() => assertMediaAssetPlacement(
    { media_type: 'video', width: 1080, height: 1920, byte_size: 10_000_000, poster_asset_id: 'poster-1' }, 'news.video_share.list'));
  // 超长视频也不再被拒。
  assert.doesNotThrow(() => assertMediaAssetPlacement(
    { media_type: 'video', width: 1280, height: 720, byte_size: 10_000_000, duration_seconds: 99_999, poster_asset_id: 'poster-1' }, 'news.video_share.list'));
  // 超大文件在「位置」这一层不再被拒（上传层仍有基础设施上限）。
  assert.doesNotThrow(() => assertMediaAssetPlacement(
    { media_type: 'image', width: 1920, height: 1080, byte_size: 999_000_000 }, 'home.hero.poster'));

  // 以下这些缺了页面会直接坏掉，必须继续拦截。
  assert.throws(() => assertMediaAssetPlacement({ media_type: 'image', width: 1920, height: 1080 }, 'home.hero.video'),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_PLACEMENT_TYPE_INVALID');
  assert.throws(() => assertMediaAssetPlacement({ media_type: 'video', width: 1920, height: 1080 }, 'news.hero.video'),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_POSTER_REQUIRED');
  assert.throws(() => assertMediaAssetPlacement(
    { media_type: 'video', width: 1920, height: 1080, poster_asset_id: 'poster-1', autoplay: true }, 'home.hero.video'),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_PLAYBACK_INVALID');
  assert.throws(() => assertMediaAssetPlacement({ media_type: 'image', width: 1920, height: 1080 }, 'not.a.real.placement'),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_PLACEMENT_INVALID');
});

test('an undersized asset produces a quality notice instead of a rejection', () => {
  // 竖屏 1080×1920 传进要求 1280×720 的位置：不拦截，但要提示。
  const notice = mediaPlacementQualityNotice({ width: 1080, height: 1920 }, 'news.video_share.list');
  assert.match(notice, /建议 1280×720/);
  assert.match(notice, /当前 1080×1920/);

  // 达标 → 无提示。
  assert.equal(mediaPlacementQualityNotice({ width: 1280, height: 720 }, 'news.video_share.list'), null);
  assert.equal(mediaPlacementQualityNotice({ width: 1920, height: 1080 }, 'home.hero.poster'), null);

  // 无尺寸要求的位置 → 无提示。
  assert.equal(mediaPlacementQualityNotice({ width: 1, height: 1 }, 'product.document'), null);
  // 尺寸缺失 → 不臆造提示。
  assert.equal(mediaPlacementQualityNotice({}, 'news.video_share.list'), null);
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

test('media asset records accept CJK filenames whose full-width punctuation is NFKC-folded', () => {
  // Regression: the recorded name went through NFKC (，→ ,) but the file's name was
  // compared raw, so an asset named 假期收官，全线启动.mp4 could be uploaded yet never
  // transitioned — it stayed permanently stuck in draft. Both sides now fold alike.
  const name = '假期收官，全线启动.mp4';
  const input = {
    file_id: 'file-cjk', original_file_name: name, mime_type: 'video/mp4', byte_size: 12_091_627,
    usage_scope: 'article', copyright_status: 'owned', media_type: 'video', width: 1280, height: 720,
    placement_key: 'news.video_share.list'
  };
  const file = { id: 'file-cjk', filename_download: name, type: 'video/mp4', filesize: 12_091_627 };

  assert.notEqual(name, name.normalize('NFKC'), 'the fixture must actually exercise NFKC folding');
  assert.doesNotThrow(() => assertMediaAssetRecord(input, file));

  // A genuinely different name must still be rejected.
  assert.throws(() => assertMediaAssetRecord({ ...input, original_file_name: 'other.mp4' }, file),
    (error) => error instanceof MediaAssetGovernanceError && error.code === 'MEDIA_FILE_METADATA_MISMATCH');
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
test('dynamic news cover accepts any size but warns when below the recommendation', () => {
  const image = { media_type: 'image', width: 1600, height: 900, byte_size: 100000 };
  assert.doesNotThrow(() => assertMediaAssetPlacement(image, 'news.dynamic_news.cover'));
  // 偏小的封面不再被拒——只在工作台给出画质提示。
  assert.doesNotThrow(() => assertMediaAssetPlacement({ ...image, width: 800 }, 'news.dynamic_news.cover'));
  assert.match(mediaPlacementQualityNotice({ ...image, width: 800 }, 'news.dynamic_news.cover'), /建议 1600×900/);
  assert.equal(mediaPlacementQualityNotice(image, 'news.dynamic_news.cover'), null);
});
