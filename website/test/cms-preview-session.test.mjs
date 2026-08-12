import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { CmsPreviewError, createCmsPreviewReader } from '../server/services/cms-preview-reader.mjs';
import { createCmsPreviewSessionStore } from '../server/services/cms-preview-session-store.mjs';

test('preview session store expires opaque sessions and supports revocation', () => {
  let timestamp = 1_000;
  const store = createCmsPreviewSessionStore({ now: () => timestamp, ttlMs: 1_000, random: () => Buffer.alloc(48, 3) });
  const created = store.create({ collection: 'pages', itemId: '1', preview: { title: '草稿' } });
  assert.deepEqual(store.get(created.id).data.preview, { title: '草稿' });
  timestamp += 1_001;
  assert.equal(store.get(created.id), null);
  const second = store.create({ collection: 'pages', itemId: '2', preview: {} });
  assert.equal(store.revoke(second.id), true);
  assert.equal(store.get(second.id), null);
});

test('CMS form post opens a server-side preview session before redirecting to the preview page', async () => {
  const source = await readFile(new URL('../server/api/preview/open.post.ts', import.meta.url), 'utf8');
  assert.match(source, /readBody/);
  assert.match(source, /createSession\(body\?\.token\)/);
  assert.match(source, /httpOnly: true/);
  assert.match(source, /sendRedirect\(event, '\/preview', 303\)/);
  assert.doesNotMatch(source, /token=.*preview/);
});

test('preview reader exchanges a token once and keeps CMS credentials server-side', async () => {
  const requests = [];
  const store = createCmsPreviewSessionStore({ random: () => Buffer.alloc(48, 4) });
  const reader = createCmsPreviewReader({
    consumeEndpoint: 'http://cms.test/content-preview-tokens/consume',
    accessToken: 'server-only-token',
    sessionStore: store,
    fetchImpl: async (url, init) => {
      requests.push({ url, init });
      return new Response(JSON.stringify({ data: {
        content_collection: 'pages', content_item_id: '1', expires_at: new Date(Date.now() + 30_000).toISOString(),
        preview: { title: '草稿标题', source_document: undefined }
      } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });
  const session = await reader.createSession('A'.repeat(48));
  assert.equal(session.collection, 'pages');
  assert.equal(store.get(session.id).data.preview.title, '草稿标题');
  assert.equal(requests[0].url, 'http://cms.test/content-preview-tokens/consume');
  assert.equal(requests[0].init.headers.Authorization, 'Bearer server-only-token');
  assert.match(requests[0].init.body, /"token":"A{48}"/);
});

test('preview reader maps expired and replayed CMS tokens without leaking upstream text', async () => {
  const reader = createCmsPreviewReader({
    consumeEndpoint: 'http://cms.test/content-preview-tokens/consume',
    fetchImpl: async () => new Response(JSON.stringify({ errors: [{ message: 'internal details', extensions: { code: 'PREVIEW_TOKEN_USED' } }] }), { status: 409 })
  });
  await assert.rejects(() => reader.consume('B'.repeat(48)), (error) => {
    assert.ok(error instanceof CmsPreviewError);
    assert.equal(error.status, 409);
    assert.equal(error.code, 'PREVIEW_TOKEN_USED');
    assert.equal(error.message, '草稿预览令牌不可用。');
    return true;
  });
});
