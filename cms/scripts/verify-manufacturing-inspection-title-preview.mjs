import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const pageId = '8';
const marker = `visual-inspection-title-${Date.now()}`;
const presentation = {
  layout: { enabled: true, desktop: { offset_x: 3, offset_y: 0 } },
  text_style: { enabled: true, size_desktop: 40, line_height: 1.4, color: '#123456' }
};

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

function inspectionSection(sections) {
  const section = sections.find((item) => item?.id === 'whole-machine-validation');
  assert.ok(section, 'pages/8 must include its whole-machine-validation section');
  return section;
}

function assertControlledPresentation(value, message) {
  assert.equal(value?.layout?.enabled, true, `${message}: layout is not enabled`);
  assert.equal(value?.layout?.desktop?.offset_x, 3, `${message}: desktop horizontal offset is wrong`);
  assert.equal(value?.layout?.desktop?.offset_y, 0, `${message}: desktop vertical offset is wrong`);
  assert.equal(value?.text_style?.enabled, true, `${message}: text style is not enabled`);
  assert.equal(value?.text_style?.size_desktop, 40, `${message}: desktop size is wrong`);
  assert.equal(value?.text_style?.line_height, 1.4, `${message}: line height is wrong`);
  assert.equal(value?.text_style?.color, '#123456', `${message}: color is wrong`);
}

async function main() {
  const env = readEnvironment(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await requestJson(`${cmsUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
  });
  const headers = { authorization: `Bearer ${login.data.access_token}`, 'content-type': 'application/json' };
  let originalTitle;
  let originalPresentation;
  let saved = false;
  let summary = null;

  try {
    const original = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    const sections = clone(original.data.sections || []);
    const inspection = inspectionSection(sections);
    originalTitle = inspection.title;
    originalPresentation = clone(inspection.field_presentation || null);
    inspection.title = marker;
    inspection.field_presentation = { ...(inspection.field_presentation || {}), title: presentation };

    await requestJson(`${cmsUrl}/items/pages/${pageId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ sections })
    });
    saved = true;

    const persisted = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    const savedInspection = inspectionSection(persisted.data.sections);
    assert.equal(savedInspection.title, marker, 'Directus did not persist the inspection title to pages/8');
    assertControlledPresentation(savedInspection.field_presentation?.title, 'Directus did not persist the controlled inspection title presentation');

    const issued = await requestJson(`${cmsUrl}/content-preview-tokens/issue`, {
      method: 'POST', headers,
      body: JSON.stringify({ contentCollection: 'pages', contentItemId: pageId, ttlSeconds: 120 })
    });
    const handoff = await fetch(`${websiteUrl}/api/preview/open`, {
      method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: issued.data.token, sectionKey: 'whole-machine-validation' })
    });
    assert.equal(handoff.status, 303, 'Nuxt did not accept the CMS preview token');
    const location = handoff.headers.get('location');
    const previewLocation = new URL(location, websiteUrl);
    assert.equal(previewLocation.pathname, '/manufacturing', 'preview token did not resolve to the manufacturing page');
    assert.equal(previewLocation.searchParams.get('cmsPreview'), '1', 'preview redirect did not retain preview mode');
    const setCookie = handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0];
    assert.match(cookie, /^ruijun_preview_session=/, 'Nuxt did not create a preview session cookie');

    const session = await requestJson(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    assert.equal(session.data.collection, 'pages');
    assert.equal(session.data.itemId, pageId);
    assert.equal(session.data.target.path, '/manufacturing');
    assert.equal(session.data.target.selector, '[data-cms-preview-key="whole-machine-validation"]');
    const previewInspection = inspectionSection(session.data.preview.sections);
    assert.equal(previewInspection.title, marker);
    assertControlledPresentation(previewInspection.field_presentation?.title, 'preview session omitted the controlled inspection title presentation');

    const previewHtml = await requestText(`${websiteUrl}${previewLocation.pathname}${previewLocation.search}`, { headers: { cookie } });
    assert.match(previewHtml, /data-cms-preview-key="whole-machine-validation"/, 'Nuxt preview omitted the inspection canvas region');
    assert.ok(previewHtml.includes(marker), 'Nuxt preview did not render the saved inspection title');
    assert.ok(previewHtml.includes('data-cms-preview-position-field-path="field_presentation.title"'), 'Nuxt preview did not render the inspection title presentation binding');
    assert.ok(previewHtml.includes('--size:40'), 'Nuxt preview did not render the inspection title size');

    summary = {
      savedTo: 'pages/8.sections[whole-machine-validation].field_presentation.title',
      previewTarget: `${session.data.collection}/${session.data.itemId}/whole-machine-validation`,
      previewTitle: marker
    };
  } finally {
    if (saved) {
      const latest = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      const sections = clone(latest.data.sections || []);
      const inspection = inspectionSection(sections);
      assert.equal(inspection.title, marker, 'inspection title changed during verification; refusing to overwrite a newer editor value');
      assertControlledPresentation(inspection.field_presentation?.title, 'inspection title presentation changed during verification; refusing to overwrite a newer editor value');
      inspection.title = originalTitle;
      if (originalPresentation) inspection.field_presentation = originalPresentation;
      else delete inspection.field_presentation;
      await requestJson(`${cmsUrl}/items/pages/${pageId}`, {
        method: 'PATCH', headers, body: JSON.stringify({ sections })
      });
      const restored = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      const restoredInspection = inspectionSection(restored.data.sections);
      assert.equal(restoredInspection.title, originalTitle, 'test inspection title was not restored');
      assert.deepEqual(restoredInspection.field_presentation || null, originalPresentation, 'test inspection title presentation was not restored');
    }
  }
  console.log(JSON.stringify({ ...summary, restored: true }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
