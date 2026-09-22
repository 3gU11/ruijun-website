import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const pageId = '3';
const sectionId = 'office-directory';
const marker = `visual-service-office-first-region-title-${Date.now()}`;
const presentation = {
  layout: { enabled: true, desktop: { offset_x: 3, offset_y: 0 } },
  text_style: { enabled: true, size_desktop: 32, line_height: 1.4, color: '#123456' }
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

function officeSection(sections) {
  const section = sections.find((item) => item?.id === sectionId);
  assert.ok(section, `pages/${pageId} must contain ${sectionId}`);
  assert.ok(Array.isArray(section.items) && section.items.length >= 2, `${sectionId} must contain at least two regions`);
  return section;
}

function titleField(item) {
  return typeof item?.title === 'string' && item.title.trim() ? 'title' : 'label';
}

function assertControlledPresentation(value, message) {
  assert.equal(value?.layout?.enabled, true, `${message}: layout is not enabled`);
  assert.equal(value?.layout?.desktop?.offset_x, 3, `${message}: desktop horizontal offset is wrong`);
  assert.equal(value?.layout?.desktop?.offset_y, 0, `${message}: desktop vertical offset is wrong`);
  assert.equal(value?.text_style?.enabled, true, `${message}: text style is not enabled`);
  assert.equal(value?.text_style?.size_desktop, 32, `${message}: desktop size is wrong`);
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
  let siblingSnapshot;
  let field;
  let saved = false;
  let summary;

  try {
    const current = await request(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    const sections = clone(current.data.sections || []);
    const section = officeSection(sections);
    const first = section.items[0];
    field = titleField(first);
    originalTitle = first[field];
    originalPresentation = clone(first.field_presentation || null);
    siblingSnapshot = clone(section.items[1]);
    first[field] = marker;
    first.field_presentation = { ...(first.field_presentation || {}), [field]: presentation };

    await request(`${cmsUrl}/items/pages/${pageId}`, { method: 'PATCH', headers, body: JSON.stringify({ sections }) });
    saved = true;

    const persisted = await request(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    const savedSection = officeSection(persisted.data.sections);
    assert.equal(savedSection.items[0][field], marker, 'Directus did not persist the first office region title');
    assertControlledPresentation(savedSection.items[0].field_presentation?.[field], 'Directus did not persist the first office region title presentation');
    assert.deepEqual(savedSection.items[1], siblingSnapshot, 'Directus changed the next office region');

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
    const previewSection = officeSection(session.data.preview.sections);
    assert.equal(previewSection.items[0][field], marker, 'preview session omitted the first office region title');
    assertControlledPresentation(previewSection.items[0].field_presentation?.[field], 'preview session omitted the first office region title presentation');
    assert.deepEqual(previewSection.items[1], siblingSnapshot, 'preview session changed the next office region');

    const html = await request(`${websiteUrl}${previewLocation.pathname}${previewLocation.search}`, { headers: { cookie } }, true);
    assert.ok(html.includes(marker), 'Nuxt preview did not render the saved first office region title');
    assert.ok(html.includes('data-cms-preview-key="office-directory"'), 'Nuxt preview did not render the office directory section');
    assert.ok(html.includes(`data-cms-preview-position-field-path="items.0.field_presentation.${field}"`), 'Nuxt preview did not render the first region title presentation binding');
    assert.ok(html.includes('--cms-offset-x-desktop:3%'), 'Nuxt preview did not render the first region title offset');
    assert.ok(html.includes('--cms-text-size-desktop:32px'), 'Nuxt preview did not render the first region title size');

    summary = { savedTo: `pages/3.sections[office-directory].items[0].field_presentation.${field}`, previewTarget: 'pages/3/office-directory', previewTitle: marker };
  } finally {
    if (saved) {
      const latest = await request(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      const sections = clone(latest.data.sections || []);
      const section = officeSection(sections);
      const first = section.items[0];
      assert.equal(first[field], marker, 'first office region title changed during verification; refusing to overwrite a newer editor value');
      assertControlledPresentation(first.field_presentation?.[field], 'first office region presentation changed during verification; refusing to overwrite a newer editor value');
      assert.deepEqual(section.items[1], siblingSnapshot, 'next office region changed during verification; refusing to overwrite');
      first[field] = originalTitle;
      if (originalPresentation) first.field_presentation = originalPresentation;
      else delete first.field_presentation;
      await request(`${cmsUrl}/items/pages/${pageId}`, { method: 'PATCH', headers, body: JSON.stringify({ sections }) });
      const restored = await request(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      const restoredSection = officeSection(restored.data.sections);
      assert.equal(restoredSection.items[0][field], originalTitle, 'first office region title was not restored');
      assert.deepEqual(restoredSection.items[0].field_presentation || null, originalPresentation, 'first office region title presentation was not restored');
      assert.deepEqual(restoredSection.items[1], siblingSnapshot, 'next office region was not restored unchanged');
    }
  }
  console.log(JSON.stringify({ ...summary, restored: true }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
