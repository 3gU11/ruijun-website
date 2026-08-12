import { createCmsRepairPageReader } from '../../../../services/cms-repair-page-reader.mjs';
import { registerCmsPublicCache } from '../../../../services/cms-public-cache-registry.mjs';
import { createError, getRouterParam } from 'h3';

const readers = new Map<string, ReturnType<typeof createCmsRepairPageReader>>();
registerCmsPublicCache('repair_page_configs', () => readers.clear());

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const endpoint = String(config.cmsRepairPageConfigsUrl || '');
  const accessToken = String(config.cmsBffToken || '');
  const cacheTtlMs = Number(config.cmsPublicContentCacheTtlMs || 30_000);
  const key = `${endpoint}:${Boolean(accessToken)}:${cacheTtlMs}`;
  let reader = readers.get(key);
  if (!reader) {
    reader = createCmsRepairPageReader({ endpoint, accessToken, cacheTtlMs });
    readers.set(key, reader);
  }
  const pageKey = String(getRouterParam(event, 'pageKey') || '').trim();
  try { return await reader.get(pageKey); }
  catch (error) { if (error instanceof TypeError) throw createError({ statusCode: 400, statusMessage: 'Invalid repair page key' }); throw error; }
});
