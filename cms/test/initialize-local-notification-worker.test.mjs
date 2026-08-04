import assert from 'node:assert/strict';
import test from 'node:test';

const { initializeLocalNotificationWorker } = await import('../scripts/initialize-local-notification-worker.mjs');

test('local notification initialization obtains an admin session, creates a worker account, and writes the worker token only to local environment output', async () => {
  let written = '';
  const result = await initializeLocalNotificationWorker({
    source: 'PUBLIC_URL=http://127.0.0.1:8055\nADMIN_EMAIL=admin@example.test\nADMIN_PASSWORD=local-password\n',
    randomToken: () => 'generated-worker-token', writeEnvironment: async (value) => { written = value; },
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET' };
      if (request.url.pathname === '/auth/login') return Response.json({ data: { access_token: 'admin-session' } });
      if (request.url.pathname === '/collections') return Response.json({ data: [] });
      if (request.url.pathname.startsWith('/fields/')) return Response.json({ data: [] });
      if (request.url.pathname === '/roles' && request.method === 'GET') return Response.json({ data: [{ id: 'worker-role', name: 'Notification worker service account' }] });
      if (request.url.pathname === '/roles') return Response.json({ data: { id: 'role-created' } });
      if (request.url.pathname === '/policies' && request.method === 'GET') return Response.json({ data: [] });
      if (request.url.pathname === '/policies') return Response.json({ data: { id: 'policy-created' } });
      if (request.url.pathname === '/access' || request.url.pathname === '/permissions') return Response.json({ data: [] });
      if (request.url.pathname === '/users' && request.method === 'GET') return Response.json({ data: [] });
      if (request.url.pathname === '/users' && request.method === 'POST') return Response.json({ data: { id: 'worker-user' } });
      return Response.json({ data: {} });
    }
  });

  assert.deepEqual(result, { provisioned: { created: true, updated: false, userId: 'worker-user' }, generatedWorkerToken: true });
  assert.match(written, /^CMS_BASE_URL=http:\/\/127\.0\.0\.1:8055$/m);
  assert.match(written, /^CMS_NOTIFICATION_WORKER_TOKEN=generated-worker-token$/m);
  assert.match(written, /^CMS_NOTIFICATION_WORKER_EMAIL=notification-worker@ruijun\.com$/m);
});
