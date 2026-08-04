import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Nuxt home and about pages map published CMS sections through the safe section resolver', async () => {
  const [home, about, manufacturing] = await Promise.all([
    readFile(new URL('../pages/index.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/about.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8')
  ]);

  for (const source of [home, about]) {
    assert.match(source, /resolvePageSection/);
    assert.doesNotMatch(source, /CMS_PAGES_URL/);
  }
  assert.match(home, /'why-ruijun'/);
  assert.match(home, /'performance'/);
  assert.match(about, /'hero'/);
  assert.match(about, /'history'/);
  assert.match(about, /useFetch\('\/api\/public\/v1\/milestones'/);
  assert.match(about, /useFetch\('\/api\/public\/v1\/qualifications'/);
  assert.doesNotMatch(about, /CMS_(?:MILESTONES|QUALIFICATIONS)_URL/);
  assert.match(manufacturing, /useFetch\('\/api\/public\/v1\/manufacturing-evidence'/);
  assert.doesNotMatch(manufacturing, /CMS_MANUFACTURING_EVIDENCE_URL/);
  assert.match(await readFile(new URL('../pages/product/detail/index.vue', import.meta.url), 'utf8'), /toggleComparedModel/);
  assert.match(await readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8'), /const resources/);
  assert.match(await readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8'), /const caseStudies/);
});
