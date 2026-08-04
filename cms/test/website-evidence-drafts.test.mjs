import assert from 'node:assert/strict';
import test from 'node:test';

const { buildWebsiteEvidenceDrafts, createDirectusWebsiteEvidenceSeeder } = await import('../import/website-evidence-drafts.mjs');

test('website evidence drafts preserve the existing manufacturing, history, media, qualification, and service evidence as unpublished records', () => {
  const drafts = buildWebsiteEvidenceDrafts();

  assert.deepEqual(drafts.manufacturing_evidence.map((item) => item.process), ['precision-machining', 'standardized-assembly', 'whole-machine-validation']);
  assert.deepEqual(drafts.milestones.map((item) => item.year), [1997, 2003, 2006, 2014, 2016, 2025]);
  assert.equal(drafts.qualifications.length, 20);
  assert.equal(drafts.qualifications.filter((item) => item.type === 'certificate').length, 7);
  assert.equal(drafts.qualifications.filter((item) => item.type === 'honor').length, 5);
  assert.equal(drafts.qualifications.filter((item) => item.type === 'patent').length, 8);
  assert.deepEqual(drafts.service_locations.map((item) => item.city), ['常熟市', '昆山市']);
  assert.equal(drafts.service_resources.length, 4);
  for (const records of Object.values(drafts)) {
    assert.ok(records.every((record) => record.status === 'draft' && record.publication_state === 'unpublished'));
    assert.ok(records.every((record) => record.source_document && record.review_note));
  }
  assert.ok(drafts.qualifications.every((item) => item.authorization_status === 'review_required'));
  assert.ok(drafts.service_locations.every((item) => item.business_status === 'review_required'));
  assert.ok(drafts.service_resources.every((item) => item.asset === null));
  assert.ok(drafts.manufacturing_evidence.every((item) => item.media.every((media) => media.path.startsWith('/assets/'))));
});

test('Directus website evidence seed upserts each draft collection by its stable source key', async () => {
  const calls = [];
  const seeder = createDirectusWebsiteEvidenceSeeder({
    baseUrl: 'https://cms.example.test', accessToken: 'server-only-token',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: new URL(url), method: options.method || 'GET', body: options.body, headers: options.headers });
      if ((options.method || 'GET') === 'GET') return Response.json({ data: [] });
      return Response.json({ data: { id: 'created' } });
    }
  });

  assert.deepEqual(await seeder.seed(), {
    manufacturing_evidence: { created: 3, updated: 0 },
    milestones: { created: 6, updated: 0 },
    qualifications: { created: 20, updated: 0 },
    service_locations: { created: 2, updated: 0 },
    service_resources: { created: 4, updated: 0 }
  });
  const writes = calls.filter((call) => call.method === 'POST');
  assert.equal(writes.length, 35);
  assert.ok(writes.every((call) => call.headers.Authorization === 'Bearer server-only-token'));
  assert.ok(writes.every((call) => {
    const body = JSON.parse(call.body);
    return body.status === 'draft' && body.publication_state === 'unpublished';
  }));
  assert.ok(calls.some((call) => call.url.pathname === '/items/qualifications' && call.url.searchParams.get('filter[source_key][_eq]') === 'certificate-01'));
});
