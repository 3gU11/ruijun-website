import { createCmsArticleReader } from '../services/cms-article-reader.mjs';
import { registerCmsPublicCache } from '../services/cms-public-cache-registry.mjs';

const readers = new Map<string, ReturnType<typeof createCmsArticleReader>>();
registerCmsPublicCache('articles', () => readers.clear());

export function useCmsArticleReader(config: ReturnType<typeof useRuntimeConfig>) {
  const endpoint = String(config.cmsArticlesUrl || '');
  const accessToken = String(config.cmsBffToken || '');
  const cacheTtlMs = Number(config.cmsPublicContentCacheTtlMs || 30_000);
  const key = `${endpoint}:${Boolean(accessToken)}:${cacheTtlMs}`;
  let reader = readers.get(key);
  if (!reader) {
    reader = createCmsArticleReader({ endpoint, accessToken, cacheTtlMs });
    readers.set(key, reader);
  }
  return reader;
}
