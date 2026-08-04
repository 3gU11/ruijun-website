import { createCmsNavigationReader } from '../../../services/cms-navigation-reader.mjs';
import { registerCmsPublicCache } from '../../../services/cms-public-cache-registry.mjs';
const readers = new Map<string, ReturnType<typeof createCmsNavigationReader>>();
registerCmsPublicCache('navigation', () => readers.clear());
export default defineEventHandler(async (event) => { const config = useRuntimeConfig(event); const endpoint = String(config.cmsSiteSettingsUrl || ''); const accessToken = String(config.cmsBffToken || ''); const ttl = Number(config.cmsPublicContentCacheTtlMs || 30_000); const key = `${endpoint}:${Boolean(accessToken)}:${ttl}`; let reader = readers.get(key); if (!reader) { reader = createCmsNavigationReader({ endpoint, accessToken, cacheTtlMs: ttl }); readers.set(key, reader); } return reader.get(); });
