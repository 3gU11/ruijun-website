import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cmsUrl = 'http://127.0.0.1:8055';
const websiteUrl = 'http://127.0.0.1:4175';
const milestoneId = '3';
const marker = `visual-milestone-3-event-${Date.now()}`;

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

async function main() {
  const env = readEnvironment(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const login = await requestJson(`${cmsUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
  });
  const headers = { authorization: `Bearer ${login.data.access_token}`, 'content-type': 'application/json' };
  let originalEvent;
  let adjacentEvents;
  let saved = false;
  let summary = null;

  try {
    const [current, milestone1, milestone2] = await Promise.all([
      requestJson(`${cmsUrl}/items/milestones/${milestoneId}?fields=id,source_key,year,event`, { headers }),
      requestJson(`${cmsUrl}/items/milestones/1?fields=id,event`, { headers }),
      requestJson(`${cmsUrl}/items/milestones/2?fields=id,event`, { headers })
    ]);
    originalEvent = current.data.event;
    adjacentEvents = [
      { milestoneId: 1, event: milestone1.data.event },
      { milestoneId: 2, event: milestone2.data.event }
    ];
    current.data.event = marker;

    await requestJson(`${cmsUrl}/items/milestones/${milestoneId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ event: marker })
    });
    saved = true;

    const [persisted, persisted1, persisted2] = await Promise.all([
      requestJson(`${cmsUrl}/items/milestones/${milestoneId}?fields=id,source_key,year,event`, { headers }),
      requestJson(`${cmsUrl}/items/milestones/1?fields=id,event`, { headers }),
      requestJson(`${cmsUrl}/items/milestones/2?fields=id,event`, { headers })
    ]);
    assert.equal(persisted.data.event, marker, `Directus did not persist event to milestones/${milestoneId}`);
    assert.deepEqual([persisted1.data.event, persisted2.data.event], adjacentEvents.map((item) => item.event), 'saving milestone 3 changed an earlier milestone');

    const issued = await requestJson(`${cmsUrl}/content-preview-tokens/issue`, {
      method: 'POST', headers,
      body: JSON.stringify({ contentCollection: 'milestones', contentItemId: milestoneId, ttlSeconds: 120 })
    });
    const handoff = await fetch(`${websiteUrl}/api/preview/open`, {
      method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: issued.data.token })
    });
    assert.equal(handoff.status, 303, 'Nuxt did not accept the CMS preview token');
    const location = handoff.headers.get('location');
    const previewLocation = new URL(location, websiteUrl);
    assert.equal(previewLocation.pathname, '/about', 'preview token did not resolve to the about page');
    assert.equal(previewLocation.searchParams.get('cmsPreview'), '1', 'preview redirect did not retain preview mode');
    const setCookie = handoff.headers.getSetCookie?.()[0] || handoff.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0];
    assert.match(cookie, /^ruijun_preview_session=/, 'Nuxt did not create a preview session cookie');

    const session = await requestJson(`${websiteUrl}/api/preview/session`, { headers: { cookie } });
    assert.equal(session.data.collection, 'milestones');
    assert.equal(session.data.itemId, milestoneId);
    assert.equal(session.data.target.path, '/about');
    assert.equal(session.data.target.selector, '[data-cms-preview-key="timeline-2006"]');
    assert.equal(session.data.preview.event, marker);

    const aboutPreview = await requestText(`${websiteUrl}${previewLocation.pathname}${previewLocation.search}`, { headers: { cookie } });
    assert.match(aboutPreview, /data-cms-preview-key="timeline-2006"/, 'about preview omitted the edited milestone canvas record');
    assert.ok(aboutPreview.includes(marker), 'about preview did not render the saved milestone event');

    const homePreview = await requestText(`${websiteUrl}/?cmsPreview=1`, { headers: { cookie } });
    assert.match(homePreview, /data-cms-preview-key="milestones\.2"/, 'home preview omitted the third milestone canvas record');
    assert.ok(homePreview.includes(marker), 'home preview did not render the saved shared milestone event');

    summary = {
      savedTo: `milestones/${milestoneId}.event`,
      previewTarget: `${session.data.collection}/${session.data.itemId}/history`,
      previewEvent: marker,
      sharedPages: ['about', 'home']
    };
  } finally {
    if (saved) {
      const [latest, latest1, latest2] = await Promise.all([
        requestJson(`${cmsUrl}/items/milestones/${milestoneId}?fields=id,event`, { headers }),
        requestJson(`${cmsUrl}/items/milestones/1?fields=id,event`, { headers }),
        requestJson(`${cmsUrl}/items/milestones/2?fields=id,event`, { headers })
      ]);
      assert.equal(latest.data.event, marker, 'milestone 3 changed during verification; refusing to overwrite a newer editor value');
      assert.deepEqual([latest1.data.event, latest2.data.event], adjacentEvents.map((item) => item.event), 'an earlier milestone changed during verification; refusing to restore a stale snapshot');
      await requestJson(`${cmsUrl}/items/milestones/${milestoneId}`, {
        method: 'PATCH', headers, body: JSON.stringify({ event: originalEvent })
      });
      const [restored, restored1, restored2] = await Promise.all([
        requestJson(`${cmsUrl}/items/milestones/${milestoneId}?fields=id,event`, { headers }),
        requestJson(`${cmsUrl}/items/milestones/1?fields=id,event`, { headers }),
        requestJson(`${cmsUrl}/items/milestones/2?fields=id,event`, { headers })
      ]);
      assert.equal(restored.data.event, originalEvent, 'test milestone 3 event was not restored');
      assert.deepEqual([restored1.data.event, restored2.data.event], adjacentEvents.map((item) => item.event), 'restoring milestone 3 changed an earlier milestone');
    }
  }
  console.log(JSON.stringify({ ...summary, restored: true }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
