import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const workbenches = [
  'content-publication-queue-workbench',
  'knowledge-review-workbench',
  'lead-workbench',
  'notification-workbench',
  'operations-overview-workbench',
  'product-release-workbench',
  'product-review-workbench',
  'publication-readiness-workbench',
  'service-content-review-workbench',
  'service-entry-analytics',
  'content-editor-workbench'
];

test('CMS workbench eyebrow labels stay in Chinese for non-technical operators', async () => {
  const modules = await Promise.all(workbenches.map((name) => readFile(new URL(`extensions/${name}/src/module.vue`, root), 'utf8')));
  const forbidden = />(?:CMS OPERATIONS|FAQ GOVERNANCE|QUICK ACTIONS|CONTENT INVENTORY|CONTENT PUBLICATION|FAQ KNOWLEDGE REVIEW|SALES INBOX|NOTIFICATION EXCEPTIONS|PRODUCT RELEASE|NEXT SNAPSHOT|ACTIVE RELEASE|RELEASE HISTORY|CONTROLLED RESTORE|PRODUCT REVIEW|PUBLICATION READINESS|SERVICE REVIEW|SERVICE ENTRY ATTRIBUTION|PUBLISH APPROVED CONTENT|WITHDRAW PUBLISHED CONTENT|ARCHIVE WITHDRAWN CONTENT)</;
  for (const module of modules) assert.doesNotMatch(module, forbidden);
  for (const module of modules) assert.doesNotMatch(module, />[^<]*(?:CMS|FAQ)[^<]*</);
});

test('default CMS workbenches do not expose English workflow labels or collection keys', async () => {
  const [publicationQueue, overview] = await Promise.all([
    readFile(new URL('extensions/content-publication-queue-workbench/src/module.vue', root), 'utf8'),
    readFile(new URL('extensions/operations-overview-workbench/src/module.vue', root), 'utf8')
  ]);
  assert.doesNotMatch(publicationQueue, /PUBLISH APPROVED CONTENT|WITHDRAW PUBLISHED CONTENT|ARCHIVE WITHDRAWN CONTENT/);
  assert.doesNotMatch(overview, /<code>\{\{ item\.key \}\}<\/code>/);
});

test('content editor uses business language for non-technical operators', async () => {
  const editor = await readFile(new URL('extensions/content-editor-workbench/src/module.vue', root), 'utf8');
  assert.doesNotMatch(editor, />来源键<|>Dify 同步状态<|>打开原始内容详情</);
  assert.match(editor, /预览当前草稿/);
  assert.match(editor, /在官网中预览草稿/);
  assert.match(editor, /资料编号（系统维护）/);
  assert.match(editor, /常见问题知识/);
  assert.doesNotMatch(editor, /FAQ 知识/);
  assert.doesNotMatch(editor, /servo_error/);
  assert.match(editor, /打开高级设置（专业人员）/);
});
