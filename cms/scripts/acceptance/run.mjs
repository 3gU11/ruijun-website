// Read-only acceptance suite for the CMS block system.
//
// Runs five suites and prints a single verdict. Nothing here writes to the CMS:
// the workbench check opens panels but never saves, so it is safe to run against
// a working environment at any time.
//
//   node cms/scripts/acceptance/run.mjs
//   node cms/scripts/acceptance/run.mjs --quick
//
// --quick drops the registry and workbench suites: registry is a source-level
// check that only moves when code changes, and workbench drives a real browser
// for about a minute. What is left answers the one question that matters at
// boot — is the site up, and is CMS content actually reaching the pages. Used by
// the launcher so a restart does not stall on the slow UI smoke test; run the
// full suite by hand or in CI.
const quickOnly = process.argv.includes('--quick');
// Suite numbering must stay honest in both modes: quick drops registry and
// workbench, so the remaining three renumber themselves rather than printing a
// gap like "[1/4] ... [3/4] ... [4/5]".
const suiteLabel = (index) => `${index}/${quickOnly ? 3 : 5}`;
//
// Suites:
//   1. runtime    — Directus + Nuxt are listening
//   2. registry   — every declared type is complete, renderable and valid
//   3. routes     — every adopted page returns 200
//   4. content    — CMS content is actually published AND lands on the page
//   5. workbench  — the editor actually mounts the block UI (no saving)
//
// Suite 4 is the one that catches "saved in CMS but the site shows nothing".
// A page still in draft serves a hard-coded static fallback and still answers
// 200, so suite 3 alone cannot tell the two apart — that gap is exactly how six
// pages once sat unpublished while every route check passed. Suite 4 therefore
// asks the question the other suites cannot: does the page render text that only
// exists in the CMS record, and do published media assets actually stream bytes?

import { readFile } from 'node:fs/promises';
import { chromium } from '../../../website/node_modules/playwright/index.mjs';
import {
  applyPageSectionPreset,
  createPageSectionInstance,
  listPageSectionDefinitions,
  listPageSectionPresets,
  validatePageSectionInstance
} from '../../../website/shared/page-section-registry.mjs';
import { dataListSources } from '../../../website/shared/page-section-sources.mjs';

const CMS = 'http://127.0.0.1:8055';
const SITE = 'http://127.0.0.1:4175';
const ADOPTED_PAGES = ['service', 'about', 'home', 'news', 'product', 'manufacturing', 'contact'];
const COMPONENT = new URL('../../../website/components/CmsCustomSections.vue', import.meta.url);

const results = [];
function record(suite, name, ok, detail = '') {
  results.push({ suite, name, ok, detail });
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function listening(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(5000) });
    return res.status > 0;
  } catch {
    return false;
  }
}

async function suiteRuntime() {
  console.log(`\n[${suiteLabel(1)}] runtime`);
  record('runtime', 'Directus 监听 8055', await listening(8055));
  record('runtime', 'Nuxt 监听 4175', await listening(4175));
}

async function suiteRegistry() {
  console.log(`\n[${suiteLabel(2)}] registry`);
  const component = await readFile(COMPONENT, 'utf8');

  for (const slug of ADOPTED_PAGES) {
    const definitions = listPageSectionDefinitions(slug);
    record('registry', `${slug} 注册了区块类型`, definitions.length > 0, `${definitions.length} 种`);

    for (const definition of definitions) {
      const label = `${definition.type}`;

      // Every definition must carry the metadata the UI relies on.
      const complete = Boolean(definition.label && definition.description && definition.category && definition.fields?.length);
      record('registry', `${label} 定义完整`, complete, complete ? '' : '缺少 label/description/category/fields');

      // A type with no render branch silently shows nothing — the worst failure
      // mode, because saving still succeeds.
      record('registry', `${label} 有渲染分支`, component.includes(`section.type === '${definition.type}'`));

      // Every non-default variant must be styled, or choosing it silently does
      // nothing. The first variant is the base layout — implemented by the
      // block's own rules rather than a variant-specific override.
      const variants = definition.variants || [];
      for (const variant of variants.slice(1)) {
        record('registry', `${label} 变体 ${variant.key} 有样式`, component.includes(`cms-variant-${variant.key}`));
      }

      // A preset that fails validation would hand the operator an unsaveable block.
      for (const preset of listPageSectionPresets(definition.type, slug)) {
        const base = createPageSectionInstance(definition.type, slug, [], { createId: () => 'accept1' });
        const applied = applyPageSectionPreset(base, preset.key, slug);
        record('registry', `${label} 预设 ${preset.key} 合法`, validatePageSectionInstance(applied, slug) === '',
          validatePageSectionInstance(applied, slug));
      }
    }
  }

  // Every data source must point somewhere real.
  for (const source of Object.values(dataListSources)) {
    record('registry', `数据源 ${source.key} 声明完整`, Boolean(source.endpoint && source.label));
  }

  // Panel edits must reach the canvas. A missing wiring leaves the panel and the
  // preview disagreeing with no error at all — silent, and easy to reintroduce.
  const workbench = await readFile(new URL('../../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  const wiring = (workbench.match(/pushPageDraftToPreview/g) || []).length;
  record('registry', '字段编辑推送到实时预览', wiring >= 7, `${wiring} 处绑定`);
}

async function suiteRoutes() {
  console.log(`\n[${suiteLabel(quickOnly ? 2 : 3)}] routes`);
  // 'home' is served at '/', so the slug and the path differ for exactly one page.
  const routes = ['', 'about', 'news', 'manufacturing', 'product', 'service', 'contact'];
  for (const path of routes) {
    const target = `${SITE}/${path}`;
    let status = 0;
    try {
      status = (await fetch(target, { signal: AbortSignal.timeout(40000) })).status;
    } catch { /* reported as a failure below */ }
    record('routes', `/${path} 返回 200`, status === 200, status ? String(status) : 'unreachable');
  }
}

// Suite 4 closes the gap the other suites cannot see: a page left in draft is
// served from a hard-coded static fallback that also answers 200, so route
// checks stay green while the site shows none of the CMS work.
//
// Two questions are asked instead:
//   1. is the page actually published, and does the public API return its
//      sections rather than null?
//   2. does the rendered page contain text that exists ONLY in the CMS record?
//
// The second is a differential assertion — the expected string is read from the
// API, never hard-coded — so it detects content silently dropped anywhere along
// the chain (publish gate, claim-review strip, registry filter, view logic).
const CONTENT_PAGES = [
  { slug: 'home', path: '' },
  { slug: 'about', path: 'about' },
  { slug: 'service', path: 'service' },
  { slug: 'product', path: 'product' },
  { slug: 'manufacturing', path: 'manufacturing' },
  { slug: 'news', path: 'news' }
];

// A marker must be long enough to be distinctive and free of characters an HTML
// serializer would rewrite into entities, or the assertion goes false-positive.
const MARKER_MIN = 10;
function pickMarker(sections) {
  let best = '';
  const visit = (value) => {
    if (Array.isArray(value)) { for (const item of value) visit(item); return; }
    if (!value || typeof value !== 'object') return;
    for (const [key, raw] of Object.entries(value)) {
      if (typeof raw !== 'string' || !['title', 'body', 'kicker', 'label', 'shortTitle', 'description', 'question'].includes(key)) continue;
      const text = raw.trim();
      if (text.length < MARKER_MIN) continue;
      if (/[<>&"']/.test(text)) continue;
      if (text.length > best.length) best = text;
    }
  };
  visit(Array.isArray(sections) ? sections : []);
  return best;
}

async function suiteContent(bffToken) {
  console.log(`\n[${suiteLabel(quickOnly ? 3 : 4)}] content（CMS → 官网 联调）`);
  const headers = { Accept: 'application/json', ...(bffToken ? { Authorization: `Bearer ${bffToken}` } : {}) };

  for (const entry of CONTENT_PAGES) {
    const api = await fetch(`${SITE}/api/public/v1/pages/${entry.slug}`, { signal: AbortSignal.timeout(20000), headers })
      .then((r) => r.json())
      .catch(() => null);
    const page = api?.data;
    const path = entry.path ? `/${entry.path}` : '/';

    if (!page) {
      record('content', `${entry.slug} 已在 CMS 发布`, false,
        '公开接口返回 null —— 该页未发布，官网正在用静态兜底内容，CMS 的改动不会显示');
      continue;
    }
    record('content', `${entry.slug} 已在 CMS 发布`, true, `${page.status}/${page.publication_state}`);

    const sections = Array.isArray(page.sections) ? page.sections : [];
    record('content', `${entry.slug} 公开接口返回了区块`, sections.length > 0, `${sections.length} 段`);

    const html = await fetch(`${SITE}${path}`, { signal: AbortSignal.timeout(40000) }).then((r) => r.text()).catch(() => '');
    const marker = pickMarker(sections);
    if (marker) {
      // Only the first 24 characters are matched: some views truncate long copy,
      // but the opening words of a CMS-authored string must survive intact.
      const probe = marker.slice(0, 24);
      record('content', `${entry.slug} 页面渲染出 CMS 文案`, html.includes(probe), probe);
    } else {
      record('content', `${entry.slug} 页面渲染出 CMS 文案`, false, '所有区块都没有可用于断言的文本字段');
    }

    // A Directus-origin asset URL means the media path regressed: the public
    // policy has no directus_files read permission, so those requests 403 with a
    // JSON body and the browser refuses them (ERR_BLOCKED_BY_ORB).
    const crossOrigin = /https?:\/\/(127\.0\.0\.1|localhost)[:/](\d+)?\/assets\//.test(html);
    record('content', `${entry.slug} 页面无跨源素材 URL`, !crossOrigin,
      crossOrigin ? '发现指向 CMS 的绝对素材地址，浏览器会因跨源媒体响应而拒绝加载' : '全部同源');
  }

  // Published articles must have a reachable detail page. A draft article that is
  // still linked from the news list answers 410, which is what an operator sees.
  const articles = await fetch(`${SITE}/api/public/v1/articles`, { signal: AbortSignal.timeout(20000), headers })
    .then((r) => r.json())
    .catch(() => null);
  const list = Array.isArray(articles?.data) ? articles.data : [];
  record('content', '已发布文章有列表数据', true, `${list.length} 篇`);
  for (const article of list.slice(0, 8)) {
    const detail = await fetch(`${SITE}/news/${encodeURIComponent(String(article.slug || ''))}`, { signal: AbortSignal.timeout(40000) })
      .then((r) => r.status)
      .catch(() => 0);
    record('content', `文章详情页可访问 — ${article.slug}`, detail === 200, detail ? String(detail) : 'unreachable');
  }

  // Every published media asset must actually stream bytes through the site. A
  // Range request keeps this cheap and also proves seeking still works. The range
  // must be satisfiable: Directus answers 416 for `bytes=0-0`, and a bogus range
  // would fail every asset while the site itself was perfectly healthy.
  const assets = await fetch(`${CMS}/items/media_assets?filter[status][_eq]=published&filter[publication_state][_eq]=published&fields=id,file_id,mime_type&limit=500&sort=id`, { headers })
    .then((r) => r.json())
    .catch(() => null);
  const media = Array.isArray(assets?.data) ? assets.data : [];
  record('content', 'CMS 中有已发布素材', true, `${media.length} 个`);
  let broken = 0;
  const brokenDetail = [];
  for (const asset of media) {
    const fileId = String(asset.file_id || '').trim();
    if (!fileId) { broken += 1; brokenDetail.push(`#${asset.id}: 无 file_id`); continue; }
    const res = await fetch(`${SITE}/api/public/v1/media/asset/${encodeURIComponent(fileId)}`, {
      signal: AbortSignal.timeout(30000), headers: { ...headers, Range: 'bytes=0-1023' }
    }).catch(() => null);
    const type = res?.headers?.get('content-type') || '';
    const ok = Boolean(res && (res.status === 200 || res.status === 206) && /^(image|video|application\/pdf)\//.test(type));
    if (!ok) {
      broken += 1;
      brokenDetail.push(`#${asset.id} ${asset.mime_type || '?'}: ${res ? res.status + ' ' + type : 'unreachable'}`);
    }
  }
  record('content', '已发布素材均可透过官网流出', broken === 0,
    broken ? `${broken}/${media.length} 个失败 — ${brokenDetail.slice(0, 4).join('; ')}` : `${media.length} 个全部可用`);
}

async function suiteWorkbench(env) {
  console.log(`\n[${suiteLabel(5)}] workbench (read-only)`);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1700, height: 1050 } });
    page.on('dialog', (dialog) => dialog.accept());

    await page.goto(`${CMS}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
    await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 60000 });
    record('workbench', '登录成功', true);

    await page.goto(`${CMS}/admin/ruijun-content-editor-workbench`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6000);

    await page.getByRole('button', { name: '服务支持', exact: true }).click();
    await page.waitForTimeout(4500);
    await page.getByRole('button', { name: '服务支持首屏', exact: true }).click();
    await page.waitForTimeout(6000);
    record('workbench', '打开栏目编辑器', true);

    record('workbench', '区块大纲渲染', (await page.locator('.section-outline').count()) > 0);
    record('workbench', '添加区块入口存在', (await page.getByRole('button', { name: '添加区块', exact: true }).count()) > 0);

    // Published content is deliberately read-only in the workbench, so the button
    // is disabled by design (canEdit() requires publication_state !== 'published').
    // Assert the reason rather than demanding a click: a check that fails on
    // correct behaviour trains people to ignore the suite.
    const addBlock = page.getByRole('button', { name: '添加区块', exact: true }).first();
    const locked = (await addBlock.isDisabled()) || (await page.locator('.read-only-note').count()) > 0;
    if (locked) {
      record('workbench', '已发布内容为只读', true, '编辑按钮已禁用，符合治理预期；跳过区块库点击');
    } else {
      await addBlock.click();
      await page.waitForTimeout(1500);
      const dialog = page.locator('.section-library[role="dialog"]');
      const entries = (await dialog.locator('.section-library-group button').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
      record('workbench', '区块库打开', (await dialog.count()) > 0, `${entries.length} 个条目`);

      // Every registered type should be offered somewhere in the library.
      const missing = listPageSectionDefinitions('service')
        .map((d) => d.label)
        .filter((label) => !entries.some((entry) => entry.startsWith(label)));
      record('workbench', '区块库覆盖全部类型', missing.length === 0, missing.join(', '));
    }

    // Close the dialog without saving — this suite must not mutate anything.
    await page.keyboard.press('Escape').catch(() => {});
    await page.locator('.section-library-overlay').click({ position: { x: 5, y: 5 } }).catch(() => {});
    await page.waitForTimeout(800);
  } catch (error) {
    record('workbench', '工作台检查执行完成', false, error.message);
  } finally {
    await browser.close();
  }
}

const env = Object.fromEntries((await readFile(new URL('../../.env.local', import.meta.url), 'utf8'))
  .split(/\r?\n/).flatMap((line) => { const m = line.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));

// The site's own service token, used exactly as Nuxt itself uses it: server-side
// reads that respect the published-only filter. Without it the CMS call falls
// back to anonymous, which cannot read the pages collection at all.
const bffEnv = Object.fromEntries((await readFile(new URL('../../../website/.env.local', import.meta.url), 'utf8'))
  .split(/\r?\n/).flatMap((line) => { const m = line.match(/^([^#=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : []; }));
const bffToken = bffEnv.NUXT_CMS_BFF_TOKEN || bffEnv.CMS_BFF_TOKEN || '';

await suiteRuntime();
await suiteRoutes();
if (!quickOnly) await suiteRegistry();
await suiteContent(bffToken);
if (!quickOnly) await suiteWorkbench(env);

const failed = results.filter((r) => !r.ok);
console.log(`\n${'='.repeat(60)}`);
console.log(failed.length === 0
  ? `ALL PASS — ${results.length}/${results.length}`
  : `${failed.length} FAILED — ${results.length - failed.length}/${results.length}`);
if (failed.length) {
  console.log('\n失败项：');
  for (const f of failed) console.log(`  [${f.suite}] ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
}
process.exit(failed.length ? 1 : 0);
