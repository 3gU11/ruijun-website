import { createCmsProductReader } from '../services/cms-product-reader.mjs';
import { registerCmsPublicCache } from '../services/cms-public-cache-registry.mjs';

const readers = new Map<string, ReturnType<typeof createCmsProductReader>>();
registerCmsPublicCache('products', () => readers.clear());

export function useCmsProductReader(config: ReturnType<typeof useRuntimeConfig>) {
  const seriesEndpoint = String(config.cmsProductSeriesUrl || '');
  const modelsEndpoint = String(config.cmsProductModelsUrl || '');
  const parametersEndpoint = String(config.cmsProductParametersUrl || '');
  const releaseEndpoint = String(config.cmsProductReleasesUrl || '');
  const mediaAssetsEndpoint = String(config.cmsMediaAssetsUrl || '');
  const publicAssetBaseUrl = String(config.cmsPublicAssetBaseUrl || '');
  const accessToken = String(config.cmsBffToken || '');
  const cacheTtlMs = Number(config.cmsPublicContentCacheTtlMs || 30_000);
  const key = `${seriesEndpoint}:${modelsEndpoint}:${parametersEndpoint}:${releaseEndpoint}:${mediaAssetsEndpoint}:${publicAssetBaseUrl}:${Boolean(accessToken)}:${cacheTtlMs}`;
  let reader = readers.get(key);
  if (!reader) {
    reader = createCmsProductReader({ seriesEndpoint, modelsEndpoint, parametersEndpoint, releaseEndpoint, mediaAssetsEndpoint, publicAssetBaseUrl, accessToken, cacheTtlMs });
    readers.set(key, reader);
  }
  return reader;
}
