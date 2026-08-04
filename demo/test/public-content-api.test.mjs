import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import test, { after, before } from 'node:test';

let cmsServer;
let cmsPort;
let sitePort;
let siteProcess;
let cmsAvailable = true;

const published = {
  series_code: 'fr-pro', slug: 'fr-pro', name: 'FR (pro)', sort_order: 1,
  status: 'published', publication_state: 'published', published_at: '2026-07-30T00:00:00.000Z'
};
const publishedModel = {
  series_code: 'fr-pro', model_code: 'fr400xs-pro', name: 'FR400XS (Pro)', parameters: { xyTravelMm: '400*300' },
  status: 'published', publication_state: 'published', published_at: '2026-07-30T00:00:00.000Z'
};
const publishedPage = {
  slug: 'about', title: '关于瑞钧', language: 'zh-CN', sections: [{ type: 'hero', title: '关于瑞钧' }],
  status: 'published', publication_state: 'published', published_at: '2026-07-30T00:00:00.000Z'
};

async function reservePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForServer(baseUrl) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/api/public/v1/service-entries`)).ok) return;
    } catch {
      // The website server may still be binding its port.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Website server did not start in time');
}

before(async () => {
  cmsPort = await reservePort();
  cmsServer = createServer((req, res) => {
    if (req.url.startsWith('/items/pages')) {
      assert.match(req.url, /filter%5Bslug%5D%5B_eq%5D=about/);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [publishedPage, { ...publishedPage, status: 'draft' }] }));
      return;
    }
    if (req.url.startsWith('/items/product_models')) {
      assert.match(req.url, /filter%5Bseries_code%5D%5B_eq%5D=fr-pro/);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [publishedModel, { ...publishedModel, model_code: 'draft', status: 'draft' }, { ...publishedModel, model_code: 'wrong-series', series_code: 'ft-xs' }] }));
      return;
    }
    if (!cmsAvailable) {
      res.writeHead(503).end();
      return;
    }
    assert.match(req.url, /filter%5Bstatus%5D%5B_eq%5D=published/);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: [published, { ...published, series_code: 'draft', status: 'draft' }] }));
  });
  cmsServer.listen(cmsPort, '127.0.0.1');
  await once(cmsServer, 'listening');

  sitePort = await reservePort();
  siteProcess = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      SITE_HOST: '127.0.0.1',
      SITE_PORT: String(sitePort),
      CMS_PRODUCT_SERIES_URL: `http://127.0.0.1:${cmsPort}/items/product_series`,
      CMS_PRODUCT_MODELS_URL: `http://127.0.0.1:${cmsPort}/items/product_models`,
      CMS_PAGES_URL: `http://127.0.0.1:${cmsPort}/items/pages`,
      CMS_PUBLIC_CONTENT_CACHE_TTL_MS: '0'
    },
    stdio: 'ignore'
  });
  await waitForServer(`http://127.0.0.1:${sitePort}`);
});

after(async () => {
  siteProcess?.kill();
  await new Promise((resolve) => cmsServer?.close(resolve));
});

test('website exposes only published product series through its public BFF endpoint', async () => {
  const response = await fetch(`http://127.0.0.1:${sitePort}/api/public/v1/product-series`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: [published], cache: 'fresh' });
});

test('website public BFF serves cached public content when CMS fails after a valid response', async () => {
  cmsAvailable = false;
  const response = await fetch(`http://127.0.0.1:${sitePort}/api/public/v1/product-series`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: [published], cache: 'stale' });
});

test('website exposes only published product models from the requested series', async () => {
  const response = await fetch(`http://127.0.0.1:${sitePort}/api/public/v1/product-models?series=fr-pro`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: [publishedModel], cache: 'fresh' });
});

test('website exposes a published CMS page by its safe slug', async () => {
  const response = await fetch(`http://127.0.0.1:${sitePort}/api/public/v1/pages/about`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: publishedPage, cache: 'fresh' });
});
