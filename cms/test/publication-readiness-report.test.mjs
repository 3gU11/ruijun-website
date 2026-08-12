import assert from 'node:assert/strict';
import test from 'node:test';

const { buildPublicationReadiness } = await import('../reports/publication-readiness-report.mjs');

test('publication readiness keeps drafts blocked and makes missing release evidence explicit', () => {
  const report = buildPublicationReadiness({ products: [{ name: 'FR-XS', status: 'draft', publication_state: 'unpublished', issues: ['参数冲突'] }], services: [{ label: '维修入口', status: 'draft', publication_state: 'unpublished', issues: ['未完成发布', '目标地址无效'] }], articles: [{ title: '新闻', status: 'draft', publication_state: 'unpublished', body: '' }] });
  assert.deepEqual(report.summary, { ready: 0, blocked: 3 });
  assert.deepEqual(report.items.map((item) => item.blockers), [['未完成发布', '参数冲突'], ['未完成发布', '目标地址无效'], ['未完成发布', '正文']]);
});

test('publication readiness blocks incomplete pages and global settings with unresolved review flags', () => {
  const report = buildPublicationReadiness({
    pages: [{ slug: 'home', title: '首页', language: 'zh-CN', sections: [{ id: 'claim', requires_claim_review: true }], seo: {}, source_document: 'demo/index.html', status: 'review', publication_state: 'unpublished' }],
    settings: [{ setting_key: 'global', navigation: [{ label: '产品', href: '/product' }], footer: { requires_business_review: true }, brand: { display_name: '瑞钧', logo_asset: '/logo.png' }, contacts: { service_phone: 'private' }, source_document: 'header.vue', status: 'review', publication_state: 'unpublished' }]
  });
  assert.deepEqual(report.summary, { ready: 0, blocked: 2 });
  assert.deepEqual(report.items.map((item) => item.type), ['page', 'setting']);
  assert.deepEqual(report.items[0].blockers, ['未完成发布', 'SEO 信息', '宣传声明待审核']);
  assert.deepEqual(report.items[1].blockers, ['未完成发布', '页脚业务信息待审核']);
  assert.doesNotMatch(JSON.stringify(report), /private|demo\/index/);
});

test('publication readiness includes product series and governed media blockers without raw metadata', () => {
  const report = buildPublicationReadiness({
    series: [{ name: 'FR 系列', status: 'review', publication_state: 'unpublished', issues: ['待确认系列别名：FR-A'] }],
    media: [{ label: 'machine.webp', status: 'review', publication_state: 'unpublished', issues: ['版权状态待审核'] }]
  });
  assert.deepEqual(report.summary, { ready: 0, blocked: 2 });
  assert.deepEqual(report.items, [
    { type: 'series', label: 'FR 系列', blockers: ['未完成发布', '待确认系列别名：FR-A'] },
    { type: 'media', label: 'machine.webp', blockers: ['未完成发布', '版权状态待审核'] }
  ]);
});

test('publication readiness includes manufacturing, qualification and milestone evidence in a stable order', () => {
  const report = buildPublicationReadiness({
    manufacturing: [{ label: '精密加工', status: 'draft', publication_state: 'unpublished', issues: ['检测依据'] }],
    qualifications: [{ label: '质量管理体系认证证书', status: 'draft', publication_state: 'unpublished', issues: ['授权状态待确认'] }],
    milestones: [{ label: '1997', status: 'draft', publication_state: 'unpublished', issues: ['佐证材料'] }]
  });
  assert.deepEqual(report.summary, { ready: 0, blocked: 3 });
  assert.deepEqual(report.items, [
    { type: 'manufacturing', label: '精密加工', blockers: ['未完成发布', '检测依据'] },
    { type: 'qualification', label: '质量管理体系认证证书', blockers: ['未完成发布', '授权状态待确认'] },
    { type: 'milestone', label: '1997', blockers: ['未完成发布', '佐证材料'] }
  ]);
});

test('publication readiness includes parameters, cases and public knowledge candidates', () => {
  const report = buildPublicationReadiness({
    parameters: [{ label: 'FR400XS / 行程', status: 'draft', publication_state: 'unpublished', issues: ['来源文件或地址'] }],
    cases: [{ label: '钛合金案例', status: 'draft', publication_state: 'unpublished', issues: ['客户授权待确认'] }],
    knowledge: [{ label: '如何检查？', status: 'draft', publication_state: 'unpublished', issues: ['高风险安全前置条件与人工升级说明'] }]
  });
  assert.deepEqual(report.items.map((item) => item.type), ['parameter', 'case', 'knowledge']);
  assert.deepEqual(report.summary, { ready: 0, blocked: 3 });
});

test('publication readiness adds a native Directus edit path only when a record id is available', () => {
  const report = buildPublicationReadiness({
    products: [{ id: 42, name: 'FR-XS', status: 'draft', publication_state: 'unpublished', issues: ['参数'] }],
    services: [{ id: 7, collection: 'service_resources', label: 'manual', status: 'draft', publication_state: 'unpublished', issues: [] }],
    articles: [{ title: '无 ID 新闻', status: 'draft', publication_state: 'unpublished', body: '' }]
  });
  assert.equal(report.items[0].edit_path, '/admin/content/product_models/42');
  assert.equal(report.items[1].edit_path, '/admin/content/service_resources/7');
  assert.equal('edit_path' in report.items[2], false);
});
