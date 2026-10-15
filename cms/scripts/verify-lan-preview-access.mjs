import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

// Regression guard for LAN visual-editing access.
//
// The operator's browser — not the server's loopback interface — has to reach
// the preview canvas. If the CMS hands back a 127.0.0.1 preview URL, every LAN
// user gets a blank canvas while localhost keeps working, which makes the bug
// very easy to miss. This script drives the whole flow through a LAN hostname.
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : [];
}));

const configuredHost = String(env.WEBSITE_PREVIEW_ALLOWED_HOSTS || '').split(',')
  .map((host) => host.trim()).find((host) => host && host !== '127.0.0.1' && host !== 'localhost');
assert.ok(configuredHost, 'WEBSITE_PREVIEW_ALLOWED_HOSTS must name a non-loopback LAN host for this check');
const cmsHost = process.argv[2] || `http://${configuredHost}:8055`;
const websiteHost = process.argv[3] || `http://${configuredHost}:4175`;
const allowLoopbackPreviewUrl = process.argv.includes('--allow-loopback');
let issuedPreviewUrl = '';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errorResponses = [];
page.on('response', async (response) => {
  if (response.status() >= 400) {
    // Directus answers a token refresh before expiry and a translations query
    // the content role cannot read; neither affects the canvas.
    if (/\/(auth\/refresh|translations)\b/.test(response.url())) return;
    let body = '';
    try { body = (await response.text()).slice(0, 160); } catch { body = '<unreadable>'; }
    errorResponses.push({ status: response.status(), url: response.url(), body: body.replace(/\s+/g, ' ') });
  }
});

try {
  await page.goto(`${cmsHost}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 60000 });

  await page.goto(`${cmsHost}/admin/ruijun-content-editor-workbench`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: '先进制造', exact: true }).click();
  await page.getByRole('button', { name: '制造首屏', exact: true }).click();
  await page.locator('.section-card[data-section-key="hero"] input').first().click();

  // Await the issued token before clicking through, so the preview URL is
  // captured deterministically instead of racing the response listener.
  const issueResponse = page.waitForResponse((response) => response.url().includes('/content-preview-tokens/issue'), { timeout: 30000 });
  await page.getByRole('button', { name: '打开实时预览', exact: true }).click();
  issuedPreviewUrl = String((await (await issueResponse).json())?.data?.preview_open_url || '');

  assert.ok(issuedPreviewUrl, 'the CMS must return a preview_open_url');
  if (!allowLoopbackPreviewUrl) {
    // The regression this script exists for: a loopback preview URL is
    // unreachable from the operator's machine even though the server is healthy.
    assert.doesNotMatch(issuedPreviewUrl, /\/\/(?:127\.0\.0\.1|localhost)[:/]/,
      `preview_open_url must be LAN-reachable, got ${issuedPreviewUrl}`);
  }
  const previewHost = new URL(issuedPreviewUrl).hostname;

  const frame = page.frameLocator('iframe');
  await frame.locator('html[data-cms-preview-edit-mode]').first().waitFor({ state: 'attached', timeout: 45000 });
  const probe = await frame.locator('html').evaluate((node) => ({
    editMode: node.dataset.cmsPreviewEditMode ?? null,
    target: node.dataset.cmsPreviewTarget ?? null,
    bodyLen: document.body.innerHTML.length
  }));
  assert.ok(probe.bodyLen > 1000, `canvas must render over LAN, got bodyLen=${probe.bodyLen}`);

  const editModeButton = page.getByRole('button', { name: '编辑模式', exact: true });
  if (await editModeButton.count()) await editModeButton.click();
  const mediaTool = page.getByTitle('选择图片或视频', { exact: true });
  if (await mediaTool.count()) await mediaTool.click();
  const mediaToolReady = await frame.locator('html[data-cms-preview-edit-mode="true"][data-cms-preview-edit-tool="media"]')
    .waitFor({ state: 'attached', timeout: 20000 }).then(() => true).catch(() => false);
  assert.equal(mediaToolReady, true, 'the media replacement tool must activate over LAN');

  const image = frame.locator('img.psd-layer--hero-building');
  await image.waitFor({ state: 'attached', timeout: 20000 });
  const attrs = await image.evaluate((node) => Object.fromEntries([...node.attributes]
    .filter((attribute) => attribute.name.startsWith('data-cms-preview'))
    .map((attribute) => [attribute.name.replace('data-cms-preview-', ''), attribute.value])));
  assert.equal(attrs.editable, 'true', 'the canvas node must expose an editable binding');
  assert.ok(attrs.collection && attrs['item-id'] && attrs['field-path'], `canvas binding must be complete, got ${JSON.stringify(attrs)}`);

  const editableCount = await frame.locator('[data-cms-preview-editable="true"]').count();
  assert.ok(editableCount > 0, 'at least one editable node must be present');
  assert.deepEqual(errorResponses, [], `unexpected failing requests: ${JSON.stringify(errorResponses)}`);

  console.log(JSON.stringify({
    check: 'lan-preview-access',
    cmsHost,
    websiteHost,
    previewHost,
    editMode: probe.editMode,
    target: probe.target,
    mediaToolReady,
    editableNodeCount: editableCount,
    canvasBinding: attrs
  }));
} finally {
  await browser.close();
}
