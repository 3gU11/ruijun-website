import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('detail BFFs retire known unpublished records instead of returning a 200 detail payload', async () => {
  const [articleApi, productApi, articlePage, productPage] = await Promise.all([
    readFile(new URL('../server/api/public/v1/articles/[slug].get.ts', import.meta.url), 'utf8'),
    readFile(new URL('../server/api/public/v1/products/[slug].get.ts', import.meta.url), 'utf8'),
    readFile(new URL('../pages/news/[slug].vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8')
  ]);

  for (const source of [articleApi, productApi]) {
    assert.match(source, /statusCode: 410/);
    assert.match(source, /source === 'cms'/);
    assert.match(source, /cache !== 'unavailable'/);
  }
  assert.match(articlePage, /statusCode: 410/);
  assert.match(productPage, /statusCode: 410/);
});
