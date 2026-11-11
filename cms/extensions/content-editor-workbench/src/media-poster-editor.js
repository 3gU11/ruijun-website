import { videoPosterAssets } from './video-poster-assets.js';

// 已登记视频的封面选项与状态提示。上传表单和素材清单共用同一套规则：
// 已发布图片照常可选，草稿封面只在登录后的内部预览里出现。
export function mediaPosterOptionsFor(asset, { publishedAssets = [], candidates = [] } = {}) {
  return videoPosterAssets({
    placementKey: asset?.placement_key,
    usageScope: asset?.usage_scope,
    publishedAssets,
    candidates
  });
}

export function mediaPosterHintFor(asset, candidates = []) {
  const posterId = String(asset?.poster_asset_id || '');
  if (!posterId) return '未设置封面：官网显示视频首帧，可随时补充。';
  const poster = (Array.isArray(candidates) ? candidates : []).find((item) => String(item.id) === posterId);
  const published = poster?.status === 'published' && poster?.publication_state === 'published';
  return published ? '封面已发布，官网直接使用。' : '封面尚未发布：官网暂用视频首帧，封面发布后自动生效。';
}
