import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyPageSectionPreset,
  createPageSectionInstance,
  getPageSectionDefinition,
  listPageSectionDefinitions,
  listPageSectionPresets,
  registeredPageSectionFieldKeys,
  registeredPageSectionInstances,
  validatePageSectionInstance
} from '../shared/page-section-registry.mjs';
import { dataListSourceKeys } from '../shared/page-section-sources.mjs';

test('every adopted page exposes the registered section types', () => {
  const expected = ['card-grid', 'data-list', 'faq', 'image', 'rich-text', 'stats', 'timeline'];
  for (const slug of ['service', 'about', 'home', 'news', 'product', 'manufacturing', 'contact']) {
    assert.deepEqual(listPageSectionDefinitions(slug).map((definition) => definition.type).sort(), expected, slug);
  }
  // A page that has not adopted the block system yet stays closed.
  assert.deepEqual(listPageSectionDefinitions('repair'), []);
  assert.equal(getPageSectionDefinition('rich-text', 'repair'), null);
  assert.equal(getPageSectionDefinition('rich-text', 'not-a-page'), null);
  assert.equal(getPageSectionDefinition('unknown', 'service'), null);
});

test('adding a registered page section creates a valid stable unique instance', () => {
  const first = createPageSectionInstance('rich-text', 'service', [], { createId: () => 'ABC123' });
  const ids = ['ABC123', 'DEF456'];
  const second = createPageSectionInstance('rich-text', 'service', [first], { createId: () => ids.shift() });

  assert.equal(first.id, 'custom-rich-text-abc123');
  assert.equal(first.type, 'rich-text');
  assert.equal(first.version, 1);
  assert.equal(first.enabled, true);
  assert.equal(validatePageSectionInstance(first, 'service'), '');
  assert.notEqual(second.id, first.id);
  assert.equal(createPageSectionInstance('rich-text', 'repair'), null);
});

test('registered section validation rejects wrong types, field shapes, and excessive text', () => {
  const section = createPageSectionInstance('rich-text', 'service', [], { createId: () => 'case1' });
  assert.match(validatePageSectionInstance({ ...section, type: 'arbitrary-component' }, 'service'), /未注册或不适用于当前页面/);
  assert.match(validatePageSectionInstance({ ...section, version: 2 }, 'service'), /版本不受支持/);
  assert.match(validatePageSectionInstance({ ...section, title: 42 }, 'service'), /必须是文本/);
  assert.match(validatePageSectionInstance({ ...section, title: 'x'.repeat(241) }, 'service'), /不得超过 240 个字符/);
});

test('only valid registered instances render, while disabled ones remain selectable in edit preview', () => {
  const valid = createPageSectionInstance('rich-text', 'service', [], { createId: () => 'valid' });
  const disabled = { ...createPageSectionInstance('rich-text', 'service', [valid], { createId: () => 'disabled' }), enabled: false };
  const invalid = { ...valid, id: 'bad id', title: 'must not render' };
  const page = { slug: 'service', sections: [valid, disabled, invalid, { id: 'legacy', title: 'legacy' }] };

  assert.deepEqual(registeredPageSectionInstances(page).map((section) => section.id), [valid.id]);
  assert.deepEqual(registeredPageSectionInstances(page, 'service', { includeDisabled: true }).map((section) => section.id), [valid.id, disabled.id]);
});

test('a media field starts empty and enforces count, asset id shape, and approved roles', () => {
  const section = createPageSectionInstance('image', 'service', [], { createId: () => 'img1' });
  assert.equal(section.id, 'custom-image-img1');
  assert.deepEqual(section.media, []);
  assert.equal(validatePageSectionInstance(section, 'service'), '');

  assert.equal(validatePageSectionInstance({ ...section, media: [{ media_asset_id: '12', role: 'image' }] }, 'service'), '');

  const tooMany = { ...section, media: [{ media_asset_id: '12' }, { media_asset_id: '13' }] };
  assert.match(validatePageSectionInstance(tooMany, 'service'), /最多只能有 1 个素材/);

  assert.match(validatePageSectionInstance({ ...section, media: [{ media_asset_id: 'not-a-number' }] }, 'service'), /未登记的素材/);
  assert.match(validatePageSectionInstance({ ...section, media: ['12'] }, 'service'), /格式无效的素材/);
  assert.match(validatePageSectionInstance({ ...section, media: 'nope' }, 'service'), /必须是素材列表/);

  // "background" is a real display role elsewhere in the CMS, but this block
  // only declares image/photo — an undeclared role must not slip through.
  assert.match(validatePageSectionInstance({ ...section, media: [{ media_asset_id: '12', role: 'background' }] }, 'service'), /不被支持/);
  assert.match(validatePageSectionInstance({ ...section, media: [{ media_asset_id: '12', role: 'Bad Role' }] }, 'service'), /只能使用小写字母/);
});

test('a list field starts empty and enforces item count and per-item field rules', () => {
  const section = createPageSectionInstance('card-grid', 'service', [], { createId: () => 'cards1' });
  assert.equal(section.id, 'custom-card-grid-cards1');
  assert.deepEqual(section.items, []);
  assert.equal(validatePageSectionInstance(section, 'service'), '');

  const withOne = { ...section, items: [{ title: '卡片', body: '说明', media_role: 'card-1' }] };
  assert.equal(validatePageSectionInstance(withOne, 'service'), '');

  assert.match(validatePageSectionInstance({ ...section, items: [{ title: 'x'.repeat(241) }] }, 'service'), /不得超过 240 个字符/);
  assert.match(validatePageSectionInstance({ ...section, items: [{ title: 7 }] }, 'service'), /必须是文本/);
  assert.match(validatePageSectionInstance({ ...section, items: ['flat-string'] }, 'service'), /第 1 项格式无效/);
  assert.match(validatePageSectionInstance({ ...section, items: Array.from({ length: 13 }, () => ({})) }, 'service'), /最多只能有 12 项/);
  assert.match(validatePageSectionInstance({ ...section, items: 'nope' }, 'service'), /必须是列表/);
});

test('select and number fields stay inside their declared ranges', () => {
  const section = createPageSectionInstance('data-list', 'service', [], { createId: () => 'list1' });
  assert.equal(section.id, 'custom-data-list-list1');
  // Defaults come from the schema: first option, and the declared minimum.
  assert.equal(section.source, 'product_series');
  assert.equal(section.limit, 1);
  assert.equal(section.columns, 1);
  assert.equal(validatePageSectionInstance(section, 'service'), '');

  assert.equal(validatePageSectionInstance({ ...section, source: 'articles', limit: 6, columns: 3 }, 'service'), '');

  // A source outside the catalogue must not be selectable.
  assert.match(validatePageSectionInstance({ ...section, source: 'not-a-source' }, 'service'), /不在允许范围内/);
  assert.match(validatePageSectionInstance({ ...section, source: 7 }, 'service'), /必须是文本/);

  assert.match(validatePageSectionInstance({ ...section, limit: 0 }, 'service'), /不得小于 1/);
  assert.match(validatePageSectionInstance({ ...section, limit: 99 }, 'service'), /不得大于 12/);
  assert.match(validatePageSectionInstance({ ...section, limit: 2.5 }, 'service'), /必须是整数/);
  assert.match(validatePageSectionInstance({ ...section, limit: '3' }, 'service'), /必须是数字/);
  assert.match(validatePageSectionInstance({ ...section, columns: 9 }, 'service'), /不得大于 4/);
});

test('a block declaring variants gets its layout field injected from that list', () => {
  const definition = getPageSectionDefinition('card-grid', 'service');
  const variantField = definition.fields.find((field) => field.key === 'variant');
  assert.ok(variantField, 'card-grid must expose a variant field');
  assert.deepEqual([...variantField.options], ['grid', 'list']);
  assert.equal(variantField.optionLabels.grid, '网格');
  assert.equal(variantField.optionLabels.list, '列表');

  // Defaulting to the first variant means a freshly added block is always valid.
  const grid = createPageSectionInstance('card-grid', 'service', [], { createId: () => 'grid1' });
  assert.equal(grid.variant, 'grid');
  assert.equal(validatePageSectionInstance(grid, 'service'), '');
  assert.equal(validatePageSectionInstance({ ...grid, variant: 'list' }, 'service'), '');

  // The injected options are the only ones accepted — the renderer has no
  // branch for anything else, so an unknown variant must be rejected.
  assert.match(validatePageSectionInstance({ ...grid, variant: 'carousel' }, 'service'), /不在允许范围内/);

  // A block without variants must not gain the field at all.
  const text = createPageSectionInstance('rich-text', 'service', [], { createId: () => 't1' });
  assert.equal(getPageSectionDefinition('rich-text', 'service').fields.some((field) => field.key === 'variant'), false);
  assert.equal(Object.hasOwn(text, 'variant'), false);
});

test('every declared preset produces a section that still validates', () => {
  for (const slug of ['service', 'about', 'home', 'news', 'product', 'manufacturing', 'contact']) {
    for (const definition of listPageSectionDefinitions(slug)) {
      for (const preset of listPageSectionPresets(definition.type, slug)) {
        const base = createPageSectionInstance(definition.type, slug, [], { createId: () => 'preset1' });
        const applied = applyPageSectionPreset(base, preset.key, slug);
        const label = `${definition.type}/${preset.key}`;
        // A preset that produced an invalid section would hand the operator an
        // unsaveable block, so this is the guarantee that matters.
        assert.equal(validatePageSectionInstance(applied, slug), '', label);
        assert.equal(applied.id, base.id, `${label} must keep its id`);
        assert.equal(applied.type, definition.type);
        assert.equal(applied.version, definition.version);
      }
    }
  }
});

test('applying an unknown preset leaves the section untouched', () => {
  const base = createPageSectionInstance('card-grid', 'service', [], { createId: () => 'keep1' });
  assert.deepEqual(applyPageSectionPreset(base, 'nope', 'service'), base);
  // A block type that declares no presets is a no-op too.
  const text = createPageSectionInstance('rich-text', 'service', [], { createId: () => 'keep2' });
  assert.deepEqual(applyPageSectionPreset(text, 'standard-3', 'service'), text);
});

test('a preset replaces list content rather than merging into it', () => {
  const base = createPageSectionInstance('card-grid', 'service', [], { createId: () => 'merge1' });
  base.items = [{ title: '旧卡片', body: '', media_role: 'old' }];
  const applied = applyPageSectionPreset(base, 'split-2', 'service');

  assert.equal(applied.items.length, 2);
  assert.deepEqual(applied.items.map((item) => item.title), ['卡片一', '卡片二']);
  assert.equal(applied.variant, 'grid');
  assert.equal(applied.columns, 2);
});

test('data-list presets only ever point at catalogued sources', () => {
  const base = createPageSectionInstance('data-list', 'service', [], { createId: () => 'dl1' });
  const presets = listPageSectionPresets('data-list', 'service');
  assert.ok(presets.length > 0, 'data-list should ship presets');
  for (const preset of presets) {
    const applied = applyPageSectionPreset(base, preset.key, 'service');
    assert.equal(validatePageSectionInstance(applied, 'service'), '', preset.key);
    assert.ok(dataListSourceKeys.includes(applied.source), `${preset.key} must use a catalogued source`);
  }
});

test('the exported field-key set covers nested list item fields', () => {
  // Consumers with their own allow-list union against this, so it must be
  // complete — including keys declared only inside a list item.
  const keys = new Set(registeredPageSectionFieldKeys);

  assert.ok(keys.has('title'), 'block field');
  assert.ok(keys.has('variant'), 'injected variant field');
  assert.ok(keys.has('source'), 'data-list field');
  assert.ok(keys.has('media_role'), 'card-grid item field');
  assert.ok(keys.has('label'), 'timeline item field');
  assert.ok(keys.has('value'), 'stats item field');

  assert.equal(new Set(registeredPageSectionFieldKeys).size, registeredPageSectionFieldKeys.length, 'must be deduplicated');
});
