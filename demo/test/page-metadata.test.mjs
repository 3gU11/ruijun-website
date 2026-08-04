import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import test, { after, before } from 'node:test';

let port;
let serverProcess;

async function reservePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port: availablePort } = server.address();
  await new Promise(resolve => server.close(resolve));
  return availablePort;
}

before(async () => {
  port = await reservePort();
  serverProcess = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, SITE_HOST: '127.0.0.1', SITE_PORT: String(port) },
    stdio: 'ignore'
  });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Website server did not start in time');
});

after(() => serverProcess?.kill());

test('each public page declares a canonical path and Open Graph title', async () => {
  for (const path of ['/', '/product/', '/manufacturing/', '/about/', '/service/']) {
    const html = await (await fetch(`http://127.0.0.1:${port}${path}`)).text();
    assert.match(html, new RegExp(`<link rel="canonical" href="${path.replace('/', '\\/')}"`));
    assert.match(html, /<meta property="og:title" content="[^"]+" \/>/);
  }
});

test('homepage exposes valid Organization structured data', async () => {
  const html = await (await fetch(`http://127.0.0.1:${port}/`)).text();
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'Expected an application/ld+json script');
  const data = JSON.parse(match[1]);
  assert.equal(data['@context'], 'https://schema.org');
  assert.equal(data['@type'], 'Organization');
  assert.equal(data.name, 'Suzhou Ruijun Intelligence Technology Co., Ltd.');
  assert.equal(data.email, 'ksrjjx@126.com');
});

test('sales lead status is announced accessibly after asynchronous submission', async () => {
  const html = await (await fetch(`http://127.0.0.1:${port}/`)).text();
  assert.match(html, /<p class="form-status" id="form-status" role="status" aria-live="polite"><\/p>/);
});

test('product page renders its public series from the CMS BFF rather than hard-coded legacy cards', async () => {
  const html = await (await fetch(`http://127.0.0.1:${port}/product/`)).text();

  assert.match(html, /data-product-series/);
  assert.match(html, /src="\.\.\/product-catalog\.js/);
  assert.doesNotMatch(html, /product-workstation\.png/);
});

test('product detail shell loads published models through the public BFF', async () => {
  const response = await fetch(`http://127.0.0.1:${port}/product/detail/`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /data-product-models/);
  assert.match(html, /src="\.\.\/\.\.\/product-detail\.js/);
});

test('service page declares CMS content targets without replacing its service workflow markup', async () => {
  const html = await (await fetch(`http://127.0.0.1:${port}/service/`)).text();

  assert.match(html, /data-cms-page="service"/);
  assert.match(html, /data-cms-section="online-service"/);
  assert.match(html, /src="\.\.\/page-content\.js/);
  assert.match(html, /data-ai-open="support"/);
});

test('home and about pages expose CMS content targets while retaining their animated page structures', async () => {
  const [home, about] = await Promise.all([
    (await fetch(`http://127.0.0.1:${port}/`)).text(),
    (await fetch(`http://127.0.0.1:${port}/about/`)).text()
  ]);

  assert.match(home, /data-cms-page="home"/);
  assert.match(home, /data-cms-section="why-ruijun"/);
  assert.match(home, /src="page-content\.js/);
  assert.match(home, /reason-horizontal-track/);
  assert.match(about, /data-cms-page="about"/);
  assert.match(about, /data-cms-section="history"/);
  assert.match(about, /src="\.\.\/page-content\.js/);
  assert.match(about, /about-history-track/);
});

test('website keeps static page content available when no CMS cache exists', async () => {
  const response = await fetch(`http://127.0.0.1:${port}/api/public/v1/pages/home`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: null, cache: 'unavailable', source: 'static' });
});
