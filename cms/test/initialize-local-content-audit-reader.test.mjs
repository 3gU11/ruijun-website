import assert from 'node:assert/strict';
import test from 'node:test';

const { initializeLocalContentAuditReader } = await import('../scripts/initialize-local-content-audit-reader.mjs');

test('local content audit initialization creates the reader with a generated token stored only in local environment output', async () => {
  let written = '';
  const result = await initializeLocalContentAuditReader({
    source: 'PUBLIC_URL=http://127.0.0.1:8055\nADMIN_EMAIL=admin@example.test\nADMIN_PASSWORD=local-password\n',
    randomToken: () => 'generated-audit-token', writeEnvironment: async (value) => { written = value; },
    fetchImpl: async (url, options = {}) => {
      const request = { url: new URL(url), method: options.method || 'GET' };
      if (request.url.pathname === '/auth/login') return Response.json({ data: { access_token: 'admin-session' } });
      if (request.url.pathname === '/collections') return Response.json({ data: [] });
      if (request.url.pathname.startsWith('/fields/')) return Response.json({ data: [] });
if (request.url.pathname === '/roles' && request.method === 'GET') return Response.json({ data: [{ id: 'audit-role', name: '内容审核只读账号' }] });
      if (request.url.pathname === '/roles') return Response.json({ data: { id: 'role-created' } });
      if (request.url.pathname === '/policies' && request.method === 'GET') return Response.json({ data: [] });
      if (request.url.pathname === '/policies') return Response.json({ data: { id: 'policy-created' } });
      if (request.url.pathname === '/access' || request.url.pathname === '/permissions') return Response.json({ data: [] });
      if (request.url.pathname === '/users' && request.method === 'GET') return Response.json({ data: [] });
      if (request.url.pathname === '/users' && request.method === 'POST') return Response.json({ data: { id: 'audit-user' } });
      return Response.json({ data: {} });
    }
  });

  assert.deepEqual(result, { provisioned: { created: true, updated: false, userId: 'audit-user' }, generatedAuditToken: true });
  assert.match(written, /^CMS_CONTENT_AUDIT_TOKEN=generated-audit-token$/m);
  assert.match(written, /^CMS_CONTENT_AUDIT_EMAIL=content-audit-reader@ruijun\.com$/m);
  assert.doesNotMatch(JSON.stringify(result), /generated-audit-token/);
});
