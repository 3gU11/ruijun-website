import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import test, { after, before } from 'node:test';

let cmsServer;
let cmsPort;
let sitePort;
let siteProcess;

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
    assert.match(req.url, /filter%5Benabled%5D%5B_eq%5D=true/);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: [
      { entry_type: 'request', url: 'https://repair.example.test/repair/new', enabled: true, open_mode: 'new_tab', fallback_phone: '150 5016 6844', status: 'published', publication_state: 'published' },
      { entry_type: 'draft', url: 'https://wrong.example.test', enabled: true, open_mode: 'new_tab', status: 'draft', publication_state: 'published' },
      { entry_type: 'disabled', url: 'https://wrong.example.test', enabled: false, open_mode: 'new_tab', status: 'published', publication_state: 'published' }
    ] }));
  });
  cmsServer.listen(cmsPort, '127.0.0.1');
  await once(cmsServer, 'listening');
  sitePort = await reservePort();
  siteProcess = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, SITE_HOST: '127.0.0.1', SITE_PORT: String(sitePort), CMS_SERVICE_ENTRIES_URL: `http://127.0.0.1:${cmsPort}/items/external_service_entries` },
    stdio: 'ignore'
  });
  await waitForServer(`http://127.0.0.1:${sitePort}`);
});

after(async () => {
  siteProcess?.kill();
  await new Promise((resolve) => cmsServer?.close(resolve));
});

test('configured website reads service deep links from published CMS entries only', async () => {
  const response = await fetch(`http://127.0.0.1:${sitePort}/api/public/v1/service-entries`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.source, 'cms');
  assert.equal(body.cache, 'fresh');
  assert.deepEqual(body.entries, { request: 'https://repair.example.test/repair/new' });
  assert.equal(body.supportPhone, '150 5016 6844');
});
