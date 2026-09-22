import { createError, getRouterParam } from 'h3';
import { createCmsPageReader } from '../../../../services/cms-page-reader.mjs';
import { registerCmsPublicCache } from '../../../../services/cms-public-cache-registry.mjs';

const readers = new Map<string, ReturnType<typeof createCmsPageReader>>();
registerCmsPublicCache('pages', () => readers.clear());

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const endpoint = String(config.cmsPagesUrl || '');
  const homepageSectionsEndpoint = String(config.cmsHomepageSectionsUrl || '');
  const mediaAssetsEndpoint = String(config.cmsMediaAssetsUrl || '');
  const publicAssetBaseUrl = String(config.cmsPublicAssetBaseUrl || '');
  const accessToken = String(config.cmsBffToken || '');
  const cacheTtlMs = Number(config.cmsPublicContentCacheTtlMs || 30_000);
  const key = `${endpoint}:${homepageSectionsEndpoint}:${mediaAssetsEndpoint}:${publicAssetBaseUrl}:${Boolean(accessToken)}:${cacheTtlMs}`;
  let reader = readers.get(key);
  if (!reader) {
    reader = createCmsPageReader({ endpoint, homepageSectionsEndpoint, mediaAssetsEndpoint, publicAssetBaseUrl, accessToken, cacheTtlMs });
    readers.set(key, reader);
  }
  try {
    return await reader.get(getRouterParam(event, 'slug'));
  } catch (error) {
    if (error instanceof TypeError) throw createError({ statusCode: 400, statusMessage: 'Invalid page slug' });
    throw error;
  }
});
