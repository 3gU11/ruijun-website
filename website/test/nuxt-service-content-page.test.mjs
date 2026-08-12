import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Nuxt service page consumes the public service resource and location APIs without CMS browser access', async () => {
  const source = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');

  assert.match(source, /useFetch\('\/api\/public\/v1\/service-resources'/);
  assert.match(source, /useFetch\('\/api\/public\/v1\/service-locations'/);
  assert.match(source, /SERVICE RESOURCES/);
  assert.match(source, /SERVICE LOCATIONS/);
  assert.match(source, /function supportPhoneValue\(value: unknown\)/);
  assert.match(source, /const supportPhone = computed\(\(\) => supportPhoneValue\(serviceConfig\.value\?\.supportPhone\)\)/);
  assert.match(source, /class="service-human-support"/);
  assert.match(source, /:href="`tel:\$\{supportPhone\}`"/);
  assert.match(source, /shouldEnableServiceEntries/);
  assert.match(source, /const repairSystemAvailable = computed\(\(\) => shouldEnableServiceEntries\(serviceConfig\.value\?\.available\)\)/);
  assert.match(source, /repairSystemAvailable\.value \? resolveServiceEntry/);
  assert.match(source, /createServiceEntryClick/);
  assert.match(source, /class="service-exit-dialog"/);
  assert.match(source, /即将进入瑞钧售后服务系统/);
  assert.match(source, /\/api\/public\/v1\/service-entry-clicks/);
  assert.match(source, /window\.open\(pendingExit\.value\.url, '_blank', 'noopener,noreferrer'\)/);
  assert.match(source, /service-exit-dialog button:not\(\.cancel\)/);
  assert.match(source, /const selectedSupportModel = ref<string \| null>\(null\)/);
  assert.match(source, /function selectSupportModel\(model: string\)/);
  assert.match(source, /id="support-actions" class="psd-action-panel"/);
  assert.doesNotMatch(source, /v-if="selectedSupportModel" id="support-actions"/);
  assert.match(source, /@click="openModelServiceAction\(action\)"/);
  assert.match(source, /:aria-pressed="selectedSupportModel === model\.label"/);
  assert.doesNotMatch(source, /CMS_SERVICE_(?:RESOURCES|LOCATIONS)_URL/);
});
