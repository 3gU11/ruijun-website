import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const pageId = '3';
const addressMarker = `visual-office-region-3-address-${Date.now()}`;
const managerMarker = `visual-office-region-3-manager-${Date.now()}`;
const phoneMarker = `138${String(Date.now()).slice(-8)}`;
const addressFieldPath = 'items.2.offices.0.address';
const managerFieldPath = 'items.2.offices.0.manager';
const phoneFieldPath = 'items.2.offices.0.phone';

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

function regionContacts(sections) {
  const section = sections.find((item) => item?.id === 'office-directory');
  assert.ok(section, 'pages/3 must include its office-directory section');
  assert.ok(Array.isArray(section.items) && Array.isArray(section.items[2]?.offices) && section.items[2].offices.length >= 2, 'office-directory third region must include at least two offices');
  return section.items[2].offices;
}

function firstContact(sections) {
  const office = regionContacts(sections)[0];
  return { address: office.address, manager: office.manager, phone: office.phone };
}

async function main() {
  const env = readEnvironment(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await requestJson(`${cmsUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
  });
  const headers = { authorization: `Bearer ${login.data.access_token}`, 'content-type': 'application/json' };
  let originalSections;
  let siblingOffice;
  let saved = false;
  let summary = null;

  try {
    const original = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    originalSections = clone(original.data.sections || []);
    const sections = clone(originalSections);
    const offices = regionContacts(sections);
    siblingOffice = clone(offices[1]);
    const directory = sections.find((item) => item?.id === 'office-directory');
    directory.items[2].offices[0].address = addressMarker;
    directory.items[2].offices[0].manager = managerMarker;
    directory.items[2].offices[0].phone = phoneMarker;

    await requestJson(`${cmsUrl}/items/pages/${pageId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ sections })
    });
    saved = true;

    const persisted = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    assert.deepEqual(firstContact(persisted.data.sections), { address: addressMarker, manager: managerMarker, phone: phoneMarker }, 'Directus did not persist all third-region contact fields');
    assert.deepEqual(regionContacts(persisted.data.sections)[1], siblingOffice, 'saving the first office changed the second office');

    const issued = await requestJson(`${cmsUrl}/content-preview-tokens/issue`, {
      method: 'POST', headers,
      body: JSON.stringify({ contentCollection: 'pages', contentItemId: pageId, ttlSeconds: 120 })
    });
    const handoff = await fetch(`${websiteUrl}/api/preview/open`, {
      method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: issued.data.token, sectionKey: 'office-directory' })
    });
    assert.equal(handoff.status, 303, 'Nuxt did not accept the CMS preview token');
    const location = handoff.headers.get('location');
    const previewLocation = new URL(location, websiteUrl);
    assert.equal(previewLocation.pathname, '/service', 'preview token did not resolve to the service page');
    assert.equal(previewLocation.searchParams.get('cmsPreview'), '1', 'preview redirect did not retain preview mode');
    const setCookie = handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0];
    assert.match(cookie, /^ruijun_preview_session=/, 'Nuxt did not create a preview session cookie');

    const session = await requestJson(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    assert.equal(session.data.target.path, '/service');
    assert.equal(session.data.target.selector, '[data-cms-preview-key="office-directory"]');
    assert.deepEqual(firstContact(session.data.preview.sections), { address: addressMarker, manager: managerMarker, phone: phoneMarker }, 'preview payload did not contain all saved contact fields');

    const previewHtml = await requestText(`${websiteUrl}${previewLocation.pathname}${previewLocation.search}`, { headers: { cookie } });
    assert.ok(previewHtml.includes('data-cms-preview-field-path="items.2.offices.0.address"'), `Nuxt preview omitted ${addressFieldPath}`);
    assert.ok(previewHtml.includes('data-cms-preview-field-path="items.2.offices.0.manager"'), `Nuxt preview omitted ${managerFieldPath}`);
    assert.ok(previewHtml.includes('data-cms-preview-field-path="items.2.offices.0.phone"'), `Nuxt preview omitted ${phoneFieldPath}`);
    assert.ok(previewHtml.includes(addressMarker) && previewHtml.includes(managerMarker) && previewHtml.includes(phoneMarker), 'Nuxt preview did not render all saved third-region contact fields');

    summary = {
      savedTo: `pages/3.sections[office-directory].${addressFieldPath},${managerFieldPath},${phoneFieldPath}`,
      previewTarget: `${session.data.collection}/${session.data.itemId}/office-directory`,
      restoredFields: ['address', 'manager', 'phone']
    };
  } finally {
    if (saved) {
      const latest = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      assert.deepEqual(firstContact(latest.data.sections), { address: addressMarker, manager: managerMarker, phone: phoneMarker }, 'third-region contact changed during verification; refusing to overwrite a newer editor value');
      assert.deepEqual(regionContacts(latest.data.sections)[1], siblingOffice, 'second office changed during verification; refusing to restore a stale snapshot');
      await requestJson(`${cmsUrl}/items/pages/${pageId}`, {
        method: 'PATCH', headers, body: JSON.stringify({ sections: originalSections })
      });
      const restored = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      assert.deepEqual(firstContact(restored.data.sections), firstContact(originalSections), 'test third-region contact fields were not restored');
      assert.deepEqual(regionContacts(restored.data.sections)[1], siblingOffice, 'restoring first-office contact fields changed the second office');
    }
  }
  console.log(JSON.stringify({ ...summary, restored: true }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
