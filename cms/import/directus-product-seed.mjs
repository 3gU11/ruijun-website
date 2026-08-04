import { buildLegacyProductDraftImport } from './legacy-product-catalog.mjs';

function collectionUrl(baseUrl, collection) {
  return new URL(`items/${collection}`, `${baseUrl.replace(/\/$/, '')}/`);
}

export function createDirectusProductSeeder({ baseUrl, accessToken, fetchImpl = fetch }) {
  if (!baseUrl || !accessToken) throw new TypeError('baseUrl and accessToken are required');
  const headers = { Accept: 'application/json', Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  async function upsert(collection, keyField, record) {
    const lookupUrl = collectionUrl(baseUrl, collection);
    lookupUrl.searchParams.set(`filter[${keyField}][_eq]`, record[keyField]);
    lookupUrl.searchParams.set('limit', '1');
    lookupUrl.searchParams.set('fields', 'id');
    const lookupResponse = await fetchImpl(lookupUrl, { method: 'GET', headers });
    if (!lookupResponse.ok) throw new Error(`Unable to query ${collection}: ${lookupResponse.status}`);
    const lookup = await lookupResponse.json();
    const existingId = Array.isArray(lookup?.data) ? lookup.data[0]?.id : null;
    const writeUrl = existingId ? new URL(`${collectionUrl(baseUrl, collection).pathname}/${existingId}`, `${baseUrl.replace(/\/$/, '')}/`) : collectionUrl(baseUrl, collection);
    const writeResponse = await fetchImpl(writeUrl, {
      method: existingId ? 'PATCH' : 'POST',
      headers,
      body: JSON.stringify(record)
    });
    if (!writeResponse.ok) throw new Error(`Unable to write ${collection}: ${writeResponse.status}`);
    return existingId ? 'updated' : 'created';
  }

  async function seedCollection(collection, keyField, records) {
    const result = { created: 0, updated: 0 };
    for (const record of records) result[await upsert(collection, keyField, record)] += 1;
    return result;
  }

  return {
    async seed(catalog) {
      const payload = buildLegacyProductDraftImport(catalog);
      return {
        product_series: await seedCollection('product_series', 'series_code', payload.product_series),
        product_models: await seedCollection('product_models', 'model_code', payload.product_models)
      };
    }
  };
}
