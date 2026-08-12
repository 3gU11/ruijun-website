import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import test from 'node:test';

test('Nuxt provides every route exposed from the primary navigation', async () => {
  await Promise.all(['pages/index.vue', 'pages/product/index.vue', 'pages/manufacturing.vue', 'pages/about.vue', 'pages/service.vue', 'pages/news.vue', 'pages/contact.vue']
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

test('Nuxt exposes robots and sitemap routes for the public publication boundary', async () => {
  await Promise.all([
    'server/routes/robots.txt.get.ts',
    'server/routes/sitemap.xml.get.ts',
    'server/services/public-sitemap.mjs'
  ].map((file) => access(new URL(`../${file}`, import.meta.url), constants.F_OK)));
});

test('Nuxt exposes the protected draft preview session and preview page', async () => {
  await Promise.all([
    'server/api/preview/session.post.ts',
    'server/api/preview/session.get.ts',
    'server/api/preview/session.delete.ts',
    'server/services/cms-preview-reader.mjs',
    'server/services/cms-preview-session-store.mjs',
    'pages/preview.vue'
  ].map((file) => access(new URL(`../${file}`, import.meta.url), constants.F_OK)));
});
