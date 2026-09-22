import { invalidateContentCache } from '../../../content-workflow/content-cache-invalidation.mjs';

export const cacheInvalidationCollections = Object.freeze([
  'pages', 'product_series', 'product_models', 'product_parameters', 'articles', 'manufacturing_evidence',
  'qualifications', 'milestones', 'service_resources', 'service_locations', 'knowledge_items',
  'external_service_entries', 'media_assets', 'site_settings'
]);

export function registerContentCacheInvalidationHook({ action, filter, env = process.env, fetchImpl = fetch, logger = console } = {}) {
  if (typeof action !== 'function') throw new TypeError('action is required');
  for (const collection of cacheInvalidationCollections) {
    for (const verb of ['create', 'update', 'delete']) {
      const event = `${collection}.items.${verb}`;
      const invalidate = async (meta = {}) => {
        const outcome = await invalidateContentCache({ endpoint: env?.WEBSITE_CACHE_INVALIDATION_URL, secret: env?.CMS_WEBHOOK_SECRET, collection, keys: meta.keys, fetchImpl, timeoutMs: env?.CONTENT_CACHE_INVALIDATION_TIMEOUT_MS });
        if (outcome.status === 'failed') logger.warn?.(`[cms-cache] ${collection}.${verb} cache invalidation failed: ${outcome.error}`);
        return outcome;
      };
      action(event, invalidate);
      // Directus actions can be dispatched after the mutation response. A
      // pre-mutation filter closes the window where a public reader can cache
      // the old snapshot between the write and the action callback.
      if (typeof filter === 'function') {
        filter(event, async (payload, meta = {}) => {
          await invalidate(meta);
          return payload;
        });
      }
    }
  }
}

export default registerContentCacheInvalidationHook;
