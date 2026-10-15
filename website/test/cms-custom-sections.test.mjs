import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../components/CmsCustomSections.vue', import.meta.url), 'utf8');

test('the shared renderer resolves registered blocks from the registry and schema', () => {
  assert.match(source, /registeredPageSectionInstances\(props\.page, props\.pageSlug, \{ includeDisabled: Boolean\(props\.visualEditMode\) \}\)/);
  assert.match(source, /resolvePageSection\(props\.page, section\.id, \{\}\)/);
  // Disabled blocks stay visible only while editing.
  assert.match(source, /includeDisabled: Boolean\(props\.visualEditMode\)/);
});

test('every registered type renders from its own branch inside one ordered loop', () => {
  // A single loop preserves stored order, so image-then-cards stays that way.
  assert.match(source, /<template v-for="section in customSections" :key="section\.id">/);
  assert.match(source, /section\.type === 'rich-text'/);
  assert.match(source, /section\.type === 'image'/);
  assert.match(source, /section\.type === 'card-grid'/);
  assert.match(source, /section\.media\?\.length/);
  assert.match(source, /section\.items\?\.length/);
});

test('the shared renderer keeps visual-edit field and media bindings', () => {
  assert.match(source, /v-bind="sectionPresentationAttributes\(section\)"/);
  assert.match(source, /v-bind="fieldPresentationAttributes\(section, 'title'\)"/);
  assert.match(source, /data-cms-preview-field-path="title"/);
  assert.match(source, /data-cms-preview-field-path="body"/);
  assert.match(source, /data-cms-preview-media-role="image"/);
  assert.match(source, /data-cms-preview-media-field-path="media"/);
  assert.match(source, /:data-cms-preview-field-path="`items\.\$\{cardIndex\}\.title`"/);
  assert.match(source, /:data-cms-preview-field-path="`items\.\$\{cardIndex\}\.body`"/);
});

test('edit-only affordances never leak into the published rendering', () => {
  // Placeholders are gated on visualEditMode, which is only true inside the canvas.
  assert.match(source, /v-else-if="visualEditMode" class="cms-custom-placeholder"/);
  assert.match(source, /v-if="visualEditMode && !section\.items\?\.length"/);
  // No page-specific class names survive in the shared component.
  assert.doesNotMatch(source, /service-custom/);
});

test('every adopted page mounts the shared renderer with its own record', async () => {
  const adopted = [
    ['service', 'servicePageContent', 'service'],
    ['about', 'pageContent', 'about'],
    ['index', 'pageContent', 'home'],
    ['news', 'newsPage', 'news'],
    ['manufacturing', 'manufacturingPage', 'manufacturing'],
    ['product/[slug]', 'productPageRecord', 'product'],
    ['contact', 'pageContent', 'contact']
  ];
  for (const [file, contentVar, slug] of adopted) {
    const page = await readFile(new URL(`../pages/${file}.vue`, import.meta.url), 'utf8');
    const mount = `<CmsCustomSections :page="${contentVar}" page-slug="${slug}" :visual-edit-mode="cmsVisualEditMode" />`;
    assert.ok(page.includes(mount), `${file} must mount the shared renderer`);
    // The page must also expose the preview edit flag the renderer keys off.
    assert.match(page, /visualEditMode: cmsVisualEditMode/, file);
  }
});

test('data-list blocks render from their source and fetch only what is referenced', () => {
  assert.match(source, /section\.type === 'data-list'/);
  assert.match(source, /resolveDataListItems\(section\?\.source, records, section\?\.limit\)/);
  // The requested set is derived from the blocks actually on the page.
  assert.match(source, /const neededSourceSignature = computed\(\(\) => \[\.\.\.new Set\(customSections\.value/);
  assert.match(source, /section\.type === 'data-list' && section\.source/);
  // A stable string signature keeps the watcher from re-firing on recompute.
  assert.match(source, /\.sort\(\)\.join\(','\)\)/);
  assert.match(source, /watch: \[neededSourceSignature\]/);
  // A source that fails to load degrades to empty instead of breaking the page.
  assert.match(source, /resolved\[key\] = \[\]/);
  // Columns are driven by the block's own field, not a fixed grid.
  assert.match(source, /'--cms-data-columns': String\(section\.columns \|\| 3\)/);
});

test('variant classes come from the block field and default to grid', () => {
  assert.match(source, /class="cms-custom-card-list" :class="`cms-variant-\$\{section\.variant \|\| 'grid'\}`"/);
  assert.match(source, /class="cms-custom-data-grid" :class="`cms-variant-\$\{section\.variant \|\| 'grid'\}`"/);
  // Every variant the registry declares has a matching style rule.
  assert.match(source, /\.cms-custom-card-list\.cms-variant-list\{/);
  assert.match(source, /\.cms-custom-data-grid\.cms-variant-list\{/);
  assert.match(source, /\.cms-custom-data-grid\.cms-variant-compact\{/);
});

test('faq, timeline and stats blocks render their declared list fields', () => {
  for (const type of ['faq', 'timeline', 'stats']) {
    assert.match(source, new RegExp(`section\\.type === '${type}'`), type);
  }
  // Each list item field is bound for visual editing.
  assert.match(source, /:data-cms-preview-field-path="`items\.\$\{itemIndex\}\.title`"/);
  assert.match(source, /:data-cms-preview-field-path="`items\.\$\{itemIndex\}\.label`"/);
  assert.match(source, /:data-cms-preview-field-path="`items\.\$\{itemIndex\}\.value`"/);
  assert.match(source, /:data-cms-preview-field-path="`items\.\$\{itemIndex\}\.body`"/);
  // Every new block has a style rule, so nothing renders unstyled.
  for (const cls of ['cms-custom-faq', 'cms-custom-timeline', 'cms-custom-stats']) {
    assert.match(source, new RegExp(`\\.${cls}\\{`), cls);
  }
});
