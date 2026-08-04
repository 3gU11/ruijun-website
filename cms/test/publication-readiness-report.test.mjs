import assert from 'node:assert/strict';
import test from 'node:test';

const { buildPublicationReadiness } = await import('../reports/publication-readiness-report.mjs');

test('publication readiness keeps drafts blocked and makes missing release evidence explicit', () => {
  const report = buildPublicationReadiness({ products: [{ name: 'FR-XS', status: 'draft', publication_state: 'unpublished', issues: ['参数冲突'] }], services: [{ label: '维修入口', status: 'draft', publication_state: 'unpublished', issues: ['目标地址无效'] }], articles: [{ title: '新闻', status: 'draft', publication_state: 'unpublished', body: '' }] });
  assert.deepEqual(report.summary, { ready: 0, blocked: 3 });
  assert.deepEqual(report.items.map((item) => item.blockers), [['未完成发布', '参数冲突'], ['未完成发布', '目标地址无效'], ['未完成发布', '正文']]);
});
