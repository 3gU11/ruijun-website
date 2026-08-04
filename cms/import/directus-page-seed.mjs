import { buildWebsitePageDrafts } from './website-page-drafts.mjs';

export function createDirectusPageSeeder({ baseUrl, accessToken, fetchImpl = fetch }) {
  if (!baseUrl || !accessToken) throw new TypeError('baseUrl and accessToken are required');
  const collectionUrl = new URL('items/pages', `${baseUrl.replace(/\/$/, '')}/`);
  const headers = { Accept: 'application/json', Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  async function upsert(page) {
    const lookupUrl = new URL(collectionUrl);
    lookupUrl.searchParams.set('filter[slug][_eq]', page.slug);
    lookupUrl.searchParams.set('limit', '1');
    lookupUrl.searchParams.set('fields', 'id');
    const lookupResponse = await fetchImpl(lookupUrl, { method: 'GET', headers });
    if (!lookupResponse.ok) throw new Error(`Unable to query pages: ${lookupResponse.status}`);
    const lookup = await lookupResponse.json();
    const existingId = Array.isArray(lookup?.data) ? lookup.data[0]?.id : null;
    const writeUrl = existingId ? new URL(`${collectionUrl.pathname}/${existingId}`, `${baseUrl.replace(/\/$/, '')}/`) : collectionUrl;
    const writeResponse = await fetchImpl(writeUrl, {
      method: existingId ? 'PATCH' : 'POST', headers, body: JSON.stringify(page)
    });
    if (!writeResponse.ok) throw new Error(`Unable to write pages: ${writeResponse.status}`);
    return existingId ? 'updated' : 'created';
  }

  return {
    async seed() {
      const result = { created: 0, updated: 0 };
      for (const page of buildWebsitePageDrafts()) result[await upsert(page)] += 1;
      return result;
    }
  };
}
