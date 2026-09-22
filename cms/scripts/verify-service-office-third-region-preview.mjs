import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const pageId = '3';
const marker = `visual-office-region-3-${Date.now()}`;

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

function officeDirectorySection(sections) {
  const section = sections.find((item) => item?.id === 'office-directory');
  assert.ok(section, 'pages/3 must include its office-directory section');
  assert.ok(Array.isArray(section.items) && section.items.length >= 3, 'office-directory must include at least three configured regions');
  return section;
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
  let previousTitles;
  let saved = false;
  let summary = null;

  try {
    const original = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    const sections = clone(original.data.sections || []);
    const officeDirectory = officeDirectorySection(sections);
    originalTitle = officeDirectory.items[2].title;
    previousTitles = [officeDirectory.items[0].title, officeDirectory.items[1].title];
    officeDirectory.items[2].title = marker;

    await requestJson(`${cmsUrl}/items/pages/${pageId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ sections })
    });
    saved = true;

    const persisted = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    const savedDirectory = officeDirectorySection(persisted.data.sections);
    assert.equal(savedDirectory.items[2].title, marker, 'Directus did not persist the third service region title');
    assert.deepEqual([savedDirectory.items[0].title, savedDirectory.items[1].title], previousTitles, 'saving the third region title changed an earlier region');

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
    assert.equal(session.data.collection, 'pages');
    assert.equal(session.data.itemId, pageId);
    assert.equal(session.data.target.path, '/service');
    assert.equal(session.data.target.selector, '[data-cms-preview-key="office-directory"]');
    const previewDirectory = officeDirectorySection(session.data.preview.sections);
    assert.equal(previewDirectory.items[2].title, marker);
    assert.deepEqual([previewDirectory.items[0].title, previewDirectory.items[1].title], previousTitles, 'preview payload changed an earlier region');

    const previewHtml = await requestText(`${websiteUrl}${previewLocation.pathname}${previewLocation.search}`, { headers: { cookie } });
    assert.match(previewHtml, /data-cms-preview-key="office-directory"/, 'Nuxt preview omitted the office-directory canvas region');
    assert.ok(previewHtml.includes(marker), 'Nuxt preview did not render the saved third service region title');

    summary = {
      savedTo: 'pages/3.sections[office-directory].items[2].title',
      previewTarget: `${session.data.collection}/${session.data.itemId}/office-directory`,
      previewTitle: marker
    };
  } finally {
    if (saved) {
      const latest = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      const sections = clone(latest.data.sections || []);
      const officeDirectory = officeDirectorySection(sections);
      assert.equal(officeDirectory.items[2].title, marker, 'third region title changed during verification; refusing to overwrite a newer editor value');
      assert.deepEqual([officeDirectory.items[0].title, officeDirectory.items[1].title], previousTitles, 'earlier regions changed during verification; refusing to overwrite their newer values');
      officeDirectory.items[2].title = originalTitle;
      await requestJson(`${cmsUrl}/items/pages/${pageId}`, {
        method: 'PATCH', headers, body: JSON.stringify({ sections })
      });
      const restored = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      const restoredDirectory = officeDirectorySection(restored.data.sections);
      assert.equal(restoredDirectory.items[2].title, originalTitle, 'test third region title was not restored');
      assert.deepEqual([restoredDirectory.items[0].title, restoredDirectory.items[1].title], previousTitles, 'restoring the third region title changed an earlier region');
    }
  }
  console.log(JSON.stringify({ ...summary, restored: true }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
