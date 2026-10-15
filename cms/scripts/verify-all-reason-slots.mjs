import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

// Confirms every homepage reason scene now exposes a bindable background /
// foreground slot on the canvas. Read-only.
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : [];
}));
const cms = 'http://127.0.0.1:8055';

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
  await page.waitForTimeout(2500);

  const scenes = await frame.locator('html').evaluate(() => [...document.querySelectorAll('.reason-scene')].map((scene) => {
    const image = scene.querySelector('img.scene-photo, img.performance-machine');
    return {
      key: scene.getAttribute('data-cms-preview-key') || '',
      mode: scene.className.includes('reason-performance') ? 'machine' : 'photo',
      role: image?.getAttribute('data-cms-preview-media-role') || '',
      placement: image?.getAttribute('data-cms-preview-placement-key') || '',
      fieldPath: image?.getAttribute('data-cms-preview-field-path') || '',
      readonly: image?.getAttribute('data-cms-preview-readonly') || ''
    };
  }));
  scenes.forEach((scene) => console.log(JSON.stringify(scene)));
  console.log(JSON.stringify({
    step: 'verdict',
    total: scenes.length,
    editable: scenes.filter((scene) => scene.fieldPath && !scene.readonly).length,
    allEditable: scenes.length > 0 && scenes.every((scene) => Boolean(scene.fieldPath) && !scene.readonly)
  }));
} finally {
  await browser.close();
}
