import { createCmsProductReader } from '../services/cms-product-reader.mjs';
import { registerCmsPublicCache } from '../services/cms-public-cache-registry.mjs';

const readers = new Map<string, ReturnType<typeof createCmsProductReader>>();
registerCmsPublicCache('products', () => readers.clear());

export function useCmsProductReader(config: ReturnType<typeof useRuntimeConfig>) {
  // Same guard as the pages/articles readers: runtime config can be stale when
  // the dev server started before .env.local changed, and an empty endpoint makes
  // the reader silently serve the static catalog instead of CMS content.
  const seriesEndpoint = String(config.cmsProductSeriesUrl || process.env.NUXT_CMS_PRODUCT_SERIES_URL || process.env.CMS_PRODUCT_SERIES_URL || '');
  const modelsEndpoint = String(config.cmsProductModelsUrl || process.env.NUXT_CMS_PRODUCT_MODELS_URL || process.env.CMS_PRODUCT_MODELS_URL || '');
  const parametersEndpoint = String(config.cmsProductParametersUrl || process.env.NUXT_CMS_PRODUCT_PARAMETERS_URL || process.env.CMS_PRODUCT_PARAMETERS_URL || '');
  const releaseEndpoint = String(config.cmsProductReleasesUrl || process.env.CMS_PRODUCT_RELEASES_URL || '');
  const mediaAssetsEndpoint = String(config.cmsMediaAssetsUrl || process.env.CMS_MEDIA_ASSETS_URL || '');
  const publicAssetBaseUrl = String(config.cmsPublicAssetBaseUrl || process.env.CMS_PUBLIC_ASSET_BASE_URL || '');
  const accessToken = String(config.cmsBffToken || process.env.CMS_PUBLIC_API_TOKEN || process.env.CMS_PREVIEW_ACCESS_TOKEN || process.env.NUXT_CMS_BFF_TOKEN || process.env.CMS_BFF_TOKEN || '');
  const cacheTtlMs = Number(config.cmsPublicContentCacheTtlMs || 30_000);
  const key = `${seriesEndpoint}:${modelsEndpoint}:${parametersEndpoint}:${releaseEndpoint}:${mediaAssetsEndpoint}:${publicAssetBaseUrl}:${Boolean(accessToken)}:${cacheTtlMs}`;
  let reader = readers.get(key);
  if (!reader) {
    reader = createCmsProductReader({ seriesEndpoint, modelsEndpoint, parametersEndpoint, releaseEndpoint, mediaAssetsEndpoint, publicAssetBaseUrl, accessToken, cacheTtlMs });
    readers.set(key, reader);
  }
  return reader;
}
