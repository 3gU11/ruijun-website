import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import test from 'node:test';

test('Nuxt provides every route exposed from the primary navigation', async () => {
  await Promise.all(['pages/index.vue', 'pages/product/index.vue', 'pages/manufacturing.vue', 'pages/about.vue', 'pages/service.vue', 'pages/resources.vue', 'pages/news.vue']
    .map((file) => access(new URL(`../${file}`, import.meta.url), constants.F_OK)));
  assert.ok(true);
});

test('Nuxt exposes the PRD public product list route', async () => {
  await access(new URL('../server/api/public/v1/products/index.get.ts', import.meta.url), constants.F_OK);
});

test('Nuxt exposes the PRD public article detail route', async () => {
  await access(new URL('../server/api/public/v1/articles/[slug].get.ts', import.meta.url), constants.F_OK);
  await access(new URL('../pages/news/[slug].vue', import.meta.url), constants.F_OK);
});

test('Nuxt exposes the PRD public service resource and location routes', async () => {
  await Promise.all([
    'server/api/public/v1/service-resources.get.ts',
    'server/api/public/v1/service-locations.get.ts'
  ].map((file) => access(new URL(`../${file}`, import.meta.url), constants.F_OK)));
});
