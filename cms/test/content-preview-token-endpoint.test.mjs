import assert from 'node:assert/strict';
import test from 'node:test';

const { hashPreviewToken, normalizeTtlSeconds } = await import('../content-preview/content-preview-token.mjs');
const { registerContentPreviewTokenEndpoint } = await import('../extensions/content-preview-token-endpoint/dist/index.js');

function responseCapture() {
  const capture = { statusCode: null, body: null };
  return { capture, response: { status(code) { capture.statusCode = code; return this; }, json(body) { capture.body = body; return this; } } };
}

function mutableDatabase(tables) {
  function database(table) {
    let filters = {};
    const matching = () => (tables[table] || []).filter((row) => Object.entries(filters).every(([key, value]) => String(row[key]) === String(value)));
    return {
      where(value) { filters = { ...filters, ...value }; return this; },
      first() { return Promise.resolve(matching()[0] || null); },
      insert(value) { const id = `${table}-${(tables[table]?.length || 0) + 1}`; tables[table].push({ id, ...value }); return Promise.resolve([id]); },
      update(value) { const rows = matching(); rows.forEach((row) => Object.assign(row, value)); return Promise.resolve(rows.length); }
    };
  }
  return database;
}

function endpointHarness(tables, options = {}) {
  const handlers = new Map();
  registerContentPreviewTokenEndpoint({
    post(path, handler) { handlers.set(`POST ${path}`, handler); }
  }, { database: mutableDatabase(tables), now: options.now || (() => new Date('2026-08-05T00:00:00.000Z')), randomBytes: options.randomBytes, websitePreviewOpenUrl: options.websitePreviewOpenUrl });
  return handlers;
}

test('preview token constraints keep TTL short and hash only the bearer token', () => {
  assert.equal(normalizeTtlSeconds(), 900);
  assert.equal(normalizeTtlSeconds(60), 60);
  assert.equal(normalizeTtlSeconds(1801), null);
  assert.equal(normalizeTtlSeconds(59), null);
  assert.throws(() => hashPreviewToken('too-short'), /invalid/i);
});

test('content editor can issue and consume a one-time draft preview token', async () => {
  const tables = {
    directus_roles: [{ id: 'editor-role', name: '内容编辑' }],
    pages: [{ id: '1', title: '预览标题', slug: 'preview', sections: [{ id: 'intro', body: '预览正文', source_url: 'private' }], status: 'draft', publication_state: 'unpublished', source_document: 'private.docx' }],
    content_preview_tokens: []
  };
  const handlers = endpointHarness(tables, { randomBytes: (size) => Buffer.alloc(size, 7), websitePreviewOpenUrl: 'http://website.test/api/preview/open' });
  const issued = responseCapture();
  await handlers.get('POST /issue')({ accountability: { user: 'editor-1', role: 'editor-role' }, body: { contentCollection: 'pages', contentItemId: '1' } }, issued.response, (error) => { throw error; });
  assert.equal(issued.capture.statusCode, 201);
  const rawToken = issued.capture.body.data.token;
  assert.ok(rawToken);
  assert.notEqual(tables.content_preview_tokens[0].token_hash, rawToken);
  assert.equal(tables.content_preview_tokens[0].token_hash, hashPreviewToken(rawToken));
  assert.equal(issued.capture.body.data.expires_at, '2026-08-05T00:15:00.000Z');
  assert.equal(issued.capture.body.data.preview_open_url, 'http://website.test/api/preview/open');

  const consumed = responseCapture();
  await handlers.get('POST /consume')({ body: { token: rawToken } }, consumed.response, (error) => { throw error; });
  assert.equal(consumed.capture.statusCode, 200);
  assert.equal(consumed.capture.body.data.status, 'used');
  assert.equal(consumed.capture.body.data.content_collection, 'pages');
  assert.equal(consumed.capture.body.data.content_item_id, '1');
  assert.equal(consumed.capture.body.data.token, undefined);
  assert.equal(consumed.capture.body.data.preview.title, '预览标题');
  assert.equal(consumed.capture.body.data.preview.sections[0].body, '预览正文');
  assert.equal('source_document' in consumed.capture.body.data.preview, false);

  const replay = responseCapture();
  await handlers.get('POST /consume')({ body: { token: rawToken } }, replay.response, (error) => { throw error; });
  assert.equal(replay.capture.statusCode, 409);
  assert.equal(replay.capture.body.errors[0].extensions.code, 'PREVIEW_TOKEN_USED');
});

test('preview issuance enforces role scope, draft state and revocation', async () => {
  const tables = {
    directus_roles: [{ id: 'review-role', name: '审核管理' }, { id: 'system-role', name: '系统管理员' }, { id: 'sales-role', name: '销售人员' }],
    pages: [{ id: '1', status: 'draft', publication_state: 'unpublished' }],
    product_models: [{ id: '2', status: 'published', publication_state: 'published' }],
    content_preview_tokens: []
  };
  const handlers = endpointHarness(tables, { randomBytes: (size) => Buffer.alloc(size, 8) });
  const forbidden = responseCapture();
  await handlers.get('POST /issue')({ accountability: { user: 'review-1', role: 'review-role' }, body: { contentCollection: 'product_models', contentItemId: '2' } }, forbidden.response, (error) => { throw error; });
  assert.equal(forbidden.capture.statusCode, 400);
  assert.equal(forbidden.capture.body.errors[0].extensions.code, 'PREVIEW_TARGET_INVALID');

  const blocked = responseCapture();
  await handlers.get('POST /issue')({ accountability: { user: 'admin-1', role: 'system-role' }, body: { contentCollection: 'product_models', contentItemId: '2' } }, blocked.response, (error) => { throw error; });
  assert.equal(blocked.capture.statusCode, 409);
  assert.equal(blocked.capture.body.errors[0].extensions.code, 'PREVIEW_CONTENT_NOT_DRAFT');

  const denied = responseCapture();
  await handlers.get('POST /issue')({ accountability: { user: 'sales-1', role: 'sales-role' }, body: { contentCollection: 'pages', contentItemId: '1' } }, denied.response, (error) => { throw error; });
  assert.equal(denied.capture.statusCode, 403);

  const issued = responseCapture();
  await handlers.get('POST /issue')({ accountability: { user: 'admin-1', role: 'system-role' }, body: { contentCollection: 'product_models', contentItemId: '2', ttlSeconds: 60 } }, issued.response, (error) => { throw error; });
  assert.equal(issued.capture.statusCode, 409);

  tables.product_models[0].status = 'draft';
  tables.product_models[0].publication_state = 'unpublished';
  await handlers.get('POST /issue')({ accountability: { user: 'admin-1', role: 'system-role' }, body: { contentCollection: 'product_models', contentItemId: '2', ttlSeconds: 60 } }, issued.response, (error) => { throw error; });
  assert.equal(issued.capture.statusCode, 201);
  const tokenId = issued.capture.body.data.id;
  const token = issued.capture.body.data.token;
  const revoked = responseCapture();
  await handlers.get('POST /:id/revoke')({ params: { id: tokenId }, accountability: { user: 'admin-1', role: 'system-role' } }, revoked.response, (error) => { throw error; });
  assert.equal(revoked.capture.statusCode, 200);
  assert.equal(revoked.capture.body.data.status, 'revoked');
  const consumed = responseCapture();
  await handlers.get('POST /consume')({ body: { token } }, consumed.response, (error) => { throw error; });
  assert.equal(consumed.capture.statusCode, 410);
  assert.equal(consumed.capture.body.errors[0].extensions.code, 'PREVIEW_TOKEN_REVOKED');
});
