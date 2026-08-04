import assert from 'node:assert/strict';
import test from 'node:test';

const { buildProductTechnicalReviewReport } = await import('../reports/product-review-report.mjs');
const { fetchProductReviewRecords } = await import('../scripts/export-product-technical-review.mjs');

test('product technical review report prioritizes unresolved mappings and parameter conflicts without changing drafts', () => {
  const report = buildProductTechnicalReviewReport({
    series: [
      {
        id: 11, series_code: 'ft-xs', name: 'FT-XS', source_document: 'demo/data/product-catalog.json',
        import_evidence: { aliases_pending_review: ['FT（Pro）'] }, status: 'draft', publication_state: 'unpublished'
      }
    ],
    models: [
      {
        id: 21, model_code: 'ft400s-pro', series_code: 'unmapped-ft-pro', name: 'FT400S（Pro）',
        source_document: 'FAQ/FT（Pro）技术文件.pdf', parameters: { travel_x_mm: '400' },
        import_evidence: {
          series_mapping_status: 'needs_product_owner_confirmation',
          parameter_conflicts: ['max_workpiece_mm'],
          observed_model_names: ['FT400S（Pro）']
        }, status: 'draft', publication_state: 'unpublished'
      },
      {
        id: 22, model_code: 'fr500xs-auto', series_code: 'fr-xs-auto', name: 'FR500XS（Auto）',
        source_document: 'FAQ/FR-XS.pdf', parameters: { travel_x_mm: '500' }, import_evidence: {},
        status: 'draft', publication_state: 'unpublished'
      }
    ]
  }, { generatedAt: new Date('2026-08-01T10:00:00.000Z') });

  assert.match(report, /# 产品主数据技术审核清单/);
  assert.match(report, /共 1 个系列、2 个型号/);
  assert.match(report, /待确认系列归属 1 条；参数冲突 1 条；待确认系列别名 1 条/);
  assert.ok(report.indexOf('FT400S（Pro）') < report.indexOf('FR500XS（Auto）'));
  assert.match(report, /系列归属待产品负责人确认/);
  assert.match(report, /参数冲突：max_workpiece_mm/);
  assert.match(report, /FT（Pro）/);
  assert.match(report, /本清单只读/);
});

test('product technical review report makes missing evidence explicit', () => {
  const report = buildProductTechnicalReviewReport({
    series: [],
    models: [{ id: 30, model_code: '', series_code: '', name: '', parameters: {}, import_evidence: {}, status: 'draft', publication_state: 'unpublished' }]
  }, { generatedAt: new Date('2026-08-01T10:00:00.000Z') });

  assert.match(report, /型号编码/);
  assert.match(report, /系列编码/);
  assert.match(report, /来源文件或地址/);
  assert.match(report, /结构化参数/);
});

test('product review exporter reads only the two private product collections with a server token', async () => {
  const requests = [];
  const records = await fetchProductReviewRecords({
    baseUrl: 'http://127.0.0.1:8055',
    accessToken: 'server-only-token',
    fetchImpl: async (url, options) => {
      requests.push({ url: new URL(url), options });
      const collection = new URL(url).pathname.split('/').at(-1);
      return new Response(JSON.stringify({ data: [{ id: collection }] }), { status: 200 });
    }
  });

  assert.deepEqual(records, { series: [{ id: 'product_series' }], models: [{ id: 'product_models' }] });
  assert.equal(requests.length, 2);
  assert.deepEqual(requests.map((request) => request.url.pathname).sort(), ['/items/product_models', '/items/product_series']);
  assert.ok(requests.every((request) => request.options.headers.Authorization === 'Bearer server-only-token'));
  assert.ok(requests.every((request) => request.url.searchParams.get('limit') === '-1'));
});
