import assert from 'node:assert/strict';
import test from 'node:test';

const { answerStaticFaq } = await import('../server/services/static-faq.mjs');

test('static FAQ returns an approved repair-progress flow without exposing repair-system internals', () => {
  const result = answerStaticFaq('我想查询维修进度');
  assert.equal(result.matched, true);
  assert.equal(result.suggestedAction, 'requests');
  assert.match(result.answer, /维修系统|售后系统/);
});

test('static FAQ never fabricates an operating answer for unknown equipment questions', () => {
  const result = answerStaticFaq('怎样修改放电参数才能提升加工速度');
  assert.equal(result.matched, false);
  assert.equal(result.suggestedAction, 'support');
  assert.match(result.note, /未审核/);
});

test('static FAQ preserves the legacy repair-materials answer before the general repair match', () => {
  const result = answerStaticFaq('报修前需要准备哪些资料');
  assert.equal(result.matched, true);
  assert.equal(result.title, '报修前建议准备 4 类资料');
  assert.equal(result.steps.length, 4);
  assert.equal(result.suggestedAction, 'request');
});

test('static FAQ restores factory-visit and human-support content', () => {
  const visit = answerStaticFaq('我想预约参观昆山工厂');
  assert.equal(visit.suggestedAction, 'visit');
  assert.match(visit.answer, /地址|来访|接待/);

  const support = answerStaticFaq('怎么联系人工售后');
  assert.equal(support.suggestedAction, 'support');
  assert.match(support.note, /150 5016 6844/);
});
