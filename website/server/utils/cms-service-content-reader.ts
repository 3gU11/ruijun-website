import { createCmsServiceContentReader } from '../services/cms-service-content-reader.mjs';
import { registerCmsPublicCache } from '../services/cms-public-cache-registry.mjs';

const readers = new Map<string, ReturnType<typeof createCmsServiceContentReader>>();
registerCmsPublicCache('serviceContent', () => readers.clear());

export function useCmsServiceContentReader(config: ReturnType<typeof useRuntimeConfig>) {
  const resourcesEndpoint = String(config.cmsServiceResourcesUrl || '');
  const locationsEndpoint = String(config.cmsServiceLocationsUrl || '');
  const knowledgeEndpoint = String(config.cmsKnowledgeItemsUrl || '');
  const mediaAssetsEndpoint = String(config.cmsMediaAssetsUrl || '');
  const publicAssetBaseUrl = String(config.cmsPublicAssetBaseUrl || '');
  const accessToken = String(config.cmsBffToken || '');
  const cacheTtlMs = Number(config.cmsPublicContentCacheTtlMs || 30_000);
  const key = `${resourcesEndpoint}:${locationsEndpoint}:${knowledgeEndpoint}:${mediaAssetsEndpoint}:${publicAssetBaseUrl}:${Boolean(accessToken)}:${cacheTtlMs}`;
  let reader = readers.get(key);
  if (!reader) {
    reader = createCmsServiceContentReader({ resourcesEndpoint, locationsEndpoint, knowledgeEndpoint, mediaAssetsEndpoint, publicAssetBaseUrl, accessToken, cacheTtlMs });
    readers.set(key, reader);
  }
  return reader;
}
