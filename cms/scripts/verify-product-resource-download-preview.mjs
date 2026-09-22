import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const modelId = '1';

function readEnvironment(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1].trim(), match[2]]] : [];
  }));
}

async function json(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* reported below */ }
  if (!response.ok) throw new Error(`${init.method || 'GET'} ${url} failed: ${response.status} ${text.slice(0, 500)}`);
  return body;
}

async function main() {
  const env = readEnvironment(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await json(`${cmsUrl}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) });
  const headers = { authorization: `Bearer ${login.data.access_token}`, 'content-type': 'application/json' };
  let fileId = '';
  let assetId = '';
  let originalResources;
  let patched = false;
  try {
    const original = await json(`${cmsUrl}/items/product_models/${modelId}?fields=id,slug,resources`, { headers });
    originalResources = original.data.resources;
    const bytes = await readFile(new URL('../uploads/cc29b356-2b80-4cdc-a7dc-95d6f9db888f.pdf', import.meta.url));
    const form = new FormData();
    form.append('title', 'visual-editing-product-attachment.pdf');
    form.append('file', new Blob([bytes], { type: 'application/pdf' }), 'cc29b356-2b80-4cdc-a7dc-95d6f9db888f.pdf');
    const uploaded = await json(`${cmsUrl}/files`, { method: 'POST', headers: { authorization: headers.authorization }, body: form });
    fileId = String(uploaded.data.id);
    const asset = await json(`${cmsUrl}/items/media_assets`, {
      method: 'POST', headers,
      body: JSON.stringify({ file_id: fileId, original_file_name: uploaded.data.filename_download, mime_type: 'application/pdf', byte_size: Number(uploaded.data.filesize), usage_scope: 'product', media_type: 'document', placement_key: 'product.document', page_key: 'product', title: 'Visual Editing 产品附件', description: 'TDD 临时附件', alt_text: 'Visual Editing 产品附件', copyright_status: 'pending_review', authorization_note: 'TDD 临时验收', status: 'draft', publication_state: 'unpublished', enabled: true })
    });
    assetId = String(asset.data.id);
    await json(`${cmsUrl}/items/product_models/${modelId}`, { method: 'PATCH', headers, body: JSON.stringify({ resources: [{ title: 'Visual Editing 产品附件', type: 'PDF', media_asset_id: assetId }] }) });
    patched = true;
    const persisted = await json(`${cmsUrl}/items/product_models/${modelId}?fields=id,resources,status,publication_state`, { headers });
    assert.equal(String(persisted.data.resources?.[0]?.media_asset_id), assetId, 'Directus did not persist the product attachment relation');
    assert.equal(persisted.data.status, 'draft');
    assert.equal(persisted.data.publication_state, 'unpublished');

    const token = await json(`${cmsUrl}/content-preview-tokens/issue`, { method: 'POST', headers, body: JSON.stringify({ contentCollection: 'product_models', contentItemId: modelId, ttlSeconds: 120 }) });
    const handoff = await fetch(`${websiteUrl}/api/preview/open`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: token.data.token }) });
    assert.equal(handoff.status, 303, 'Nuxt did not accept the product preview token');
    const cookie = (handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '').split(';')[0];
    assert.match(cookie, /^ruijun_preview_session=/);
    const session = await json(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    assert.equal(String(session.data.preview.resources?.[0]?.media_asset_id), assetId);
    const protectedAsset = await fetch(`${websiteUrl}/api/preview/media/${encodeURIComponent(assetId)}`, { headers: { cookie } });
    assert.equal(protectedAsset.status, 200, 'protected preview attachment did not respond');
    assert.equal(protectedAsset.headers.get('content-type'), 'application/pdf');
    assert.equal((await protectedAsset.arrayBuffer()).byteLength, bytes.byteLength);
    const publicResponse = await fetch(`${websiteUrl}/api/public/v1/products/${encodeURIComponent(original.data.slug)}`);
    const publicText = await publicResponse.text();
    assert.ok(!publicText.includes('Visual Editing 产品附件'), 'unpublished attachment leaked into public product API');

    let pageResponse;
    let html = '';
    for (let attempt = 0; attempt < 3; attempt += 1) {
      pageResponse = await fetch(`${websiteUrl}/product/${encodeURIComponent(original.data.slug)}?cmsPreview=1`, { headers: { cookie } });
      html = await pageResponse.text();
      if (pageResponse.ok) break;
    }
    assert.equal(pageResponse.status, 200, `preview product page failed: ${html.slice(0, 3000)}`);
    assert.ok(html.includes(`/api/preview/media/${assetId}`), 'product preview HTML did not expose the protected attachment path');
    assert.match(html, /download=/, 'product attachment link is not marked for browser download');
    console.log(JSON.stringify({ modelId, assetId, previewMediaPath: `/api/preview/media/${assetId}`, protectedBytes: bytes.byteLength, publicLeaked: false, restored: false }));
  } finally {
    if (patched) await json(`${cmsUrl}/items/product_models/${modelId}`, { method: 'PATCH', headers, body: JSON.stringify({ resources: originalResources }) });
    if (assetId) await fetch(`${cmsUrl}/items/media_assets/${encodeURIComponent(assetId)}`, { method: 'DELETE', headers: { authorization: headers.authorization } });
    if (fileId) await fetch(`${cmsUrl}/files/${encodeURIComponent(fileId)}`, { method: 'DELETE', headers: { authorization: headers.authorization } });
    if (patched) console.log(JSON.stringify({ modelId, restored: true }));
  }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
