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
  const isPrivate = host === 'localhost' || host === '127.0.0.1' || host === '::1'
    || /^10\./.test(host) || /^192\.168\./.test(host)
    || (() => { const match = /^172\.(\d+)\./.exec(host); return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31); })();
  if (url.protocol !== 'http:' || !isPrivate) throw new Error(`${label} must be a local or RFC1918 HTTP URL`);
  return url.toString().replace(/\/$/, '');
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.errors?.[0]?.message || `HTTP ${response.status}`;
    throw new Error(`E2E request failed: ${message}`);
  }
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
const seriesCode = `e2e-restore-${suffix}`;
const modelCode = `e2e-restore-model-${suffix}`;
const sourceDocument = `E2E product restore verification ${suffix}`;
const createdReleaseIds = [];
let previousRelease = null;
let verification = null;

try {
  previousRelease = await database('product_release_snapshots')
    .where({ release_key: 'main', status: 'published', publication_state: 'published' })
    .orderBy('version', 'desc').first();
  const publishedAt = new Date().toISOString();
  await database('product_series').insert({
    series_code: seriesCode, slug: seriesCode, name: 'E2E Restore Series', source_document: sourceDocument,
    scenarios: '[]', capabilities: '[]', import_evidence: '{}', sort_order: 9999, language: 'zh-CN',
    status: 'published', publication_state: 'published', published_at: publishedAt, publication_log: '[]'
  });
  await database('product_models').insert({
    series_code: seriesCode, model_code: modelCode, slug: modelCode, name: 'E2E Restore Model v1', source_document: sourceDocument,
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
  const publishHeaders = { Authorization: authorization, 'Content-Type': 'application/json' };
  const first = await request(`${cmsBaseUrl}/product-release/publish`, {
    method: 'POST', headers: publishHeaders, body: JSON.stringify({ releaseNote: `Temporary restore baseline ${suffix}` })
  });
  createdReleaseIds.push(first.data.id);
  if (first.data.cache_invalidation?.status !== 'succeeded') throw new Error('First temporary release did not invalidate the website cache');

  await database('product_models').where({ model_code: modelCode }).update({ name: 'E2E Restore Model v2' });
  const second = await request(`${cmsBaseUrl}/product-release/publish`, {
    method: 'POST', headers: publishHeaders, body: JSON.stringify({ releaseNote: `Temporary restore changed version ${suffix}` })
  });
  createdReleaseIds.push(second.data.id);
  if (second.data.version !== first.data.version + 1) throw new Error('Second temporary release did not increment its version');

  const restored = await request(`${cmsBaseUrl}/product-release/${first.data.id}/restore`, {
    method: 'POST', headers: publishHeaders, body: JSON.stringify({ restoreNote: `恢复临时产品 v1，核对官网内容与版本历史 ${suffix}` })
  });
  createdReleaseIds.push(restored.data.id);
  if (restored.data.version !== second.data.version + 1) throw new Error('Restored release did not create the next version');
  if (String(restored.data.restored_from_release_id) !== String(first.data.id) || restored.data.restored_from_version !== first.data.version) {
    throw new Error('Restored release did not retain its source version');
  }
  if (restored.data.cache_invalidation?.status !== 'succeeded') throw new Error('Restored release did not invalidate the website cache');

  const active = await request(`${cmsBaseUrl}/product-release`, { headers: { Authorization: authorization } });
  if (active.data?.version !== restored.data.version || active.data?.snapshot?.models?.find((model) => model.model_code === modelCode)?.name !== 'E2E Restore Model v1') {
    throw new Error('Active CMS release does not expose the restored product content');
  }
  const history = await request(`${cmsBaseUrl}/product-release/history`, { headers: { Authorization: authorization } });
  const historyRecord = history.data?.find((record) => String(record.id) === String(first.data.id));
  if (!historyRecord?.can_restore || Object.hasOwn(historyRecord, 'snapshot')) throw new Error('History endpoint did not return a safe restorable metadata record');

  const publicProducts = await request(`${websiteBaseUrl}/api/public/v1/products?series=${encodeURIComponent(seriesCode)}`);
  if (!Array.isArray(publicProducts.data) || publicProducts.data.find((record) => record.model_code === modelCode)?.name !== 'E2E Restore Model v1') {
    throw new Error('Website did not read the restored product snapshot');
  }
  verification = { firstPublished: true, secondPublished: true, restoredAsNewVersion: true, cacheInvalidated: true, websiteReadRestoredSnapshot: true };
} finally {
  for (const id of createdReleaseIds) await database('product_release_snapshots').where({ id }).delete();
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
    database('product_release_snapshots').whereIn('id', createdReleaseIds).count({ count: '*' }).first()
  ]);
  if (residualCounts.some((row) => Number(row?.count || 0) !== 0)) throw new Error('Temporary product restore E2E data was not fully cleaned');
  await fetch(`${websiteBaseUrl}/api/internal/v1/cms/cache-invalidate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${environment.CMS_WEBHOOK_SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ collection: 'product_release_snapshots' })
  }).catch(() => null);
  await database.destroy();
}

console.log(JSON.stringify({ ...verification, temporaryDataCleaned: true }));
