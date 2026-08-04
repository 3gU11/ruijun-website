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

async function waitForServer(baseUrl) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/`)).ok) return;
    } catch {
      // The child process may still be binding the socket.
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Website server did not start in time');
}

before(async () => {
  port = await reservePort();
  serverProcess = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, SITE_HOST: '127.0.0.1', SITE_PORT: String(port) },
    stdio: 'ignore'
  });
  await waitForServer(`http://127.0.0.1:${port}`);
});

after(() => serverProcess?.kill());

test('serves robots.txt with a sitemap declaration', async () => {
  const response = await fetch(`http://127.0.0.1:${port}/robots.txt`);
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/plain/);
  assert.match(body, /User-agent: \*/);
  assert.match(body, new RegExp(`Sitemap: http://127\\.0\\.0\\.1:${port}/sitemap\\.xml`));
});

test('serves a sitemap for every public website route', async () => {
  const response = await fetch(`http://127.0.0.1:${port}/sitemap.xml`);
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^application\/xml/);
  for (const path of ['/', '/product/', '/manufacturing/', '/about/', '/service/']) {
    assert.match(body, new RegExp(`<loc>http://127\\.0\\.0\\.1:${port}${path}</loc>`));
  }
});
