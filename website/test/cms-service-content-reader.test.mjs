import assert from 'node:assert/strict';
import test from 'node:test';

const { createCmsServiceContentReader } = await import('../server/services/cms-service-content-reader.mjs');

const publication = { status: 'published', publication_state: 'published', published_at: '2026-07-30T00:00:00.000Z' };
const publishedResource = {
  source_key: 'manual-fr-xs', type: 'machine_manual', title: 'FR-XS 说明书', summary: '设备说明书', applicable_models: ['FR400XS'],
  version: 'v1', language: 'zh-CN', asset: 'https://assets.example.test/manual-fr-xs.pdf', display_date: '2026-07-30', sort_order: 2,
  updated_at: '2026-07-30T00:00:00.000Z', ...publication
};
const publicKnowledge = {
  source_key: 'fault-wire', visibility: 'public', channel: 'website', category: 'fault_analysis', question_title: '容易断丝',
  applicable_models: ['FR400XS'], error_codes: ['E01'], symptoms: '加工时频繁断丝',
  troubleshooting_steps: [{ type: 'manual_step', content: '检查张力' }], safety_preconditions: ['关闭高频'], risk_level: 'medium',
  version: 'v1', sort_order: 1, ...publication
};
const activeLocation = { source_key: 'east-china', region: '华东', city: '苏州', service_scope: '上门服务', contact: { phone: '15050166844' }, business_status: 'active', ...publication };

test('Nuxt service content reader exposes only published website content and strips internal fields', async () => {
  const requests = [];
  const reader = createCmsServiceContentReader({
    resourcesEndpoint: 'https://cms.example.test/items/service_resources', locationsEndpoint: 'https://cms.example.test/items/service_locations',
    knowledgeEndpoint: 'https://cms.example.test/items/knowledge_items', accessToken: 'server-only-token', now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url, options) => {
      const request = new URL(url); requests.push({ request, headers: options.headers });
      if (request.pathname.endsWith('service_resources')) return Response.json({ data: [publishedResource, { ...publishedResource, source_key: 'draft', status: 'draft' }] });
      if (request.pathname.endsWith('knowledge_items')) return Response.json({ data: [publicKnowledge, { ...publicKnowledge, source_key: 'internal', visibility: 'support_internal' }, { ...publicKnowledge, source_key: 'repair', channel: 'repair_portal' }] });
      return Response.json({ data: [activeLocation, { ...activeLocation, source_key: 'closed', business_status: 'closed' }] });
    }
  });

  const resources = await reader.listResources();
  assert.equal(resources.data.length, 1);
  assert.deepEqual(resources.data[0], {
    source_key: 'manual-fr-xs', type: 'machine_manual', title: 'FR-XS 说明书', summary: '设备说明书', body: '', applicable_models: ['FR400XS'],
    version: 'v1', language: 'zh-CN', asset: 'https://assets.example.test/manual-fr-xs.pdf', display_date: '2026-07-30', sort_order: 2,
    updated_at: '2026-07-30T00:00:00.000Z'
  });
  const knowledge = await reader.listKnowledge();
  assert.equal(knowledge.data.length, 1);
  assert.equal(knowledge.data[0].title, '容易断丝');
  assert.deepEqual(knowledge.data[0].steps, ['检查张力']);
  assert.equal('technical_reviewer' in knowledge.data[0], false);
  assert.deepEqual((await reader.listLocations()).data, [activeLocation]);
  assert.equal(requests.find((item) => item.request.pathname.endsWith('knowledge_items')).request.searchParams.get('filter[visibility][_eq]'), 'public');
  assert.equal(requests[0].headers.Authorization, 'Bearer server-only-token');
});

test('Nuxt service content reader fails closed and keeps only its last normalized cache', async () => {
  assert.deepEqual(await createCmsServiceContentReader({ resourcesEndpoint: '', locationsEndpoint: '' }).listResources(), { data: [], cache: 'unavailable', source: 'static' });
  let available = true;
  const reader = createCmsServiceContentReader({ resourcesEndpoint: 'https://cms.example.test/items/service_resources', locationsEndpoint: '', cacheTtlMs: 0,
    fetchImpl: async () => available ? Response.json({ data: [publishedResource] }) : new Response('', { status: 503 }) });
  const first = await reader.listResources();
  available = false;
  assert.deepEqual(await reader.listResources(), { ...first, cache: 'stale' });
});
