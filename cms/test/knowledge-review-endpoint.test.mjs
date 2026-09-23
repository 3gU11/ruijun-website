import assert from 'node:assert/strict';
import test from 'node:test';

const { registerKnowledgeReviewEndpoint } = await import('../extensions/knowledge-review-endpoint/src/index.js');

function responseCapture() {
  const capture = { statusCode: null, body: null };
  return { capture, response: { status(code) { capture.statusCode = code; return this; }, json(body) { capture.body = body; return this; } } };
}

test('knowledge review endpoint returns safe governance summaries and native edit paths', async () => {
  const handlers = new Map();
  const rows = {
    directus_roles: [{ name: '技术审核人员' }],
    knowledge_items: [
      {
        id: 1, question_title: '高风险问题', category: 'mechanical_fault', risk_level: 'high', visibility: 'public', channel: 'both',
        source_key: 'private-source', source_document: 'private.csv', troubleshooting_steps: '[{"content":"private-step"}]',
        safety_preconditions: '[]', escalation_guidance: '', version: 'v1', technical_reviewer: 'tech-1', status: 'draft', publication_state: 'unpublished'
      },
      {
        id: 2, question_title: '可送审问题', category: 'operation', risk_level: 'medium', visibility: 'support_internal', channel: 'repair_portal',
        source_key: 'source-2', source_document: 'faq.csv', troubleshooting_steps: [{ content: 'stop' }],
        safety_preconditions: [], escalation_guidance: '', version: 'v2', technical_reviewer: 'tech-2', status: 'review', publication_state: 'unpublished'
      }
    ]
  };
  const database = (table) => ({ where() { return this; }, first() { return Promise.resolve(rows[table]?.[0] || null); }, select() { return Promise.resolve(rows[table] || []); } });
  registerKnowledgeReviewEndpoint({ get: (path, handler) => handlers.set(path, handler) }, { database });
  const { capture, response } = responseCapture();
  await handlers.get('/')({ accountability: { user: 'reviewer-1', role: 'reviewer-role' } }, response, (error) => { throw error; });
  assert.equal(capture.statusCode, 200);
  assert.deepEqual(capture.body.data.summary, { total: 2, blocked: 1, ready_for_review: 1, high_risk: 1, public: 1 });
  assert.deepEqual(capture.body.data.items[0], {
    id: 1,
    title: '高风险问题',
    category: 'mechanical_fault',
    risk: 'high',
    visibility: 'public',
    channel: 'both',
    status: 'draft',
    publication_state: 'unpublished',
    missing: ['高风险安全前置条件与人工升级说明'],
    ready_for_review: false,
    edit_path: '/admin/content/knowledge_items/1'
  });
  assert.equal(capture.body.data.items[1].ready_for_review, true);
  assert.doesNotMatch(JSON.stringify(capture.body), /private-source|private\.csv|private-step/);
});

test('knowledge review endpoint rejects non-review roles before reading FAQ records', async () => {
  const handlers = new Map();
  const touched = [];
  const database = (table) => ({ where() { return this; }, first() { return Promise.resolve(table === 'directus_roles' ? { name: '销售人员' } : null); }, select() { touched.push(table); return Promise.resolve([]); } });
  registerKnowledgeReviewEndpoint({ get: (path, handler) => handlers.set(path, handler) }, { database });
  const { capture, response } = responseCapture();
  await handlers.get('/')({ accountability: { user: 'sales-1', role: 'sales-role' } }, response, (error) => { throw error; });
  assert.equal(capture.statusCode, 403);
  assert.deepEqual(touched, []);
});
