import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const pageId = '3';
const sectionId = 'support';
const marker = `visual-service-support-title-${Date.now()}`;
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

async function request(url, init = {}, text = false) {
  const response = await fetch(url, init);
  const body = await response.text();
  if (!response.ok) throw new Error(`${init.method || 'GET'} ${url} failed: ${response.status} ${body.slice(0, 300)}`);
  return text ? body : body ? JSON.parse(body) : null;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function supportSection(sections) {
  const support = sections.find((item) => item?.id === 'support');
  assert.ok(support, `pages/${pageId} must contain ${sectionId}`);
  return support;
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
  const login = await request(`${cmsUrl}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
  });
  const headers = { authorization: `Bearer ${login.data.access_token}`, 'content-type': 'application/json' };
  let originalTitle;
  let originalPresentation;
  let saved = false;
  let summary;

  try {
    const current = await request(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    const sections = clone(current.data.sections || []);
    const support = supportSection(sections);
    originalTitle = support.title;
    originalPresentation = clone(support.field_presentation || null);
    support.title = marker;
    support.field_presentation = { ...(support.field_presentation || {}), title: presentation };

    await request(`${cmsUrl}/items/pages/${pageId}`, { method: 'PATCH', headers, body: JSON.stringify({ sections }) });
    saved = true;

    const persisted = await request(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    const savedSupport = supportSection(persisted.data.sections);
    assert.equal(savedSupport.title, marker, 'Directus did not persist the service support title');
    assertControlledPresentation(savedSupport.field_presentation?.title, 'Directus did not persist the controlled service support title presentation');

    const issued = await request(`${cmsUrl}/content-preview-tokens/issue`, {
      method: 'POST', headers,
      body: JSON.stringify({ contentCollection: 'pages', contentItemId: pageId, ttlSeconds: 120 })
    });
    const handoff = await fetch(`${websiteUrl}/api/preview/open`, {
      method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: issued.data.token, sectionKey: sectionId })
    });
    assert.equal(handoff.status, 303, 'Nuxt did not accept the CMS preview token');
    const previewLocation = new URL(handoff.headers.get('location'), websiteUrl);
    assert.equal(previewLocation.pathname, '/service');
    const cookie = (handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '').split(';')[0];
    assert.match(cookie, /^ruijun_preview_session=/, 'Nuxt did not create a preview session cookie');

    const session = await request(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    const previewSupport = supportSection(session.data.preview.sections);
    assert.equal(previewSupport.title, marker, 'preview session omitted the service support title');
    assertControlledPresentation(previewSupport.field_presentation?.title, 'preview session omitted the controlled support title presentation');

    const html = await request(`${websiteUrl}${previewLocation.pathname}${previewLocation.search}`, { headers: { cookie } }, true);
    assert.ok(html.includes(marker), 'Nuxt preview did not render the saved service support title');
    assert.ok(html.includes('data-cms-preview-key="support"'), 'Nuxt preview did not render the service support section');
    assert.ok(html.includes('data-cms-preview-position-field-path="field_presentation.title"'), 'Nuxt preview did not render the support title presentation binding');
    assert.ok(html.includes('--cms-offset-x-desktop:3%'), 'Nuxt preview did not render the support title offset');
    assert.ok(html.includes('--cms-text-size-desktop:40px'), 'Nuxt preview did not render the support title size');

    summary = { savedTo: 'pages/3.sections[support].field_presentation.title', previewTarget: 'pages/3/support', previewTitle: marker };
  } finally {
    if (saved) {
      const latest = await request(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      const sections = clone(latest.data.sections || []);
      const support = supportSection(sections);
      assert.equal(support.title, marker, 'service support title changed during verification; refusing to overwrite a newer editor value');
      assertControlledPresentation(support.field_presentation?.title, 'service support title presentation changed during verification; refusing to overwrite a newer editor value');
      support.title = originalTitle;
      if (originalPresentation) support.field_presentation = originalPresentation;
      else delete support.field_presentation;
      await request(`${cmsUrl}/items/pages/${pageId}`, { method: 'PATCH', headers, body: JSON.stringify({ sections }) });
      const restored = await request(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      const restoredSupport = supportSection(restored.data.sections);
      assert.equal(restoredSupport.title, originalTitle, 'service support title was not restored');
      assert.deepEqual(restoredSupport.field_presentation || null, originalPresentation, 'service support title presentation was not restored');
    }
  }
  console.log(JSON.stringify({ ...summary, restored: true }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
