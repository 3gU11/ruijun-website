import assert from 'node:assert/strict';
import test from 'node:test';

const { buildBffEnvironment } = await import('../scripts/configure-local-bff-token.mjs');

test('local BFF configuration keeps only the dedicated service token and removes legacy website write-token variables', () => {
  const existing = ['CMS_PAGES_URL=http://127.0.0.1:8055/items/pages', 'CMS_WRITE_TOKEN=admin-token', 'NUXT_CMS_WRITE_TOKEN=admin-token', 'NUXT_PUBLIC_SITE_URL=http://127.0.0.1:4302'].join('\r\n');
  const configured = buildBffEnvironment(existing, 'new-bff-token', 'new-dedupe-secret', 'new-webhook-secret');

  assert.match(configured, /^CMS_BFF_TOKEN=new-bff-token$/m);
  assert.match(configured, /^NUXT_CMS_BFF_TOKEN=new-bff-token$/m);
  assert.match(configured, /^LEAD_DEDUPE_SECRET=new-dedupe-secret$/m);
  assert.match(configured, /^NUXT_LEAD_DEDUPE_SECRET=new-dedupe-secret$/m);
  assert.match(configured, /^CMS_LEAD_DEDUPE_KEYS_URL=http:\/\/127\.0\.0\.1:8055\/items\/lead_dedupe_keys$/m);
  assert.match(configured, /^NUXT_CMS_LEAD_DEDUPE_KEYS_URL=http:\/\/127\.0\.0\.1:8055\/items\/lead_dedupe_keys$/m);
  assert.match(configured, /^CMS_SERVICE_RESOURCES_URL=http:\/\/127\.0\.0\.1:8055\/items\/service_resources$/m);
  assert.match(configured, /^NUXT_CMS_SERVICE_RESOURCES_URL=http:\/\/127\.0\.0\.1:8055\/items\/service_resources$/m);
  assert.match(configured, /^CMS_SERVICE_LOCATIONS_URL=http:\/\/127\.0\.0\.1:8055\/items\/service_locations$/m);
  assert.match(configured, /^NUXT_CMS_SERVICE_LOCATIONS_URL=http:\/\/127\.0\.0\.1:8055\/items\/service_locations$/m);
  assert.match(configured, /^CMS_KNOWLEDGE_ITEMS_URL=http:\/\/127\.0\.0\.1:8055\/items\/knowledge_items$/m);
  assert.match(configured, /^NUXT_CMS_KNOWLEDGE_ITEMS_URL=http:\/\/127\.0\.0\.1:8055\/items\/knowledge_items$/m);
  assert.match(configured, /^CMS_MILESTONES_URL=http:\/\/127\.0\.0\.1:8055\/items\/milestones$/m);
  assert.match(configured, /^NUXT_CMS_MILESTONES_URL=http:\/\/127\.0\.0\.1:8055\/items\/milestones$/m);
  assert.match(configured, /^CMS_QUALIFICATIONS_URL=http:\/\/127\.0\.0\.1:8055\/items\/qualifications$/m);
  assert.match(configured, /^NUXT_CMS_QUALIFICATIONS_URL=http:\/\/127\.0\.0\.1:8055\/items\/qualifications$/m);
  assert.match(configured, /^CMS_MANUFACTURING_EVIDENCE_URL=http:\/\/127\.0\.0\.1:8055\/items\/manufacturing_evidence$/m);
  assert.match(configured, /^NUXT_CMS_MANUFACTURING_EVIDENCE_URL=http:\/\/127\.0\.0\.1:8055\/items\/manufacturing_evidence$/m);
  assert.match(configured, /^CMS_MEDIA_ASSETS_URL=http:\/\/127\.0\.0\.1:8055\/items\/media_assets$/m);
  assert.match(configured, /^NUXT_CMS_MEDIA_ASSETS_URL=http:\/\/127\.0\.0\.1:8055\/items\/media_assets$/m);
  assert.match(configured, /^CMS_ARTICLES_URL=http:\/\/127\.0\.0\.1:8055\/items\/articles$/m);
  assert.match(configured, /^NUXT_CMS_ARTICLES_URL=http:\/\/127\.0\.0\.1:8055\/items\/articles$/m);
  assert.match(configured, /^CMS_PUBLIC_ASSET_BASE_URL=http:\/\/127\.0\.0\.1:8055$/m);
  assert.match(configured, /^NUXT_CMS_PUBLIC_ASSET_BASE_URL=http:\/\/127\.0\.0\.1:8055$/m);
  assert.match(configured, /^CMS_SERVICE_ENTRY_CLICKS_URL=http:\/\/127\.0\.0\.1:8055\/items\/service_entry_clicks$/m);
  assert.match(configured, /^NUXT_CMS_SERVICE_ENTRY_CLICKS_URL=http:\/\/127\.0\.0\.1:8055\/items\/service_entry_clicks$/m);
  assert.match(configured, /^CMS_WEBHOOK_SECRET=new-webhook-secret$/m);
  assert.match(configured, /^NUXT_CMS_WEBHOOK_SECRET=new-webhook-secret$/m);
  assert.doesNotMatch(configured, /^CMS_WRITE_TOKEN=/m);
  assert.doesNotMatch(configured, /^NUXT_CMS_WRITE_TOKEN=/m);
  assert.match(configured, /^CMS_PAGES_URL=http:\/\/127\.0\.0\.1:8055\/items\/pages$/m);
  assert.match(configured, /\r\n/);
});
