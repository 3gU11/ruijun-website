import assert from 'node:assert/strict';
import { once } from 'node:events';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import test, { after, before } from 'node:test';

let port;
let leadFile;
let serverProcess;

async function reservePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port: availablePort } = server.address();
  await new Promise(resolve => server.close(resolve));
  return availablePort;
}

async function waitForServer(baseUrl) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/api/public/v1/service-entries`)).ok) return;
    } catch {
      // The child process may still be binding the socket.
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Website server did not start in time');
}

before(async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'ruijun-leads-test-'));
  leadFile = join(tempDir, 'leads.jsonl');
  port = await reservePort();
  serverProcess = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, SITE_HOST: '127.0.0.1', SITE_PORT: String(port), LEADS_DATA_PATH: leadFile, WEBSITE_BFF_BASE_URL: '' },
    stdio: 'ignore'
  });
  await waitForServer(`http://127.0.0.1:${port}`);
});

after(async () => {
  serverProcess?.kill();
  await rm(join(leadFile, '..'), { recursive: true, force: true });
});

test('fails closed without a configured Nuxt BFF and never creates a local lead file', async () => {
  const response = await fetch(`http://127.0.0.1:${port}/api/public/v1/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Zhang', phone: '13738375470', leadType: 'quote', consent: true, pagePath: '/product/' })
  });

  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'LEAD_STORE_UNAVAILABLE');
  await assert.rejects(access(leadFile));
});
