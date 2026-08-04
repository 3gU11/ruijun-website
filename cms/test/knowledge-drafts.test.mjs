import assert from 'node:assert/strict';
import test from 'node:test';
import { buildKnowledgeDrafts, createDirectusKnowledgeSeeder, parseSingleColumnCsv } from '../import/knowledge-drafts.mjs';

test('parses quoted single-column CSV records without splitting multiline knowledge content', () => {
  const rows = parseSingleColumnCsv('分段内容\n"# 伺服报警 E-010\n\n处理步骤：\n1. 停机检查"\n"### 2. 水嘴异常\n检查过滤器"\n');

  assert.deepEqual(rows, ['# 伺服报警 E-010\n\n处理步骤：\n1. 停机检查', '### 2. 水嘴异常\n检查过滤器']);
});

test('builds stable unpublished internal knowledge drafts from each CSV record', () => {
  const drafts = buildKnowledgeDrafts([
    { sourcePath: 'Dify知识库/伺服错误码.csv', content: '分段内容\n"# 伺服报警 E-010\n请联系售后"\n' },
    { sourcePath: 'Dify知识库/机械问题.csv', content: '分段内容\n"# 水嘴异常\n检查水路"\n' }
  ]);

  assert.equal(drafts.length, 2);
  assert.equal(drafts[0].question_title, '伺服报警 E-010');
  assert.equal(drafts[0].risk_level, 'high');
  assert.equal(drafts[0].visibility, 'support_internal');
  assert.equal(drafts[0].channel, 'both');
  assert.equal(drafts[0].status, 'draft');
  assert.equal(drafts[0].publication_state, 'unpublished');
  assert.equal(drafts[0].dify_sync_status, 'not_eligible');
  assert.equal(drafts[0].source_key, buildKnowledgeDrafts([{ sourcePath: 'Dify知识库/伺服错误码.csv', content: '分段内容\n"# 内容已更新"\n' }])[0].source_key);
});

test('upserts only drafts and never changes an already reviewed knowledge item', async () => {
  const calls = [];
  const seeder = createDirectusKnowledgeSeeder({
    baseUrl: 'http://cms.test',
    accessToken: 'test-token',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: new URL(url), options });
      if (url.includes('filter[source_key]')) {
        const key = new URL(url).searchParams.get('filter[source_key][_eq]');
        return new Response(JSON.stringify({ data: key === 'reviewed-item' ? [{ id: '7', status: 'review', publication_state: 'unpublished' }] : [{ id: '8', status: 'draft', publication_state: 'unpublished' }] }), { status: 200 });
      }
      return new Response(JSON.stringify({ data: {} }), { status: 200 });
    }
  });

  const result = await seeder.seed([
    { source_key: 'reviewed-item', status: 'draft', publication_state: 'unpublished' },
    { source_key: 'draft-item', status: 'draft', publication_state: 'unpublished' }
  ]);

  assert.deepEqual(result, { created: 0, updated: 1, skippedReviewed: 1 });
  const patch = calls.find((call) => call.options.method === 'PATCH');
  assert.ok(patch);
  assert.ok(!Object.hasOwn(JSON.parse(patch.options.body), 'status'));
  assert.ok(!Object.hasOwn(JSON.parse(patch.options.body), 'publication_state'));
  assert.equal(calls.filter((call) => call.options.method === 'POST').length, 0);
});
