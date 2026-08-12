const serviceRoutes = Object.freeze([
  ['support', '/service'],
  ['request', '/repair/new'],
  ['warranty', '/repair/warranty'],
  ['requests', '/repair/requests']
]);

function normalizedBaseUrl(value) {
  const url = new URL(String(value || '').trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('repairSystemBaseUrl must use http or https');
  return url.toString().replace(/\/$/, '');
}

export function buildServiceEntryDrafts(repairSystemBaseUrl) {
  const baseUrl = normalizedBaseUrl(repairSystemBaseUrl);
  return serviceRoutes.map(([entryType, route]) => ({
    entry_type: entryType,
    url: `${baseUrl}${route}`,
    enabled: false,
    open_mode: 'new_tab',
    fallback_phone: '150 5016 6844',
    health_status: 'pending',
    status: 'draft',
    publication_state: 'unpublished',
    source_url: null,
    source_document: 'demo/site-config.js',
    review_note: '正式售后域名、入口负责人和人工兜底已确认后，方可启用并发布。'
  }));
}

export function createDirectusServiceEntrySeeder({ baseUrl, accessToken, repairSystemBaseUrl, fetchImpl = fetch }) {
  if (!baseUrl || !accessToken) throw new TypeError('baseUrl and accessToken are required');
  const collectionUrl = new URL('items/external_service_entries', `${baseUrl.replace(/\/$/, '')}/`);
  const headers = { Accept: 'application/json', Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  async function upsert(entry) {
    const lookupUrl = new URL(collectionUrl);
    lookupUrl.searchParams.set('filter[entry_type][_eq]', entry.entry_type);
    lookupUrl.searchParams.set('limit', '1');
    lookupUrl.searchParams.set('fields', 'id');
    const lookupResponse = await fetchImpl(lookupUrl, { method: 'GET', headers });
    if (!lookupResponse.ok) throw new Error(`Unable to query service entry ${entry.entry_type}: ${lookupResponse.status}`);
    const lookup = await lookupResponse.json();
    const existingId = Array.isArray(lookup?.data) ? lookup.data[0]?.id : null;
    const writeUrl = existingId ? new URL(`${collectionUrl.pathname}/${existingId}`, `${baseUrl.replace(/\/$/, '')}/`) : collectionUrl;
    const writeResponse = await fetchImpl(writeUrl, { method: existingId ? 'PATCH' : 'POST', headers, body: JSON.stringify(entry) });
    if (!writeResponse.ok) throw new Error(`Unable to write service entry ${entry.entry_type}: ${writeResponse.status}`);
    return existingId ? 'updated' : 'created';
  }

  return {
    async seed() {
      const result = { created: 0, updated: 0 };
      for (const entry of buildServiceEntryDrafts(repairSystemBaseUrl)) result[await upsert(entry)] += 1;
      return result;
    }
  };
}
