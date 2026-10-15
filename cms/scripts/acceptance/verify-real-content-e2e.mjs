import { readFile } from 'node:fs/promises';

// Real-content end-to-end: walk the multi-role publication workflow on a live
// draft, then verify that a dynamic `data-list` block renders the freshly
// published record.
//
// This is the path unit tests cannot cover — every data-list source collection in
// the local CMS is draft-only, so the block has never rendered real data.
//
// Everything it creates is removed at the end: the article returns to
// draft/unpublished with its original field values, the page sections are
// restored, and the two test accounts are deleted.
const env = Object.fromEntries((await readFile(new URL('../../.env.local', import.meta.url), 'utf8'))
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const CMS = 'http://127.0.0.1:8055';
const SITE = 'http://127.0.0.1:4175';
const PAGE_ID = '3';
const PASSWORD = 'Accept-E2E-123456!';
const STAMP = Date.now().toString(36);
const EDITOR = `accept-editor-${STAMP}@example.com`;
const PUBLISHER = `accept-publisher-${STAMP}@example.com`;
const READINESS_FIELDS = ['summary', 'body', 'video_url', 'cover_asset', 'seo', 'source_document', 'source_url', 'body_media', 'media', 'transcript', 'category', 'display_date', 'field_presentation', 'slug'];

const out = { steps: [], failures: [] };
const step = (n, d = '') => { out.steps.push(`${n}${d ? ' :: ' + d : ''}`); console.log(`[step] ${n}${d ? ' :: ' + d : ''}`); };
const fail = (n) => { out.failures.push(n); console.log(`[FAIL] ${n}`); };

async function login(email, password) {
  const res = await fetch(`${CMS}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return (await res.json())?.data?.access_token || null;
}
async function api(token, path, init = {}) {
  const res = await fetch(`${CMS}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) }
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}
const err = (r) => JSON.stringify(r.body).slice(0, 240);

const admin = await login(env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
if (!admin) { console.log('管理员登录失败'); process.exit(1); }

const roles = (await api(admin, '/roles?fields=id,name&limit=30')).body.data || [];
const editorRole = roles.find((r) => r.name === '内容编辑');
const publisherRole = roles.find((r) => r.name === '审核管理');
if (!editorRole || !publisherRole) { console.log('缺少所需角色'); process.exit(1); }

const allArticles = (await api(admin, '/items/articles?fields=id,slug,title,status,publication_state,cover_asset,media&limit=20')).body.data || [];
const mediaAssets = (await api(admin, '/items/media_assets?fields=id,publication_state&limit=300')).body.data || [];
const mediaState = new Map(mediaAssets.map((m) => [String(m.id), m.publication_state]));
const mediaBlockers = (a) => [a.cover_asset, ...(a.media || []).map((m) => m.media_asset_id)]
  .filter(Boolean).map(String).filter((id) => mediaState.get(id) !== 'published');

// Prefer an article stuck in `scheduled`: that state has no path back to draft,
// so an interrupted run must be recovered by publishing then unpublishing it.
// Otherwise take a clean draft whose media dependencies are satisfied.
const articleBefore = allArticles.find((a) => a.status === 'scheduled')
  || allArticles.find((a) => a.status === 'draft' && mediaBlockers(a).length === 0);
if (!articleBefore) { console.log('没有可用的文章草稿'); process.exit(1); }
const recovering = articleBefore.status === 'scheduled';
step('选中文章草稿', `${articleBefore.id} | ${articleBefore.title} | ${articleBefore.status}${recovering ? '（需恢复）' : ''}`);
step('被素材门禁拦住的文章数', String(allArticles.filter((a) => mediaBlockers(a).length > 0).length));

// Full snapshot for restore, plus a published cover to borrow.
const original = (await api(admin, `/items/articles/${articleBefore.id}`)).body.data;
const publishedMediaRes = await api(admin, '/items/media_assets?filter[publication_state][_eq]=published&fields=id,title&limit=3');
step('已发布素材查询', `${publishedMediaRes.status} | ${JSON.stringify(publishedMediaRes.body).slice(0, 200)}`);
const publishedMedia = (publishedMediaRes.body.data || [])[0];
const pageBefore = (await api(admin, `/items/pages/${PAGE_ID}?fields=sections`)).body.data;
const publicBefore = (await (await fetch(`${SITE}/api/public/v1/articles`)).json()).data.length;
step('发布前公开文章数', String(publicBefore));

let editorUser = null;
let publisherUser = null;

try {
  const editorCreated = await api(admin, '/users', {
    method: 'POST',
    body: JSON.stringify({ email: EDITOR, password: PASSWORD, role: editorRole.id, status: 'active', first_name: 'E2E', last_name: 'Editor' })
  });
  if (editorCreated.status !== 200) throw new Error(`创建编辑账号失败 ${editorCreated.status} ${err(editorCreated)}`);
  editorUser = editorCreated.body.data.id;

  const publisherCreated = await api(admin, '/users', {
    method: 'POST',
    body: JSON.stringify({ email: PUBLISHER, password: PASSWORD, role: publisherRole.id, status: 'active', first_name: 'E2E', last_name: 'Publisher' })
  });
  if (publisherCreated.status !== 200) throw new Error(`创建审核账号失败 ${publisherCreated.status} ${err(publisherCreated)}`);
  publisherUser = publisherCreated.body.data.id;
  step('已创建编辑与审核账号');

  const editor = await login(EDITOR, PASSWORD);
  const publisher = await login(PUBLISHER, PASSWORD);
  if (!editor || !publisher) throw new Error('测试账号登录失败');

  // The article is a stub; the readiness gate legitimately refuses it. Fill the
  // minimum so the gate can be exercised rather than tripped.
  const filled = await api(admin, `/items/articles/${articleBefore.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      summary: 'E2E 发布流程验证用摘要',
      body: 'E2E 发布流程验证用正文内容。',
      // cover_asset is a string column holding a media asset id, not a numeric FK.
      cover_asset: publishedMedia ? String(publishedMedia.id) : null,
      seo: { title: 'E2E 发布验证', description: 'E2E 发布流程验证' },
      source_url: 'https://example.com/e2e-source'
    })
  });
  step('补齐就绪字段', `${filled.status} ${filled.status === 200 ? '' : err(filled)}`);

  // A recovered article is already approved, so only the publish step applies.
  if (!recovering) {
    const submitted = await api(editor, `/items/articles/${articleBefore.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'review' }) });
    let state = (await api(admin, `/items/articles/${articleBefore.id}?fields=status,publication_state`)).body.data;
    step('编辑提交审核', `${submitted.status} → ${state.status} ${submitted.status === 200 ? '' : err(submitted)}`);
    if (state.status !== 'review') fail(`提交审核后应为 review，实际 ${state.status}`);

    const approved = await api(publisher, `/items/articles/${articleBefore.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'scheduled' }) });
    state = (await api(admin, `/items/articles/${articleBefore.id}?fields=status,publication_state`)).body.data;
    step('审核通过', `${approved.status} → ${state.status} ${approved.status === 200 ? '' : err(approved)}`);
    if (state.status !== 'scheduled') fail(`审核通过后应为 scheduled，实际 ${state.status}`);
  } else {
    step('编辑提交审核 / 审核通过', '跳过（文章已在 scheduled，走恢复路径）');
  }

  const published = await api(publisher, `/items/articles/${articleBefore.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'published' }) });
  const state = (await api(admin, `/items/articles/${articleBefore.id}?fields=status,publication_state`)).body.data;
  step('发布', `${published.status} → ${state.status}/${state.publication_state} ${published.status === 200 ? '' : err(published)}`);
  if (state.publication_state !== 'published') fail(`发布后应为 published，实际 ${state.publication_state}`);

  // --- public API must now expose it ---
  const publicAfter = (await (await fetch(`${SITE}/api/public/v1/articles`)).json()).data;
  step('发布后公开文章数', `${publicBefore} → ${publicAfter.length}`);
  if (!publicAfter.some((a) => a.slug === original.slug)) fail('公开接口未包含刚发布的文章');

  // --- the dynamic block must render the real record ---
  const blockId = `custom-data-list-real${STAMP}`;
  await api(admin, `/items/pages/${PAGE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ sections: [...pageBefore.sections, {
      id: blockId, type: 'data-list', version: 1, enabled: true,
      title: '真实数据验证', source: 'articles', limit: 3, columns: 3, variant: 'grid'
    }] })
  });

  const issue = await api(admin, '/content-preview-tokens/issue', {
    method: 'POST', body: JSON.stringify({ contentCollection: 'pages', contentItemId: PAGE_ID })
  });
  const open = await fetch(`${SITE}/api/preview/open`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: issue.body.data.token }), redirect: 'manual'
  });
  const cookie = (open.headers.getSetCookie() || []).map((c) => c.split(';')[0]).join('; ');
  const html = await (await fetch(new URL(open.headers.get('location'), SITE).toString(), { headers: { cookie } })).text();

  const hasCard = html.includes('cms-custom-data-card');
  const hasTitle = html.includes(original.title);
  step('data-list 渲染卡片', String(hasCard));
  step('卡片含真实文章标题', String(hasTitle));
  if (!hasCard) fail('data-list 未渲染出卡片 —— 取到的是空数据');
  if (!hasTitle) fail('data-list 未渲染出真实文章标题');
} catch (error) {
  fail(`执行中断：${error.message}`);
} finally {
  // --- restore: published -> unpublished -> draft, then the original fields ---
  const publisherToken = await login(PUBLISHER, PASSWORD);
  const editorToken = await login(EDITOR, PASSWORD);
  const current = (await api(admin, `/items/articles/${articleBefore.id}?fields=status`)).body.data?.status;

  if (current === 'published' && publisherToken) {
    await api(publisherToken, `/items/articles/${articleBefore.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'unpublished' }) });
  }
  const mid = (await api(admin, `/items/articles/${articleBefore.id}?fields=status`)).body.data?.status;
  if (mid === 'unpublished' && editorToken) {
    await api(editorToken, `/items/articles/${articleBefore.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'draft' }) });
  }

  // Put every mutable field back exactly as it was.
  const restoreBody = {};
  for (const key of READINESS_FIELDS) if (Object.hasOwn(original, key)) restoreBody[key] = original[key];
  await api(admin, `/items/articles/${articleBefore.id}`, { method: 'PATCH', body: JSON.stringify(restoreBody) });

  const back = (await api(admin, `/items/articles/${articleBefore.id}?fields=status,publication_state,summary,cover_asset`)).body.data;
  // `scheduled` has no route back to draft, so a recovered article lands on draft.
  const expectedStatus = recovering ? 'draft' : original.status;
  step('文章已还原', `${back.status}/${back.publication_state} | summary=${JSON.stringify(back.summary)} | cover=${back.cover_asset}`);
  if (back.status !== expectedStatus || back.publication_state !== original.publication_state) {
    fail(`文章状态未还原：${back.status}/${back.publication_state} ≠ ${expectedStatus}/${original.publication_state}`);
  }

  await api(admin, `/items/pages/${PAGE_ID}`, { method: 'PATCH', body: JSON.stringify({ sections: pageBefore.sections }) });
  const pageAfter = (await api(admin, `/items/pages/${PAGE_ID}?fields=sections`)).body.data;
  step('页面已还原', `${pageAfter.sections.length} 个区块`);

  for (const id of [editorUser, publisherUser].filter(Boolean)) {
    const del = await api(admin, `/users/${id}`, { method: 'DELETE' });
    if (![200, 204].includes(del.status)) fail(`删除测试账号 ${id} 失败：${del.status}`);
  }
  step('测试账号已删除');

  const publicFinal = (await (await fetch(`${SITE}/api/public/v1/articles`)).json()).data.length;
  step('公开文章数已还原', `${publicFinal}（期望 ${publicBefore}）`);
  if (publicFinal !== publicBefore) fail(`公开文章数未还原：${publicFinal} ≠ ${publicBefore}`);
}

console.log('\n=== RESULT ===');
console.log(out.failures.length === 0 ? `ALL PASS（${out.steps.length} 步）` : `${out.failures.length} FAILED`);
for (const f of out.failures) console.log('  -', f);
