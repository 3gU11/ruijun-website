import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import test, { after, before } from 'node:test';

let bffServer;
let bffPort;
let sitePort;
let siteProcess;
let captured;

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
  bffPort = await reservePort();
  bffServer = createServer(async (req, res) => {
    assert.equal(req.method, 'POST');
    assert.equal(req.url, '/api/public/v1/leads');
    let raw = '';
    for await (const chunk of req) raw += chunk;
    captured = { authorization: req.headers.authorization, body: JSON.parse(raw) };
    if (captured.body.name === 'Unavailable upstream') {
      res.writeHead(502, { 'Content-Type': 'text/html' });
      res.end('<html>upstream error</html>');
      return;
    }
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ leadReference: 'bff-lead-123', status: 'new' }));
  });
  bffServer.listen(bffPort, '127.0.0.1');
  await once(bffServer, 'listening');
  sitePort = await reservePort();
  siteProcess = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      SITE_HOST: '127.0.0.1', SITE_PORT: String(sitePort),
      WEBSITE_BFF_BASE_URL: `http://127.0.0.1:${bffPort}`,
      CMS_WRITE_TOKEN: 'must-not-be-forwarded'
    },
    stdio: 'ignore'
  });
  await waitForServer(`http://127.0.0.1:${sitePort}`);
});

after(async () => {
  siteProcess?.kill();
  await new Promise((resolve) => bffServer?.close(resolve));
});

test('visual demo forwards sales leads to the Nuxt BFF without CMS credentials or local persistence', async () => {
  const response = await fetch(`http://127.0.0.1:${sitePort}/api/public/v1/leads`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Zhang', phone: '13738375470', leadType: 'quote', requirement: 'E2E test', consent: true, pagePath: '/product/' })
  });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { leadReference: 'bff-lead-123', status: 'new' });
  assert.equal(captured.authorization, undefined);
  assert.deepEqual(captured.body, { name: 'Zhang', phone: '13738375470', leadType: 'quote', requirement: 'E2E test', consent: true, pagePath: '/product/' });
});

test('visual demo exposes a controlled unavailable response when the Nuxt BFF cannot respond', async () => {
  const response = await fetch(`http://127.0.0.1:${sitePort}/api/public/v1/leads`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Unavailable upstream', phone: '13738375471', leadType: 'quote', consent: true, pagePath: '/product/' })
  });

  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'LEAD_STORE_UNAVAILABLE');
});
