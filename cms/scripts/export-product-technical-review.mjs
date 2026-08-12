import { buildProductTechnicalReviewReport } from '../reports/product-review-report.mjs';

async function fetchCollection({ baseUrl, accessToken, collection, fields, fetchImpl = fetch }) {
  const root = String(baseUrl || '').replace(/\/$/, '');
  if (!root || !accessToken) throw new TypeError('CMS_BASE_URL and CMS_WRITE_TOKEN are required');
  const response = await fetchImpl(`${root}/items/${collection}?limit=-1&fields=${encodeURIComponent(fields.join(','))}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error(`Unable to read ${collection} review records: ${response.status}`);
  return (await response.json()).data || [];
}

export async function fetchProductReviewRecords({ baseUrl, accessToken, fetchImpl = fetch }) {
  const common = ['id', 'source_url', 'source_document', 'review_note', 'status', 'publication_state', 'import_evidence'];
  const [series, models, parameters] = await Promise.all([
    fetchCollection({ baseUrl, accessToken, collection: 'product_series', fields: [...common, 'series_code', 'name'], fetchImpl }),
    fetchCollection({ baseUrl, accessToken, collection: 'product_models', fields: [...common, 'series_code', 'model_code', 'name', 'parameters'], fetchImpl }),
    fetchCollection({ baseUrl, accessToken, collection: 'product_parameters', fields: [...common, 'model_code', 'group_name', 'field_name', 'value', 'unit', 'sort_order', 'test_conditions'], fetchImpl })
  ]);
  return { series, models, parameters };
}

if (import.meta.main) {
  const records = await fetchProductReviewRecords({ baseUrl: process.env.CMS_BASE_URL, accessToken: process.env.CMS_CONTENT_AUDIT_TOKEN || process.env.CMS_WRITE_TOKEN });
  process.stdout.write(buildProductTechnicalReviewReport(records));
}
