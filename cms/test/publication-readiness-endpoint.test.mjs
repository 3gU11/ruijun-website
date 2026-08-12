import assert from 'node:assert/strict';
import test from 'node:test';

const { registerPublicationReadinessEndpoint } = await import('../extensions/publication-readiness-endpoint/dist/index.js');

function responseCapture() {
  const capture = { statusCode: null, body: null };
  return { capture, response: { status(code) { capture.statusCode = code; return this; }, json(body) { capture.body = body; return this; } } };
}

test('publication readiness endpoint allows publishers and returns only labels and blockers', async () => {
  const handlers = new Map();
  const rows = {
    directus_roles: [{ name: '发布人员' }],
    product_series: [{ name: 'FR 系列', series_code: 'FR', source_document: 'catalog', import_evidence: '{"aliases_pending_review":["FR-A"]}', status: 'draft', publication_state: 'unpublished' }],
    product_models: [{ name: 'FR-XS', status: 'draft', publication_state: 'unpublished', model_code: 'FR-XS', series_code: 'FR', source_document: 'catalog', parameters: JSON.stringify({ travel: '500mm' }), import_evidence: '{}' }],
    product_parameters: [{ model_code: 'FR400XS', field_name: '行程', value: '', source_document: 'private-parameter-source.pdf', status: 'draft', publication_state: 'unpublished' }],
    case_studies: [{ slug: 'case-1', industry: '模具', material: '', thickness: '', model_code: 'FR400XS', process: '', result: '', authorization_status: 'review_required', source_document: 'private-case-source.pdf', status: 'draft', publication_state: 'unpublished' }],
    media_assets: [{ id: 8, file_id: 'file-8', original_file_name: 'machine.webp', mime_type: 'image/webp', byte_size: 1024, usage_scope: 'product', copyright_status: 'pending_review', status: 'draft', publication_state: 'unpublished' }],
    directus_files: [{ id: 'file-8', filename_download: 'machine.webp', type: 'image/webp', filesize: 1024 }],
    manufacturing_evidence: [{ source_key: 'precision-machining', process: 'precision-machining', description: '', media: '[{"path":"/private/factory.jpg"}]', inspection_evidence: '', source_document: 'manufacturing.html', status: 'draft', publication_state: 'unpublished' }],
    qualifications: [{ source_key: 'certificate-01', type: 'certificate', name: '质量管理体系认证证书', certificate_number: 'private-certificate-number', issuer: '', valid_until: null, assets: '[{"path":"/private/certificate.jpg"}]', authorization_status: 'review_required', source_document: 'about.html', status: 'draft', publication_state: 'unpublished' }],
    milestones: [{ source_key: 'timeline-1997', year: 1997, event: '公司始创', evidence: '', source_document: 'about.html', status: 'draft', publication_state: 'unpublished' }],
    knowledge_items: [
      { source_key: 'faq-public', source_document: 'private-faq-source.csv', visibility: 'public', channel: 'both', category: 'operation', question_title: '公开问题', troubleshooting_steps: '[]', risk_level: 'high', safety_preconditions: '[]', escalation_guidance: '', version: 'review-1', technical_reviewer: 'reviewer-1', status: 'draft', publication_state: 'unpublished' },
      { source_key: 'faq-internal', source_document: 'private-internal-source.csv', visibility: 'support_internal', channel: 'support', category: 'internal', question_title: '内部保密问题', troubleshooting_steps: '[{"content":"private-step"}]', risk_level: 'medium', version: 'internal-1', technical_reviewer: 'reviewer-1', status: 'draft', publication_state: 'unpublished' }
    ],
    service_resources: [{ source_key: 'manual', status: 'draft', publication_state: 'unpublished', type: 'manual', source_document: 'archive', asset: null }],
    service_locations: [{ source_key: 'east', region: '华东', city: '', service_scope: '', contact: '{"name":"private-contact","phone":"13800000000"}', business_status: 'pending', valid_until: null, status: 'draft', publication_state: 'unpublished' }],
    external_service_entries: [{ entry_type: 'request', status: 'draft', publication_state: 'unpublished', url: 'http://127.0.0.1/repair/new', enabled: false }],
    articles: [{ slug: '', category: '', title: '新闻', summary: '', body: '', video_url: '', cover_asset: '', seo: '{}', source_document: 'private-news-source.html', status: 'draft', publication_state: 'unpublished' }],
    pages: [{ slug: 'home', title: '首页', language: 'zh-CN', sections: '[{"requires_claim_review":true}]', seo: '{}', source_document: 'demo/index.html', status: 'draft', publication_state: 'unpublished' }],
    site_settings: [{ setting_key: 'global', navigation: '[]', footer: '{"requires_business_review":true}', brand: '{}', contacts: '{"service_phone":"private"}', source_document: 'header.vue', status: 'draft', publication_state: 'unpublished' }]
  };
  const database = (table) => ({ where() { return this; }, first() { return Promise.resolve(rows[table]?.[0] || null); }, select() { return Promise.resolve(rows[table] || []); } });
  registerPublicationReadinessEndpoint({ get: (path, handler) => handlers.set(path, handler) }, { database });
  const { capture, response } = responseCapture();
  await handlers.get('/')({ accountability: { user: 'publisher-1', role: 'publisher-role' } }, response, (error) => { throw error; });
  assert.equal(capture.statusCode, 200);
  assert.deepEqual(capture.body.data.summary, { ready: 0, blocked: 15 });
  assert.deepEqual(capture.body.data.items.map((item) => item.type), ['series', 'product', 'parameter', 'case', 'manufacturing', 'qualification', 'milestone', 'service', 'service', 'service', 'knowledge', 'article', 'page', 'setting', 'media']);
  assert.deepEqual(capture.body.data.items.find((item) => item.label === '华东').blockers, ['未完成发布', '城市', '服务范围', '有效期待确认', '营业或服务状态未确认']);
  assert.match(capture.body.data.items.find((item) => item.type === 'media').blockers.join('；'), /版权状态待审核/);
  assert.ok(capture.body.data.items.every((item) => {
    const keys = Object.keys(item).sort().join(',');
    return keys === 'blockers,label,type' || keys === 'blockers,edit_path,label,type';
  }));
  assert.ok(capture.body.data.items.filter((item) => item.edit_path).every((item) => /^\/admin\/content\/[a-z_]+\/[^/]+$/.test(item.edit_path)));
  assert.doesNotMatch(JSON.stringify(capture.body), /127\.0\.0\.1|catalog|500mm|private|13800000000|demo\/index|file-8|manufacturing\.html|about\.html|内部保密问题/);
});

test('publication readiness endpoint rejects non-publishers before reading content', async () => {
  const handlers = new Map();
  const touched = [];
  const database = (table) => ({ where() { return this; }, first() { return Promise.resolve(table === 'directus_roles' ? { name: '技术审核人员' } : null); }, select() { touched.push(table); return Promise.resolve([]); } });
  registerPublicationReadinessEndpoint({ get: (path, handler) => handlers.set(path, handler) }, { database });
  const { capture, response } = responseCapture();
  await handlers.get('/')({ accountability: { user: 'reviewer-1', role: 'reviewer-role' } }, response, (error) => { throw error; });
  assert.equal(capture.statusCode, 403);
  assert.deepEqual(touched, []);
});

test('publication readiness endpoint blocks media whose declared metadata differs from the Directus file', async () => {
  const handlers = new Map();
  const rows = {
    directus_roles: [{ name: '发布人员' }],
    media_assets: [{ file_id: 'file-mismatch', original_file_name: 'machine.webp', mime_type: 'image/webp', byte_size: 2048, usage_scope: 'product', copyright_status: 'owned', status: 'published', publication_state: 'published' }],
    directus_files: [{ id: 'file-mismatch', filename_download: 'machine.webp', type: 'image/webp', filesize: 1024 }]
  };
  const database = (table) => ({ where() { return this; }, first() { return Promise.resolve(rows[table]?.[0] || null); }, select() { return Promise.resolve(rows[table] || []); } });
  registerPublicationReadinessEndpoint({ get: (path, handler) => handlers.set(path, handler) }, { database });
  const { capture, response } = responseCapture();
  await handlers.get('/')({ accountability: { user: 'publisher-1', role: 'publisher-role' } }, response, (error) => { throw error; });
  assert.equal(capture.statusCode, 200);
  assert.deepEqual(capture.body.data.summary, { ready: 0, blocked: 1 });
  assert.deepEqual(capture.body.data.items, [{ type: 'media', label: 'machine.webp', blockers: ['媒体元数据与上传文件不一致'] }]);
  assert.doesNotMatch(JSON.stringify(capture.body), /file-mismatch|2048|1024/);
});

test('publication readiness endpoint returns safe native edit paths for publisher-only records', async () => {
  const handlers = new Map();
  const rows = {
    directus_roles: [{ name: '发布人员' }],
    product_models: [{ id: 42, name: 'FR-XS', model_code: 'FR-XS', series_code: 'FR', source_document: 'catalog', parameters: '{"travel":"500mm"}', import_evidence: '{}', status: 'draft', publication_state: 'unpublished' }]
  };
  const database = (table) => ({ where() { return this; }, first() { return Promise.resolve(rows[table]?.[0] || null); }, select() { return Promise.resolve(rows[table] || []); } });
  registerPublicationReadinessEndpoint({ get: (path, handler) => handlers.set(path, handler) }, { database });
  const { capture, response } = responseCapture();
  await handlers.get('/')({ accountability: { user: 'publisher-1', role: 'publisher-role' } }, response, (error) => { throw error; });
  const product = capture.body.data.items.find((item) => item.type === 'product');
  assert.deepEqual(product, {
    type: 'product',
    label: 'FR-XS',
    blockers: ['未完成发布'],
    edit_path: '/admin/content/product_models/42'
  });
  assert.doesNotMatch(JSON.stringify(capture.body), /catalog|FR-XS.*parameters/);
});
