import assert from 'node:assert/strict';
import test from 'node:test';

const { createDirectusNotificationWorkerProvisioner } = await import('../scripts/provision-notification-worker.mjs');

test('notification worker provisioner creates a separate non-admin service account with the worker role', async () => {
  const calls = [];
  const provisioner = createDirectusNotificationWorkerProvisioner({
    baseUrl: 'https://cms.example.test', adminToken: 'admin-token', serviceToken: 'worker-token', serviceEmail: 'notification-worker@example.test',
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body, headers: options.headers };
      calls.push(request);
if (request.url.pathname === '/roles') return Response.json({ data: [{ id: 'worker-role', name: '通知任务服务账号', admin_access: false }] });
      if (request.url.pathname === '/users' && request.method === 'GET') return Response.json({ data: [] });
      if (request.url.pathname === '/users' && request.method === 'POST') return Response.json({ data: { id: 'worker-user' } });
      throw new Error(`Unexpected request ${request.method} ${request.url.pathname}`);
    }
  });

  assert.deepEqual(await provisioner.provision(), { created: true, updated: false, userId: 'worker-user' });
  assert.deepEqual(JSON.parse(calls.find((call) => call.method === 'POST').body), {
    email: 'notification-worker@example.test', role: 'worker-role', status: 'active', token: 'worker-token'
  });
});
