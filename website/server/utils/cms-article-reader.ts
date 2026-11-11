import { createCmsArticleReader } from '../services/cms-article-reader.mjs';
import { registerCmsPublicCache } from '../services/cms-public-cache-registry.mjs';

const readers = new Map<string, ReturnType<typeof createCmsArticleReader>>();
registerCmsPublicCache('articles', () => readers.clear());

export function useCmsArticleReader(config: ReturnType<typeof useRuntimeConfig>) {
  // Mirror the pages reader: Nuxt runtime config can be stale when the dev server
  // starts before .env.local is updated, so fall back to the current process env.
  // Without this the endpoint stayed empty and every article list/detail silently
  // served the static fallback, hiding published video shares from the site.
  const endpoint = String(config.cmsArticlesUrl || process.env.NUXT_CMS_ARTICLES_URL || process.env.CMS_ARTICLES_URL || '');
  const mediaAssetsEndpoint = String(config.cmsMediaAssetsUrl || process.env.CMS_MEDIA_ASSETS_URL || '');
  const publicAssetBaseUrl = String(config.cmsPublicAssetBaseUrl || process.env.CMS_PUBLIC_ASSET_BASE_URL || '');
  const accessToken = String(config.cmsBffToken || process.env.CMS_PUBLIC_API_TOKEN || process.env.CMS_PREVIEW_ACCESS_TOKEN || process.env.NUXT_CMS_BFF_TOKEN || process.env.CMS_BFF_TOKEN || '');
  const cacheTtlMs = Number(config.cmsPublicArticleCacheTtlMs ?? config.cmsPublicContentCacheTtlMs ?? 0);
  const key = `${endpoint}:${mediaAssetsEndpoint}:${publicAssetBaseUrl}:${Boolean(accessToken)}:${cacheTtlMs}`;
  let reader = readers.get(key);
  if (!reader) {
    reader = createCmsArticleReader({ endpoint, mediaAssetsEndpoint, publicAssetBaseUrl, accessToken, cacheTtlMs });
    readers.set(key, reader);
  }
  return reader;
}
