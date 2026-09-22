import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { collectPreviewMediaAssetIds, decoratePreviewMedia, previewMediaPath } from '../server/services/cms-preview-media.mjs';

test('draft-preview media paths remain same-origin and require the preview session proxy', () => {
  const preview = decoratePreviewMedia({
    sections: [{ id: 'hero', hero_video_asset_id: '49' }, { id: 'core-equipment', media: [{ media_asset_id: '50', role: '' }] }],
    configuration: { drawings: [{ media_asset_id: '27', caption: 'FL1610 尺寸参数图' }] }
  });
  assert.equal(preview.sections[0].hero_video_asset_id, '49');
  assert.equal(preview.sections[0].hero_video_asset_url, '/api/preview/media/49');
  assert.equal(preview.sections[1].media[0].path, '/api/preview/media/50');
  assert.equal(preview.sections[1].media[0].managed, true);
  assert.equal(preview.configuration.drawings[0].path, '/api/preview/media/27');
  assert.deepEqual([...collectPreviewMediaAssetIds(preview)], ['49', '50', '27']);
  assert.equal(previewMediaPath('not-an-id'), '');
});
test('product series cover assets become protected preview paths', async () => {
  const { decoratePreviewMedia } = await import('../server/services/cms-preview-media.mjs');
  const result = decoratePreviewMedia({ cover_asset: 123 });
  assert.equal(result.cover_asset, '/api/preview/media/123');
});

test('service resource scalar attachments are authorized and decorated as protected preview paths', () => {
  const preview = decoratePreviewMedia({
    asset: '97', cover_asset: 98, title: '服务资料'
  });
  assert.equal(preview.asset, '/api/preview/media/97');
  assert.equal(preview.cover_asset, '/api/preview/media/98');
  // The proxy URL is intentionally not itself an asset ID. Keep the opaque
  // identity alongside it so a subsequent live-preview message can renew the
  // preview-session allow-list without exposing a Directus file URL.
  assert.equal(preview.asset_media_asset_id, '97');
  assert.equal(preview.cover_media_asset_id, '98');
  assert.deepEqual([...collectPreviewMediaAssetIds(preview)], ['97', '98']);
});

test('preview media endpoint authorizes asset access against the opaque preview session', async () => {
  const source = await readFile(new URL('../server/api/preview/media/[assetId].get.ts', import.meta.url), 'utf8');
  assert.match(source, /CMS_PREVIEW_SESSION_COOKIE/);
  assert.match(source, /collectPreviewMediaAssetIds\(session\.data\.preview\)/);
  assert.match(source, /Authorization: `Bearer \$\{token\}`/);
  assert.match(source, /private, no-store/);
  assert.match(source, /Readable\.fromWeb/);
});
