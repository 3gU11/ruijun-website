import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const pageId = '9';
const marker = `visual-dynamic-news-empty-${Date.now()}`;

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

function dynamicNewsSection(sections) {
  const section = sections.find((item) => item?.id === 'dynamic-news');
  assert.ok(section, 'pages/9 must include its dynamic-news section');
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
  let originalDescription;
  let saved = false;
  let summary = null;

  try {
    const original = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    const sections = clone(original.data.sections || []);
    const dynamicNews = dynamicNewsSection(sections);
    originalDescription = dynamicNews.description;
    dynamicNews.description = marker;

    await requestJson(`${cmsUrl}/items/pages/${pageId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ sections })
    });
    saved = true;

    const persisted = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    assert.equal(dynamicNewsSection(persisted.data.sections).description, marker, 'Directus did not persist the empty-state description to pages/9');

    const issued = await requestJson(`${cmsUrl}/content-preview-tokens/issue`, {
      method: 'POST', headers,
      body: JSON.stringify({ contentCollection: 'pages', contentItemId: pageId, ttlSeconds: 120 })
    });
    const handoff = await fetch(`${websiteUrl}/api/preview/open`, {
      method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: issued.data.token, sectionKey: 'dynamic-news' })
    });
    assert.equal(handoff.status, 303, 'Nuxt did not accept the CMS preview token');
    const location = handoff.headers.get('location');
    const previewLocation = new URL(location, websiteUrl);
    assert.equal(previewLocation.pathname, '/news', 'preview token did not resolve to the news page');
    assert.equal(previewLocation.searchParams.get('cmsPreview'), '1', 'preview redirect did not retain preview mode');
    const setCookie = handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0];
    assert.match(cookie, /^ruijun_preview_session=/, 'Nuxt did not create a preview session cookie');

    const session = await requestJson(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    assert.equal(session.data.collection, 'pages');
    assert.equal(session.data.itemId, pageId);
    assert.equal(session.data.target.path, '/news');
    assert.equal(session.data.target.selector, '[data-cms-preview-key="dynamic-news"]');
    assert.equal(dynamicNewsSection(session.data.preview.sections).description, marker);

    const previewHtml = await requestText(`${websiteUrl}${previewLocation.pathname}${previewLocation.search}`, { headers: { cookie } });
    assert.match(previewHtml, /data-cms-preview-key="dynamic-news"/, 'Nuxt preview omitted the dynamic-news canvas region');
    assert.ok(previewHtml.includes(marker), 'Nuxt preview did not render the saved dynamic-news empty-state description');

    summary = {
      savedTo: 'pages/9.sections[dynamic-news].description',
      previewTarget: `${session.data.collection}/${session.data.itemId}/dynamic-news`,
      previewDescription: marker
    };
  } finally {
    if (saved) {
      const latest = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      const sections = clone(latest.data.sections || []);
      const dynamicNews = dynamicNewsSection(sections);
      assert.equal(dynamicNews.description, marker, 'empty-state description changed during verification; refusing to overwrite a newer editor value');
      dynamicNews.description = originalDescription;
      await requestJson(`${cmsUrl}/items/pages/${pageId}`, {
        method: 'PATCH', headers, body: JSON.stringify({ sections })
      });
      const restored = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      assert.equal(dynamicNewsSection(restored.data.sections).description, originalDescription, 'test empty-state description was not restored');
    }
  }
  console.log(JSON.stringify({ ...summary, restored: true }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
