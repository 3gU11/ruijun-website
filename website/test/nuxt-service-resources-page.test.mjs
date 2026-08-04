import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('service resource page reads public resources and locations then filters only in the browser', async () => {
  const source = await readFile(new URL('../pages/resources.vue', import.meta.url), 'utf8');

  assert.match(source, /useFetch\('\/api\/public\/v1\/service-resources'/);
  assert.match(source, /useFetch\('\/api\/public\/v1\/service-locations'/);
  assert.match(source, /filterServiceResources\(resources\.value, modelQuery\.value\)/);
  assert.doesNotMatch(source, /CMS_(?:SERVICE_RESOURCES|SERVICE_LOCATIONS)_URL/);
});
