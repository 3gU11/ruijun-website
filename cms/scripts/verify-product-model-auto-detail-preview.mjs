import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const modelId = '1';
const adjacentModelId = '2';
const featureIndex = 1;
const field = 'detail';
const marker = `visual-model-1-feature-detail-${Date.now()}`;
const renderedFieldPath = `configuration.features.${featureIndex}.${field}`;
const presentationKey = `features_${featureIndex}_${field}`;

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

async function requestText(url, init = {}) {
  const response = await fetch(url, init);
  const body = await response.text();
  if (!response.ok) throw new Error(`${init.method || 'GET'} ${url} failed: ${response.status} ${body.slice(0, 300)}`);
  return body;
}

function featureValue(record) {
  const feature = record?.configuration?.features?.[featureIndex];
  assert.ok(feature && typeof feature === 'object', `product_models/${record?.id || ''} must include configuration.features.${featureIndex}`);
  assert.ok(typeof feature[field] === 'string' && feature[field].trim(), `product_models/${record?.id || ''} must include ${renderedFieldPath}`);
  return feature[field];
}

async function main() {
  const env = readEnvironment(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await requestJson(`${cmsUrl}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
  });
  const headers = { authorization: `Bearer ${login.data.access_token}`, 'content-type': 'application/json' };
  let originalConfiguration;
  let adjacentOriginal;
  let saved = false;
  let summary = null;

  try {
    const [current, adjacent] = await Promise.all([
      requestJson(`${cmsUrl}/items/product_models/${modelId}?fields=id,slug,model_code,configuration`, { headers }),
      requestJson(`${cmsUrl}/items/product_models/${adjacentModelId}?fields=id,configuration`, { headers })
    ]);
    originalConfiguration = clone(current.data.configuration || {});
    adjacentOriginal = featureValue(adjacent.data);
    const siblingValue = current.data.configuration?.features?.[0]?.detail;
    const configuration = clone(current.data.configuration || {});
    featureValue({ id: modelId, configuration });
    configuration.features[featureIndex][field] = marker;
    configuration.field_presentation ||= {};
    configuration.field_presentation[presentationKey] = {
      text_style: { enabled: true, weight: 600, size_desktop: 18, line_height: 1.5, color: '#123456' },
      layout: { enabled: true, desktop: { offset_x: 3, offset_y: -2 } }
    };

    await requestJson(`${cmsUrl}/items/product_models/${modelId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ configuration })
    });
    saved = true;

    const [persisted, persistedAdjacent] = await Promise.all([
      requestJson(`${cmsUrl}/items/product_models/${modelId}?fields=id,slug,model_code,configuration`, { headers }),
      requestJson(`${cmsUrl}/items/product_models/${adjacentModelId}?fields=id,configuration`, { headers })
    ]);
    assert.equal(featureValue(persisted.data), marker, `Directus did not persist ${renderedFieldPath}`);
    assert.equal(persisted.data.configuration.features[0]?.detail, siblingValue, 'saving the second detail changed the first detail');
    assert.equal(featureValue(persistedAdjacent.data), adjacentOriginal, 'saving model 1 changed model 2');
    assert.equal(persisted.data.configuration.field_presentation?.[presentationKey]?.text_style?.size_desktop, 18, 'Directus did not persist the detail text style');

    const issued = await requestJson(`${cmsUrl}/content-preview-tokens/issue`, {
      method: 'POST', headers, body: JSON.stringify({ contentCollection: 'product_models', contentItemId: modelId, ttlSeconds: 120 })
    });
    const handoff = await fetch(`${websiteUrl}/api/preview/open`, {
      method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: issued.data.token })
    });
    assert.equal(handoff.status, 303, 'Nuxt did not accept the CMS preview token');
    const previewLocation = new URL(handoff.headers.get('location'), websiteUrl);
    assert.equal(previewLocation.pathname, `/product/${persisted.data.slug || persisted.data.model_code}`, 'preview token did not resolve to the automatic-threading model');
    const cookie = (handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '').split(';')[0];
    assert.match(cookie, /^ruijun_preview_session=/, 'Nuxt did not create a preview session cookie');
    const session = await requestJson(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    assert.equal(session.data.collection, 'product_models');
    assert.equal(featureValue(session.data.preview), marker, 'preview session omitted the edited detail');
    assert.equal(session.data.preview.configuration.field_presentation?.[presentationKey]?.text_style?.size_desktop, 18, 'preview session omitted the detail presentation');

    const previewHtml = await requestText(`${websiteUrl}${previewLocation.pathname}${previewLocation.search}`, { headers: { cookie } });
    assert.match(previewHtml, /id="product-details"/, 'Nuxt preview omitted the product details canvas');
    assert.ok(previewHtml.includes(`data-cms-preview-field-path="${renderedFieldPath}"`), 'Nuxt preview omitted the detail field binding');
    assert.ok(previewHtml.includes(marker), 'Nuxt preview did not render the edited detail');
    assert.ok(previewHtml.includes('--cms-text-size-desktop:18px'), 'Nuxt preview did not render the detail text style');
    summary = { savedTo: `product_models/${modelId}.${renderedFieldPath}`, previewTarget: `${session.data.collection}/${session.data.itemId}/product-details`, previewTitle: marker };
  } finally {
    if (saved) {
      const [latest, latestAdjacent] = await Promise.all([
        requestJson(`${cmsUrl}/items/product_models/${modelId}?fields=id,configuration`, { headers }),
        requestJson(`${cmsUrl}/items/product_models/${adjacentModelId}?fields=id,configuration`, { headers })
      ]);
      assert.equal(featureValue(latest.data), marker, 'model 1 changed during verification; refusing to overwrite a newer editor value');
      assert.equal(featureValue(latestAdjacent.data), adjacentOriginal, 'model 2 changed during verification; refusing to restore a stale snapshot');
      await requestJson(`${cmsUrl}/items/product_models/${modelId}`, {
        method: 'PATCH', headers, body: JSON.stringify({ configuration: originalConfiguration })
      });
      const [restored, restoredAdjacent] = await Promise.all([
        requestJson(`${cmsUrl}/items/product_models/${modelId}?fields=id,configuration`, { headers }),
        requestJson(`${cmsUrl}/items/product_models/${adjacentModelId}?fields=id,configuration`, { headers })
      ]);
      assert.equal(featureValue(restored.data), originalConfiguration.features[featureIndex][field], 'model 1 detail was not restored');
      assert.equal(featureValue(restoredAdjacent.data), adjacentOriginal, 'restoring model 1 changed model 2');
    }
  }
  console.log(JSON.stringify({ ...summary, restored: true }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
