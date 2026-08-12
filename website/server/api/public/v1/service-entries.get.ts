import { createError } from 'h3';
import { createCmsServiceEntryReader } from '../../../services/cms-service-entry-reader.mjs';
import { registerCmsPublicCache } from '../../../services/cms-public-cache-registry.mjs';

const serviceRoutes = Object.freeze({
  request: '/repair/new',
  progress: '/requests',
  warranty: '/warranty',
  spareParts: '/spare-parts'
});
const readers = new Map<string, ReturnType<typeof createCmsServiceEntryReader>>();
const healthCache = new Map<string, { checkedAt: number; available: boolean }>();
registerCmsPublicCache('serviceEntries', () => {
  readers.clear();
  healthCache.clear();
});

async function repairsysHealth(url: string) {
  const previous = healthCache.get(url);
  if (previous && Date.now() - previous.checkedAt < 10_000) return previous;
  let available = false;
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(2_000) });
    const body = response.ok ? await response.json() : null;
    available = Boolean(body?.ok);
  } catch {
    // The service links remain usable even when the optional health probe fails.
  }
  const current = { checkedAt: Date.now(), available };
  healthCache.set(url, current);
  return current;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const endpoint = String(config.cmsServiceEntriesUrl || '');
  const accessToken = String(config.cmsBffToken || '');
  const cacheTtlMs = Number(config.cmsPublicContentCacheTtlMs || 30_000);
  const readerKey = `${endpoint}:${Boolean(accessToken)}:${cacheTtlMs}`;
  let reader = readers.get(readerKey);
  if (!reader) {
    reader = createCmsServiceEntryReader({ endpoint, accessToken, cacheTtlMs });
    readers.set(readerKey, reader);
  }
  const health = await repairsysHealth(String(config.repairsysHealthUrl));

  if (endpoint) {
    const result = await reader.list();
    if (result.cache === 'unavailable') {
      throw createError({ statusCode: 503, statusMessage: 'Service entry content is unavailable' });
    }
    const repairBase = String(config.public.repairPortalUrl || config.repairsysPublicBaseUrl || '').replace(/\/$/, '');
    const entries = Object.fromEntries(result.data.map((entry) => {
      const fixedPath = repairBase && serviceRoutes[entry.entry_type as keyof typeof serviceRoutes];
      return [entry.entry_type, fixedPath ? `${repairBase}${fixedPath}` : entry.url];
    }));
    const supportPhone = result.data.find((entry) => entry.fallback_phone)?.fallback_phone || '150 5016 6844';
    return { available: health.available, checkedAt: new Date(health.checkedAt).toISOString(), source: 'cms', cache: result.cache, supportPhone, entries };
  }

  const repairBase = String(config.public.repairPortalUrl || config.repairsysPublicBaseUrl || '').replace(/\/$/, '');
  const entries = repairBase
    ? Object.fromEntries(Object.entries(serviceRoutes).map(([key, path]) => [key, `${repairBase}${path}`]))
    : {};
  return { available: health.available, checkedAt: new Date(health.checkedAt).toISOString(), source: 'official_site', supportPhone: '150 5016 6844', entries };
});
