import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

const cms = 'http://127.0.0.1:8055';
const qualificationId = String(process.argv[2] || '12');
const alternateAssetId = String(process.argv[3] || (qualificationId === '12' ? '121' : '120'));
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
async function decodedPixels(locator) {
  return locator.evaluate(async node => {
    await node.decode();
    if (!node.naturalWidth || !node.naturalHeight) throw new Error('Qualification image did not decode');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    canvas.getContext('2d').drawImage(node, 0, 0, 32, 32);
    return canvas.toDataURL();
  });
}
try {
  token = (await (await fetch(`${cms}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) })).json()).data.access_token;
  original = await api(`/items/qualifications/${qualificationId}`);
  assert.equal(original.type, qualificationId === '12' ? 'honor' : 'patent');
  await page.goto(`${cms}/admin/login`);
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL(url => !url.pathname.endsWith('/login'));
  await page.goto(`${cms}/admin/ruijun-content-editor-workbench`);
  await page.getByRole('button', { name: '关于瑞钧', exact: true }).click();
  await page.getByRole('button', { name: original.type === 'honor' ? '荣誉证书' : '专利证书', exact: true }).click();
  await page.getByRole('button', { name: '打开实时预览', exact: true }).click();
  const frame = page.frameLocator('iframe');
  const row = original.type === 'honor' ? '.honor-row' : '.patent-row';
  const image = frame.locator(`${row} img`).first();
  await image.waitFor({ state: 'attached' });
  await page.getByTitle('选择图片或视频', { exact: true }).click();
  await frame.locator('html[data-cms-preview-edit-mode="true"][data-cms-preview-edit-tool="media"]').waitFor({ state: 'attached' });
  await image.scrollIntoViewIfNeeded();
  const bounds = await image.boundingBox();
  assert.ok(bounds && bounds.width > 0 && bounds.height > 0, 'Qualification image must be visible');
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  const panel = page.getByRole('complementary', { name: '选中元素属性' });
  await panel.waitFor();
  assert.match(await panel.innerText(), new RegExp(`qualifications/${qualificationId} · assets\\.0`));
  const beforePixels = await decodedPixels(image);
  await panel.getByLabel(/^媒体替换/).selectOption(alternateAssetId);
  await page.waitForFunction(() => !document.querySelector('.visual-save-button')?.disabled);
  await page.waitForTimeout(800);
  assert.ok((await image.getAttribute('src') || '').includes(`/api/preview/media/${alternateAssetId}`));
  const afterPixels = await decodedPixels(image);
  assert.notEqual(afterPixels, beforePixels, 'Replacement must change decoded image pixels');
  const saveResponse = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname === `/items/qualifications/${qualificationId}`);
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  assert.ok((await saveResponse).ok());
  await page.waitForFunction(() => document.querySelector('.visual-save-button')?.disabled === true);
  const saved = await api(`/items/qualifications/${qualificationId}?fields=id,assets`);
  assert.equal(String(saved.assets?.[0]?.media_asset_id), alternateAssetId);
  await page.goto(`${cms}/admin/ruijun-content-editor-workbench`);
  await page.getByRole('button', { name: '关于瑞钧', exact: true }).click();
  await page.getByRole('button', { name: original.type === 'honor' ? '荣誉证书' : '专利证书', exact: true }).click();
  await page.getByRole('button', { name: '打开实时预览', exact: true }).click();
  const reloaded = page.frameLocator('iframe').locator(`${row} img`).first();
  await reloaded.waitFor({ state: 'attached' });
  assert.ok((await reloaded.getAttribute('src') || '').includes(`/api/preview/media/${alternateAssetId}`));
  assert.equal(await decodedPixels(reloaded), afterPixels, 'Reload must preserve decoded pixels');
  console.log(JSON.stringify({ qualificationId, differentPixelsVerified: true, reloadPixelsVerified: true }));
  console.log(JSON.stringify({ check: 'about-qualification-browser', qualificationId, type: original.type, selected: true, replaced: true, saved: true, authenticatedReadback: true, reloaded: true }));
} finally {
  if (original) {
    await api(`/items/qualifications/${qualificationId}`, 'PATCH', { assets: original.assets });
    const restored = await api(`/items/qualifications/${qualificationId}?fields=id,assets`);
    assert.deepEqual(restored.assets, original.assets);
    console.log(JSON.stringify({ qualificationId, restored: true }));
  }
  await browser.close();
}
