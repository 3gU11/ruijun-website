import { createCmsEvidenceReader } from '../services/cms-evidence-reader.mjs';
import { registerCmsPublicCache } from '../services/cms-public-cache-registry.mjs';

const readers = new Map<string, ReturnType<typeof createCmsEvidenceReader>>();
registerCmsPublicCache('evidence', () => readers.clear());

export function useCmsEvidenceReader(config: ReturnType<typeof useRuntimeConfig>) {
  const milestonesEndpoint = String(config.cmsMilestonesUrl || '');
  const qualificationsEndpoint = String(config.cmsQualificationsUrl || '');
  const manufacturingEvidenceEndpoint = String(config.cmsManufacturingEvidenceUrl || '');
  const mediaAssetsEndpoint = String(config.cmsMediaAssetsUrl || '');
  const publicAssetBaseUrl = String(config.cmsPublicAssetBaseUrl || '');
  const accessToken = String(config.cmsBffToken || '');
  const cacheTtlMs = Number(config.cmsPublicContentCacheTtlMs || 30_000);
  const key = `${milestonesEndpoint}:${qualificationsEndpoint}:${manufacturingEvidenceEndpoint}:${mediaAssetsEndpoint}:${publicAssetBaseUrl}:${Boolean(accessToken)}:${cacheTtlMs}`;
  let reader = readers.get(key);
  if (!reader) {
    reader = createCmsEvidenceReader({ milestonesEndpoint, qualificationsEndpoint, manufacturingEvidenceEndpoint, mediaAssetsEndpoint, publicAssetBaseUrl, accessToken, cacheTtlMs });
    readers.set(key, reader);
  }
  return reader;
}
