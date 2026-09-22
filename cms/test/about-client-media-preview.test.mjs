import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('about client media verifier keeps domestic and global gallery bindings isolated', async () => {
  const script = await readFile(new URL('../scripts/verify-about-client-media-preview.mjs', import.meta.url), 'utf8');
  assert.match(script, /const cases = \[/);
  assert.match(script, /sectionId: 'clients-domestic', assetId: '103', role: 'domestic-1'/);
  assert.match(script, /sectionId: 'clients-global', assetId: '108', role: 'global-1'/);
  assert.match(script, /assert\.deepEqual\(sectionFor\(persisted\.data\.sections, otherSectionId\)\.media, otherSnapshot/);
  assert.match(script, /data-cms-preview-placement-key="about\\\.client\\\.image"/);
  assert.match(script, /assert\.deepEqual\(restored\.data\.sections, originalSections\)/);
});
