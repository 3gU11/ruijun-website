import assert from 'node:assert/strict';
import test from 'node:test';

const { createDirectusBffServiceAccountProvisioner } = await import('../scripts/provision-bff-service-account.mjs');

test('BFF service account provisioner creates an active non-admin account bound to the website BFF role', async () => {
  const calls = [];
  const provisioner = createDirectusBffServiceAccountProvisioner({
    baseUrl: 'https://cms.example.test', adminToken: 'admin-token', serviceToken: 'bff-token', serviceEmail: 'website-bff@example.test',
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body, headers: options.headers };
      calls.push(request);
      if (request.url.pathname === '/roles') return Response.json({ data: [{ id: 'bff-role', name: '官网 BFF 服务账户', admin_access: false }] });
      if (request.url.pathname === '/users' && request.method === 'POST') return Response.json({ data: { id: 'created-user' } });
      if (request.url.pathname === '/users' && request.method === 'GET') return Response.json({ data: [] });
      throw new Error(`Unexpected request ${request.method} ${request.url.pathname}`);
    }
  });

  assert.deepEqual(await provisioner.provision(), { created: true, updated: false, userId: 'created-user' });
  const write = calls.find((call) => call.method === 'POST');
  assert.deepEqual(JSON.parse(write.body), { email: 'website-bff@example.test', role: 'bff-role', status: 'active', token: 'bff-token' });
  assert.equal(write.headers.Authorization, 'Bearer admin-token');
});

test('BFF service account provisioner rotates only the target account token and fails closed without the service role', async () => {
  const writes = [];
  const provisioner = createDirectusBffServiceAccountProvisioner({
    baseUrl: 'https://cms.example.test', adminToken: 'admin-token', serviceToken: 'rotated-token', serviceEmail: 'website-bff@example.test',
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body };
      if (request.url.pathname === '/roles') return Response.json({ data: [{ id: 'bff-role', name: '官网 BFF 服务账户', admin_access: false }] });
      if (request.url.pathname === '/users' && request.method === 'GET') return Response.json({ data: [{ id: 'existing-user', email: 'website-bff@example.test' }] });
      if (request.url.pathname === '/users/existing-user' && request.method === 'PATCH') { writes.push(JSON.parse(request.body)); return Response.json({ data: { id: 'existing-user' } }); }
      throw new Error(`Unexpected request ${request.method} ${request.url.pathname}`);
    }
  });

  assert.deepEqual(await provisioner.provision(), { created: false, updated: true, userId: 'existing-user' });
  assert.deepEqual(writes, [{ role: 'bff-role', status: 'active', token: 'rotated-token' }]);

  const missingRole = createDirectusBffServiceAccountProvisioner({
    baseUrl: 'https://cms.example.test', adminToken: 'admin-token', serviceToken: 'bff-token',
    fetchImpl: async () => Response.json({ data: [] })
  });
  await assert.rejects(missingRole.provision(), /website BFF role/i);
});
