import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('news list links only to the public article detail route and the detail page reads only the BFF', async () => {
  const [list, detail] = await Promise.all([
    readFile(new URL('../pages/news.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/news/[slug].vue', import.meta.url), 'utf8')
  ]);
  assert.match(list, /NuxtLink :to="`\/news\/\$\{encodeURIComponent\(String\(article\.slug\)\)\}`"/);
  assert.match(detail, /\/api\/public\/v1\/articles\//);
  assert.match(detail, /该文章暂未发布/);
  assert.doesNotMatch(detail, /CMS_BFF_TOKEN|CMS_WRITE_TOKEN|\/items\/articles/);
});
