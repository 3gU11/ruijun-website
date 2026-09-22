import { createCmsArticleReader } from '../services/cms-article-reader.mjs';
import { registerCmsPublicCache } from '../services/cms-public-cache-registry.mjs';

const readers = new Map<string, ReturnType<typeof createCmsArticleReader>>();
registerCmsPublicCache('articles', () => readers.clear());

export function useCmsArticleReader(config: ReturnType<typeof useRuntimeConfig>) {
  const endpoint = String(config.cmsArticlesUrl || '');
  const mediaAssetsEndpoint = String(config.cmsMediaAssetsUrl || '');
  const publicAssetBaseUrl = String(config.cmsPublicAssetBaseUrl || '');
  const accessToken = String(config.cmsBffToken || '');
  const cacheTtlMs = Number(config.cmsPublicArticleCacheTtlMs ?? config.cmsPublicContentCacheTtlMs ?? 0);
  const key = `${endpoint}:${mediaAssetsEndpoint}:${publicAssetBaseUrl}:${Boolean(accessToken)}:${cacheTtlMs}`;
  let reader = readers.get(key);
  if (!reader) {
    reader = createCmsArticleReader({ endpoint, mediaAssetsEndpoint, publicAssetBaseUrl, accessToken, cacheTtlMs });
    readers.set(key, reader);
  }
  return reader;
}
