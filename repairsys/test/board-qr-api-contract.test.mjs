import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Repair API exposes public board QR resolution and protected lifecycle operations', async () => {
  const source = await readFile(new URL('../server/index.js', import.meta.url), 'utf8');
  assert.match(source, /app\.get\('\/api\/v1\/boards\/resolve\/:token'/);
  assert.match(source, /app\.get\('\/api\/v1\/admin\/board-codes', requirePermission\('MASTER_DATA'\)/);
  assert.match(source, /app\.post\('\/api\/v1\/admin\/board-codes', requirePermission\('MASTER_DATA'\)/);
  assert.match(source, /app\.post\('\/api\/v1\/admin\/board-codes\/:id\/revoke', requirePermission\('MASTER_DATA'\)/);
  assert.match(source, /boardQrAudit\(/);
  assert.doesNotMatch(source, /res\.json\(\{[^}]*customer:/);
});

test('Repair persistence includes QR codes and scan audits for both local and MySQL modes', async () => {
  const source = await readFile(new URL('../server/store.js', import.meta.url), 'utf8');
  assert.match(source, /CREATE TABLE IF NOT EXISTS board_qr_codes/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS board_qr_scan_audits/);
  assert.match(source, /boardQrCodes/);
  assert.match(source, /boardQrScanAudits/);
});

test('standalone client has a QR landing route and resolves it through the Repair API', async () => {
  const [router, api, client, vite] = await Promise.all([
    readFile(new URL('../src/client/router.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/api.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/ClientApp.vue', import.meta.url), 'utf8'),
    readFile(new URL('../vite.client.config.js', import.meta.url), 'utf8')
  ]);
  assert.match(router, /scan:\s*'\/scan\/:token'/);
  assert.match(router, /path: '\/scan'/);
  assert.match(api, /resolveBoardQr:\s*\(token\).*\/v1\/boards\/resolve/);
  assert.match(client, /clientView === 'scan'/);
  assert.match(client, /resolveBoardQr/);
  assert.match(client, /BrowserQRCodeReader/);
  assert.match(client, /decodeFromVideoDevice/);
  assert.match(client, /handleQrImageChange/);
  assert.match(client, /submitQrScan/);
  assert.match(vite, /path === '\/scan'/);
  assert.match(client, /guideForm\.machineNo = machine\.machineNo/);
  assert.match(client, /boardNo: board\.boardId/);
  assert.match(client, /guideStep\.value = 3/);
  assert.match(client, /router\.replace\(\{ path: clientRoutes\.request, query: \{ source: 'board_qr' \} \}\)/);
});

test('Repair Admin exposes board QR issuance, query, and revocation controls', async () => {
  const [workspace, panel, api] = await Promise.all([
    readFile(new URL('../src/AdminWorkspace.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/admin/AdminMasterDataPanel.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/api.js', import.meta.url), 'utf8')
  ]);
  assert.match(workspace, /boardQrCodes/);
  assert.match(workspace, /VITE_REPAIR_CLIENT_URL/);
  assert.match(panel, /board-qr-codes/);
  assert.match(panel, /issue-board-qr/);
  assert.match(panel, /revoke-board-qr/);
  assert.match(api, /boardQrCodes:/);
  assert.match(api, /issueBoardQr:/);
  assert.match(api, /revokeBoardQr:/);
});
