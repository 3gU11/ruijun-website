import { buildServiceContentReviewReport } from '../reports/service-content-review-report.mjs';

async function fetchCollection({ baseUrl, accessToken, collection, fields, fetchImpl = fetch }) {
  const root = String(baseUrl || '').replace(/\/$/, '');
  if (!root || !accessToken) throw new TypeError('CMS_BASE_URL and CMS_WRITE_TOKEN are required');
  const response = await fetchImpl(`${root}/items/${collection}?limit=-1&fields=${encodeURIComponent(fields.join(','))}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error(`Unable to read ${collection} review records: ${response.status}`);
  return (await response.json()).data || [];
}

export async function fetchServiceContentReviewRecords({ baseUrl, accessToken, fetchImpl = fetch }) {
  const common = ['id', 'source_key', 'source_url', 'source_document', 'review_note', 'status', 'publication_state'];
  const [resources, locations, entries] = await Promise.all([
    fetchCollection({ baseUrl, accessToken, collection: 'service_resources', fields: [...common, 'type', 'applicable_models', 'version', 'language', 'asset', 'updated_at'], fetchImpl }),
    fetchCollection({ baseUrl, accessToken, collection: 'service_locations', fields: [...common, 'region', 'city', 'service_scope', 'contact', 'business_status', 'valid_until'], fetchImpl }),
    fetchCollection({ baseUrl, accessToken, collection: 'external_service_entries', fields: ['id', 'entry_type', 'url', 'enabled', 'open_mode', 'fallback_phone', 'health_status', 'source_document', 'review_note', 'status', 'publication_state'], fetchImpl })
  ]);
  return { resources, locations, entries };
}

if (import.meta.main) {
  const records = await fetchServiceContentReviewRecords({ baseUrl: process.env.CMS_BASE_URL, accessToken: process.env.CMS_CONTENT_AUDIT_TOKEN || process.env.CMS_WRITE_TOKEN });
  process.stdout.write(buildServiceContentReviewReport(records));
}
