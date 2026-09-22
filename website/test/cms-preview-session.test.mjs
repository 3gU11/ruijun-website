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

test('CMS form post opens a server-side preview session before redirecting to the real page', async () => {
  const source = await readFile(new URL('../server/api/preview/open.post.ts', import.meta.url), 'utf8');
  assert.match(source, /readBody/);
  assert.match(source, /URLSearchParams/);
  assert.match(source, /typeof rawBody === 'string'/);
  assert.match(source, /createSession\(body\?\.token, \{ sectionKey:/);
  assert.match(source, /targetContext\?\.sectionKey/);
  assert.match(source, /httpOnly: true/);
  assert.match(source, /resolveCmsPreviewTarget/);
  assert.match(source, /previewTargetLocation/);
  assert.match(source, /sendRedirect\(event, previewTargetLocation\(target\), 303\)/);
  assert.doesNotMatch(source, /token=.*preview/);
});

test('fragment handoff creates the CMS preview session only after reaching the website origin', async () => {
  const source = await readFile(new URL('../pages/cms-preview-handoff.vue', import.meta.url), 'utf8');
  assert.match(source, /cmsPreviewToken/);
  assert.match(source, /window\.history\.replaceState/);
  assert.match(source, /fetch\('\/api\/preview\/session'/);
  assert.match(source, /navigateTo\(location, \{ replace: true \}\)/);
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

test('page preview sessions retain only a validated section key for on-page scrolling', async () => {
  const store = createCmsPreviewSessionStore({ random: () => Buffer.alloc(48, 8) });
  const reader = createCmsPreviewReader({
    consumeEndpoint: 'http://cms.test/content-preview-tokens/consume',
    sessionStore: store,
    fetchImpl: async () => new Response(JSON.stringify({ data: {
      content_collection: 'pages', content_item_id: 'page-1', expires_at: new Date(Date.now() + 30_000).toISOString(),
      preview: { slug: 'manufacturing', title: '制造页草稿' }
    } }), { status: 200, headers: { 'content-type': 'application/json' } })
  });
  const session = await reader.createSession('C'.repeat(48), { sectionKey: 'core-equipment' });
  assert.deepEqual(store.get(session.id).data.targetContext, { sectionKey: 'core-equipment' });
  const rejected = await reader.createSession('D'.repeat(48), { sectionKey: 'not valid' });
  assert.equal(store.get(rejected.id).data.targetContext, undefined);
});

test('article preview sessions permit only the fixed news list-card contexts', async () => {
  const store = createCmsPreviewSessionStore({ random: () => Buffer.alloc(48, 9) });
  const reader = createCmsPreviewReader({
    consumeEndpoint: 'http://cms.test/content-preview-tokens/consume',
    sessionStore: store,
    fetchImpl: async () => new Response(JSON.stringify({ data: {
      content_collection: 'articles', content_item_id: 10, expires_at: new Date(Date.now() + 30_000).toISOString(),
      preview: { slug: 'draft-news', title: '草稿新闻' }
    } }), { status: 200, headers: { 'content-type': 'application/json' } })
  });

  const dynamicNews = await reader.createSession('E'.repeat(48), { sectionKey: 'dynamic-news' });
  assert.deepEqual(store.get(dynamicNews.id).data.targetContext, { sectionKey: 'dynamic-news' });
  const unsupported = await reader.createSession('F'.repeat(48), { sectionKey: 'hero' });
  assert.equal(store.get(unsupported.id).data.targetContext, undefined);
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
