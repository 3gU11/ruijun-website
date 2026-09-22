import assert from 'node:assert/strict';
import test from 'node:test';

import { applyVisualMediaReplacement, hydrateProductDimensionsFields, hydrateServiceActionMediaFields } from '../../cms/extensions/content-editor-workbench/src/visual-editing-fields.js';

test('product dimensions workbench draft materializes the visible fallback without overwriting nonempty CMS copy', () => {
  const emptyDraft = { id: 'dimensions', title: '尺寸与资料', body: '' };
  const populatedDraft = { id: 'dimensions', title: '尺寸与资料', body: '后台已填写说明' };

  assert.equal(hydrateProductDimensionsFields(emptyDraft).body, '注：1.表中所述加工性能参数是在本公司指定条件（材料、加工条件、环境、测量参数）下进行的实验结果　2.某些功能配置需要选装');
  assert.equal(hydrateProductDimensionsFields(populatedDraft).body, '后台已填写说明');
});

test('an unbound service action icon can create only its controlled media slot', () => {
  const pageSection = { media: [] };
  assert.equal(applyVisualMediaReplacement(pageSection, 'media.0', 'service-icon-1', { mediaSlot: 'action-1' }), true);
  assert.deepEqual(pageSection.media, [{ role: 'action-1', media_asset_id: 'service-icon-1' }]);
  assert.equal(applyVisualMediaReplacement(pageSection, 'media.0', 'service-icon-2', { mediaSlot: 'action-2' }), false);
});

test('service action drafts materialize eight independent controlled icon slots', () => {
  const section = { id: 'support-actions', items: Array.from({ length: 8 }, (_, index) => ({ media_role: `action-${index + 1}` })), media: [] };
  hydrateServiceActionMediaFields(section);
  assert.deepEqual(section.media, Array.from({ length: 8 }, (_, index) => ({ role: `action-${index + 1}`, media_asset_id: '' })));
});
