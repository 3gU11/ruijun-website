import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('footer purchase verifier covers every independently editable purchase field', async () => {
  const script = await readFile(new URL('../scripts/verify-footer-purchase-fields-preview.mjs', import.meta.url), 'utf8');
  for (const field of ['purchase_label', 'purchase_title', 'purchase_subtitle', 'purchase_phone']) {
    assert.match(script, new RegExp(field));
  }
  assert.match(script, /保存/);
  assert.match(script, /恢复/);
  assert.match(script, /api\/preview\/open/);
});
