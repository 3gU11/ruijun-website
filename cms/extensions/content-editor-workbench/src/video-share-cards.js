// Video sharing is media-first: a published video asset is the card. There is
// no article for a video share, and no image/video mixing with dynamic news.

export const VIDEO_SHARE_PLACEMENT_KEY = 'news.video_share.list';
export const VIDEO_SHARE_PAGE_KEY = 'news';
export const VIDEO_SHARE_SECTION_KEY = 'video-sharing';
export const VIDEO_SHARE_MAX_BYTES = 500 * 1024 * 1024;
export const VIDEO_SHARE_COPYRIGHT_STATUSES = Object.freeze(['owned', 'licensed', 'authorized', 'pending_review']);
const VIDEO_FILE_TYPES = new Set(['video/mp4', 'video/webm']);
const VIDEO_FILE_EXTENSIONS = new Set(['mp4', 'webm']);
const VIDEO_FILE_EXTENSION_MIME = Object.freeze({ mp4: 'video/mp4', webm: 'video/webm' });

function text(value, maximum = 10000) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).slice(0, maximum);
  return typeof value === 'string' ? value.normalize('NFKC').trim().slice(0, maximum) : '';
}

export function isVideoAsset(asset) {
  const mediaType = text(asset?.media_type, 40).toLowerCase();
  const mimeType = text(asset?.mime_type, 120).toLowerCase();
  return mediaType === 'video' || mimeType.startsWith('video/');
}

export function formatVideoShareDate(value) {
  const source = text(value, 80);
  if (!source) return '';
  const dateOnly = source.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateOnly) return '';
  const [, year, month, day] = dateOnly;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (parsed.getUTCFullYear() !== Number(year) || parsed.getUTCMonth() !== Number(month) - 1 || parsed.getUTCDate() !== Number(day)) return '';
  return `${year}-${month}-${day}`;
}

function compareCards(left, right) {
  const leftTime = Date.parse(left.date || '') || 0;
  const rightTime = Date.parse(right.date || '') || 0;
  if (rightTime !== leftTime) return rightTime - leftTime;
  if (left.sort_order !== right.sort_order) return left.sort_order - right.sort_order;
  return String(right.key).localeCompare(String(left.key), 'en');
}

export function buildVideoShareCards({ mediaAssets = [] } = {}) {
  return (Array.isArray(mediaAssets) ? mediaAssets : [])
    .filter((asset) => asset
      && isVideoAsset(asset)
      && text(asset.placement_key, 120) === VIDEO_SHARE_PLACEMENT_KEY)
    .map((asset) => {
      const id = text(asset.id, 128);
      return {
        key: `media-${id}`,
        mediaAssetId: id,
        mediaAsset: asset,
        title: text(asset.title, 240) || text(asset.original_file_name, 240) || '视频分享',
        date: formatVideoShareDate(asset.published_at),
        sort_order: Number.isFinite(Number(asset.sort_order)) ? Number(asset.sort_order) : 0,
        status: text(asset.status, 40) || 'published',
        publication_state: text(asset.publication_state, 40) || '',
        videoFileId: text(asset.file_id, 128),
        posterAssetId: text(asset.poster_asset_id, 128)
      };
    })
    .sort(compareCards);
}

export function canEditVideoShareCard(card) {
  return Boolean(card?.mediaAssetId);
}

export function newVideoShareEditor() {
  return {
    mode: 'create',
    mediaAssetId: '',
    source: 'file',
    file: null,
    fileLabel: '',
    localPreviewUrl: '',
    title: '',
    sort_order: 0,
    transcript: '',
    copyright_status: 'owned',
    alt_text: '',
    description: '',
    poster_asset_id: '',
    autoplay: false,
    muted: true,
    loop: false,
    authorization_note: '',
    enabled: true,
    save_name: ''
  };
}

export function videoShareEditorFromCard(card) {
  const media = card?.mediaAsset || {};
  return {
    mode: 'edit',
    mediaAssetId: text(card?.mediaAssetId, 128),
    source: 'existing',
    file: null,
    fileLabel: text(media.original_file_name, 500),
    localPreviewUrl: '',
    title: text(card?.title, 240) || text(media.title, 240) || text(media.original_file_name, 240) || '视频分享',
    sort_order: Number.isFinite(Number(card?.sort_order)) ? Number(card.sort_order) : 0,
    transcript: text(media.transcript, 30000),
    copyright_status: VIDEO_SHARE_COPYRIGHT_STATUSES.includes(text(media.copyright_status, 40)) ? text(media.copyright_status, 40) : 'owned',
    alt_text: text(media.alt_text, 300),
    description: text(media.description, 2000),
    poster_asset_id: text(media.poster_asset_id, 128),
    autoplay: media.autoplay === true,
    muted: media.muted !== false,
    loop: media.loop === true,
    authorization_note: text(media.authorization_note, 2000),
    enabled: media.enabled !== false,
    save_name: ''
  };
}

export function applyVideoAssetToEditor(editor, asset) {
  const next = { ...editor };
  next.source = 'existing';
  next.mediaAssetId = text(asset?.id, 128);
  next.file = null;
  next.fileLabel = text(asset?.original_file_name, 500);
  next.title = text(next.title, 240) || text(asset?.title, 240) || text(asset?.original_file_name, 240);
  const assetSortOrder = Number(asset?.sort_order);
  if (!Number.isFinite(Number(next.sort_order)) || Number(next.sort_order) === 0) {
    next.sort_order = Number.isFinite(assetSortOrder) ? assetSortOrder : next.sort_order;
  }
  next.transcript = text(asset?.transcript, 30000);
  next.copyright_status = VIDEO_SHARE_COPYRIGHT_STATUSES.includes(text(asset?.copyright_status, 40)) ? text(asset.copyright_status, 40) : next.copyright_status;
  next.alt_text = text(asset?.alt_text, 300);
  next.description = text(asset?.description, 2000);
  next.poster_asset_id = text(asset?.poster_asset_id, 128);
  next.autoplay = asset?.autoplay === true;
  next.muted = asset?.muted !== false;
  next.loop = asset?.loop === true;
  next.authorization_note = text(asset?.authorization_note, 2000);
  next.enabled = asset?.enabled !== false;
  return next;
}

export function validateVideoShareFile(file) {
  if (!file) return '请选择视频文件。';
  const mime = text(file.type, 120).toLowerCase();
  const extension = text(file.name, 500).toLowerCase().split('.').pop();
  const expectedMime = VIDEO_FILE_EXTENSION_MIME[extension];
  if (!expectedMime || !VIDEO_FILE_EXTENSIONS.has(extension)) return '仅支持 MP4 或 WebM 视频文件。';
  // Some Windows/browser combinations leave File.type empty or report
  // application/octet-stream for an otherwise valid .mp4. The extension is
  // authoritative here; the upload uses the normalized MIME below.
  if (mime && mime !== expectedMime) return '仅支持 MP4 或 WebM 视频文件。';
  const size = Number(file.size);
  if (!Number.isFinite(size) || size < 1) return '不能上传空文件。';
  if (size > VIDEO_SHARE_MAX_BYTES) return '视频文件超过 500 MB 的上限。';
  return '';
}

export function normalizedVideoMime(file) {
  const mime = text(file?.type, 120).toLowerCase();
  if (VIDEO_FILE_TYPES.has(mime)) return mime;
  const fileName = text(file?.name, 500) || text(file?.filename_download, 500);
  const extension = fileName.toLowerCase().split('.').pop();
  return VIDEO_FILE_EXTENSION_MIME[extension] || mime;
}

export function validateVideoShareEditor(editor) {
  if (!editor) return '视频分享内容不可用，请重新打开。';
  if (editor.source === 'file' && !editor.mediaAssetId) {
    const fileError = validateVideoShareFile(editor.file);
    if (fileError) return fileError;
  }
  if (editor.source === 'existing' && !text(editor.mediaAssetId, 128)) return '请选择系统里已有的视频素材。';
  if (!text(editor.title, 240)) return '请填写视频卡片标题。';
  if (!VIDEO_SHARE_COPYRIGHT_STATUSES.includes(text(editor.copyright_status, 40))) return '请选择有效的版权状态。';
  return '';
}

export function videoShareMediaCreatePayload({ editor, file, metadata = {} } = {}) {
  const width = positiveInteger(metadata.width) || positiveInteger(file?.width) || 1280;
  const height = positiveInteger(metadata.height) || positiveInteger(file?.height) || 720;
  const duration = Number(metadata.duration_seconds ?? file?.duration);
  const aspectRatio = text(metadata.aspect_ratio, 40) || aspectRatioFor(width, height);
  return {
    file_id: text(file?.id, 128),
    original_file_name: text(file?.filename_download, 500),
    mime_type: normalizedVideoMime(file) || text(file?.type, 120),
    byte_size: Number(file?.filesize),
    usage_scope: 'article',
    media_type: 'video',
    width,
    height,
    duration_seconds: Number.isFinite(duration) && duration > 0 ? Math.ceil(duration) : null,
    aspect_ratio: aspectRatio,
    poster_asset_id: text(editor?.poster_asset_id, 128) || null,
    placement_key: VIDEO_SHARE_PLACEMENT_KEY,
    page_key: VIDEO_SHARE_PAGE_KEY,
    section_key: VIDEO_SHARE_SECTION_KEY,
    sort_order: Number(editor?.sort_order) || 0,
    enabled: editor?.enabled !== false,
    autoplay: editor?.autoplay === true,
    muted: editor?.muted !== false,
    loop: editor?.loop === true,
    title: text(editor?.title, 240) || text(file?.filename_download, 240),
    description: text(editor?.description, 2000) || null,
    transcript: text(editor?.transcript, 30000) || null,
    alt_text: text(editor?.alt_text, 300) || null,
    copyright_status: text(editor?.copyright_status, 40) || 'owned',
    authorization_note: text(editor?.authorization_note, 2000) || null,
    // Media assets are published on upload; the server enforces this too.
    status: 'published',
    publication_state: 'published'
  };
}

export function videoShareMediaUpdatePayload(editor, extra = {}) {
  return {
    title: text(editor?.title, 240) || null,
    description: text(editor?.description, 2000) || null,
    transcript: text(editor?.transcript, 30000) || null,
    alt_text: text(editor?.alt_text, 300) || null,
    copyright_status: text(editor?.copyright_status, 40) || 'owned',
    authorization_note: text(editor?.authorization_note, 2000) || null,
    poster_asset_id: text(editor?.poster_asset_id, 128) || null,
    sort_order: Number(editor?.sort_order) || 0,
    enabled: editor?.enabled !== false,
    autoplay: editor?.autoplay === true,
    muted: editor?.muted !== false,
    loop: editor?.loop === true,
    usage_scope: 'article',
    placement_key: VIDEO_SHARE_PLACEMENT_KEY,
    page_key: VIDEO_SHARE_PAGE_KEY,
    section_key: VIDEO_SHARE_SECTION_KEY,
    ...extra
  };
}

export function videoShareMediaLabel(asset) {
  const title = text(asset?.title, 240) || text(asset?.original_file_name, 500) || `素材 #${text(asset?.id, 128)}`;
  const dimensions = positiveInteger(asset?.width) && positiveInteger(asset?.height) ? `${asset.width}×${asset.height}` : '';
  return [title, text(asset?.original_file_name, 500), dimensions].filter(Boolean).join(' · ');
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
}

function aspectRatioFor(width, height) {
  const w = positiveInteger(width);
  const h = positiveInteger(height);
  if (!w || !h) return '';
  let a = w;
  let b = h;
  while (b) [a, b] = [b, a % b];
  return `${w / a}:${h / a}`;
}
