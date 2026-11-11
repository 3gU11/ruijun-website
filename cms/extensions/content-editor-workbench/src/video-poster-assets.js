function isImage(asset) {
  return asset?.media_type === 'image' || String(asset?.mime_type || '').startsWith('image/');
}

function isPublished(asset) {
  return asset?.status === 'published' && asset?.publication_state === 'published';
}

function uniqueById(assets) {
  const known = new Set();
  return assets.filter((asset) => {
    const id = String(asset?.id || '');
    if (!id || known.has(id)) return false;
    known.add(id);
    return true;
  });
}

const dedicatedPosterPlacementByVideo = Object.freeze({
  'home.hero.video': 'home.hero.poster',
  'service.tutorial.video': 'service.tutorial.poster'
});

// 封面是可选展示项：已发布图片照常可选；刚上传、尚未发布的封面也允许选，
// 但只在登录后的内部预览里出现——官网要等封面发布后才替换视频首帧。
// 有专属海报位的展示位（首页首屏、服务教学）继续按专属位筛选；其余展示位
// 用「与视频相同用途范围」约束，避免把无关图片挂成封面。
export function videoPosterAssets({ placementKey, usageScope = '', publishedAssets, candidates }) {
  const dedicatedPosterPlacement = dedicatedPosterPlacementByVideo[String(placementKey || '')];
  const publishedImages = (Array.isArray(publishedAssets) ? publishedAssets : []).filter((asset) => (
    isImage(asset)
    && isPublished(asset)
    && (!dedicatedPosterPlacement || asset?.placement_key === dedicatedPosterPlacement)
  ));

  const privatePosters = (Array.isArray(candidates) ? candidates : []).filter((asset) => {
    if (!isImage(asset) || isPublished(asset)) return false;
    if (String(asset?.status || '') !== 'draft') return false;
    if (dedicatedPosterPlacement) return asset?.placement_key === dedicatedPosterPlacement;
    return !usageScope || String(asset?.usage_scope || '') === String(usageScope);
  });

  return uniqueById([...publishedImages, ...privatePosters]);
}
