import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

const cms = 'http://127.0.0.1:8055';
const seriesId = String(process.argv[2] || '1');
const initialAssetId = String(process.argv[3] || '25');
const alternateAssetId = String(process.argv[4] || '26');
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : [];
}));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const request = page.context().request;
let token;
async function api(path, method = 'GET', body) {
  const response = await request.fetch(`${cms}${path}`, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, ...(body ? { data: body } : {}) });
  if (!response.ok()) throw new Error(`${method} ${path}: ${response.status()} ${await response.text()}`);
  return response.status() === 204 ? null : (await response.json()).data;
}
let original;
async function pixels(locator) {
  return locator.evaluate(async node => {
    await node.decode();
    if (!node.naturalWidth || !node.naturalHeight) throw new Error('Cover failed to decode');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    canvas.getContext('2d').drawImage(node, 0, 0, 32, 32);
    return canvas.toDataURL();
  });
}
let temporaryAssetId;
let alternateTemporaryAssetId;
try {
  token = (await (await fetch(`${cms}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) })).json()).data.access_token;
  original = await api(`/items/product_series/${seriesId}`);
  assert.equal(original.status, 'draft');
  const source = await api(`/items/media_assets/${initialAssetId}`);
  const temporary = await api('/items/media_assets', 'POST', {
    file_id: source.file_id, original_file_name: source.original_file_name, mime_type: source.mime_type, byte_size: source.byte_size,
    width: source.width, height: source.height, aspect_ratio: source.aspect_ratio, usage_scope: 'product', media_type: 'image',
    placement_key: 'product.series.cover', page_key: 'product', section_key: 'series-cover', alt_text: '临时系列封面',
    copyright_status: source.copyright_status || 'internal', authorization_note: '临时内部验收', enabled: true, status: 'draft', publication_state: 'unpublished', title: '临时系列封面'
  });
  temporaryAssetId = String(temporary.id);
  const alternateSource = await api(`/items/media_assets/${alternateAssetId}`);
  const alternateTemporary = await api('/items/media_assets', 'POST', {
    file_id: alternateSource.file_id, original_file_name: alternateSource.original_file_name, mime_type: alternateSource.mime_type, byte_size: alternateSource.byte_size,
    width: alternateSource.width, height: alternateSource.height, aspect_ratio: alternateSource.aspect_ratio, usage_scope: 'product', media_type: 'image',
    placement_key: 'product.series.cover', page_key: 'product', section_key: 'series-cover', alt_text: '临时系列封面二', copyright_status: alternateSource.copyright_status || 'internal', authorization_note: '临时内部验收', enabled: true, status: 'draft', publication_state: 'unpublished', title: '临时系列封面二'
  });
  alternateTemporaryAssetId = String(alternateTemporary.id);
  await api(`/items/product_series/${seriesId}`, 'PATCH', { cover_asset: temporaryAssetId });
  await page.goto(`${cms}/admin/login`);
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL(url => !url.pathname.endsWith('/login'));
  await page.goto(`${cms}/admin/ruijun-content-editor-workbench`);
  await page.getByRole('button', { name: '产品展示', exact: true }).click();
  await page.getByRole('button', { name: '产品系列与型号', exact: true }).click();
  await page.getByRole('button', { name: '打开实时预览', exact: true }).click();
  const frame = page.frameLocator('iframe');
  const image = frame.locator(`.product-card-wrap[data-cms-preview-item-id="${seriesId}"] img[data-cms-preview-media-role="cover"]`);
  await image.waitFor({ state: 'attached' });
  await page.getByTitle('选择图片或视频', { exact: true }).click();
  await frame.locator('html[data-cms-preview-edit-mode="true"][data-cms-preview-edit-tool="media"]').waitFor({ state: 'attached' });
  await image.click();
  const panel = page.getByRole('complementary', { name: '选中元素属性' });
  await panel.waitFor();
  assert.match(await panel.innerText(), new RegExp(`product_series/${seriesId} · cover_asset`));
  const candidates = await panel.getByLabel(/^媒体替换/).locator('option').evaluateAll(options => options.map(option => option.value));
  assert.ok(candidates.includes(temporaryAssetId));
  const beforePixels = await pixels(image);
  await panel.getByLabel(/^媒体替换/).selectOption(alternateTemporaryAssetId);
  await page.waitForFunction(() => !document.querySelector('.visual-save-button')?.disabled);
  await page.waitForTimeout(800);
  assert.ok((await image.getAttribute('src') || '').includes(`/api/preview/media/${alternateTemporaryAssetId}`));
  const afterPixels = await pixels(image);
  assert.notEqual(beforePixels, afterPixels, 'Series cover pixels must change');
  const saveResponse = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname === `/items/product_series/${seriesId}`);
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  assert.ok((await saveResponse).ok());
  await page.waitForFunction(() => document.querySelector('.visual-save-button')?.disabled === true);
  const saved = await api(`/items/product_series/${seriesId}?fields=id,cover_asset`);
  assert.equal(String(saved.cover_asset), alternateTemporaryAssetId);
  await page.goto(`${cms}/admin/ruijun-content-editor-workbench`);
  await page.getByRole('button', { name: '产品展示', exact: true }).click();
  await page.getByRole('button', { name: '产品系列与型号', exact: true }).click();
  await page.getByRole('button', { name: '打开实时预览', exact: true }).click();
  const reloaded = page.frameLocator('iframe').locator(`.product-card-wrap[data-cms-preview-item-id="${seriesId}"] img[data-cms-preview-media-role="cover"]`);
  await reloaded.waitFor({ state: 'attached' });
  assert.ok((await reloaded.getAttribute('src') || '').includes(`/api/preview/media/${alternateTemporaryAssetId}`));
  assert.equal(await pixels(reloaded), afterPixels, 'Reloaded cover pixels must persist');
  console.log(JSON.stringify({ differentPixelsVerified: true, reloadPixelsVerified: true }));
  console.log(JSON.stringify({ check: 'product-series-cover-browser', seriesId, selected: true, replaced: true, saved: true, authenticatedReadback: true, reloaded: true }));
} finally {
  if (original) {
    await api(`/items/product_series/${seriesId}`, 'PATCH', { cover_asset: original.cover_asset || null });
    const restored = await api(`/items/product_series/${seriesId}?fields=id,cover_asset`);
    assert.equal(restored.cover_asset || null, original.cover_asset || null);
    console.log(JSON.stringify({ seriesId, restored: true }));
  }
  if (temporaryAssetId) {
    await api(`/items/media_assets/${temporaryAssetId}`, 'DELETE');
    assert.deepEqual(await api(`/items/media_assets?filter[id][_eq]=${temporaryAssetId}`), []);
  }
  if (alternateTemporaryAssetId) {
    await api(`/items/media_assets/${alternateTemporaryAssetId}`, 'DELETE');
    assert.deepEqual(await api(`/items/media_assets?filter[id][_eq]=${alternateTemporaryAssetId}`), []);
  }
  await browser.close();
  console.log(JSON.stringify({ cleanupVerified: true, temporaryAssetId, alternateTemporaryAssetId }));
}
