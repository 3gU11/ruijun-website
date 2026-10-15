import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

// BB-23 / BB-25 probe: exercise duplicate and delete on a real list, capture the
// confirm dialog, then verify the canvas reflects the change. Restores the
// original section payload at the end so no content is left modified.
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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const dialogs = [];
page.on('dialog', async (dialog) => {
  dialogs.push({ type: dialog.type(), message: dialog.message().slice(0, 120) });
  await dialog.dismiss();   // First pass: cancel. Verifies BB-25's cancel path.
});

let original;
try {
  token = (await api('/auth/login', 'POST', { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })).access_token;
  original = await api('/items/pages/2?fields=id,sections');
  const section = original.sections.find((item) => item.id === 'overview');
  console.log(JSON.stringify({ step: 'baseline', sectionId: 'overview', itemCount: section?.items?.length }));

  await page.goto(`${cms}/admin/login`);
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(env.ADMIN_EMAIL);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));

  await page.goto(`${cms}/admin/ruijun-content-editor-workbench`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '关于瑞钧', exact: true }).click();
  await page.getByRole('button', { name: '公司简介', exact: true }).click();
  await page.getByRole('button', { name: '打开实时预览', exact: true }).click();
  const frame = page.frameLocator('iframe');
  await frame.locator('html[data-cms-preview-edit-mode]').first().waitFor({ state: 'attached', timeout: 45000 });
  const editModeButton = page.getByRole('button', { name: '编辑模式', exact: true });
  if (await editModeButton.count()) await editModeButton.click();
  const textTool = page.getByTitle('选择文字元素', { exact: true });
  if (await textTool.count()) await textTool.click();
  await frame.locator('html[data-cms-preview-edit-mode="true"]').waitFor({ state: 'attached', timeout: 20000 }).catch(() => null);
  await page.waitForTimeout(900);

  // Select an overview bullet (a real stored `items.N.label` entry).
  const itemSelector = '.overview-top li';
  const target = frame.locator(itemSelector).first();
  if (!(await target.count())) {
    console.log(JSON.stringify({ step: 'select', status: 'TARGET-NOT-FOUND' }));
  } else {
    await target.scrollIntoViewIfNeeded().catch(() => null);
    await target.click({ timeout: 10000 });
    const panel = page.getByRole('complementary', { name: '选中元素属性' });
    await panel.waitFor({ timeout: 8000 });
    console.log(JSON.stringify({ step: 'select', panelText: (await panel.innerText()).replace(/\s+/g, ' ').slice(0, 180) }));
    const orderPanel = panel.locator('.visual-list-order');
    console.log(JSON.stringify({ step: 'list-order', present: await orderPanel.count() > 0, text: await orderPanel.count() ? (await orderPanel.innerText()).replace(/\s+/g, ' ') : '' }));

    // BB-25: delete must ask for confirmation, and cancelling must keep the item.
    const beforeDelete = await frame.locator(itemSelector).count();
    await panel.getByRole('button', { name: '删除', exact: true }).click();
    await page.waitForTimeout(600);
    const afterCancel = await frame.locator(itemSelector).count();
    console.log(JSON.stringify({ step: 'delete-cancel', dialogs, itemsBefore: beforeDelete, itemsAfterCancel: afterCancel, cancelKeptItem: beforeDelete === afterCancel }));

    // BB-23: duplicate should add exactly one entry.
    await panel.getByRole('button', { name: '复制', exact: true }).click();
    await page.waitForTimeout(900);
    const afterDuplicate = await frame.locator(itemSelector).count();
    console.log(JSON.stringify({ step: 'duplicate', itemsAfterDuplicate: afterDuplicate, addedOne: afterDuplicate === beforeDelete + 1 }));
    console.log(JSON.stringify({ step: 'dirty-state', saveEnabled: await page.locator('.visual-save-button:not([disabled])').count() > 0 }));
  }
} finally {
  if (original) {
    await api('/items/pages/2', 'PATCH', { sections: original.sections });
    const restored = await api('/items/pages/2?fields=id,sections');
    console.log(JSON.stringify({ step: 'restore', sectionsUnchanged: JSON.stringify(restored.sections) === JSON.stringify(original.sections) }));
  }
  await browser.close();
}
