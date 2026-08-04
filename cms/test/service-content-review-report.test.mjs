import assert from 'node:assert/strict';
import test from 'node:test';

const { buildServiceContentReviewReport } = await import('../reports/service-content-review-report.mjs');
const { fetchServiceContentReviewRecords } = await import('../scripts/export-service-content-review.mjs');

test('service content review report identifies unpublished assets, incomplete locations, and disabled repair entries without exposing contact values', () => {
  const report = buildServiceContentReviewReport({
    resources: [{
      id: 1, source_key: 'legacy-manual', type: 'manual', source_document: '旧站资料', applicable_models: [], version: null,
      language: 'zh-CN', asset: null, updated_at: null, status: 'draft', publication_state: 'unpublished', review_note: '待审核'
    }],
    locations: [{
      id: 2, source_key: 'factory-changshu', region: '江苏省', city: '常熟市', service_scope: '待确认', contact: {},
      business_status: 'review_required', valid_until: null, status: 'draft', publication_state: 'unpublished', review_note: '待审核'
    }],
    entries: [{
      id: 3, entry_type: 'request', url: 'http://127.0.0.1:2888/repair/new', enabled: false, open_mode: 'new_tab',
      fallback_phone: '150 5016 6844', health_status: 'pending', source_document: 'demo/site-config.js',
      status: 'draft', publication_state: 'unpublished', review_note: '待审核'
    }]
  }, { generatedAt: new Date('2026-08-01T11:00:00.000Z') });

  assert.match(report, /# 服务支持内容审核清单/);
  assert.match(report, /共 1 份服务资料、1 个服务网点、1 个售后入口/);
  assert.match(report, /待上传受控文件 1 条；待确认网点信息 1 条；不可公开售后入口 1 条/);
  assert.match(report, /受控文件未上传/);
  assert.match(report, /企业联系方式待确认/);
  assert.match(report, /售后健康状态未确认/);
  assert.match(report, /暂存本机地址/);
  assert.doesNotMatch(report, /150 5016 6844/);
  assert.doesNotMatch(report, /127\.0\.0\.1:2888/);
  assert.match(report, /本清单只读/);
});

test('service content review exporter reads only service review collections through the server token', async () => {
  const requests = [];
  const records = await fetchServiceContentReviewRecords({
    baseUrl: 'http://127.0.0.1:8055', accessToken: 'server-only-token',
    fetchImpl: async (url, options) => {
      requests.push({ url: new URL(url), options });
      return Response.json({ data: [] });
    }
  });

  assert.deepEqual(records, { resources: [], locations: [], entries: [] });
  assert.deepEqual(requests.map((request) => request.url.pathname).sort(), [
    '/items/external_service_entries', '/items/service_locations', '/items/service_resources'
  ]);
  assert.ok(requests.every((request) => request.options.headers.Authorization === 'Bearer server-only-token'));
  assert.ok(requests.every((request) => request.url.searchParams.get('limit') === '-1'));
});
