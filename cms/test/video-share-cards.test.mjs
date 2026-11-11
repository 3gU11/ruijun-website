import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyVideoAssetToEditor,
  buildVideoShareCards,
  canEditVideoShareCard,
  formatVideoShareDate,
  newVideoShareEditor,
  normalizedVideoMime,
  validateVideoShareEditor,
  videoShareEditorFromCard,
  videoShareMediaCreatePayload,
  videoShareMediaUpdatePayload
} from '../extensions/content-editor-workbench/src/video-share-cards.js';

const video = (id, overrides = {}) => ({
  id,
  file_id: `file-${id}`,
  original_file_name: `video-${id}.mp4`,
  mime_type: 'video/mp4',
  media_type: 'video',
  placement_key: 'news.video_share.list',
  page_key: 'news',
  section_key: 'video-sharing',
  title: `视频 ${id}`,
  status: 'published',
  publication_state: 'published',
  published_at: '2026-11-01T08:00:00.000Z',
  copyright_status: 'owned',
  enabled: true,
  ...overrides
});

test('video sharing is built from published video-share media only', () => {
  const cards = buildVideoShareCards({
    mediaAssets: [
      video(12),
      video(13, { placement_key: 'home.hero.video', title: '首页视频' }),
      { id: 7, media_type: 'image', mime_type: 'image/png', placement_key: 'news.video_share.list' }
    ]
  });
  assert.equal(cards.length, 1);
  assert.equal(cards[0].mediaAssetId, '12');
  assert.equal(cards[0].title, '视频 12');
  assert.equal(cards[0].date, '2026-11-01');
  assert.equal(cards[0].videoFileId, 'file-12');
});

test('cards sort by published date then same-day order', () => {
  const cards = buildVideoShareCards({
    mediaAssets: [
      video(21, { published_at: '2026-11-04T00:00:00.000Z', sort_order: 2, title: '同日后排' }),
      video(22, { published_at: '2026-11-04T00:00:00.000Z', sort_order: 0, title: '同日前排' }),
      video(23, { published_at: '2026-11-05T00:00:00.000Z', title: '最新' })
    ]
  });
  assert.deepEqual(cards.map((card) => card.title), ['最新', '同日前排', '同日后排']);
});

test('a video-share card is editable when it has a media asset', () => {
  assert.equal(canEditVideoShareCard({ mediaAssetId: '12' }), true);
  assert.equal(canEditVideoShareCard({ mediaAssetId: '' }), false);
});

test('editing a card keeps its title while adopting the selected video metadata', () => {
  let editor = videoShareEditorFromCard({ mediaAssetId: '12', title: '卡片标题', sort_order: 3, mediaAsset: video(12) });
  assert.equal(editor.title, '卡片标题');
  assert.equal(editor.source, 'existing');
  editor = applyVideoAssetToEditor(editor, video(30, { title: '新视频素材', description: '素材说明', transcript: '新文字稿' }));
  assert.equal(editor.mediaAssetId, '30');
  assert.equal(editor.title, '卡片标题');
  assert.equal(editor.description, '素材说明');
  assert.equal(editor.transcript, '新文字稿');
});

test('new cards get the media title or filename as their card title', () => {
  const editor = applyVideoAssetToEditor(newVideoShareEditor(), video(30, { title: '素材标题' }));
  assert.equal(editor.title, '素材标题');
});

test('validation requires a real local file or an existing video asset', () => {
  const empty = newVideoShareEditor();
  assert.match(validateVideoShareEditor(empty), /请选择视频文件/);
  assert.match(validateVideoShareEditor({ ...empty, source: 'existing' }), /请选择系统里已有的视频素材/);
  assert.match(validateVideoShareEditor({
    ...empty,
    source: 'file',
    file: { name: 'a.mov', type: 'video/quicktime', size: 10 }
  }), /仅支持 MP4 或 WebM/);
  assert.equal(validateVideoShareEditor({
    ...empty,
    source: 'file',
    file: { name: 'a.mp4', type: 'video/mp4', size: 10 },
    title: '标题',
    copyright_status: 'owned'
  }), '');
  // Some browsers report an empty MIME for a valid .mp4; the extension wins.
  assert.equal(validateVideoShareEditor({
    ...empty,
    source: 'file',
    file: { name: 'a.mp4', type: '', size: 10 },
    title: '标题',
    copyright_status: 'owned'
  }), '');
});

test('missing image or zero-length files are rejected by the editor', () => {
  assert.match(validateVideoShareEditor({ ...newVideoShareEditor(), source: 'file', file: { name: 'a.mp4', type: 'video/mp4', size: 0 }, title: '标题' }), /空文件/);
  assert.match(validateVideoShareEditor({ ...newVideoShareEditor(), source: 'file', file: { name: 'a.png', type: 'image/png', size: 10 }, title: '标题' }), /仅支持 MP4 或 WebM/);
});

test('media payloads publish immediately and normalize an empty MIME', () => {
  const editor = {
    ...newVideoShareEditor(),
    source: 'existing',
    mediaAssetId: '12',
    title: '标题',
    copyright_status: 'authorized',
    transcript: '文字稿',
    poster_asset_id: '7',
    autoplay: true,
    muted: true
  };
  const payload = videoShareMediaCreatePayload({
    editor,
    file: { id: 'file-1', filename_download: 'a.mp4', type: '', filesize: 1024 },
    metadata: { width: 1920, height: 1080, duration_seconds: 9.2 }
  });
  assert.equal(payload.placement_key, 'news.video_share.list');
  assert.equal(payload.page_key, 'news');
  assert.equal(payload.section_key, 'video-sharing');
  assert.equal(payload.usage_scope, 'article');
  assert.equal(payload.media_type, 'video');
  assert.equal(payload.mime_type, 'video/mp4');
  assert.equal(payload.status, 'published');
  assert.equal(payload.publication_state, 'published');
  assert.equal(payload.width, 1920);
  assert.equal(payload.duration_seconds, 10);
  const update = videoShareMediaUpdatePayload(editor, { submission_name: '保存名称' });
  assert.equal(update.placement_key, 'news.video_share.list');
  assert.equal(update.submission_name, '保存名称');
  assert.equal(normalizedVideoMime({ name: 'a.webm', type: '' }), 'video/webm');
});

test('date formatting only accepts real calendar dates', () => {
  assert.equal(formatVideoShareDate('2026-11-04T08:00:00.000Z'), '2026-11-04');
  assert.equal(formatVideoShareDate('2026-02-30'), '');
  assert.equal(formatVideoShareDate('not-a-date'), '');
});
