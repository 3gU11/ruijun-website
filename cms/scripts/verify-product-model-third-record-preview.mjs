import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const modelId = '17';
const featureIndex = 0;
const marker = `visual-model-17-feature-${Date.now()}`;
const renderedFieldPath = `configuration.features.${featureIndex}.label`;

function readEnvironment(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1].trim(), match[2]]] : [];
  }));
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function firstFeatureLabel(record) {
  const features = record?.configuration?.features;
  assert.ok(Array.isArray(features) && features[featureIndex], `product_models/${record?.id || ''} must include configuration.features.${featureIndex}`);
  return features[featureIndex].label;
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
  let originalPresentation;
  let adjacentLabels;
  let saved = false;
  let summary = null;

  try {
    const [current, model15, model16] = await Promise.all([
      requestJson(`${cmsUrl}/items/product_models/${modelId}?fields=id,slug,model_code,configuration,presentation`, { headers }),
      requestJson(`${cmsUrl}/items/product_models/15?fields=id,configuration`, { headers }),
      requestJson(`${cmsUrl}/items/product_models/16?fields=id,configuration`, { headers })
    ]);
    originalConfiguration = clone(current.data.configuration || {});
    originalPresentation = clone(current.data.presentation || null);
    adjacentLabels = [
      { modelId: 15, label: firstFeatureLabel(model15.data) },
      { modelId: 16, label: firstFeatureLabel(model16.data) }
    ];
    const configuration = clone(current.data.configuration || {});
    const presentation = clone(current.data.presentation || {});
    assert.ok(Array.isArray(configuration.features) && configuration.features[featureIndex], `product_models/${modelId} must include configuration.features.${featureIndex}`);
    configuration.features[featureIndex].label = marker;
    presentation.field_presentation ||= {};
    presentation.field_presentation.model_code = {
      text_style: { enabled: true, weight: 600, size_desktop: 24, line_height: 1.4, color: '#123456' },
      layout: { enabled: true, desktop: { offset_x: 4, offset_y: -2 } }
    };

    await requestJson(`${cmsUrl}/items/product_models/${modelId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ configuration, presentation })
    });
    saved = true;

    const [persisted, persisted15, persisted16] = await Promise.all([
      requestJson(`${cmsUrl}/items/product_models/${modelId}?fields=id,slug,model_code,configuration,presentation`, { headers }),
      requestJson(`${cmsUrl}/items/product_models/15?fields=id,configuration`, { headers }),
      requestJson(`${cmsUrl}/items/product_models/16?fields=id,configuration`, { headers })
    ]);
    assert.equal(firstFeatureLabel(persisted.data), marker, `Directus did not persist ${renderedFieldPath} to product_models/${modelId}`);
    assert.equal(persisted.data.presentation?.field_presentation?.model_code?.text_style?.size_desktop, 24, 'Directus did not persist the model-code text style');
    assert.equal(persisted.data.presentation?.field_presentation?.model_code?.layout?.desktop?.offset_x, 4, 'Directus did not persist the model-code position');
    assert.deepEqual([firstFeatureLabel(persisted15.data), firstFeatureLabel(persisted16.data)], adjacentLabels.map((item) => item.label), 'saving model 17 changed an adjacent model');

    const issued = await requestJson(`${cmsUrl}/content-preview-tokens/issue`, {
      method: 'POST', headers,
      body: JSON.stringify({ contentCollection: 'product_models', contentItemId: modelId, ttlSeconds: 120 })
    });
    const handoff = await fetch(`${websiteUrl}/api/preview/open`, {
      method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: issued.data.token })
    });
    assert.equal(handoff.status, 303, 'Nuxt did not accept the CMS preview token');
    const location = handoff.headers.get('location');
    const previewLocation = new URL(location, websiteUrl);
    assert.equal(previewLocation.pathname, `/product/${persisted.data.slug || persisted.data.model_code}`, 'preview token did not resolve to the edited product model');
    assert.equal(previewLocation.searchParams.get('cmsPreview'), '1', 'preview redirect did not retain preview mode');
    const setCookie = handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0];
    assert.match(cookie, /^ruijun_preview_session=/, 'Nuxt did not create a preview session cookie');

    const session = await requestJson(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    assert.equal(session.data.collection, 'product_models');
    assert.equal(session.data.itemId, modelId);
    assert.equal(session.data.target.path, previewLocation.pathname);
    assert.equal(firstFeatureLabel(session.data.preview), marker);
    assert.equal(session.data.preview.presentation?.field_presentation?.model_code?.text_style?.size_desktop, 24, 'preview session omitted the model-code presentation');

    const previewHtml = await requestText(`${websiteUrl}${previewLocation.pathname}${previewLocation.search}`, { headers: { cookie } });
    assert.match(previewHtml, /id="product-details"/, 'Nuxt preview omitted the product details canvas region');
    assert.ok(previewHtml.includes(`data-cms-preview-field-path="${renderedFieldPath}"`), 'Nuxt preview omitted the exact feature field binding');
    assert.ok(previewHtml.includes('data-cms-preview-position-field-path="presentation.field_presentation.model_code"'), 'Nuxt preview omitted the model-code position binding');
    assert.ok(previewHtml.includes('--cms-text-size-desktop:24px'), 'Nuxt preview did not render the saved model-code text style');
    assert.ok(previewHtml.includes(marker), 'Nuxt preview did not render the saved product feature label');

    summary = {
      savedTo: `product_models/${modelId}.${renderedFieldPath}`,
      previewTarget: `${session.data.collection}/${session.data.itemId}/product-details`,
      previewTitle: marker
    };
  } finally {
    if (saved) {
      const [latest, latest15, latest16] = await Promise.all([
        requestJson(`${cmsUrl}/items/product_models/${modelId}?fields=id,configuration,presentation`, { headers }),
        requestJson(`${cmsUrl}/items/product_models/15?fields=id,configuration`, { headers }),
        requestJson(`${cmsUrl}/items/product_models/16?fields=id,configuration`, { headers })
      ]);
      assert.equal(firstFeatureLabel(latest.data), marker, 'model 17 changed during verification; refusing to overwrite a newer editor value');
      assert.equal(latest.data.presentation?.field_presentation?.model_code?.text_style?.size_desktop, 24, 'model-code presentation changed during verification; refusing to overwrite a newer editor value');
      assert.deepEqual([firstFeatureLabel(latest15.data), firstFeatureLabel(latest16.data)], adjacentLabels.map((item) => item.label), 'an adjacent model changed during verification; refusing to restore a stale snapshot');
      await requestJson(`${cmsUrl}/items/product_models/${modelId}`, {
        method: 'PATCH', headers, body: JSON.stringify({ configuration: originalConfiguration, presentation: originalPresentation })
      });
      const [restored, restored15, restored16] = await Promise.all([
        requestJson(`${cmsUrl}/items/product_models/${modelId}?fields=id,configuration,presentation`, { headers }),
        requestJson(`${cmsUrl}/items/product_models/15?fields=id,configuration`, { headers }),
        requestJson(`${cmsUrl}/items/product_models/16?fields=id,configuration`, { headers })
      ]);
      assert.equal(firstFeatureLabel(restored.data), originalConfiguration.features[featureIndex].label, 'test model 17 feature label was not restored');
      assert.deepEqual(restored.data.presentation || null, originalPresentation, 'test model 17 presentation was not restored');
      assert.deepEqual([firstFeatureLabel(restored15.data), firstFeatureLabel(restored16.data)], adjacentLabels.map((item) => item.label), 'restoring model 17 changed an adjacent model');
    }
  }
  console.log(JSON.stringify({ ...summary, restored: true }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
