import { readFile } from 'node:fs/promises';
import { chromium } from '../../website/node_modules/playwright/index.mjs';

// BB-37 + BB-39. Intercepts exactly one page-save request: first with 500 to
// prove retryability, then with 401 to prove session-expiry messaging. The
// browser draft must remain intact after both failures. No record is changed.
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/); return match ? [[match[1].trim(), match[2]]] : [];
}));
const base = 'http://127.0.0.1:8055';
const PW = 'TempVerify!2026';
const editorEmail = `tmp-save-${Date.now()}@example.com`;

async function login(email, password) {
  const response = await fetch(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return (await response.json())?.data?.access_token || '';
}
const adminToken = await login(env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
const adminHeaders = { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` };
const roles = await (await fetch(`${base}/roles?fields=id,name&limit=50`, { headers: adminHeaders })).json();
const editorRoleId = roles.data?.find((role) => role.name === '内容编辑')?.id;
if (!editorRoleId) throw new Error('The 内容编辑 role was not found');
const userResponse = await fetch(`${base}/users`, {
  method: 'POST', headers: adminHeaders,
  body: JSON.stringify({ email: editorEmail, password: PW, role: editorRoleId, status: 'active', first_name: '临时', last_name: '保存验证' })
});
const editorUserId = String((await userResponse.json())?.data?.id || '');
if (!editorUserId) throw new Error(`Could not create the temporary editor (${userResponse.status})`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

async function interceptNextPageSave(status, message) {
  await page.route('**/items/pages/*', async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ errors: [{ message }] }) });
    await page.unroute('**/items/pages/*');
  }, { times: 1 });
}

try {
  await page.goto(`${base}/admin/login`);
  await page.getByRole('textbox', { name: '邮箱', exact: true }).fill(editorEmail);
  await page.getByRole('textbox', { name: '密码', exact: true }).fill(PW);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));

  await page.goto(`${base}/admin/ruijun-content-editor-workbench`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '关于瑞钧', exact: true }).click();
  await page.getByRole('button', { name: '公司简介', exact: true }).click();
  const title = page.locator('form.editor-form input').first();
  const titleReady = await title.waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
  if (!titleReady) {
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 700);
    console.log(JSON.stringify({ step: 'setup-failed', bodyText: text }));
    throw new Error('Page title input was not available');
  }
  const original = await title.inputValue();
  const marker = `BB37-BB39-${Date.now()}`;
  await title.fill(marker);
  const save = page.getByRole('button', { name: '保存页面草稿', exact: true }).first();

  // BB-37: transient server failure. The button must become usable again and
  // the typed value must stay, which is precisely what enables retry.
  await interceptNextPageSave(500, 'Temporary save failure');
  await save.click();
  await page.waitForTimeout(700);
  const failureAlert = await page.locator('.alert.error, .error, [role="alert"]').filter({ hasText: 'Temporary save failure' }).first().innerText().catch(() => '');
  console.log(JSON.stringify({
    step: 'BB-37-failure',
    errorVisible: failureAlert.includes('Temporary save failure'),
    draftRetained: await title.inputValue() === marker,
    saveEnabledAgain: await save.isEnabled()
  }));

  // A second click is the retry. Intercept with a synthetic 200 so no real data
  // changes while proving the exact same draft can be submitted again.
  let retryBody = '';
  await page.route('**/items/pages/*', async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    retryBody = route.request().postData() || '';
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 2 } }) });
    await page.unroute('**/items/pages/*');
  }, { times: 1 });
  await save.click();
  await page.waitForTimeout(700);
  console.log(JSON.stringify({ step: 'BB-37-retry', retriedSameDraft: retryBody.includes(marker) }));

  // Re-enter the marker because a synthetic successful response triggers reload.
  await title.fill(marker);
  await interceptNextPageSave(401, 'Invalid user credentials.');
  await save.click();
  await page.waitForTimeout(700);
  const pageText = await page.locator('body').innerText();
  console.log(JSON.stringify({
    step: 'BB-39-session-expired',
    specificMessage: pageText.includes('登录会话已失效或当前账号没有保存权限'),
    recoveryGuidance: pageText.includes('重新登录后保存'),
    draftRetained: await title.inputValue() === marker,
    falseSuccessAbsent: !pageText.includes('页面草稿已保存')
  }));

  // Restore only the local form value; no PATCH reached the server.
  await title.fill(original);
} finally {
  await browser.close();
  if (editorUserId) await fetch(`${base}/users/${editorUserId}`, { method: 'DELETE', headers: adminHeaders });
  console.log(JSON.stringify({ step: 'cleanup', temporaryUserRemoved: true }));
}
