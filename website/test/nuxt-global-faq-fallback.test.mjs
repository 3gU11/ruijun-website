import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('global FAQ restores homepage visibility on navigation and keeps human support visible', async () => {
  const component = await readFile(new URL('../components/GlobalFaqAssistant.vue', import.meta.url), 'utf8');
  assert.match(component, /getFaqRouteState/);
  assert.match(component, /watch\(\(\) => route\.path/);
  assert.match(component, /human-support/);
  assert.match(component, /supportPhoneHref/);
  assert.match(component, /to="\/service"/);
});

test('global FAQ restores the complete legacy service assistant content and next-step route', async () => {
  const component = await readFile(new URL('../components/GlobalFaqAssistant.vue', import.meta.url), 'utf8');
  assert.match(component, /AI 服务助手/);
  assert.match(component, /维修 · 保修 · 进度/);
  assert.match(component, /你好，我是瑞钧服务助手/);
  assert.match(component, /如何发起维修申请/);
  assert.match(component, /维修进度在哪里查询/);
  assert.match(component, /如何核验保修状态/);
  assert.match(component, /报修前需要准备哪些资料/);
  assert.match(component, /class="service-ai-suggestions"/);
  assert.match(component, /查看下一步/);
  assert.match(component, /RUIJUN REPAIR APPLICATION/);
  assert.match(component, /继续咨询 AI 客服/);
  assert.match(component, /\/api\/public\/v1\/service-entries/);
  assert.match(component, /resolveServiceEntry/);
});

test('global FAQ keeps structured answers, citations, feedback, and loading controls', async () => {
  const component = await readFile(new URL('../components/GlobalFaqAssistant.vue', import.meta.url), 'utf8');
  assert.match(component, /answer\.steps\?\.length/);
  assert.match(component, /class="citations"/);
  assert.match(component, /这条答复是否有帮助/);
  assert.match(component, /正在查找已审核的服务信息/);
  assert.match(component, /停止生成/);
});
