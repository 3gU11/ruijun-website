import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

// Verifies the BB-22 fix end to end: a published video article must expose a
// separate cover entry inside the canvas edit mode. Creates temporary records
// and removes them in `finally`.
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : [];
}));
const cms = 'http://127.0.0.1:8055';
let token;
async function api(path, method = 'GET', body) {
  const response = await fetch(`${cms}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${(await response.text()).slice(0, 160)}`);
  return response.status === 204 ? null : (await response.json()).data;
}

let tempAssetId;
let tempArticleId;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

try {
  token = (await api('/auth/login', 'POST', { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })).access_token;

  const source = await api('/items/media_assets/133');
  // Copy the governed usage metadata verbatim so the record passes the same
  // validation the CMS form enforces, then publish it so the reader resolves it.
  const copyFields = ['file_id', 'original_file_name', 'mime_type', 'byte_size', 'usage_scope', 'media_type',
    'width', 'height', 'aspect_ratio', 'placement_key', 'page_key', 'section_key', 'copyright_status',
    'duration_seconds', 'transcript'];
  const asset = await api('/items/media_assets', 'POST', {
    ...Object.fromEntries(copyFields.filter((key) => source[key] != null).map((key) => [key, source[key]])),
    alt_text: '临时视频', authorization_note: '临时 BB-22 验证', enabled: true,
    status: 'published', publication_state: 'published', title: '临时 BB-22 验证视频'
  });
  tempAssetId = String(asset.id);
  const article = await api('/items/articles', 'POST', {
    title: '临时 BB-22 验证文章', slug: 'tmp-bb22-verify', status: 'draft', publication_state: 'unpublished',
    category: 'news', media: [{ media_asset_id: tempAssetId }], summary: '临时验证'
  });
  tempArticleId = String(article.id);
  console.log(JSON.stringify({ step: 'setup', tempAssetId, tempArticleId }));

  await page.goto(`${cms}/admin/login`);
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));

  await page.goto(`${cms}/admin/ruijun-content-editor-workbench`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '视频新闻', exact: true }).click();
  await page.getByRole('button', { name: '动态新闻内容', exact: true }).click();
  const row = page.locator('.record-choice').filter({ hasText: '临时 BB-22 验证文章' }).first();
  await row.waitFor({ timeout: 30000 });
  await row.click();
  await page.getByRole('button', { name: '打开实时预览', exact: true }).click();

  const frame = page.frameLocator('iframe');
  await frame.locator('html[data-cms-preview-edit-mode]').first().waitFor({ state: 'attached', timeout: 45000 });
  const editModeButton = page.getByRole('button', { name: '编辑模式', exact: true });
  if (await editModeButton.count()) await editModeButton.click();
  await frame.locator('html[data-cms-preview-edit-mode="true"]').waitFor({ state: 'attached', timeout: 20000 }).catch(() => null);
  await page.waitForTimeout(1200);

  const videoCount = await frame.locator('.article-media video').count();
  const cover = frame.locator('.cms-hidden-media-preview img');
  const coverCount = await cover.count();
  console.log(JSON.stringify({ step: 'canvas', videoCount, coverEntryPresent: coverCount > 0 }));

  if (coverCount) {
    console.log(JSON.stringify({ step: 'cover-attrs', attrs: await cover.first().evaluate((node) => Object.fromEntries([...node.attributes]
      .filter((attribute) => attribute.name.startsWith('data-cms-preview'))
      .map((attribute) => [attribute.name.replace('data-cms-preview-', ''), attribute.value]))) }));
    const mediaTool = page.getByTitle('选择图片或视频', { exact: true });
    if (await mediaTool.count()) await mediaTool.click();
    await page.waitForTimeout(400);
    await cover.first().scrollIntoViewIfNeeded().catch(() => null);
    await cover.first().click({ timeout: 10000 });
    await page.waitForTimeout(800);
    const panel = page.getByRole('complementary', { name: '选中元素属性' });
    const visible = (await panel.count()) > 0;
    console.log(JSON.stringify({ step: 'cover-panel', visible, text: visible ? (await panel.innerText()).replace(/\s+/g, ' ').slice(0, 260) : '' }));
  }
} finally {
  if (tempArticleId) { await api(`/items/articles/${tempArticleId}`, 'DELETE').catch(() => null); }
  if (tempAssetId) { await api(`/items/media_assets/${tempAssetId}`, 'DELETE').catch(() => null); }
  const leftArticles = tempArticleId ? await api(`/items/articles?filter[id][_eq]=${tempArticleId}`).catch(() => []) : [];
  const leftAssets = tempAssetId ? await api(`/items/media_assets?filter[id][_eq]=${tempAssetId}`).catch(() => []) : [];
  console.log(JSON.stringify({ step: 'cleanup', articleRemoved: leftArticles.length === 0, assetRemoved: leftAssets.length === 0 }));
  await browser.close();
}
