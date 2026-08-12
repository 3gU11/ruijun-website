import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import knex from 'knex';

const cmsRoot = resolve(import.meta.dirname, '..');

function parseEnvironment(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    return match ? [[match[1], match[2]]] : [];
  }));
}

function privateHttpUrl(value, label) {
  const url = new URL(value);
  const host = url.hostname;
  const privateHost = host === 'localhost' || host === '127.0.0.1' || host === '::1'
    || /^10\./.test(host) || /^192\.168\./.test(host)
    || (() => { const match = /^172\.(\d+)\./.exec(host); return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31); })();
  if (url.protocol !== 'http:' || !privateHost) throw new Error(`${label} must be a local or RFC1918 HTTP URL`);
  return url.toString().replace(/\/$/, '');
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`E2E request failed with HTTP ${response.status}`);
  return body;
}

const environment = parseEnvironment(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
const cmsBaseUrl = privateHttpUrl(environment.CMS_BASE_URL || 'http://127.0.0.1:8055', 'CMS_BASE_URL');
const websiteBaseUrl = privateHttpUrl(process.env.WEBSITE_BASE_URL || 'http://127.0.0.1:4173', 'WEBSITE_BASE_URL');
if (!environment.ADMIN_EMAIL || !environment.ADMIN_PASSWORD || !environment.CMS_WEBHOOK_SECRET) {
  throw new Error('Local CMS administrator credentials and CMS_WEBHOOK_SECRET are required');
}

const database = knex({
  client: 'sqlite3',
  connection: { filename: resolve(cmsRoot, environment.DB_FILENAME || './data/directus.db') },
  useNullAsDefault: true
});
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const seriesCode = `e2e-cache-${suffix}`;
const modelCode = `e2e-model-${suffix}`;
const sourceDocument = `E2E product cache verification ${suffix}`;
let releaseId = null;
let previousRelease = null;
let temporaryBaselineId = null;
let verification = null;

try {
  previousRelease = await database('product_release_snapshots')
    .where({ release_key: 'main', status: 'published', publication_state: 'published' })
    .orderBy('version', 'desc').first();
  const publishedAt = new Date().toISOString();
  if (!previousRelease) {
    const baselineSnapshot = {
      schema_version: 1, release_key: 'main', version: 0, generated_at: publishedAt,
      series: [], models: [], parameters: [], counts: { series: 0, models: 0, parameters: 0 }
    };
    const inserted = await database('product_release_snapshots').insert({
      release_key: 'main', version: 0, source_hash: '0'.repeat(64), snapshot: JSON.stringify(baselineSnapshot),
      release_note: `Temporary cache baseline ${suffix}`, published_at: publishedAt,
      status: 'published', publication_state: 'published', cache_invalidation_status: 'succeeded',
      cache_invalidation_attempts: 0, publication_log: '[]'
    });
    temporaryBaselineId = Array.isArray(inserted) ? inserted[0] : inserted;
  }
  await request(`${websiteBaseUrl}/api/public/v1/products`);
  await database('product_series').insert({
    series_code: seriesCode, slug: seriesCode, name: 'E2E Cache Series', source_document: sourceDocument,
    scenarios: '[]', capabilities: '[]', import_evidence: '{}', sort_order: 9999, language: 'zh-CN',
    status: 'published', publication_state: 'published', published_at: publishedAt, publication_log: '[]'
  });
  await database('product_models').insert({
    series_code: seriesCode, model_code: modelCode, slug: modelCode, name: 'E2E Cache Model', source_document: sourceDocument,
    parameters: JSON.stringify({ 'XY 行程': '1*1' }), configuration: '{}', media: '[]', resources: '[]', case_studies: '[]', import_evidence: '{}',
    status: 'published', publication_state: 'published', published_at: publishedAt, publication_log: '[]'
  });
  await database('product_parameters').insert({
    model_code: modelCode, group_name: 'E2E', field_name: 'XY 行程', value: '1*1', unit: 'mm', sort_order: 1,
    source_document: sourceDocument, import_evidence: JSON.stringify({ source_key: `e2e:${suffix}` }),
    status: 'published', publication_state: 'published', published_at: publishedAt, publication_log: '[]'
  });

  const login = await request(`${cmsBaseUrl}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: environment.ADMIN_EMAIL, password: environment.ADMIN_PASSWORD })
  });
  const authorization = `Bearer ${login.data.access_token}`;
  const release = await request(`${cmsBaseUrl}/product-release/publish`, {
    method: 'POST', headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ releaseNote: `Temporary cache E2E ${suffix}` })
  });
  releaseId = release.data.id;
  if (release.data.cache_invalidation?.status !== 'succeeded') {
    const cacheStatus = String(release.data.cache_invalidation?.status || 'missing');
    const cacheError = String(release.data.cache_invalidation?.error || 'UNKNOWN');
    throw new Error(`Product release cache invalidation did not succeed: ${cacheStatus}/${cacheError}`);
  }

  const publicProducts = await request(`${websiteBaseUrl}/api/public/v1/products?series=${encodeURIComponent(seriesCode)}`);
  if (!Array.isArray(publicProducts.data) || !publicProducts.data.some((record) => record.model_code === modelCode)) {
    throw new Error('Website did not read the newly published product snapshot');
  }
  verification = { published: true, cacheInvalidated: true, websiteReadSameSnapshot: true };
} finally {
  if (releaseId != null) await database('product_release_snapshots').where({ id: releaseId }).delete();
  if (temporaryBaselineId != null) await database('product_release_snapshots').where({ id: temporaryBaselineId }).delete();
  if (previousRelease) {
    await database('product_release_snapshots').where({ id: previousRelease.id }).update({ status: 'published', publication_state: 'published' });
  }
  await database('product_parameters').where({ model_code: modelCode }).delete();
  await database('product_models').where({ model_code: modelCode }).delete();
  await database('product_series').where({ series_code: seriesCode }).delete();
  const residualCounts = await Promise.all([
    database('product_series').where({ series_code: seriesCode }).count({ count: '*' }).first(),
    database('product_models').where({ model_code: modelCode }).count({ count: '*' }).first(),
    database('product_parameters').where({ model_code: modelCode }).count({ count: '*' }).first(),
    database('product_release_snapshots').where('release_note', 'like', `%${suffix}%`).count({ count: '*' }).first()
  ]);
  if (residualCounts.some((row) => Number(row?.count || 0) !== 0)) throw new Error('Temporary product release E2E data was not fully cleaned');
  await fetch(`${websiteBaseUrl}/api/internal/v1/cms/cache-invalidate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${environment.CMS_WEBHOOK_SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ collection: 'product_release_snapshots' })
  }).catch(() => null);
  await database.destroy();
}

console.log(JSON.stringify({ ...verification, temporaryDataCleaned: true }));
