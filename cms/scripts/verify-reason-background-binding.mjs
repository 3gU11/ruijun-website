import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

// Proves the data half of the fix: once a reason section carries a media entry
// whose role is bindable, the canvas exposes the background for replacement
// instead of reporting it as a static asset. Original payload is restored.
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
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status}`);
  return response.status === 204 ? null : (await response.json()).data;
}

token = (await api('/auth/login', 'POST', { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })).access_token;
const originalPage = await api('/items/pages/1?fields=id,sections');
const originalSection = originalPage.sections.find((section) => section.id === 'advanced-manufacturing');
console.log(JSON.stringify({ step: 'baseline', media: originalSection.media }));

// Bind the background asset exactly as the (now fixed) workbench would.
const patched = originalPage.sections.map((section) => section.id === 'advanced-manufacturing'
  ? { ...section, media: [...(section.media || []), { role: 'background', media_asset_id: '90' }] }
  : section);
await api('/items/pages/1', 'PATCH', { sections: patched });
const afterPatch = await api('/items/pages/1?fields=sections');
console.log(JSON.stringify({ step: 'patched', media: afterPatch.sections.find((s) => s.id === 'advanced-manufacturing').media }));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
try {
  await page.goto(`${cms}/admin/login`);
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));

  await page.goto(`${cms}/admin/ruijun-content-editor-workbench`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '三大特点', exact: true }).click();
  await page.getByRole('button', { name: '打开实时预览', exact: true }).click();

  const frame = page.frameLocator('iframe');
  await frame.locator('html[data-cms-preview-edit-mode]').first().waitFor({ state: 'attached', timeout: 60000 });
  const editModeButton = page.getByRole('button', { name: '编辑模式', exact: true });
  if (await editModeButton.count()) await editModeButton.click();
  const mediaTool = page.getByTitle('选择图片或视频', { exact: true });
  if (await mediaTool.count()) await mediaTool.click();
  await frame.locator('html[data-cms-preview-edit-mode="true"]').waitFor({ state: 'attached', timeout: 20000 }).catch(() => null);
  await page.waitForTimeout(2500);

  const scenes = await frame.locator('html').evaluate(() => [...document.querySelectorAll('.reason-scene img.scene-photo')].map((node) => ({
    key: node.closest('.reason-scene')?.getAttribute('data-cms-preview-key') || '',
    fieldPath: node.getAttribute('data-cms-preview-field-path') || '',
    readonly: node.getAttribute('data-cms-preview-readonly') || '',
    placement: node.getAttribute('data-cms-preview-placement-key') || ''
  })));
  console.log(JSON.stringify({ step: 'canvas-scenes', scenes }));
  const target = scenes.find((scene) => scene.key === 'advanced-manufacturing');
  console.log(JSON.stringify({
    step: 'verdict',
    backgroundBindable: Boolean(target && target.fieldPath && !target.readonly),
    fieldPath: target?.fieldPath || '',
    readonly: target?.readonly || ''
  }));
} finally {
  await browser.close();
  await api('/items/pages/1', 'PATCH', { sections: originalPage.sections });
  const restored = await api('/items/pages/1?fields=sections');
  console.log(JSON.stringify({ step: 'restore', mediaRestored: JSON.stringify(restored.sections.find((s) => s.id === 'advanced-manufacturing').media) === JSON.stringify(originalSection.media) }));
}
