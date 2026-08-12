import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import test from 'node:test';

test('Nuxt exposes the complete customer repair BFF surface', async () => {
  await Promise.all([
    'server/api/repair/auth/login.post.ts',
    'server/api/repair/auth/register.post.ts',
    'server/api/repair/auth/me.get.ts',
    'server/api/repair/auth/logout.post.ts',
    'server/api/repair/warranty/check.post.ts',
    'server/api/repair/models.get.ts',
    'server/api/repair/model-photo-config.get.ts',
    'server/api/repair/requests/index.get.ts',
    'server/api/repair/requests/index.post.ts',
    'server/api/repair/requests/[requestNo].get.ts',
    'server/api/repair/requests/[requestNo].post.ts'
    , 'server/api/repair/attachments/[requestNo]/[fileName].get.ts'
  ].map((file) => access(new URL(`../${file}`, import.meta.url), constants.F_OK)));
});

test('service entry fallback points to the standalone Repair client', async () => {
  const source = await readFile(new URL('../server/api/public/v1/service-entries.get.ts', import.meta.url), 'utf8');
  assert.match(source, /repairsysPublicBaseUrl/);
  assert.match(source, /repair\/new/);
  assert.match(source, /progress:\s*'\/requests'/);
  assert.doesNotMatch(source, /:2888/);
});

test('Nuxt keeps legacy repair customer URLs as permanent redirects', async () => {
  const config = await readFile(new URL('../nuxt.config.ts', import.meta.url), 'utf8');
  assert.match(config, /['"]\/warranty['"]\s*:\s*\{\s*redirect:\s*\{\s*to:\s*['"]\/repair\/warranty['"],\s*statusCode:\s*301/);
  assert.match(config, /['"]\/requests['"]\s*:\s*\{\s*redirect:\s*\{\s*to:\s*['"]\/repair\/requests['"],\s*statusCode:\s*301/);
  assert.match(config, /['"]\/support['"]\s*:\s*\{\s*redirect:\s*\{\s*to:\s*['"]\/service['"],\s*statusCode:\s*301/);
});

test('service repair migration preserves list, detail, supplement, and attachment flows', async () => {
  const source = await readFile(new URL('../components/RepairInlinePanel.vue', import.meta.url), 'utf8');
  const service = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');
  assert.match(source, /mode: 'request' \| 'warranty' \| 'progress' \| 'requests'/);
  assert.match(source, /\/api\/repair\/requests/);
  assert.match(source, /submitSupplement/);
  assert.match(source, /readSupplementImage/);
  assert.match(source, /attachments/);
  assert.match(source, /api\/repair\/attachments/);
  assert.match(source, /warrantyScope/);
  assert.match(source, /selectedMaterialCodes/);
  assert.match(source, /faultCategory/);
  assert.match(source, /sendMethod/);
  assert.match(source, /address/);
  assert.match(source, /faqContext/);
  assert.match(source, /faq-context/);
  assert.match(source, /applyFaqContext/);
  assert.match(source, /result\?\.attachments/);
  assert.match(source, /errorValue\?\.statusCode === 401/);
  assert.match(source, /details/);
  assert.match(source, /verifyItem/);
  assert.match(source, /verification/);
  assert.match(source, /\/api\/repair\/models/);
  assert.match(service, /number: '10'/);
  assert.match(service, /resolveRepairPortalUrl/);
  assert.doesNotMatch(service, /repairMode\.value = 'requests'/);
  assert.match(service, /repairFaqContext/);
  assert.match(service, /:faq-context="repairFaqContext"/);
});

test('Nuxt keeps the repair customer deep links on the same component contract', async () => {
  const files = [
    '../pages/repair/new.vue',
    '../pages/repair/requests/index.vue',
    '../pages/repair/requests/[requestNo].vue'
  ];
  await Promise.all(files.map((file) => access(new URL(file, import.meta.url), constants.F_OK)));
  const [newPage, listPage, detailPage] = await Promise.all(files.map((file) => readFile(new URL(file, import.meta.url), 'utf8')));
  assert.match(newPage, /RepairInlinePanel/);
  assert.match(newPage, /mode="request"/);
  assert.match(listPage, /mode="requests"/);
  assert.match(detailPage, /mode="progress"/);
  assert.match(detailPage, /requestNo/);
});

test('Repair API exposes an owner-scoped customer request detail projection', async () => {
  const server = await readFile(new URL('../../repairsys/server/index.js', import.meta.url), 'utf8');
  assert.match(server, /app\.get\('\/api\/repair-requests\/:requestNo'/);
  assert.match(server, /requireRequestAccess/);
  assert.match(server, /customerVisible|publicRepairRequest|publicRequest/);
  assert.match(server, /logistics/);
  assert.match(server, /operationLogs/);
  assert.match(server, /statusEvents/);
  assert.match(server, /res\.status\(201\)\.json\(customerVisibleRequest\(repairRequest, db\)\)/);
  assert.match(server, /res\.json\(customerVisibleRequest\(repairRequest, db\)\)/);
});

test('Nuxt Repair BFF forwards the browser Origin with state-changing requests', async () => {
  const source = await readFile(new URL('../server/services/repair-api.mjs', import.meta.url), 'utf8');
  assert.match(source, /getRequestHeader\(event, ['\"]origin['\"]\)/i);
  assert.match(source, /Origin:\s*origin/);
});

test('Nuxt Repair BFF preserves successful upstream status codes', async () => {
  const source = await readFile(new URL('../server/services/repair-api.mjs', import.meta.url), 'utf8');
  assert.match(source, /setResponseStatus\(event, response\.status\)/);
});

test('Repair attachment BFF uses the protected upload origin outside the API prefix', async () => {
  const source = await readFile(new URL('../server/api/repair/attachments/[requestNo]/[fileName].get.ts', import.meta.url), 'utf8');
  assert.match(source, /repairsysPublicBaseUrl/);
  assert.match(source, /uploads\/repair-requests/);
  assert.doesNotMatch(source, /baseUrl\}\/uploads\/repair-requests/);
});
