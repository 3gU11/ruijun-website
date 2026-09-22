import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('manufacturing scenes reveal continuously and reverse with scroll progress', async () => {
  const page = await readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8');

  assert.match(page, /const motionScenes = \[/);
  assert.match(page, /import\('gsap\/ScrollTrigger'\)/);
  assert.match(page, /data-motion-trigger/);
  assert.match(page, /data-motion-line/);
  assert.match(page, /xPercent: fromLeft \? -11 : 11/);
  assert.match(page, /stagger: \.075/);
  assert.match(page, /start: 'top 88%'/);
  assert.match(page, /end: 'top 44%'/);
  assert.match(page, /scrub: \.75/);
  assert.match(page, /prefers-reduced-motion: reduce/);
  assert.match(page, /context\.revert\(\)/);
});

test('page-backed manufacturing media layers can return to their PSD defaults', async () => {
  const page = await readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8');

  assert.equal((page.match(/:data-cms-preview-allow-default="mediaBinding\.collection === 'pages' && mediaBinding\.fieldPath \? 'true' : undefined"/g) || []).length, 2);
});

test('manufacturing footer purchase card matches the product footer interaction and centers both copy fields', async () => {
  const page = await readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8');

  assert.match(page, /'footer-purchase': 'footer-08'/);
  assert.match(page, /hoveredFooterLayer\.value === 'footer-08'/);
  assert.match(page, /footer-purchase-title,.psd-editable-footer-text--footer-purchase-copy-title,.psd-editable-footer-text--footer-purchase-copy-subtitle,.psd-editable-footer-text--footer-purchase-phone\{text-align:center\}/);
  assert.match(page, /color:#fff;filter:drop-shadow\(0 0 5px rgb\(242 38 49 \/ 75%\)\);transform:translateY\(-1px\)/);
});

test('manufacturing core equipment opens an accessible paged lightbox', async () => {
  const page = await readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8');

  assert.match(page, /const equipmentGallery = computed\(\(\) =>/);
  assert.match(page, /const equipmentSectionTitle = computed\(\(\) =>/);
  assert.doesNotMatch(page, /'smart-warehouse': \{ title: 'warehouse-title', description: 'warehouse-title' \}/);
  assert.doesNotMatch(page, /'core-equipment': \{ title: 'equipment-title', description: 'equipment-title' \}/);
  assert.match(page, /const mobileManufacturingSteps = computed\(\(\) =>/);
  assert.match(page, /const processNodes = computed\(\(\) =>/);
  assert.match(page, /const mobileManufacturingFlow = computed\(\(\) =>/);
  assert.match(page, /processAnchorCoordinates/);
  assert.match(page, /mobile-manufacturing-step/);
  assert.match(page, /class="equipment-preview-trigger"/);
  assert.match(page, /aria-label="`放大查看\$\{equipment\.alt\}`"/);
  assert.match(page, /:aria-label="`\$\{equipmentSectionTitle\}大图`"/);
  assert.match(page, /event\.key === 'ArrowLeft'/);
  assert.match(page, /event\.key === 'ArrowRight'/);
  assert.match(page, /event\.key === 'Escape'/);
  assert.match(page, /manufacturing-lightbox-open/);
});

test('manufacturing media keeps the PSD geometry while allowing governed videos', async () => {
  const page = await readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8');

  assert.match(page, /type ManufacturingMedia/);
  assert.match(page, /dynamicLayerMedia\(layer\)\.mediaType === 'video'/);
  assert.match(page, /node\.media\?\.mediaType === 'video'/);
  assert.match(page, /step\.media\?\.mediaType === 'video'/);
  assert.match(page, /currentEquipment\?\.media\?\.mediaType === 'video'/);
  assert.match(page, /posterPath/);
  assert.match(page, /autoplay muted loop playsinline preload="metadata"/);
  assert.match(page, /const binding = manufacturingTextBinding\(text\.id\)/);
  assert.match(page, /fieldPath: binding\?\.fieldPath/);
  assert.match(page, /positionedItemPresentationAttributes\(node\)/);
  assert.doesNotMatch(page, /<div class="cms-positioned"><strong class="cms-styled-text"/);
});

test('manufacturing process nodes retain Directus source indexes and owning page bindings', async () => {
  const page = await readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8');

  assert.match(page, /sourceIndex/);
  assert.match(page, /processSection\.cms_collection/);
  assert.match(page, /processSection\.cms_item_id/);
  assert.match(page, /node\.titleFieldPath/);
  assert.match(page, /node\.bodyFieldPath/);
  assert.match(page, /node\.mediaFieldPath/);
  assert.doesNotMatch(page, /items\.\$\{index\}\.(?:title|body|image|media|connection_label)/);
});

test('manufacturing PSD text keeps field-level presentation isolated from its sibling copy', async () => {
  const page = await readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8');

  assert.match(page, /function textPresentationFor\(text: PsdText & \{ sectionId\?: string; fieldPath\?: string \}\)/);
  assert.match(page, /const presentation = textPresentationFor\(text\);/);
  assert.match(page, /const offset = presentation\.layout\.enabled \? presentation\.layout\.desktop : \{ offset_x: 0, offset_y: 0 \};/);
  assert.match(page, /'--size': presentation\.text_style\.enabled && presentation\.text_style\.size_desktop \? presentation\.text_style\.size_desktop : text\.size/);
  assert.match(page, /'--line-height': presentation\.text_style\.enabled \? presentation\.text_style\.line_height : 1\.33/);
  assert.match(page, /positionFieldPath: binding\?\.fieldPath \? `field_presentation\.\$\{binding\.fieldPath\}` : undefined/);
  assert.match(page, /:data-cms-preview-position-field-path="text\.positionFieldPath"/);
  assert.match(page, /\.psd-editable-text\{[^}]*line-height:var\(--line-height,1\.33\)/);
  assert.doesNotMatch(page, /const presentation = presentationFor\(text\.sectionId \|\| ''\);/);
});

test('manufacturing canvas roots and text fallbacks retain the owning pages binding', async () => {
  const page = await readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8');
  assert.match(page, /const manufacturingPage = computed\(\(\) => overlayRecord\('pages'/);
  assert.match(page, /<section id="manufacturing-flow"[^>]*v-bind="sectionPresentationAttributes\(manufacturingSections\.get\('process'\) \|\| \{\}\)"/);
  assert.match(page, /manufacturingPage\.value\?\.id != null/);
  assert.match(page, /'pages'/);
  assert.match(page, /String\(manufacturingPage\.value\.id\)/);
  assert.match(page, /collection: manufacturingPage\.value\?\.id != null \? 'pages' : \(evidence\?\.id != null \? 'manufacturing_evidence'/);
  assert.match(page, /:data-cms-preview-key="mediaBinding\.collection && mediaBinding\.itemId \? sectionForLayer\(layer\) : undefined"/);
  assert.match(page, /:data-cms-preview-key="equipment\.binding \? 'core-equipment' : undefined"/);
  assert.doesNotMatch(page, /mobile-manufacturing-step" :data-cms-preview-key/);
});

test('manufacturing footer copy keeps exact site-settings bindings for visual editing', async () => {
  const page = await readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8');

  assert.match(page, /const footerTextBindingById: Record<string, string> = \{/);
  assert.match(page, /'footer-products': 'footer\.columns\.0\.title'/);
  assert.match(page, /'footer-workstation': 'footer\.columns\.0\.links\.0\.label'/);
  assert.match(page, /'footer-address-changshu': 'contacts\.addresses\.0'/);
  assert.match(page, /'footer-email-export': 'contacts\.export_email'/);
  assert.match(page, /'footer-purchase-title': 'footer\.purchase_label'/);
  assert.match(page, /'footer-purchase-copy-title': 'footer\.purchase_title'/);
  assert.match(page, /'footer-purchase-copy-subtitle': 'footer\.purchase_subtitle'/);
  assert.match(page, /function footerTextBinding\(textId: string\)/);
  assert.match(page, /collection: 'site_settings'/);
  assert.match(page, /:data-cms-preview-collection="footerBinding\?\.collection"/);
  assert.match(page, /:data-cms-preview-field-path="footerBinding\?\.fieldPath"/);
  assert.match(page, /:data-cms-preview-editable="footerBinding \? 'true' : undefined"/);
  assert.match(page, /\.psd-editable-footer-text\{[^}]*pointer-events:auto/);
});

test('manufacturing rebuilds canvas sections when the live page snapshot changes', async () => {
  const page = await (await import('node:fs/promises')).readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8');
  assert.match(page, /import \{ buildManufacturingSections \} from '~\/shared\/manufacturing-sections\.mjs';/);
  assert.ok(page.includes('const manufacturingSections = shallowRef<Map<string, Record<string, any>>>(new Map());'));
  assert.match(page, /watchEffect\(\(\) => \{\s*manufacturingSections\.value = buildManufacturingSections\(manufacturingPage\.value, manufacturingSectionFallback\);\s*\}\);/);
  assert.doesNotMatch(page, /const manufacturingSections = computed\(\(\) => new Map/);
});

test('manufacturing equipment media binds to its actual page or evidence record and leaves PSD fallbacks read only', async () => {
  const page = await readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8');

  assert.match(page, /equipment\.binding\?\.collection/);
  assert.match(page, /equipment\.binding\?\.itemId/);
  assert.match(page, /equipment\.binding\?\.fieldPath/);
  assert.match(page, /currentEquipment\?\.binding\?\.fieldPath/);
  assert.match(page, /collection: 'pages'/);
  assert.match(page, /collection: 'manufacturing_evidence'/);
  assert.match(page, /equipmentFallbackGallery\.map\(\(item\) => \(\{ \.\.\.item, media: mediaEntry\(asset\(item\.name\)\), binding: null \}\)\)/);
});

test('manufacturing process-node copy keeps independent field presentation paths', async () => {
  const page = await readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8');

  assert.match(page, /import \{ fieldPresentationAttributes, normalizeSectionPresentation, positionedItemPresentationAttributes, sectionPresentationAttributes \} from '~\/shared\/section-presentation\.mjs';/);
  assert.match(page, /fieldPresentationAttributes\(node, node\.titlePresentationKey\)/);
  assert.match(page, /fieldPresentationAttributes\(node, node\.bodyPresentationKey\)/);
  assert.match(page, /fieldPresentationAttributes\(node, node\.connectionPresentationKey\)/);
  assert.match(page, /:data-cms-preview-position-field-path="node\.titlePresentationFieldPath"/);
  assert.match(page, /:data-cms-preview-position-field-path="node\.bodyPresentationFieldPath"/);
  assert.match(page, /:data-cms-preview-position-field-path="node\.connectionPresentationFieldPath"/);
});
