import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const sectionId = String(process.env.VISUAL_SECTION_ID || 'performance').trim();
const siblingSectionId = String(process.env.VISUAL_SIBLING_SECTION_ID || 'advanced-manufacturing').trim();
const field = String(process.env.VISUAL_FIELD || 'introTitle').trim();
const editableFields = new Set(['kicker', 'title', 'body', 'description', 'label', 'shortTitle', 'introTitle', 'introDetail']);
if (!/^[a-z][a-z0-9-]*$/i.test(sectionId) || !/^[a-z][a-z0-9-]*$/i.test(siblingSectionId) || !editableFields.has(field)) {
  throw new Error('VISUAL_SECTION_ID, VISUAL_SIBLING_SECTION_ID, or VISUAL_FIELD is not an approved homepage text target');
}
const marker = `visual-home-${sectionId}-${field}-${Date.now()}`;
const presentation = {
  layout: { enabled: true, desktop: { offset_x: 3, offset_y: 0 } },
  text_style: { enabled: true, size_desktop: 28, line_height: 1.4, color: '#123456' }
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

function pageSection(sections, id) {
  const section = sections.find((item) => item?.id === id);
  assert.ok(section, `home page must contain ${id}`);
  return section;
}

function assertControlledPresentation(value, message) {
  assert.equal(value?.layout?.enabled, true, `${message}: layout is not enabled`);
  assert.equal(value?.layout?.desktop?.offset_x, 3, `${message}: desktop horizontal offset is wrong`);
  assert.equal(value?.layout?.desktop?.offset_y, 0, `${message}: desktop vertical offset is wrong`);
  assert.equal(value?.text_style?.enabled, true, `${message}: text style is not enabled`);
  assert.equal(value?.text_style?.size_desktop, 28, `${message}: desktop size is wrong`);
  assert.equal(value?.text_style?.line_height, 1.4, `${message}: line height is wrong`);
  assert.equal(value?.text_style?.color, '#123456', `${message}: color is wrong`);
}

function assertPreviewSiblingUnchanged(actual, expected, message) {
  assert.equal(actual?.id, expected?.id, `${message}: id changed`);
  for (const key of ['kicker', 'title', 'body', 'description', 'shortTitle', 'introTitle', 'introDetail', 'mode']) {
    assert.equal(actual?.[key] || '', expected?.[key] || '', `${message}: ${key} changed`);
  }
  assert.deepEqual(actual?.field_presentation || null, expected?.field_presentation || null, `${message}: field presentation changed`);
}

async function findHomePage(headers) {
  const response = await request(`${cmsUrl}/items/pages?filter[slug][_eq]=home&fields=id,slug,sections&limit=1`, { headers });
  const page = Array.isArray(response.data) ? response.data[0] : null;
  assert.ok(page?.id != null && Array.isArray(page.sections), 'Directus did not return the editable home page');
  return page;
}

async function main() {
  const env = readEnvironment(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await request(`${cmsUrl}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
  });
  const headers = { authorization: `Bearer ${login.data.access_token}`, 'content-type': 'application/json' };
  const page = await findHomePage(headers);
  let originalTitle;
  let originalPresentation;
  let siblingSnapshot;
  let saved = false;
  let summary;

  try {
    const sections = clone(page.sections);
    const section = pageSection(sections, sectionId);
    const sibling = pageSection(sections, siblingSectionId);
    originalTitle = section[field];
    assert.equal(typeof originalTitle, 'string', `${sectionId}.${field} must be a text field`);
    originalPresentation = clone(section.field_presentation || null);
    siblingSnapshot = clone(sibling);
    section[field] = marker;
    section.field_presentation = { ...(section.field_presentation || {}), [field]: presentation };

    await request(`${cmsUrl}/items/pages/${encodeURIComponent(page.id)}`, { method: 'PATCH', headers, body: JSON.stringify({ sections }) });
    saved = true;

    const persisted = await findHomePage(headers);
    const savedSection = pageSection(persisted.sections, sectionId);
    assert.equal(savedSection[field], marker, 'Directus did not persist the homepage text field');
    assertControlledPresentation(savedSection.field_presentation?.[field], 'Directus did not persist the homepage text presentation');
    assert.deepEqual(pageSection(persisted.sections, siblingSectionId), siblingSnapshot, 'Directus changed the adjacent homepage section');

    const issued = await request(`${cmsUrl}/content-preview-tokens/issue`, {
      method: 'POST', headers,
      body: JSON.stringify({ contentCollection: 'pages', contentItemId: String(page.id), ttlSeconds: 120 })
    });
    const handoff = await fetch(`${websiteUrl}/api/preview/open`, {
      method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: issued.data.token, sectionKey: sectionId })
    });
    assert.equal(handoff.status, 303, 'Nuxt did not accept the CMS preview token');
    const previewLocation = new URL(handoff.headers.get('location'), websiteUrl);
    assert.equal(previewLocation.pathname, '/');
    const cookie = (handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '').split(';')[0];
    assert.match(cookie, /^ruijun_preview_session=/, 'Nuxt did not create a preview session cookie');

    const session = await request(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    const previewSection = pageSection(session.data.preview.sections, sectionId);
    assert.equal(previewSection[field], marker, 'preview session omitted the homepage text field');
    assertControlledPresentation(previewSection.field_presentation?.[field], 'preview session omitted the homepage text presentation');
    assertPreviewSiblingUnchanged(pageSection(session.data.preview.sections, siblingSectionId), siblingSnapshot, 'preview session changed the adjacent homepage section');

    const html = await request(`${websiteUrl}${previewLocation.pathname}${previewLocation.search}`, { headers: { cookie } }, true);
    assert.ok(html.includes(marker), 'Nuxt preview did not render the homepage text field');
    assert.ok(html.includes(`data-cms-preview-key="${sectionId}"`), 'Nuxt preview did not render the homepage target section');
    assert.ok(html.includes(`data-cms-preview-position-field-path="field_presentation.${field}"`), 'Nuxt preview did not render the homepage text presentation binding');
    assert.ok(html.includes('--cms-offset-x-desktop:3%'), 'Nuxt preview did not render the homepage text offset');
    assert.ok(html.includes('--cms-text-size-desktop:28px'), 'Nuxt preview did not render the homepage text size');

    summary = { savedTo: `pages/${page.id}.sections[${sectionId}].field_presentation.${field}`, previewTarget: `pages/${page.id}/${sectionId}`, previewTitle: marker };
  } finally {
    if (saved) {
      const latest = await findHomePage(headers);
      const sections = clone(latest.sections);
      const section = pageSection(sections, sectionId);
      assert.equal(section[field], marker, 'homepage text field changed during verification; refusing to overwrite a newer editor value');
      assertControlledPresentation(section.field_presentation?.[field], 'homepage text presentation changed during verification; refusing to overwrite a newer editor value');
      assert.deepEqual(pageSection(sections, siblingSectionId), siblingSnapshot, 'adjacent homepage section changed during verification; refusing to overwrite');
      section[field] = originalTitle;
      if (originalPresentation) section.field_presentation = originalPresentation;
      else delete section.field_presentation;
      await request(`${cmsUrl}/items/pages/${encodeURIComponent(latest.id)}`, { method: 'PATCH', headers, body: JSON.stringify({ sections }) });
      const restored = await findHomePage(headers);
      const restoredSection = pageSection(restored.sections, sectionId);
      assert.equal(restoredSection[field], originalTitle, 'homepage text field was not restored');
      assert.deepEqual(restoredSection.field_presentation || null, originalPresentation, 'homepage text presentation was not restored');
      assert.deepEqual(pageSection(restored.sections, siblingSectionId), siblingSnapshot, 'adjacent homepage section was not restored unchanged');
    }
  }
  console.log(JSON.stringify({ ...summary, restored: true }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
