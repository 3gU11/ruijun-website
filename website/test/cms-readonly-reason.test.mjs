import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('the canvas distinguishes an unwired slot from a fixed layout layer', async () => {
  const source = await readFile(new URL('composables/useCmsDraftPreview.ts', root), 'utf8');

  // A registered placement means the slot is meant to be managed and only lacks
  // a binding, which the operator can fix themselves.
  assert.match(source, /const placement = String\(element\.dataset\.cmsPreviewPlacementKey \|\| ''\)\.trim\(\);/);
  assert.match(source, /尚未绑定受管素材。请在所在段落的「图片与背景」中添加素材，并把展示位置填写为 \$\{placement\.split\('\.'\)\.pop\(\)\}。/);
  // No placement means the element is part of the layout and needs a template change.
  assert.match(source, /此素材是版式的组成部分，不能单独替换。如需更换，请在 Nuxt 模板中新增经确认的版式位置。/);

  // A reason declared by the template still wins.
  assert.match(source, /const reason = String\(element\.dataset\.cmsPreviewReadonlyReason \|\| ''\)\.trim\(\) \|\| fallbackReason;/);
  // The resolved reason is published so the panel shows the same text rather
  // than its own generic fallback.
  assert.match(source, /element\.dataset\.cmsPreviewReadonlyReason = reason;/);
  assert.doesNotMatch(source, /此为静态素材；请先在媒体资产中导入、审核并发布后再替换。/);
});

test('the product machine image keeps a binding even when nothing is bound yet', async () => {
  const source = await readFile(new URL('pages/product/[slug].vue', root), 'utf8');
  // Returning '' here left the slot without a picker, so an operator could not
  // bind a machine image at all.
  assert.match(source, /const displayImageFieldPath = computed\(\(\) => \{/);
  assert.match(source, /return 'configuration\.machine_asset_id';\s*\n\}\);/);
  assert.doesNotMatch(source, /return selectedModelRecord\.value\?\.media\?\.\[0\]\?\.path && selectedModelRecord\.value\.media\[0\]\.path === displayImage\.value \? 'media\.0' : '';/);
});
