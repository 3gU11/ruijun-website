import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const pageId = '8';
const marker = `visual-process-node-${Date.now()}`;
const titlePresentation = {
  layout: { enabled: true, desktop: { offset_x: 3, offset_y: 0 } },
  text_style: { enabled: true, size_desktop: 32, line_height: 1.4, color: '#123456' }
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

function assertControlledPresentation(value, message) {
  assert.equal(value?.layout?.enabled, true, `${message}: layout is not enabled`);
  assert.equal(value?.layout?.desktop?.offset_x, 3, `${message}: horizontal offset is wrong`);
  assert.equal(value?.text_style?.enabled, true, `${message}: text style is not enabled`);
  assert.equal(value?.text_style?.size_desktop, 32, `${message}: font size is wrong`);
  assert.equal(value?.text_style?.line_height, 1.4, `${message}: line height is wrong`);
  assert.equal(value?.text_style?.color, '#123456', `${message}: color is wrong`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function processSection(sections) {
  const section = sections.find((item) => item?.id === 'process');
  assert.ok(section, 'pages/8 must include its manufacturing process section');
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
  let created = false;
  let summary = null;

  try {
    const original = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    const sections = clone(original.data.sections || []);
    const process = processSection(sections);
    process.items = Array.isArray(process.items) ? process.items : [];
    process.items.push({
      title: '工艺流程预览验证节点',
      body: '仅用于验证 CMS 草稿预览的临时内容。',
      connection_label: '验证连接说明',
      field_presentation: { title: titlePresentation },
      anchor: 'top-left',
      media_role: marker,
      sort_order: process.items.length
    });

    await requestJson(`${cmsUrl}/items/pages/${pageId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ sections })
    });
    created = true;

    const saved = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
    const savedNode = processSection(saved.data.sections).items.find((item) => item?.media_role === marker);
    assert.deepEqual(savedNode && {
      title: savedNode.title,
      body: savedNode.body,
      connection_label: savedNode.connection_label,
      anchor: savedNode.anchor
    }, {
      title: '工艺流程预览验证节点',
      body: '仅用于验证 CMS 草稿预览的临时内容。',
      connection_label: '验证连接说明',
      anchor: 'top-left'
    }, 'Directus did not persist the process node to pages/8');
    assertControlledPresentation(savedNode?.field_presentation?.title, 'Directus did not persist the process node title presentation');

    const issued = await requestJson(`${cmsUrl}/content-preview-tokens/issue`, {
      method: 'POST', headers,
      body: JSON.stringify({ contentCollection: 'pages', contentItemId: pageId, ttlSeconds: 120 })
    });
    const handoff = await fetch(`${websiteUrl}/api/preview/open`, {
      method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: issued.data.token, sectionKey: 'process' })
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
    const previewNode = processSection(session.data.preview.sections).items.find((item) => item?.media_role === marker);
    assert.equal(session.data.collection, 'pages');
    assert.equal(session.data.itemId, pageId);
    assert.equal(session.data.target.path, '/manufacturing');
    assert.equal(session.data.target.selector, '[data-cms-preview-key="process"]');
    assert.equal(previewNode?.title, '工艺流程预览验证节点');
    assert.equal(previewNode?.connection_label, '验证连接说明');
    assertControlledPresentation(previewNode?.field_presentation?.title, 'preview session omitted the process node title presentation');

    const previewHtml = await requestText(`${websiteUrl}${previewLocation.pathname}${previewLocation.search}`, { headers: { cookie } });
    assert.ok(previewHtml.includes('工艺流程预览验证节点'), 'Nuxt preview did not render the temporary process node');
    assert.ok(previewHtml.includes('data-cms-preview-position-field-path="items.'), 'Nuxt preview did not expose the process-node presentation binding');
    assert.ok(previewHtml.includes('--cms-offset-x-desktop:3%'), 'Nuxt preview did not render the process-node title offset');
    assert.ok(previewHtml.includes('--cms-text-size-desktop:32px'), 'Nuxt preview did not render the process-node title size');

    summary = {
      savedTo: 'pages/8.sections[process].items',
      previewTarget: `${session.data.collection}/${session.data.itemId}/process`,
      previewNodeTitle: previewNode.title
    };
  } finally {
    if (created) {
      const latest = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      const sections = clone(latest.data.sections || []);
      const process = processSection(sections);
      process.items = (Array.isArray(process.items) ? process.items : []).filter((item) => item?.media_role !== marker);
      await requestJson(`${cmsUrl}/items/pages/${pageId}`, {
        method: 'PATCH', headers, body: JSON.stringify({ sections })
      });
      const restored = await requestJson(`${cmsUrl}/items/pages/${pageId}?fields=id,sections`, { headers });
      assert.equal(processSection(restored.data.sections).items.some((item) => item?.media_role === marker), false, 'test process node was not removed');
    }
  }
  console.log(JSON.stringify({ ...summary, restored: true }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
