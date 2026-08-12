import assert from 'node:assert/strict';
import test from 'node:test';

const {
  assessArticle,
  assessCaseStudy,
  assessProductParameter,
  assessPublicKnowledge
} = await import('../reports/public-content-review-rules.mjs');

test('product parameters require a model, field, value and traceable source', () => {
  assert.deepEqual(assessProductParameter({}), ['型号编码', '参数字段', '参数值', '来源文件或地址']);
  assert.deepEqual(assessProductParameter({ model_code: 'FR400XS', field_name: '行程', value: '400', source_document: 'catalog.pdf' }), []);
});

test('case studies require complete machining context, evidence source and customer authorization', () => {
  assert.deepEqual(assessCaseStudy({ slug: 'case-1', industry: '', material: '', thickness: '', model_code: '', process: '', result: '', authorization_status: 'review_required', source_document: 'case.pdf' }), [
    '行业', '材料', '厚度', '型号编码', '工艺过程', '结果', '客户授权待确认'
  ]);
  assert.deepEqual(assessCaseStudy({ slug: 'case-1', industry: '模具', material: '钛合金', thickness: '20mm', model_code: 'FR400XS', process: '中走丝加工', result: '完成验收', authorization_status: 'authorized', source_document: 'case.pdf' }), []);
});

test('articles require route metadata, content, cover, SEO and a traceable source', () => {
  assert.deepEqual(assessArticle({ title: '新闻' }), ['文章标识', '分类', '摘要', '正文或视频', '封面媒体', 'SEO 信息', '来源文件或地址']);
  assert.deepEqual(assessArticle({ slug: 'news-1', category: 'news', title: '新闻', summary: '摘要', body: '正文', cover_asset: 'asset-1', seo: { title: '新闻' }, source_document: 'news.html' }), []);
});

test('public FAQ knowledge reuses lifecycle completeness and high-risk safety requirements', () => {
  const record = {
    source_key: 'faq-1', source_document: 'faq.csv', visibility: 'public', channel: 'both', category: 'operation',
    question_title: '如何检查？', troubleshooting_steps: [{ content: '先停机。' }], risk_level: 'high',
    version: 'review-1', technical_reviewer: 'reviewer-1'
  };
  assert.deepEqual(assessPublicKnowledge(record), ['高风险安全前置条件与人工升级说明']);
  assert.deepEqual(assessPublicKnowledge({ ...record, safety_preconditions: ['断电'], escalation_guidance: '无法确认时联系售后。' }), []);
});
