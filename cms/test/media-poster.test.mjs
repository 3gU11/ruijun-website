import assert from 'node:assert/strict';
import test from 'node:test';

const { MediaPosterError, mediaPosterIssue, posterPlacementForVideo, resolveMediaPosterAssignment } = await import('../content-workflow/media-poster.mjs');
const { registerMediaPosterEndpoint } = await import('../extensions/media-poster-endpoint/src/index.js');
const { mediaPosterHintFor, mediaPosterOptionsFor } = await import('../extensions/content-editor-workbench/src/media-poster-editor.js');

const video = {
  id: 8, media_type: 'video', placement_key: 'news.video_share.list', usage_scope: 'article',
  poster_asset_id: null, publication_log: [], status: 'draft', publication_state: 'unpublished'
};
const cover = {
  id: 9, media_type: 'image', mime_type: 'image/jpeg', placement_key: 'news.article.poster',
  usage_scope: 'article', status: 'draft', publication_state: 'unpublished'
};

test('a draft cover can be attached without touching the video lifecycle', () => {
  const result = resolveMediaPosterAssignment({
    asset: video, poster: cover, posterAssetId: '9', actorId: 'user-1',
    now: new Date('2026-11-03T00:00:00Z')
  });
  assert.equal(result.poster_asset_id, '9');
  assert.equal(result.changed, true);
  assert.equal(result.publication_log.at(-1).action, 'poster_updated');
  assert.equal(result.publication_log.at(-1).from, null);
  assert.equal(result.publication_log.at(-1).to, '9');
  assert.equal(result.publication_log.at(-1).at, '2026-11-03T00:00:00.000Z');
  // 只返回封面字段，绝不携带 status / publication_state。
  assert.deepEqual(Object.keys(result).sort(), ['changed', 'poster_asset_id', 'publication_log']);
});

test('clearing the cover is allowed and reassigning the same cover is a no-op', () => {
  const cleared = resolveMediaPosterAssignment({ asset: { ...video, poster_asset_id: 9 }, poster: null, posterAssetId: '', actorId: 'user-1' });
  assert.equal(cleared.poster_asset_id, null);
  assert.equal(cleared.changed, true);

  const unchanged = resolveMediaPosterAssignment({ asset: { ...video, poster_asset_id: 9 }, poster: cover, posterAssetId: 9, actorId: 'user-1' });
  assert.equal(unchanged.changed, false);
  assert.equal(unchanged.poster_asset_id, '9');
});

test('cover assignment rejects wrong targets and incompatible images', () => {
  assert.equal(mediaPosterIssue({ asset: { ...video, media_type: 'image' }, poster: cover, posterAssetId: '9' }), '只有视频素材可以单独设置封面');
  assert.match(mediaPosterIssue({ asset: video, poster: null, posterAssetId: '9' }), /不存在/);
  assert.match(mediaPosterIssue({ asset: video, poster: { ...cover, id: 8 }, posterAssetId: '8' }), /视频素材本身/);
  assert.match(mediaPosterIssue({ asset: video, poster: { ...cover, media_type: 'video', mime_type: 'video/mp4' }, posterAssetId: '9' }), /图片/);
  assert.match(mediaPosterIssue({ asset: video, poster: { ...cover, usage_scope: 'brand' }, posterAssetId: '9' }), /用途范围/);
  assert.throws(
    () => resolveMediaPosterAssignment({ asset: video, poster: { ...cover, usage_scope: 'brand' }, posterAssetId: '9' }),
    (error) => error instanceof MediaPosterError && error.code === 'MEDIA_POSTER_INVALID'
  );
});

test('placements with a dedicated poster slot only accept that slot', () => {
  assert.equal(posterPlacementForVideo('home.hero.video'), 'home.hero.poster');
  assert.equal(posterPlacementForVideo('service.tutorial.video'), 'service.tutorial.poster');
  assert.equal(posterPlacementForVideo('news.video_share.list'), '');

  const heroVideo = { ...video, placement_key: 'home.hero.video', usage_scope: 'homepage' };
  const newsCover = { ...cover, placement_key: 'news.article.poster', usage_scope: 'homepage' };
  assert.match(mediaPosterIssue({ asset: heroVideo, poster: newsCover, posterAssetId: '9' }), /home\.hero\.poster/);
  assert.equal(mediaPosterIssue({ asset: heroVideo, poster: { ...newsCover, placement_key: 'home.hero.poster' }, posterAssetId: '9' }), '');
});

function fakeContext(rows) {
  const updates = [];
  const database = () => {
    let filter = null;
    const query = {
      where(value) { filter = value; return query; },
      async first() { return rows.find((row) => String(row.id) === String(filter?.id)) || null; },
      async update(patch) {
        updates.push(patch);
        const target = rows.find((row) => String(row.id) === String(filter?.id));
        if (target) Object.assign(target, patch);
        return 1;
      }
    };
    return query;
  };
  return { updates, database };
}

function fakeResponse() {
  return {
    statusCode: 0,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

async function runEndpoint(rows, body, accountability, path = '/') {
  const handlers = new Map();
  const context = fakeContext(rows);
  registerMediaPosterEndpoint({ post: (routePath, fn) => { handlers.set(routePath, fn); } }, { database: context.database });
  const handler = handlers.get(path);
  if (!handler) throw new Error(`missing endpoint handler for ${path}`);
  const response = fakeResponse();
  await handler({ body, accountability }, response, (error) => { throw error; });
  return { response, updates: context.updates };
}

test('poster endpoint changes only the cover and keeps a published video published', async () => {
  const rows = [{ ...video, status: 'published', publication_state: 'published' }, { ...cover }];
  const { response, updates } = await runEndpoint(rows, { media_asset_id: 8, poster_asset_id: 9 }, { user: 'admin-1', admin: true });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.poster_asset_id, '9');
  assert.equal(response.body.data.status, 'published');
  assert.equal(response.body.data.publication_state, 'published');
  assert.deepEqual(Object.keys(updates[0]).sort(), ['poster_asset_id', 'publication_log']);
  assert.equal(rows[0].status, 'published');
  assert.equal(rows[0].publication_state, 'published');
});

test('poster endpoint rejects anonymous accounts and unknown assets', async () => {
  const anon = await runEndpoint([{ ...video }, { ...cover }], { media_asset_id: 8, poster_asset_id: 9 }, null);
  assert.equal(anon.response.statusCode, 403);

  const missing = await runEndpoint([{ ...video }, { ...cover }], { media_asset_id: 404, poster_asset_id: 9 }, { user: 'admin-1', admin: true });
  assert.equal(missing.response.statusCode, 404);
});

test('canvas asset endpoint edits text fields without touching the published lifecycle', async () => {
  const rows = [{ ...video, status: 'published', publication_state: 'published', title: '旧标题', alt_text: null, transcript: null }];
  const { response, updates } = await runEndpoint(rows, {
    media_asset_id: 8, title: '新标题', alt_text: '替代文本', transcript: '字幕'
  }, { user: 'admin-1', admin: true }, '/asset');
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.title, '新标题');
  assert.equal(response.body.data.status, 'published');
  assert.equal(rows[0].title, '新标题');
  assert.equal(rows[0].status, 'published');
  assert.equal(rows[0].publication_state, 'published');
  assert.deepEqual(Object.keys(updates[0]).sort(), ['alt_text', 'publication_log', 'title', 'transcript']);
  assert.match(String(updates[0].publication_log), /content_updated/);
});

test('canvas asset endpoint rejects invalid copyright status', async () => {
  const rows = [{ ...video, status: 'published', publication_state: 'published' }];
  const { response } = await runEndpoint(rows, { media_asset_id: 8, copyright_status: 'unknown' }, { user: 'admin-1', admin: true }, '/asset');
  assert.equal(response.statusCode, 400);
});

test('media list hint explains whether the cover is missing, draft or published', () => {
  assert.match(mediaPosterHintFor({ ...video, poster_asset_id: null }, []), /未设置封面/);
  assert.match(mediaPosterHintFor({ ...video, poster_asset_id: 9 }, [{ ...cover }]), /封面尚未发布/);
  assert.match(mediaPosterHintFor({ ...video, poster_asset_id: 9 }, [{ ...cover, status: 'published', publication_state: 'published' }]), /封面已发布/);
});

test('media list cover options keep published images and matching-scope drafts', () => {
  const options = mediaPosterOptionsFor(video, {
    publishedAssets: [{ id: 1, media_type: 'image', status: 'published', publication_state: 'published' }],
    candidates: [cover, { ...cover, id: 10, usage_scope: 'brand' }]
  });
  assert.deepEqual(options.map((asset) => asset.id), [1, 9]);
});
