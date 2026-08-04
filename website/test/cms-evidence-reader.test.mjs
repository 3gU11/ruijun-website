import assert from 'node:assert/strict';
import test from 'node:test';

const { createCmsEvidenceReader } = await import('../server/services/cms-evidence-reader.mjs');

const published = { status: 'published', publication_state: 'published', published_at: '2026-07-30T00:00:00.000Z' };

test('Nuxt evidence reader exposes only published, effective, approved and safe public evidence', async () => {
  const requests = [];
  const reader = createCmsEvidenceReader({
    milestonesEndpoint: 'https://cms.example.test/items/milestones',
    qualificationsEndpoint: 'https://cms.example.test/items/qualifications',
    manufacturingEvidenceEndpoint: 'https://cms.example.test/items/manufacturing_evidence',
    accessToken: 'server-only-token', now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url, options) => {
      const request = new URL(url);
      requests.push({ request, headers: options.headers });
      if (request.pathname.endsWith('/milestones')) return Response.json({ data: [
        { source_key: 'timeline-1997', year: 1997, event: 'Founded', evidence: 'Reviewed source', sort_order: 1, ...published },
        { source_key: 'timeline-draft', year: 2000, event: 'Draft', sort_order: 2, ...published, status: 'draft' },
        { source_key: 'timeline-future', year: 2027, event: 'Future', sort_order: 3, ...published, published_at: '2026-08-02T00:00:00.000Z' }
      ] });
      if (request.pathname.endsWith('/qualifications')) return Response.json({ data: [
        { source_key: 'certificate-01', type: 'certificate', name: 'Quality certificate', assets: [{ path: '/assets/certificates/quality.jpg', alt: 'Quality certificate' }, { path: 'javascript:alert(1)', alt: 'Unsafe' }], authorization_status: 'approved', sort_order: 1, ...published },
        { source_key: 'certificate-review', type: 'certificate', name: 'Review required', assets: [{ path: '/assets/certificates/review.jpg' }], authorization_status: 'review_required', sort_order: 2, ...published },
        { source_key: 'certificate-unsafe', type: 'certificate', name: 'Unsafe only', assets: [{ path: 'data:image/png;base64,abc' }], authorization_status: 'approved', sort_order: 3, ...published }
      ] });
      return Response.json({ data: [
        { source_key: 'precision', process: 'precision-machining', description: 'Reviewed process', media: [{ path: 'https://cdn.example.test/factory.jpg', alt: 'Factory' }], inspection_evidence: 'Report', sort_order: 1, ...published },
        { source_key: 'invalid', process: 'invalid', description: 'Invalid media', media: [{ path: '//cdn.example.test/unsafe.jpg' }], sort_order: 2, ...published }
      ] });
    }
  });

  assert.deepEqual(await reader.listMilestones(), {
    data: [{ source_key: 'timeline-1997', year: 1997, event: 'Founded', evidence: 'Reviewed source', sort_order: 1 }], cache: 'fresh', source: 'cms'
  });
  assert.deepEqual(await reader.listQualifications(), {
    data: [{ source_key: 'certificate-01', type: 'certificate', name: 'Quality certificate', assets: [{ path: '/assets/certificates/quality.jpg', alt: 'Quality certificate' }], sort_order: 1 }], cache: 'fresh', source: 'cms'
  });
  assert.deepEqual(await reader.listManufacturingEvidence(), {
    data: [{ source_key: 'precision', process: 'precision-machining', description: 'Reviewed process', media: [{ path: 'https://cdn.example.test/factory.jpg', alt: 'Factory' }], inspection_evidence: 'Report', sort_order: 1 }], cache: 'fresh', source: 'cms'
  });
  assert.equal(requests[0].request.searchParams.get('filter[status][_eq]'), 'published');
  assert.equal(requests[0].headers.Authorization, 'Bearer server-only-token');
  assert.match(requests[1].request.searchParams.get('fields'), /authorization_status/);
});

test('Nuxt evidence reader fails closed and serves only its own last valid cached result during CMS outages', async () => {
  assert.deepEqual(await createCmsEvidenceReader({}).listMilestones(), { data: [], cache: 'unavailable', source: 'static' });

  let available = true;
  const record = { source_key: 'timeline-1997', year: 1997, event: 'Founded', evidence: '', sort_order: 1, ...published };
  const reader = createCmsEvidenceReader({
    milestonesEndpoint: 'https://cms.example.test/items/milestones', cacheTtlMs: 0,
    fetchImpl: async () => available ? Response.json({ data: [record] }) : new Response('', { status: 503 })
  });
  await reader.listMilestones();
  available = false;
  assert.deepEqual(await reader.listMilestones(), {
    data: [{ source_key: 'timeline-1997', year: 1997, event: 'Founded', evidence: '', sort_order: 1 }], cache: 'stale', source: 'cms'
  });
});

test('Nuxt evidence reader resolves published asset IDs for qualifications and manufacturing evidence', async () => {
  const reader = createCmsEvidenceReader({
    qualificationsEndpoint: 'https://cms.example.test/items/qualifications', manufacturingEvidenceEndpoint: 'https://cms.example.test/items/manufacturing_evidence',
    mediaAssetsEndpoint: 'https://cms.example.test/items/media_assets', now: () => Date.parse('2026-08-01T00:00:00.000Z'),
    fetchImpl: async (url) => {
      const request = new URL(url);
      if (request.pathname.endsWith('/media_assets')) return Response.json({ data: [
        { id: 9, file_id: 'certificate-file', alt_text: '审核证书', status: 'published', publication_state: 'published', published_at: '2026-07-31T00:00:00.000Z' }
      ] });
      if (request.pathname.endsWith('/qualifications')) return Response.json({ data: [
        { source_key: 'certificate-01', type: 'certificate', name: 'Quality certificate', assets: [{ media_asset_id: 9 }], authorization_status: 'approved', sort_order: 1, ...published }
      ] });
      return Response.json({ data: [
        { source_key: 'precision', process: 'precision-machining', description: 'Reviewed process', media: [{ media_asset_id: 9 }], inspection_evidence: 'Report', sort_order: 1, ...published }
      ] });
    }
  });

  assert.deepEqual((await reader.listQualifications()).data[0]?.assets, [{ path: 'https://cms.example.test/assets/certificate-file', alt: '审核证书' }]);
  assert.deepEqual((await reader.listManufacturingEvidence()).data[0]?.media, [{ path: 'https://cms.example.test/assets/certificate-file', alt: '审核证书' }]);
});
