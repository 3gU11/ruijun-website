import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const keepResource = process.env.KEEP_SERVICE_RESOURCE === '1';

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
  try { body = text ? JSON.parse(text) : null; } catch { /* surfaced in the assertion below */ }
  if (!response.ok) throw new Error(`${init.method || 'GET'} ${url} failed: ${response.status} ${text.slice(0, 500)}`);
  return body;
}

export function buildValidPdf() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    '<< /Length 43 >>\nstream\nBT /F1 18 Tf 20 80 Td (Service TDD) Tj ET\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let output = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output, 'latin1'));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(output, 'latin1');
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) output += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(output, 'latin1'));
}

export async function verifyServiceResource({ verifyWorkbench } = {}) {
  const env = readEnvironment(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await json(`${cmsUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
  });
  const authorization = `Bearer ${login.data.access_token}`;
  const headers = { authorization, 'content-type': 'application/json' };
  const sourceKey = `visual-editing-service-download-${Date.now()}`;
  let fileId = '';
  let assetId = '';
  let resourceId = '';
  try {
    const bytes = buildValidPdf();
    const form = new FormData();
    form.append('title', 'visual-editing-service-attachment.pdf');
    form.append('file', new Blob([bytes], { type: 'application/pdf' }), 'visual-editing-service-attachment.pdf');
    const uploaded = await json(`${cmsUrl}/files`, { method: 'POST', headers: { authorization }, body: form });
    fileId = String(uploaded.data.id);
    const asset = await json(`${cmsUrl}/items/media_assets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        file_id: fileId,
        original_file_name: uploaded.data.filename_download,
        mime_type: 'application/pdf',
        byte_size: Number(uploaded.data.filesize),
        usage_scope: 'service',
        media_type: 'document',
        placement_key: 'service.document',
        page_key: 'service',
        section_key: 'download',
        title: 'Visual Editing 服务附件',
        description: 'TDD 临时服务附件',
        alt_text: 'Visual Editing 服务附件',
        copyright_status: 'pending_review',
        authorization_note: 'TDD 临时验收',
        status: 'draft',
        publication_state: 'unpublished',
        enabled: true
      })
    });
    assetId = String(asset.data.id);
    const resource = await json(`${cmsUrl}/items/service_resources`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source_key: sourceKey,
        type: 'product_manual',
        title: 'Visual Editing 服务附件',
        summary: 'TDD 临时附件',
        body: '服务资料下载预览验收',
        applicable_models: ['FR400XS'],
        version: 'TDD',
        language: 'zh-CN',
        asset: assetId,
        display_date: '2026-09-02',
        sort_order: 0,
        status: 'draft',
        publication_state: 'unpublished'
      })
    });
    resourceId = String(resource.data.id);

    const persisted = await json(`${cmsUrl}/items/service_resources/${encodeURIComponent(resourceId)}?fields=id,source_key,asset,status,publication_state`, { headers });
    assert.equal(String(persisted.data.asset), assetId, 'service resource did not persist the selected attachment');
    assert.equal(persisted.data.status, 'draft');
    assert.equal(persisted.data.publication_state, 'unpublished');

    const token = await json(`${cmsUrl}/content-preview-tokens/issue`, {
      method: 'POST', headers,
      body: JSON.stringify({ contentCollection: 'service_resources', contentItemId: resourceId, ttlSeconds: 120 })
    });
    if (keepResource) {
      console.log(JSON.stringify({ resourceId, assetId, sourceKey, previewTokenIssued: true, retained: true }));
      return;
    }
    const handoff = await fetch(`${websiteUrl}/api/preview/open`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: token.data.token })
    });
    assert.equal(handoff.status, 303, 'Nuxt did not accept the service resource preview token');
    const cookie = (handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '').split(';')[0];
    assert.match(cookie, /^ruijun_preview_session=/);
    const session = await json(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    const previewResource = session.data.preview;
    assert.equal(String(previewResource.id), resourceId);
    assert.equal(String(previewResource.asset_media_asset_id), assetId);
    assert.equal(previewResource.asset, `/api/preview/media/${assetId}`);

    const protectedAsset = await fetch(`${websiteUrl}/api/preview/media/${encodeURIComponent(assetId)}`, { headers: { cookie } });
    assert.equal(protectedAsset.status, 200, 'protected service attachment did not respond');
    assert.equal(protectedAsset.headers.get('content-type'), 'application/pdf');
    assert.equal((await protectedAsset.arrayBuffer()).byteLength, bytes.byteLength);

    const pageResponse = await fetch(`${websiteUrl}/service/download?cmsPreview=1`, { headers: { cookie } });
    const html = await pageResponse.text();
    assert.equal(pageResponse.status, 200, `service download preview failed: ${html.slice(0, 1000)}`);
    assert.ok(html.includes(`/api/preview/media/${assetId}`), 'service download preview did not render the protected attachment path');
    assert.match(html, /download=/, 'service download link is not marked for browser download');

    if (verifyWorkbench) await verifyWorkbench({ resourceId, assetId, sourceKey, bytes, env, headers });

    const publicResponse = await fetch(`${websiteUrl}/api/public/v1/service-resources`);
    const publicText = await publicResponse.text();
    assert.ok(!publicText.includes(sourceKey), 'unpublished service resource leaked into public API');
    console.log(JSON.stringify({ resourceId, assetId, sourceKey, previewTokenIssued: true, previewMediaPath: `/api/preview/media/${assetId}`, protectedBytes: bytes.byteLength, publicLeaked: false, restored: false, retained: keepResource }));
  } finally {
    if (!keepResource) {
      const cleanupErrors = [];
      for (const [path, id] of [['items/service_resources', resourceId], ['items/media_assets', assetId], ['files', fileId]]) {
        if (!id) continue;
        try {
          const removed = await fetch(`${cmsUrl}/${path}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { authorization } });
          assert.ok(removed.ok, `cleanup failed: ${path}/${id}`);
          const remaining = await json(`${cmsUrl}/${path}?filter[id][_eq]=${encodeURIComponent(id)}&fields=id`, { headers });
          assert.equal(remaining.data.length, 0, `cleanup readback failed: ${path}/${id}`);
        } catch (error) { cleanupErrors.push(error); }
      }
      if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'Temporary service fixture cleanup failed');
      if (resourceId) console.log(JSON.stringify({ resourceId, restored: true }));
    } else {
      console.log(JSON.stringify({ resourceId, assetId, retained: true, cleanup: `DELETE /items/service_resources/${resourceId}, /items/media_assets/${assetId}, /files/${fileId}` }));
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyServiceResource().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
}
