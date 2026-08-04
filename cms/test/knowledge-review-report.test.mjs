import assert from 'node:assert/strict';
import test from 'node:test';

const { buildKnowledgeTechnicalReviewReport } = await import('../reports/knowledge-review-report.mjs');

test('technical review report prioritizes high-risk knowledge and makes missing review evidence explicit', () => {
  const report = buildKnowledgeTechnicalReviewReport([
    {
      id: 2, source_key: 'faq-medium', source_document: 'FAQ/面板.csv', category: 'control_panel', question_title: '面板报警如何排查？',
      troubleshooting_steps: [{ content: '记录报警代码。' }], risk_level: 'medium', version: 'source-1', technical_reviewer: '', visibility: 'support_internal', channel: 'both',
      status: 'draft', publication_state: 'unpublished'
    },
    {
      id: 1, source_key: 'faq-high', source_document: 'FAQ/机械问题.csv', category: 'mechanical_fault', question_title: '运动部件卡滞怎么办？',
      troubleshooting_steps: [{ content: '检查导轮。' }], risk_level: 'high', version: 'source-1', technical_reviewer: 'tech-1', visibility: 'support_internal', channel: 'both',
      status: 'draft', publication_state: 'unpublished'
    }
  ], { generatedAt: new Date('2026-08-01T09:00:00.000Z') });

  assert.match(report, /# FAQ 技术审核清单/);
  assert.match(report, /共 2 条：高风险 1 条/);
  assert.ok(report.indexOf('faq-high') < report.indexOf('faq-medium'));
  assert.match(report, /高风险安全前置条件与人工升级说明/);
  assert.match(report, /technical_reviewer/);
  assert.match(report, /support_internal/);
});
