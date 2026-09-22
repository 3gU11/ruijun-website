import { filterPreviewStagingMediaAssets } from './visual-media-staging.js';

function isMediaType(asset, type) {
  const mediaType = String(asset?.media_type || '').toLowerCase();
  const mimeType = String(asset?.mime_type || '').toLowerCase();
  return mediaType === type || mimeType.startsWith(`${type}/`);
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

/**
 * Returns media that can be attached to an editorial draft. Public assets are
 * available as usual. A video-share draft may additionally use its own
 * private staging video inside the authenticated Nuxt preview, without making
 * that asset visible on the public news page.
 */
export function editorialMediaAssets({ category, publishedAssets, candidates }) {
  const expectedType = category === 'video' ? 'video' : 'image';
  const published = (Array.isArray(publishedAssets) ? publishedAssets : [])
    .filter((asset) => isMediaType(asset, expectedType));

  if (category === 'news') {
    const staging = filterPreviewStagingMediaAssets(candidates, {
      scope: 'article',
      placementKey: 'news.dynamic_news.cover',
      elementType: 'image',
      pageKey: 'news',
      sectionKey: 'dynamic-news'
    });
    return uniqueById([...published, ...staging]);
  }

  if (category !== 'video') return uniqueById(published);

  const staging = filterPreviewStagingMediaAssets(candidates, {
    scope: 'article',
    placementKey: 'news.video_share.list',
    elementType: 'video',
    pageKey: 'news',
    sectionKey: 'video-sharing'
  });
  return uniqueById([...published, ...staging]);
}

export function isEditorialMediaAssetAllowed(assetId, options) {
  return editorialMediaAssets(options).some((asset) => String(asset.id) === String(assetId));
}
