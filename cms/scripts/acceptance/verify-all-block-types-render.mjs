import { readFile } from 'node:fs/promises';
import {
  createPageSectionInstance,
  listPageSectionDefinitions
} from '../../../website/shared/page-section-registry.mjs';

// Renders every registered block type for real.
//
// The acceptance suite only greps the component for a render branch — that proves
// the branch exists, not that it produces DOM. This adds one instance of each
// type, renders the page once, and asserts the expected container and content
// appear. Because the instances are built from the registry, a newly registered
// type is covered automatically.
//
// `data-list` is excluded: it only renders when its source has published records,
// which is covered by `verify-real-content-e2e.mjs`.
//
// The page is restored at the end.
const env = Object.fromEntries((await readFile(new URL('../../.env.local', import.meta.url), 'utf8'))
  .split(/\r?\n/).flatMap((l) => { const m = l.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

const CMS = 'http://127.0.0.1:8055';
const SITE = 'http://127.0.0.1:4175';
const PAGE_ID = '3';
const SLUG = 'service';
const STAMP = Date.now().toString(36).slice(-5);
const MARKER = `e2e${STAMP}`;
const SKIP = new Set(['data-list']);

const failures = [];
const step = (n, d = '') => console.log(`[step] ${n}${d ? ' :: ' + d : ''}`);
const fail = (n) => { failures.push(n); console.log(`[FAIL] ${n}`); };

const login = await (await fetch(`${CMS}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
})).json();
const admin = login.data.access_token;
const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${admin}` };

// Build a minimal but valid instance for a definition, with marker text in every
// field so the rendered DOM can be traced back to this run.
function buildInstance(definition, index) {
  const section = createPageSectionInstance(definition.type, SLUG, [], { createId: () => `${MARKER}-${index}` });
  for (const field of definition.fields) {
    if (field.type === 'text' || field.type === 'textarea') section[field.key] = `${MARKER}-${field.key}`;
    else if (field.type === 'select') section[field.key] = field.options[0];
    else if (field.type === 'number') section[field.key] = Number.isInteger(field.min) ? field.min : 1;
    else if (field.type === 'list') {
      section[field.key] = [Object.fromEntries(field.itemFields.map((itemField) => [itemField.key, `${MARKER}-${itemField.key}`]))];
    } else if (field.type === 'media') section[field.key] = [];
  }
  return section;
}

const pageBefore = (await (await fetch(`${CMS}/items/pages/${PAGE_ID}?fields=sections`, { headers: auth })).json()).data;
const definitions = listPageSectionDefinitions(SLUG).filter((d) => !SKIP.has(d.type));
step('待验证区块类型', definitions.map((d) => d.type).join(', '));

const instances = definitions.map((d, i) => buildInstance(d, i));
step('已构造实例', String(instances.length));

try {
  await fetch(`${CMS}/items/pages/${PAGE_ID}`, {
    method: 'PATCH', headers: auth,
    body: JSON.stringify({ sections: [...pageBefore.sections, ...instances] })
  });

  const issue = await (await fetch(`${CMS}/content-preview-tokens/issue`, {
    method: 'POST', headers: auth, body: JSON.stringify({ contentCollection: 'pages', contentItemId: PAGE_ID })
  })).json();
  const open = await fetch(`${SITE}/api/preview/open`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: issue.data.token }), redirect: 'manual'
  });
  const cookie = (open.headers.getSetCookie() || []).map((c) => c.split(';')[0]).join('; ');
  const html = await (await fetch(new URL(open.headers.get('location'), SITE).toString(), { headers: { cookie } })).text();
  step('预览 HTML 长度', String(html.length));

  for (const definition of definitions) {
    const container = `cms-custom-${definition.type}`;
    const hasContainer = html.includes(container);
    // Every declared field should have produced some markup carrying its marker.
    const markerKeys = definition.fields
      .filter((f) => f.type === 'text' || f.type === 'textarea')
      .map((f) => `${MARKER}-${f.key}`);
    const present = markerKeys.filter((k) => html.includes(k));
    const hasContent = markerKeys.length === 0 || present.length > 0;

    step(`${definition.type} 容器`, hasContainer ? '✅' : '❌');
    step(`${definition.type} 内容`, `${present.length}/${markerKeys.length} 个文本字段出现在 DOM`);
    if (!hasContainer) fail(`${definition.type} 未渲染出容器 .${container}`);
    if (!hasContent) fail(`${definition.type} 渲染了容器但没有任何字段内容`);
  }
} catch (error) {
  fail(`执行中断：${error.message}`);
} finally {
  await fetch(`${CMS}/items/pages/${PAGE_ID}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ sections: pageBefore.sections }) });
  const after = (await (await fetch(`${CMS}/items/pages/${PAGE_ID}?fields=sections`, { headers: auth })).json()).data;
  step('页面已还原', `${after.sections.length} 个区块`);
  if (after.sections.some((s) => s.type)) fail('页面未完全还原');
}

console.log('\n=== RESULT ===');
console.log(failures.length === 0 ? `ALL PASS — ${definitions.length} 种区块类型全部渲染成功` : `${failures.length} FAILED`);
for (const f of failures) console.log('  -', f);
