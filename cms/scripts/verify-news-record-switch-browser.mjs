import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

// BB-30: switching between two news records must not leak unsaved content from
// one draft into another. Read-only with respect to persisted data.
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : [];
}));
const base = 'http://127.0.0.1:8055';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const dialogs = [];
page.on('dialog', async (dialog) => {
  dialogs.push(dialog.message());
  await dialog.accept(); // Accept switching away from the unsaved draft.
});

try {
  await page.goto(`${base}/admin/login`);
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));

  await page.goto(`${base}/admin/ruijun-content-editor-workbench`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '视频新闻', exact: true }).click();
  await page.getByRole('button', { name: '动态新闻内容', exact: true }).click();

  const choices = page.locator('.record-choice');
  const count = await choices.count();
  console.log(JSON.stringify({ step: 'records', count }));
  if (count < 2) throw new Error(`BB-30 needs at least two news records; got ${count}`);

  await choices.nth(0).click();
  const titleInput = page.locator('form').getByLabel('标题', { exact: true }).first();
  await titleInput.waitFor({ timeout: 15000 });
  const firstOriginal = await titleInput.inputValue();
  const marker = `BB30-UNSAVED-${Date.now()}`;
  await titleInput.fill(marker);
  console.log(JSON.stringify({ step: 'edit-first', firstOriginal, markerApplied: await titleInput.inputValue() === marker }));

  // Select the second item. The workbench must warn, then load its own record.
  await choices.nth(1).click();
  await page.waitForTimeout(700);
  const secondTitle = await titleInput.inputValue();
  console.log(JSON.stringify({ step: 'switch-second', dialogShown: dialogs.length > 0, secondTitle, noLeak: secondTitle !== marker }));

  // Return to the first. Since the switch was accepted, its unsaved marker must
  // be gone and the persisted title must reappear.
  await choices.nth(0).click();
  await page.waitForTimeout(700);
  const firstAfter = await titleInput.inputValue();
  console.log(JSON.stringify({ step: 'return-first', firstAfter, restoredPersistedValue: firstAfter === firstOriginal, markerGone: firstAfter !== marker }));
} finally {
  await browser.close();
}
