import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const pageId = '2';
const sectionId = 'factory';
const marker = `visual-about-factory-title-${Date.now()}`;
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

function factorySection(sections) {
  const section = sections.find((item) => item?.id === sectionId);
  assert.ok(section, `pages/${pageId} must contain ${sectionId}`);
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
    const factory = factorySection(sections);
    originalTitle = factory.title;
    originalPresentation = clone(factory.field_presentation || null);
    factory.title = marker;
    factory.field_presentation = { ...(factory.field_presentation || {}), title: presentation };

    await request(`${cmsUrl}/items/pages/${pageId}`, { method: 'PATCH', headers, body: JSON.stringify({ sections }) });
    saved = true;

    const persisted = await request(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    const savedFactory = factorySection(persisted.data.sections);
    assert.equal(savedFactory.title, marker, 'Directus did not persist the factory title');
    assertControlledPresentation(savedFactory.field_presentation?.title, 'Directus did not persist the controlled factory title presentation');

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
    assert.equal(previewLocation.pathname, '/about');
    const cookie = (handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '').split(';')[0];
    assert.match(cookie, /^ruijun_preview_session=/, 'Nuxt did not create a preview session cookie');

    const session = await request(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    const previewFactory = factorySection(session.data.preview.sections);
    assert.equal(previewFactory.title, marker, 'preview session omitted the factory title');
    assertControlledPresentation(previewFactory.field_presentation?.title, 'preview session omitted the controlled title presentation');

    const html = await request(`${websiteUrl}${previewLocation.pathname}${previewLocation.search}`, { headers: { cookie } }, true);
    assert.ok(html.includes(marker), 'Nuxt preview did not render the saved factory title');
    assert.ok(html.includes('data-cms-preview-position-field-path="field_presentation.title"'), 'Nuxt preview did not render the title presentation binding');
    assert.ok(html.includes('--cms-offset-x-desktop:3%'), 'Nuxt preview did not render the title offset');
    assert.ok(html.includes('--cms-text-size-desktop:40px'), 'Nuxt preview did not render the title size');

    summary = { savedTo: 'pages/2.sections[factory].field_presentation.title', previewTarget: 'pages/2/factory', previewTitle: marker };
  } finally {
    if (saved) {
      const latest = await request(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      const sections = clone(latest.data.sections || []);
      const factory = factorySection(sections);
      assert.equal(factory.title, marker, 'factory title changed during verification; refusing to overwrite a newer editor value');
      assertControlledPresentation(factory.field_presentation?.title, 'factory title presentation changed during verification; refusing to overwrite a newer editor value');
      factory.title = originalTitle;
      if (originalPresentation) factory.field_presentation = originalPresentation;
      else delete factory.field_presentation;
      await request(`${cmsUrl}/items/pages/${pageId}`, { method: 'PATCH', headers, body: JSON.stringify({ sections }) });
      const restored = await request(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      const restoredFactory = factorySection(restored.data.sections);
      assert.equal(restoredFactory.title, originalTitle, 'factory title was not restored');
      assert.deepEqual(restoredFactory.field_presentation || null, originalPresentation, 'factory title presentation was not restored');
    }
  }
  console.log(JSON.stringify({ ...summary, restored: true }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
