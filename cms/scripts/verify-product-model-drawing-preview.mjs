import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const modelId = '17';
const mediaAssetId = '27';
const marker = `visual-model-17-drawing-${Date.now()}`;

function readEnvironment(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1].trim(), match[2]]] : [];
  }));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, init);
  const body = await response.text();
  if (!response.ok) throw new Error(`${init.method || 'GET'} ${url} failed: ${response.status} ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
}

async function main() {
  const env = readEnvironment(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await requestJson(`${cmsUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
  });
  const headers = { authorization: `Bearer ${login.data.access_token}`, 'content-type': 'application/json' };
  let originalConfiguration;
  let saved = false;

  try {
    const [model, asset] = await Promise.all([
      requestJson(`${cmsUrl}/items/product_models/${modelId}?fields=id,slug,model_code,configuration`, { headers }),
      requestJson(`${cmsUrl}/items/media_assets/${mediaAssetId}?fields=id,status,publication_state,usage_scope,placement_key`, { headers })
    ]);
    assert.equal(asset.data.status, 'draft', 'verification asset must remain a draft');
    assert.equal(asset.data.publication_state, 'unpublished', 'verification asset must remain unpublished');
    assert.equal(asset.data.usage_scope, 'product', 'verification asset must be product-scoped');

    originalConfiguration = clone(model.data.configuration || {});
    const configuration = clone(model.data.configuration || {});
    configuration.drawings = [{ title: 'FL1610 DRAWING', caption: marker, media_asset_id: mediaAssetId }];
    await requestJson(`${cmsUrl}/items/product_models/${modelId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ configuration })
    });
    saved = true;

    const persisted = await requestJson(`${cmsUrl}/items/product_models/${modelId}?fields=id,slug,configuration`, { headers });
    assert.equal(persisted.data.configuration.drawings?.[0]?.media_asset_id, mediaAssetId, 'Directus did not save drawing media_asset_id');
    assert.equal(persisted.data.configuration.drawings?.[0]?.caption, marker, 'Directus did not save drawing caption');

    const issued = await requestJson(`${cmsUrl}/content-preview-tokens/issue`, {
      method: 'POST', headers,
      body: JSON.stringify({ contentCollection: 'product_models', contentItemId: modelId, ttlSeconds: 120 })
    });
    const handoff = await fetch(`${websiteUrl}/api/preview/open`, {
      method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: issued.data.token })
    });
    assert.equal(handoff.status, 303, 'Nuxt did not accept the preview token');
    const previewLocation = new URL(handoff.headers.get('location'), websiteUrl);
    const cookie = (handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '').split(';')[0];
    assert.match(cookie, /^ruijun_preview_session=/, 'Nuxt did not create a preview session cookie');
    const session = await requestJson(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    assert.equal(session.data.collection, 'product_models');
    assert.equal(session.data.itemId, modelId);
    assert.equal(session.data.preview.configuration?.drawings?.[0]?.media_asset_id, mediaAssetId, 'preview session omitted drawing media binding');
    assert.equal(session.data.preview.configuration?.drawings?.[0]?.caption, marker, 'preview session omitted drawing caption');

    console.log(JSON.stringify({
      previewPath: `${previewLocation.pathname}${previewLocation.search}`,
      drawingFieldPath: 'configuration.drawings.0.media_asset_id',
      mediaAssetId,
      restored: false
    }));
  } finally {
    if (saved) {
      const latest = await requestJson(`${cmsUrl}/items/product_models/${modelId}?fields=id,configuration`, { headers });
      assert.equal(latest.data.configuration?.drawings?.[0]?.caption, marker, 'drawing changed during verification; refusing to overwrite a newer edit');
      await requestJson(`${cmsUrl}/items/product_models/${modelId}`, {
        method: 'PATCH', headers, body: JSON.stringify({ configuration: originalConfiguration })
      });
      const restored = await requestJson(`${cmsUrl}/items/product_models/${modelId}?fields=id,configuration`, { headers });
      assert.deepEqual(restored.data.configuration || {}, originalConfiguration, 'product configuration was not restored');
      console.log(JSON.stringify({ modelId, mediaAssetId, restored: true }));
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
