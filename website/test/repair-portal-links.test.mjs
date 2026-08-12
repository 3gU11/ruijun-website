import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRepairPortalUrl } from '../shared/repair-portal.mjs';

test('repair portal links are controlled and point to the standalone client', () => {
  assert.equal(resolveRepairPortalUrl('repair_new', 'https://repair.example.com/'), 'https://repair.example.com/repair/new');
  assert.equal(resolveRepairPortalUrl('repair_warranty', 'https://repair.example.com/'), 'https://repair.example.com/warranty');
  assert.equal(resolveRepairPortalUrl('repair_requests', 'https://repair.example.com/'), 'https://repair.example.com/requests');
});

test('unknown action or missing base is not turned into an arbitrary URL', () => {
  assert.equal(resolveRepairPortalUrl('faq', 'https://repair.example.com/'), null);
  assert.equal(resolveRepairPortalUrl('repair_new', ''), null);
});
