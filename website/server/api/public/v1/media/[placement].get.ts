import { createCmsMediaPlacementReader } from '../../../../services/cms-media-asset-resolver.mjs';
import { registerCmsPublicCache } from '../../../../services/cms-public-cache-registry.mjs';

const readers = new Map<string, ReturnType<typeof createCmsMediaPlacementReader>>();
registerCmsPublicCache('media-placements', () => readers.clear());

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const placement = String(getRouterParam(event, 'placement') || '');
  const key = `${config.cmsMediaAssetsUrl}:${config.cmsPublicAssetBaseUrl}`;
  let reader = readers.get(key);
  if (!reader) {
    reader = createCmsMediaPlacementReader({ endpoint: String(config.cmsMediaAssetsUrl || ''), publicAssetBaseUrl: String(config.cmsPublicAssetBaseUrl || ''), accessToken: String(config.cmsBffToken || ''), cacheTtlMs: Number(config.cmsPublicContentCacheTtlMs || 30_000) });
    readers.set(key, reader);
  }
  return reader.get(placement);
});
