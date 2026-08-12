import assert from 'node:assert/strict';
import test from 'node:test';

const { registerOperationsOverviewEndpoint } = await import('../extensions/operations-overview-endpoint/dist/index.js');

function responseCapture() {
  const capture = { statusCode: null, body: null };
  return { capture, response: { status(code) { capture.statusCode = code; return this; }, json(body) { capture.body = body; return this; } } };
}

test('operations overview returns safe aggregate counts and quick links', async () => {
  const handlers = new Map();
  const rows = {
    product_series: [{ id: 1, status: 'draft', publication_state: 'unpublished' }],
    product_models: [{ id: 2, status: 'published', publication_state: 'published' }],
    knowledge_items: [
      { id: 3, status: 'draft', publication_state: 'unpublished', risk_level: 'high', visibility: 'support_internal', troubleshooting_steps: '[]', safety_preconditions: '[]' },
      { id: 4, status: 'review', publication_state: 'unpublished', risk_level: 'low', visibility: 'public', troubleshooting_steps: '[]', safety_preconditions: '[]' }
    ]
  };
  const database = (table) => ({ where() { return this; }, first() { return Promise.resolve({ name: '审核管理' }); }, select() { return Promise.resolve(rows[table] || []); } });
  registerOperationsOverviewEndpoint({ get: (path, handler) => handlers.set(path, handler) }, { database });
  const { capture, response } = responseCapture();
  await handlers.get('/')({ accountability: { user: 'publisher-1', role: 'publisher-role' } }, response, (error) => { throw error; });
  assert.equal(capture.statusCode, 200);
  assert.equal(capture.body.data.summary.total_records, 4);
  assert.equal(capture.body.data.summary.attention_records, 3);
  assert.deepEqual(capture.body.data.knowledge, { total: 2, high_risk: 1, blocked: 2, ready_for_review: 0, public_candidates: 1, draft: 1 });
  assert.equal(capture.body.data.quick_links[0].path, '/admin/ruijun-content-editor-workbench');
  assert.ok(capture.body.data.quick_links.some((link) => link.path === '/admin/ruijun-content-publication-queue-workbench'));
  assert.match(capture.body.data.collections.find((item) => item.key === 'product_series').edit_path, /admin\/content\/product_series/);
  assert.doesNotMatch(JSON.stringify(capture.body), /question_title|private-source|troubleshooting_steps/);
});

test('operations overview rejects non-CMS roles before reading content', async () => {
  const handlers = new Map();
  const touched = [];
  const database = (table) => ({ where() { return this; }, first() { return Promise.resolve({ name: '销售人员' }); }, select() { touched.push(table); return Promise.resolve([]); } });
  registerOperationsOverviewEndpoint({ get: (path, handler) => handlers.set(path, handler) }, { database });
  const { capture, response } = responseCapture();
  await handlers.get('/')({ accountability: { user: 'sales-1', role: 'sales-role' } }, response, (error) => { throw error; });
  assert.equal(capture.statusCode, 403);
  assert.deepEqual(touched, []);
});
