import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('about partner gallery declares its governed media placement', async () => {
  const source = await readFile(new URL('../pages/about.vue', import.meta.url), 'utf8');
  const partnerSection = source.slice(source.indexOf('data-cms-preview-key="partners"'), source.indexOf('data-cms-preview-key="clients-domestic"'));
  assert.match(partnerSection, /data-cms-preview-placement-key="about\.partner\.image"/);
  assert.match(partnerSection, /data-cms-preview-field-path="asset\.fieldPath"/);
});

test('about managed galleries declare the placement matching their media governance rule', async () => {
  const source = await readFile(new URL('../pages/about.vue', import.meta.url), 'utf8');
  assert.equal((source.match(/data-cms-preview-placement-key="about\.gallery\.image"/g) || []).length, 1);
  assert.equal((source.match(/data-cms-preview-placement-key="about\.client\.image"/g) || []).length, 2);
  assert.equal((source.match(/data-cms-preview-placement-key="qualification\.image"/g) || []).length, 3);
});
