import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import test from 'node:test';

test('Nuxt exposes the approved public evidence routes through the website BFF', async () => {
  const root = new URL('../', import.meta.url);
  await Promise.all([
    'server/api/public/v1/milestones.get.ts',
    'server/api/public/v1/qualifications.get.ts',
    'server/api/public/v1/manufacturing-evidence.get.ts'
  ].map((file) => access(new URL(file, root), constants.F_OK)));
  assert.ok(true);
});
