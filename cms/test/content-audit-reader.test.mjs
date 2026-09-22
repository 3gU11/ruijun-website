import assert from 'node:assert/strict';
import test from 'node:test';

const { contentRoles } = await import('../schema/content-model.mjs');
const { createDirectusSchemaApplier } = await import('../scripts/apply-directus-schema.mjs');
const { createDirectusContentAuditReaderProvisioner } = await import('../scripts/provision-content-audit-reader.mjs');

test('content audit reader is a dedicated non-admin role', () => {
  assert.ok(contentRoles.includes('content_audit_reader'));
});

test('content audit reader receives read-only permissions only for product and service audit collections', async () => {
  const permissions = [];
  const applier = createDirectusSchemaApplier({
    baseUrl: 'https://cms.example.test', accessToken: 'admin-token',
    schemaPlan: { collections: [], fields: [], roles: [{ key: 'content_audit_reader', name: '内容审核只读账号', admin: false }] },
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body };
      if (request.url.pathname === '/collections') return Response.json({ data: [] });
      if (request.url.pathname === '/roles') return Response.json({ data: [{ id: 'audit-role', name: '内容审核只读账号' }] });
      if (request.url.pathname === '/policies') return Response.json({ data: [{ id: 'audit-policy', name: 'Ruijun content_audit_reader' }] });
      if (request.url.pathname === '/access') return Response.json({ data: [{ role: 'audit-role', policy: 'audit-policy' }] });
      if (request.url.pathname === '/permissions' && request.method === 'GET') return Response.json({ data: [] });
      if (request.url.pathname === '/permissions' && request.method === 'POST') { permissions.push(JSON.parse(request.body)); return Response.json({ data: {} }); }
      throw new Error(`Unexpected request ${request.method} ${request.url.pathname}`);
    }
  });

  await applier.apply();
  assert.deepEqual(permissions.map((item) => [item.collection, item.action]).sort(), [
    ['external_service_entries', 'read'], ['knowledge_items', 'read'], ['product_models', 'read'], ['product_parameters', 'read'], ['product_series', 'read'], ['service_locations', 'read'], ['service_resources', 'read']
  ]);
  assert.ok(permissions.every((item) => !item.fields.includes('lead_reference') && !item.fields.includes('phone')));
});

test('content audit reader provisioner creates a separate non-admin account', async () => {
  const calls = [];
  const provisioner = createDirectusContentAuditReaderProvisioner({
    baseUrl: 'https://cms.example.test', adminToken: 'admin-token', serviceToken: 'audit-token', serviceEmail: 'content-audit@example.test',
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET', body: options.body };
      calls.push(request);
      if (request.url.pathname === '/roles') return Response.json({ data: [{ id: 'audit-role', name: '内容审核只读账号', admin_access: false }] });
      if (request.url.pathname === '/users' && request.method === 'GET') return Response.json({ data: [] });
      if (request.url.pathname === '/users' && request.method === 'POST') return Response.json({ data: { id: 'audit-user' } });
      throw new Error(`Unexpected request ${request.method} ${request.url.pathname}`);
    }
  });

  assert.deepEqual(await provisioner.provision(), { created: true, updated: false, userId: 'audit-user' });
  assert.deepEqual(JSON.parse(calls.find((call) => call.method === 'POST').body), { email: 'content-audit@example.test', role: 'audit-role', status: 'active', token: 'audit-token' });
});
