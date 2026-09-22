import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const fields = Object.freeze({
  purchase_label: '大批量采购',
  purchase_title: '你有量',
  purchase_subtitle: '我有价',
  purchase_phone: '15050166844'
});

function envFile(text) {
  return Object.fromEntries(text.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1].trim(), match[2]]] : [];
  }));
}
async function json(url, init = {}) {
  const response = await fetch(url, init);
  const body = await response.text();
  if (!response.ok) throw new Error(`${init.method || 'GET'} ${url} failed: ${response.status} ${body.slice(0, 240)}`);
  return body ? JSON.parse(body) : null;
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }

async function main() {
  // 保存每个字段后验证预览，再恢复原始值。
  const env = envFile(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await json(`${cmsUrl}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) });
  const headers = { authorization: `Bearer ${login.data.access_token}`, 'content-type': 'application/json' };
  const current = await json(`${cmsUrl}/items/site_settings?limit=1&fields=id,status,publication_state,footer`, { headers });
  const original = current.data?.[0];
  assert.ok(original?.id, 'site_settings record is required');
  assert.equal(original.status, 'draft');
  assert.equal(original.publication_state, 'unpublished');
  const originalFooter = clone(original.footer || {});
  const footer = { ...originalFooter };
  let changed = false;
  try {
    for (const [field, value] of Object.entries(fields)) {
      footer[field] = `${value}（画布验收）`;
      await json(`${cmsUrl}/items/site_settings/${encodeURIComponent(original.id)}`, { method: 'PATCH', headers, body: JSON.stringify({ footer }) });
      changed = true;
      const persisted = await json(`${cmsUrl}/items/site_settings/${encodeURIComponent(original.id)}?fields=id,status,publication_state,footer`, { headers });
      assert.equal(persisted.data.footer?.[field], footer[field], `${field} was not persisted`);
      const issued = await json(`${cmsUrl}/content-preview-tokens/issue`, { method: 'POST', headers, body: JSON.stringify({ contentCollection: 'site_settings', contentItemId: String(original.id), ttlSeconds: 120 }) });
      const handoff = await fetch(`${websiteUrl}/api/preview/open`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: issued.data.token, sectionKey: 'home' }) });
      assert.equal(handoff.status, 303, `preview handoff failed for ${field}`);
      const cookie = (handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '').split(';')[0];
      assert.match(cookie, /^ruijun_preview_session=/);
      const location = new URL(handoff.headers.get('location'), websiteUrl);
      const html = await (await fetch(`${websiteUrl}${location.pathname}${location.search}`, { headers: { cookie } })).text();
      assert.match(html, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    console.log(JSON.stringify({ collection: 'site_settings', itemId: String(original.id), fields: Object.keys(fields), preview: true, restored: false }));
  } finally {
    if (changed) {
      await json(`${cmsUrl}/items/site_settings/${encodeURIComponent(original.id)}`, { method: 'PATCH', headers, body: JSON.stringify({ footer: originalFooter }) });
      const restored = await json(`${cmsUrl}/items/site_settings/${encodeURIComponent(original.id)}?fields=id,footer`, { headers });
      assert.deepEqual(restored.data.footer, originalFooter, 'site_settings footer was not restored');
      console.log(JSON.stringify({ collection: 'site_settings', itemId: String(original.id), restored: true }));
    }
  }
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
