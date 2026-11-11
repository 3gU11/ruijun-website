// 封面（poster）是视频素材的可选展示项。它不参与发布门禁：官网在封面缺失或
// 尚未发布时回退到视频首帧。因此发布后的视频也必须能单独补充/替换封面，而
// 不能因此退回草稿（那会让已上线视频从官网消失）。本模块只做纯校验与日志，
// 数据库读写留在 endpoint 扩展里。

const posterPlacementByVideo = Object.freeze({
  'home.hero.video': 'home.hero.poster',
  'service.tutorial.video': 'service.tutorial.poster'
});

export class MediaPosterError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'MediaPosterError';
    this.code = code;
  }
}

function text(value) {
  return typeof value === 'string' ? value.normalize('NFKC').trim() : '';
}

function assetId(value) {
  if (Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return String(Math.trunc(value));
  const id = text(value);
  return /^[1-9]\d*$/.test(id) ? id : '';
}

function isImageAsset(asset) {
  const mediaType = text(asset?.media_type).toLowerCase();
  const mimeType = text(asset?.mime_type).toLowerCase();
  return mediaType === 'image' || mimeType.startsWith('image/');
}

function activityLog(value) {
  let entries = value;
  if (typeof entries === 'string') {
    try { entries = JSON.parse(entries); } catch { entries = []; }
  }
  return Array.isArray(entries) ? entries.filter((entry) => entry && typeof entry === 'object').slice(-199) : [];
}

export function posterPlacementForVideo(placementKey) {
  return posterPlacementByVideo[text(placementKey)] || '';
}

// 返回人类可读的问题描述，空字符串表示可以接受。
export function mediaPosterIssue({ asset, poster, posterAssetId } = {}) {
  if (!asset || typeof asset !== 'object') return '找不到要修改的媒体素材';
  if (text(asset.media_type).toLowerCase() !== 'video') return '只有视频素材可以单独设置封面';
  const nextId = assetId(posterAssetId);
  if (!nextId) return '';
  if (!poster) return '选择的封面素材不存在';
  if (String(poster.id) === String(asset.id)) return '封面不能指向视频素材本身';
  if (!isImageAsset(poster)) return '封面必须是图片素材';
  const dedicated = posterPlacementForVideo(asset.placement_key);
  if (dedicated && text(poster.placement_key) !== dedicated) return `该展示位的封面必须来自「${dedicated}」`;
  if (!dedicated && text(poster.usage_scope) !== text(asset.usage_scope)) return '封面素材的用途范围必须与视频一致';
  return '';
}

// 只返回需要写入的字段：poster_asset_id + 审计日志。绝不触碰
// status / publication_state / published_at，因此已发布视频不会因为补封面而下线。
export function resolveMediaPosterAssignment({ asset, poster = null, posterAssetId = '', actorId = '', now = new Date() } = {}) {
  const issue = mediaPosterIssue({ asset, poster, posterAssetId });
  if (issue) throw new MediaPosterError('MEDIA_POSTER_INVALID', issue);
  const timestamp = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(timestamp.getTime())) throw new TypeError('now must be a valid Date');

  const nextId = assetId(posterAssetId) || null;
  const previousId = assetId(asset?.poster_asset_id) || null;
  if (nextId === previousId) {
    return { poster_asset_id: nextId, changed: false, publication_log: asset?.publication_log ?? [] };
  }
  return {
    poster_asset_id: nextId,
    changed: true,
    publication_log: [...activityLog(asset?.publication_log), {
      action: 'poster_updated',
      actor: text(actorId),
      at: timestamp.toISOString(),
      changed_fields: ['poster_asset_id'],
      from: previousId,
      to: nextId
    }]
  };
}
