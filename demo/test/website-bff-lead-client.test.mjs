import assert from 'node:assert/strict';
import test from 'node:test';

const { WebsiteBffUnavailable, createWebsiteBffLeadClient } = await import('../website-bff-lead-client.mjs');

test('Demo lead proxy forwards only to the fixed Nuxt public lead endpoint without credentials', async () => {
  let request;
  const client = createWebsiteBffLeadClient({
    baseUrl: 'https://website-bff.example.test/base-path/',
    fetchImpl: async (url, options) => {
      request = { url: String(url), options };
      return Response.json({ leadReference: 'lead-123', status: 'new' }, { status: 201 });
    }
  });

  const result = await client.submit({ name: 'Zhang', phone: '13738375470', leadType: 'quote', consent: true, pagePath: '/' });

  assert.deepEqual(result, { status: 201, body: { leadReference: 'lead-123', status: 'new' } });
  assert.equal(request.url, 'https://website-bff.example.test/api/public/v1/leads');
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(request.options.headers, { Accept: 'application/json', 'Content-Type': 'application/json' });
  assert.equal(request.options.headers.Authorization, undefined);
});

test('Demo lead proxy fails closed when the Nuxt BFF is unavailable or returns a non-JSON response', async () => {
  const unavailable = createWebsiteBffLeadClient({
    baseUrl: 'https://website-bff.example.test',
    fetchImpl: async () => { throw new Error('connect ECONNREFUSED'); }
  });
  const invalidResponse = createWebsiteBffLeadClient({
    baseUrl: 'https://website-bff.example.test',
    fetchImpl: async () => new Response('<html>upstream error</html>', { status: 502, headers: { 'Content-Type': 'text/html' } })
  });

  await assert.rejects(unavailable.submit({}), WebsiteBffUnavailable);
  await assert.rejects(invalidResponse.submit({}), WebsiteBffUnavailable);
});
