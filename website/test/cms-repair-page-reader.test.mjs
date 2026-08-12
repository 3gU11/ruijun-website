import assert from 'node:assert/strict';
import test from 'node:test';
import { createCmsRepairPageReader } from '../server/services/cms-repair-page-reader.mjs';

test('repair page reader exposes only published page configs and normalizes customer content', async () => {
  const reader = createCmsRepairPageReader({ endpoint: 'https://cms.example.test/items/repair_page_configs', fetchImpl: async (url) => new Response(JSON.stringify({ data: [{ page_key: 'repair_home', title: '售后服务', intro: 'intro', model_cards: [{ label: 'FR-XS', image: '/models/fr-xs.png', sort_order: 2 }], action_cards: [{ number: '01', title: '报修', query: '故障报修' }, { number: '99', title: '非法动作' }], process_steps: [{ title: '提交' }], notices: ['notice'], faq_refs: ['faq-1'], seo: { title: 'safe' }, status: 'published', publication_state: 'published', published_at: null }, { page_key: 'repair_new', title: 'draft', status: 'draft', publication_state: 'unpublished' }] })) });
  const result = await reader.get('repair_home');
  assert.equal(result.data.title, '售后服务');
  assert.deepEqual(result.data.modelCards, [{ label: 'FR-XS', image: '/models/fr-xs.png', sortOrder: 2 }]);
  assert.deepEqual(result.data.actionCards, [{ number: '01', label: '报修', title: '报修', query: '故障报修' }]);
  assert.deepEqual(result.data.processSteps, [{ title: '提交' }]);
  assert.deepEqual(result.data.faqRefs, ['faq-1']);
});

test('repair page reader fails closed for invalid keys and keeps a validated cache on outage', async () => {
  let online = true;
  const reader = createCmsRepairPageReader({ endpoint: 'https://cms.example.test/items/repair_page_configs', fetchImpl: async () => { if (!online) throw new Error('offline'); return new Response(JSON.stringify({ data: [{ page_key: 'repair_progress', title: '进度', status: 'published', publication_state: 'published' }] })); }, now: (() => { let value = 0; return () => value; })(), cacheTtlMs: 0 });
  await assert.rejects(() => reader.get('unsafe key'), /page key is invalid/);
  const first = await reader.get('repair_progress');
  online = false;
  const stale = await reader.get('repair_progress');
  assert.equal(stale.data.title, first.data.title);
});
