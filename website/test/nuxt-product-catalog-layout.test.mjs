import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

test('product catalog keeps six desktop families in one viewport with single-line labels', async () => {
  const page = await readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');

  assert.match(page, /height: 395px/);
  assert.match(page, /title: 'Our product', kicker: '我们的产品'/);
  assert.match(page, /const categoriesCopy = computed\(\(\) => productSection\('categories', \{ kicker: '3大', title: '选择瑞钧理由' \}\)\);/);
  assert.match(page, /title: 'Champion', body: '销量持续领先，品质始终如一'/);
  assert.match(page, /const section = productSection\(id, fallback\);\s*return \{\s*id,\s*\.\.\.fallback,\s*\.\.\.section/);
  assert.match(page, /const productPageRecord = computed\(\(\) => overlayRecord\('pages', productPageResponse\.value\?\.data \|\| null\)\);/);
  assert.match(page, /const productPageSections = computed\(\(\) => Array\.isArray\(productPageRecord\.value\?\.sections\)/);
  assert.match(page, /const productPageContent = computed\(\(\) => \(\{[\s\S]*productPageRecord\.value[\s\S]*sections: productPageSections\.value/);
  assert.match(page, /data-cms-preview-key="categories"/);
  assert.match(page, /:data-cms-preview-key="proof\.id"/);
  assert.match(page, /v-bind="sectionPresentationAttributes\(proof\)"/);
  assert.doesNotMatch(page, /NO\.0|NO\.\$\{value\}/);
  assert.match(page, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(page, /\.product-grid \{[^}]*max-width: 1280px/s);
  assert.match(page, /aspect-ratio: 420 \/ 259/);
  assert.match(page, /\.product-card \{[^}]*display: block;[^}]*width: 100%/s);
  assert.match(page, /\.product-copy \{[^}]*width:38%/s);
  // Long series names wrap to two lines instead of being clipped by ellipsis.
  assert.match(page, /\.product-kicker \{[^}]*line-clamp:2/s);
  assert.match(page, /\.product-name \{[^}]*line-clamp:2/s);
  assert.doesNotMatch(page, /\.product-name \{[^}]*white-space:nowrap/s);
  assert.match(page, /'is-selected': detailsOpen && selectedCard === family\.id/);
  assert.match(page, /class="details-jump"/);
  // Contextual CTA inside the detail panel; the close affordance is neutral,
  // not brand-red (red stays for destructive/brand actions).
  assert.match(page, /class="catalog-cta-card"/);
  // The ↓ jump lands below the fixed header, not under it.
  assert.match(page, /\.product-series-panel \{[^}]*scroll-margin-top:120px/s);
  assert.match(page, /class="series-panel-cta"/);
  assert.match(page, /获取选型建议/);
  assert.match(page, /class="series-cta-secondary"/);
  assert.match(page, /\.series-panel-close \{[^}]*background:#1f2224/s);
  assert.match(page, /series-model-list button\.active \{[^}]*background:#e51b23/s);
  assert.match(page, /\.specification-pager button:disabled \{[^}]*opacity:\.35/s);
  // A series URL titles the tab and the accessible H1 with the series, not the
  // selected model.
  assert.match(page, /function modelRecordId\(label: string\): string \{[\s\S]*?normalizeModelLabel\(item\.name \|\| item\.model_code\)/);
  assert.match(page, /CMS_LIVE_PREVIEW_SERIES_SELECT/);
  assert.match(page, /const seoDisplayName = computed/);
  assert.match(page, /<span v-if="slug" class="sr-only">\{\{ seoDisplayName \}\}<\/span>/);
  assert.match(page, /<h2 class="sr-only">\{\{ seoDisplayName \}\} 产品详情<\/h2>/);
  assert.match(page, /<h2 v-bind="detailFieldAttributes\('intro\.title', 'intro_title'\)"/);
  assert.match(page, /const catalogPageSize = computed/);
  assert.match(page, /paginationCopy\.value\?\.pagination\?\.page_size/);
  assert.match(page, /Math\.min\(Math\.max\(value, 1\), 6\) : 6/);
  assert.match(page, /const visibleCatalogCards = computed/);
  // The grid mirrors the published catalog, so the canvas cannot show a card or
  // a page the site does not have. Draft-only series are listed in their own
  // strip below the grid, with a delete button each.
  assert.match(page, /const seriesCatalog = computed\(\(\) => mergeSeriesWithPreview\(publishedSeries\.value, previewSeries\.value\)\);/);
  assert.match(page, /const seriesDraftCards = computed\(\(\) => \[\.\.\.seriesCatalog\.value\.unpublishedDrafts\]/);
  assert.match(page, /data-cms-preview-action="series-remove" :data-cms-series-record-id="String\(draft\.id\)"/);
  assert.match(page, /const sortedCatalogSeries = computed\(\(\) => seriesCatalog\.value\.records/);
  assert.match(page, /const cmsCards = sortedCatalogSeries\.value\.map/);
  assert.match(page, /data-cms-preview-draft-note/);
  assert.match(page, /function fallbackProductCardForSeries\(series: any, index: number\)/);
  assert.match(page, /'ft-xs': 'ft'/);
  assert.match(page, /'fl-xs': 'fl'/);
  assert.match(page, /fallbackProductCardForSeries\(series, index\)\?\.image/);
  assert.match(page, /id: 'fl'[^\n]+product-fl-xs\.png/);
  assert.match(page, /v-for="\(family, pageIndex\) in visibleCatalogCards"/);
  assert.match(page, /function seriesCardItemId\(index: number, _fallback: string\)/);
  assert.match(page, /class="product-card-wrap"[^>]*data-cms-preview-collection="product_series"[^>]*:data-cms-preview-item-id="seriesCardItemId\(/);
  assert.match(page, /:data-cms-preview-key="seriesCardItemId/);
  assert.match(page, /\? seriesCardValue\(/);
  // Each family card is a link to its own series page; that page then opens the
  // series through the slug watcher instead of staying on the overview.
  assert.match(page, /<NuxtLink[^>]*:to="`\/product\/\$\{encodeURIComponent\(family\.id\)\}`"[^>]*class="product-card"[^>]*data-cms-preview-field-path="name"/);
  assert.match(page, /const index = catalogCards\.value\.findIndex\(\(card\) => String\(card\.id\)\.toLowerCase\(\) === key\)/);
  assert.match(page, /data-cms-preview-field-path="cover_asset"/);
  assert.match(page, /data-cms-preview-field-path="positioning"/);
  assert.match(page, /data-cms-preview-field-path="name"/);
  assert.doesNotMatch(page, /:data-cms-preview-field-path="`items\.\$\{pageIndex\}\.(cover_asset|positioning|name)`"/);
  assert.match(page, /id="product-details"[^>]*v-bind="\{ \.\.\.sectionPresentationAttributes\(parametersCopy\), \.\.\.detailOwnerAttributes\(\) \}"/);
  assert.match(page, /v-bind="\{ \.\.\.sectionPresentationAttributes\(parametersCopy\), \.\.\.detailOwnerAttributes\(\) \}"/);
  assert.match(page, /class="series-model-list"[^>]*aria-label="该系列机型"/);
  // The chip text is the model name; the editable path must name the same field
  // (it used to be model_code, so the panel showed a different value).
  assert.match(page, /<span v-bind="fieldPresentationAttributes\(selectedModelRecord\?\.presentation, 'name'\)" data-cms-preview-field-path="name" data-cms-preview-label="型号名称" data-cms-preview-position-field-path="presentation\.field_presentation\.name">\{\{ model \}\}<\/span>/);
  assert.match(page, /v-bind="detailFieldAttributes\(`features\.\$\{index\}\.label`, featurePresentationPath\(index, 'label'\)\)"/);
  assert.match(page, /v-bind="detailFieldAttributes\(`features\.\$\{index\}\.image`, featurePresentationPath\(index, 'image'\)\)"[^>]*data-cms-preview-media-role="feature"/);
  // Detail fields switch owner: the series (`detail.*`) for solution-type series,
  // the displayed model (`configuration.*`) otherwise.
  assert.match(page, /return \{ mode: 'series', collection: 'product_series', itemId: String\(activeSeriesRecord\.value\.id\), prefix: 'detail' \};/);
  assert.match(page, /'data-cms-preview-field-path': `\$\{owner\.prefix\}\.\$\{relativePath\}`/);
  // The displayed card is the only source of truth for the series; deriving it from
  // the page product or the preview target leaked another family into the panel.
  assert.match(page, /const published = sortedCatalogSeries\.value\.find\(\(series: any\) => String\(series\.slug \|\| series\.series_code\) === activeCard\.value\?\.id\);/);
  assert.match(page, /const sessionSeries = recordsFor\('product_series'\)\.find\(/);
  assert.match(page, /const activePreviewModel = previewSession\.value\?\.collection === 'product_models' \? product\.value\?\.model_code : '';/);
  assert.match(page, /const seriesDetailEntry = computed\(\(\) => productSeriesDetails\[seriesDetailKeyExact\(seriesDetailCard\.value\)\] \|\| null\);/);
  // Model chips come from an exact template hit, never from the `pro` heuristic.
  assert.match(page, /const seriesModelCodes = computed\(\(\) => \{/);
  // Records and the series' own template models are merged, so adding a model
  // never hides the ones that were already there.
  assert.match(page, /const templateModels = seriesModelCodes\.value/);
  assert.match(page, /return realModels\.length \? realModels : templateModels;/);
  // Series-level detail wins only when it exists, so sites without it keep
  // rendering the model configuration and the PSD fallback exactly as before.
  assert.match(page, /const seriesDetail = computed\(\(\) => \{/);
  assert.match(page, /if \(key !== 'workstation'\) return null;/);
  assert.match(page, /\{ keepEmpty: Boolean\(previewSession\.value\) \}/);
  assert.match(page, /if \(seriesDetail\.value\?\.intro\) return \{/);
  assert.match(page, /if \(seriesDetail\.value\?\.features\?\.length\) return seriesDetail\.value\.features;/);
  // Series-level machine photo: the draft holds a governed asset id, the canvas
  // resolves it through the authorized preview endpoint.
  assert.match(page, /const seriesMachineImage = computed\(\(\) => \{/);
  assert.match(page, /if \(assetId && previewSession\.value\) return `\/api\/preview\/media\/\$\{encodeURIComponent\(assetId\)\}`;/);
  assert.match(page, /if \(detailMode\.value === 'series'\) return seriesMachineImage\.value \|\| activeSeriesDetail\.value\.machine;/);
  assert.match(page, /'data-cms-preview-field-path': 'detail\.machine_asset_id'/);
  // Canvas-only list controls: add/remove a device-composition row without
  // leaving the preview, bound to the array the panel renders from.
  assert.match(page, /const featureListPath = computed\(\(\) => \(detailMode\.value === 'series' \? 'detail\.features' : 'configuration\.features'\)\);/);
  assert.match(page, /data-cms-preview-action="list-add" :data-cms-list-path="featureListPath" :data-cms-list-series="activeSeriesCode"/);
  assert.match(page, /data-cms-preview-action="list-remove" :data-cms-list-path="featureListPath" :data-cms-list-series="activeSeriesCode" :data-cms-list-index="String\(index\)"/);
  assert.match(page, /v-if="previewSession" type="button" class="cms-list-add"/);
  // "＋" and "×" are always offered; the workbench resolves the record from the
  // series code and seeds the website original before touching the array.
  assert.match(page, /:data-cms-list-label="reason\.label \|\| `第 \$\{index \+ 1\} 项`"/);
  assert.match(page, /const specHasRecordRows = computed\(\(\) => parameterGroups\.value\.some/);
  assert.match(page, /:data-cms-list-collection="detailOwner\(\)\.collection" :data-cms-list-item-id="detailOwner\(\)\.itemId"/);
  assert.match(page, /const previewModel = product\.value && String\(product\.value\.series_code \|\| ''\) === activeSeriesCode\.value \? product\.value : null;/);
  assert.match(page, /import \{ groupPreviewProductParameters, mergePreviewParameterRows, normalizePreviewParameterGroups \} from '~\/shared\/product-preview-parameters\.mjs';/);
  assert.match(page, /normalizePreviewParameterGroups\(groups\)/);
  // The workbench's left series list must switch this canvas card; otherwise the
  // next "＋新增机型" writes the previous series code.
  assert.match(page, /data\.kind === 'series-selected'/);
  assert.match(page, /function applyCanvasSeriesSelection\(data/);
  assert.match(page, /mergePreviewParameterRows\(baseGroups\.flatMap/);
  assert.match(page, /:data-cms-preview-item-id="item\.id \|\| parameterRowOwnerId\(\) \|\| undefined"/);
  assert.match(page, /:data-cms-preview-field-path="item\.id \? 'unit' : parameterRowPath\(groupIndex, rowIndex, 'unit'\)"/);
  assert.match(page, /const sessionModels = recordsFor\('product_models'\)\.filter/);
  // Pushed draft models must reach the panel, otherwise canvas edits look ignored;
  // template names never mix with real records.
  assert.match(page, /const realModels = \[\.\.\.\(previewModel \? \[previewModel\] : \[\]\), \.\.\.sessionModels, \.\.\.publishedModels\]\.filter/);
  assert.match(page, /<b[^>]*data-cms-preview-field-path="kicker"[^>]*>\{\{ categoriesCopy\.kicker \|\| '3大' \}\}<\/b>/);
  assert.match(page, /<span[^>]*class="cms-styled-text"[^>]*data-cms-preview-field-path="title"[^>]*>\{\{ categoriesCopy\.title \}\}<\/span>/);
  assert.match(page, /:data-cms-preview-field-path="proof\.value \? 'value' : 'title'"/);
  assert.match(page, /:data-cms-preview-field-path="proof\.value \? 'unit' : 'body'"/);
  assert.match(page, /watch\(\[proofCopy, previewSession\], \(\[proofs, session\]\) => \{[\s\S]*if \(!session \|\| !proofDomReady\.value\) return;[\s\S]*syncPreviewProofNumbers\(proofs\)/);
  assert.match(page, /const proofDomReady = ref\(false\);/);
  assert.match(page, /if \(!session \|\| !proofDomReady\.value\) return;/);
  assert.match(page, /onMounted\(\(\) => \{[\s\S]*proofDomReady\.value = true;[\s\S]*syncPreviewProofNumbers\(\);\s*\}\);/);
  // The published number is rendered by SSR and must not restart from 0 while a
  // count-up script runs (it left "0 %" next to copy claiming 50%).
  assert.match(page, /:data-cms-preview-field-path="proof\.value \? 'value' : 'title'">\{\{ proof\.value \}\}<\/span>/);
  assert.doesNotMatch(page, /const animateProof|Math\.round\(target \* eased\)/);
  assert.match(page, /v-bind="detailFieldAttributes\('intro\.title', 'intro_title'\)"/);
  assert.match(page, /v-bind="machineImageAttributes\(\)"/);
  // A series without a machine photo (FR-G) keeps a governed image slot with a
  // neutral placeholder instead of an empty centre column, and a failed managed
  // asset falls back to the website original instead of a blank slot.
  assert.match(page, /:src="machineImageSrc"/);
  assert.match(page, /@error="handleMachineImageError"/);
  assert.match(page, /const machineImageSrc = computed\(\(\) => \(machineImageFailed\.value \? machineImageFallback\.value : displayImage\.value\)/);
  assert.match(page, /<img :src="String\(displayConfig\.labels\?\.technicalImage \|\| '\/assets\/psd\/technical-label-psd\.png'\)" :alt="String\(displayLabels\.technical \|\| parametersCopy\.title \|\| '技术参数'\)" v-bind="productBinding\('configuration\.labels\.technical_image_asset_id'\)"[^>]*data-cms-preview-media-role="technical">/);
  assert.match(page, /:data-cms-preview-field-path="`configuration\.drawings\.\$\{activeDrawing\.sourceIndex\}\.caption`"/);
  assert.match(page, /v-bind="productBinding\(`configuration\.drawings\.\$\{activeDrawing\.sourceIndex\}\.media_asset_id`\)"/);
  assert.match(page, /:data-cms-preview-placement-key="'product\.gallery\.image'"/);
  // A draft card without a cover needs a real <img> so the media panel can replace
  // it; the placeholder is explicit (class cms-draft-cover-empty) and never used as
  // a default for published cards.
  assert.match(page, /<img v-else src="\/assets\/psd\/product-dimensions\.png"[^>]*class="cms-draft-cover-empty"[^>]*data-cms-preview-field-path="cover_asset"/);
  // A published series without a cover must not borrow another series' photo.
  assert.match(page, /product-cover-placeholder\.png/);
  assert.doesNotMatch(page, /fallbackProductCards\[index\]/);
  assert.match(page, /routeSeriesExists/);
  assert.match(page, /previewSession\.value\?\.collection === 'product_models'\) void nextTick\(scrollToDetails\)/);
  assert.match(page, /data-cms-preview-key="parameters-empty"/);
  assert.match(page, /const specificationRows = computed<Array<\[string, string\]>>/);
  assert.match(page, /const parameterLabels: Record<string, string>/);
  assert.match(page, /series-specification\.is-empty/);
  assert.match(page, /class="catalog-pager"/);
  assert.match(page, /const paginationCopy = computed\(\(\) => productSection\('pagination', \{[\s\S]*pagination: \{ page_size: 6, previous_label: '上一页', next_label: '下一页' \}/);
  assert.match(page, /data-cms-preview-field-path="pagination\.previous_label"/);
  assert.match(page, /data-cms-preview-field-path="pagination\.next_label"/);
  assert.match(page, /@click="changeCatalogPage\(-1\)"/);
  assert.match(page, /@click="changeCatalogPage\(1\)"/);
  assert.match(page, /scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/);
  assert.match(page, /\.product-grid\.has-selection \.product-card\.is-selected \{[^}]*translateY\(-18px\)/s);
  assert.match(page, /\.series-specification \{[^}]*clamp\(260px, 15\.625vw, 300px\)/s);
  assert.match(page, /\.specification-drawings \{[^}]*align-self:end/s);
  assert.match(page, /@media \(min-width: 901px\) \{[\s\S]*\.series-specification \{[^}]*min-height: 650px/s);
  assert.match(page, /\.specification-table dl \{[^}]*min-height: 520px;[^}]*grid-auto-rows: minmax\(32px, auto\)/s);
  assert.match(page, /\.specification-table dt,[\s\S]*\.specification-table dd \{[^}]*font-size: clamp\(14px, \.85vw, 16px\)/s);
  assert.match(page, /\.specification-drawings img \{[^}]*height: 100%;[^}]*max-height: 650px[^}]*object-fit: contain/s);
  assert.match(page, /@media \(max-width: 900px\) \{[\s\S]*\.specification-table dl \{[^}]*height: auto;[^}]*grid-auto-rows: auto/s);
  assert.match(page, /class="series-capability"/);
  // The PSD detail defaults moved into a shared module so the CMS can seed them.
  const detailDefaults = await readFile(new URL('../shared/product-series-details.mjs', import.meta.url), 'utf8');
  assert.match(detailDefaults, /models: \['FR400XS\(auto\)', 'FR500XS\(auto\)', 'FR600XS\(auto\)', 'FR7055XS\(auto\)', 'FR8055XS\(auto\)', 'FR8060XS\(auto\)'\]/);
  assert.match(detailDefaults, /models: \['FR-Y8060', 'FR-Y1080'\]/);
  assert.match(detailDefaults, /models: \['FL8560', 'FL1180', 'FL1390', 'FL1610'\]/);
  assert.match(detailDefaults, /高强度承载设计/);
  assert.doesNotMatch(detailDefaults, /models: \[[^\]]*(FL2160XS|FL8060XS)/);
  assert.match(detailDefaults, /灵动切割工作站搭载自动穿丝系统/);
  assert.match(page, /表中所述加工性能参数是在本公司指定条件/);
  assert.doesNotMatch(page, /\.series-capabilities button\.active img|\.series-capabilities button:hover img/);
  assert.match(page, /--product-content-edge: max\(6\.2%, calc\(\(100% - 1400px\) \/ 2\)\)/);
  assert.match(page, /--product-arc-width: min\(22\.526vw, 432\.5px\)/);
  assert.match(page, /\.product-overview::after \{[^}]*right: calc\(var\(--product-content-edge\) - var\(--product-arc-outset\)\)/s);
  assert.match(page, /product-overview-arc\.png/);
  await access(new URL('../public/assets/psd/product-overview-arc.png', import.meta.url));
  await access(new URL('../public/assets/psd/product-detail/workstation-machine.png', import.meta.url));
  await access(new URL('../public/assets/psd/product-detail/auto-threading.png', import.meta.url));
  await access(new URL('../public/assets/psd/product-detail/fl-machine.png', import.meta.url));
  assert.match(page, /<div class="overview-kicker cms-positioned"[^>]*data-cms-preview-key="categories"[^>]*aria-hidden="true"><b[^>]*data-cms-preview-field-path="kicker"[^>]*>\{\{ categoriesCopy\.kicker \|\| '3大' \}\}<\/b>/);
  assert.match(page, /--product-kicker-outset: min\(3\.4375vw, 66px\)/);
  assert.match(page, /\.overview-kicker \{[^}]*right: calc\(var\(--product-content-edge\) - var\(--product-kicker-outset\)\)/s);
  assert.match(page, /\.overview-kicker span \{[^}]*font-size: min\(1\.875vw, 36px\)/s);
  assert.match(page, /\.overview-kicker \{[^}]*z-index: 1/);
  assert.match(page, /\.overview-heading \{[^}]*top: min\(6\.875vw, 132px\)[^}]*left: max\(6\.2%, calc\(\(100% - 1280px\) \/ 2\)\)/s);
  assert.match(page, /--product-grid-width: min\(1280px, calc\(100% - \(2 \* var\(--product-content-edge\)\)\)\)/);
  assert.match(page, /\.proof-grid \{[^}]*top: min\(13\.646vw, 261px\)[^}]*width: var\(--product-grid-width\)/s);
  assert.match(page, /\.product-overview::after \{[^}]*top: calc\(min\(3\.36vw, 64\.5px\) - 72px\)/s);
  assert.doesNotMatch(page, /\.product-overview::after \{[^}]*border-radius|\.product-overview::after \{[^}]*rotate\(/s);
});

test('product detail editing and page actions stay wired to the selected model', async () => {
  const page = await readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');

  // The detail panel renders the selected model, so bindings must not fall back
  // to the first published model of the list endpoint, nor to a model from
  // another series (that made every card render the same detail).
  assert.match(page, /function boundProductRecord\(\): ProductRecord \| null \{/);
  assert.match(page, /const fallback = product\.value && String\(product\.value\.series_code \|\| ''\) === activeSeriesCode\.value \? product\.value : null;/);
  assert.match(page, /return \(selectedModelRecord\.value as ProductRecord \| null\) \|\| fallback;/);
  assert.match(page, /return recordBacked \|\| activeModels\.value\[0\] \|\| null;/);
  assert.match(page, /const record = boundProductRecord\(\);/);
  // The canvas opens the detail panel in place instead of navigating away and
  // dropping ?cmsPreview=1.
  assert.match(page, /function handleCatalogCardClick\(event: MouseEvent, id: string\)/);
  assert.match(page, /data-cms-preview-page-action="open-product-series"/);
  // Published series/models are read-only: the destructive controls are hidden
  // instead of offering a delete that the workbench rejects.
  assert.match(page, /function seriesCardCanDelete\(index: number\)/);
  assert.match(page, /:disabled="!seriesCardCanDelete\(/);
  assert.match(page, /\.cms-card-remove:disabled \{/);
  assert.match(page, /:disabled="!modelCanDelete"/);
  assert.match(page, /previewSession && item\.id && modelCanDelete/);
  // Draft cards used to send only `series-select`, which the canvas swallowed,
  // so the page detail never opened. Both card types now use the page action.
  assert.match(page, /class="series-detail-action" data-cms-preview-page-action="open-product-series" :data-cms-series-id="draft\.id"/);
  // One click fires the page action and the button's click handler; the open
  // sequence is deduplicated so it does not notify/scroll twice.
  assert.match(page, /lastSeriesOpenId/);
  assert.match(page, /now - lastSeriesOpenAt < 200/);
  assert.match(page, /:data-cms-preview-page-action="previewSession \? 'select-product-model' : undefined"/);  assert.match(page, /@click="handleCatalogCardClick\(\$event, family\.id\)"/);
  // Page-owned clicks are handed back through the preview event, and new nodes
  // are re-decorated after the panel opens or the model changes.
  assert.match(page, /window\.addEventListener\(CMS_LIVE_PREVIEW_PAGE_ACTION, applyCanvasPageAction\)/);
  assert.match(page, /watch\(\[detailsOpen, selectedModel, catalogPage\], \(\) => \{ void refreshVisualDecorations\(\); \}, \{ flush: 'post' \}\);/);
});

test('visible resource and case section kickers retain their exact CMS field bindings', async () => {
  const page = await readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');

  assert.match(page, /data-cms-preview-key="resources"[^>]*:data-cms-preview-collection="productRecordBinding\('resources'\)\['data-cms-preview-collection'\]"[^>]*:data-cms-preview-item-id="productRecordBinding\('resources'\)\['data-cms-preview-item-id'\]"/);
  assert.match(page, /data-cms-preview-key="resources"[\s\S]{0,420}<p class="eyebrow">\{\{ resourcesCopy\.kicker \}\}<\/p>/);
  assert.doesNotMatch(page, /data-cms-preview-key="resources"[\s\S]{0,420}<p class="eyebrow" data-cms-preview-field-path="kicker"/);
  assert.match(page, /v-for="\(resource, resourceIndex\) in resources"/);
  assert.match(page, /:data-cms-preview-field-path="`resources\.\$\{resourceIndex\}\.title`"/);
  assert.match(page, /:data-cms-preview-link-field-path="`resources\.\$\{resourceIndex\}\.url`"/);
  assert.match(page, /<span[^>]*:data-cms-preview-field-path="`resources\.\$\{resourceIndex\}\.type`">/);
  assert.match(page, /<strong[^>]*:data-cms-preview-field-path="`resources\.\$\{resourceIndex\}\.title`">/);
  assert.match(page, /data-cms-preview-key="cases"[\s\S]{0,420}<p class="eyebrow" data-cms-preview-field-path="kicker">/);
});

test('product catalog fallback images follow the CMS series identity', async () => {
  const page = await readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');

  assert.match(page, /function fallbackProductCardForSeries\(series: any, index: number\)/);
  assert.match(page, /'fr-pro': 'pro'/);
  assert.match(page, /'ft-xs': 'ft'/);
  assert.match(page, /'fl-xs': 'fl'/);
  assert.match(page, /fallbackProductCardForSeries\(series, index\)\?\.image/);
  assert.match(page, /id: 'fl'[^\n]+product-fl-xs\.png/);
});

test('parameter rows can be added and removed from the canvas', async () => {
  const page = await readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');

  // Per-row delete and a list-level add, both bound to the displayed model.
  assert.match(page, /data-cms-preview-action="parameter-remove" :data-cms-parameter-id="item\.id" :data-cms-model-code="selectedModelRecord\?\.model_code \|\| displayModel"/);
  assert.match(page, /data-cms-preview-action="parameter-add" :data-cms-model-code="selectedModelRecord\?\.model_code \|\| displayModel"/);
  assert.match(page, /v-if="previewSession && item\.id && modelCanDelete" type="button" class="spec-row-remove"/);
  // A brand-new model has no parameter rows yet, so the empty state needs its
  // own add button; the table's bottom button only exists once rows do.
  assert.match(page, /class="spec-table-toolbar"/);
  assert.match(page, /previewSession && modelCanDelete && boundProductRecord\(\)\?\.id != null/);
  assert.match(page, /<dl v-if="parameterGroups\.length">/);
  assert.match(page, /<div v-if="previewSession && specHasRecordRows && modelCanDelete" class="spec-row-actions">/);
});

test('a card click can never navigate the canvas away from its preview session', async () => {
  const page = await readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');

  assert.match(page, /const \{ overlayRecord, overlayList, recordFor, recordsFor, session: previewSession, enabled: previewEnabled, error: previewError,/);
  // A lost session must say so instead of looking like an old build.
  assert.match(page, /const previewSessionLost = computed\(\(\) => Boolean\(previewEnabled\.value\) && !previewSession\.value && Boolean\(previewError\.value\)\);/);
  assert.match(page, /class="cms-session-lost"/);
  assert.match(page, /if \(!previewSession\.value && !insidePreviewFrame\(\)\) return;/);
  assert.match(page, /event\.preventDefault\(\);\s*\n\s*openSeriesDetails\(id\);/);
});

test('fallback detail fields are read-only and explain how to initialize', async () => {
  const page = await readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');

  assert.match(page, /const DETAIL_INITIALIZE_HINT = '当前详情来自官网原版兜底，尚未写入 CMS。/);
  assert.match(page, /attributes\['data-cms-preview-readonly'\] = 'uninitialized';/);
  assert.match(page, /attributes\['data-cms-preview-readonly-reason'\] = DETAIL_INITIALIZE_HINT;/);
  assert.match(page, /\{\{ DETAIL_INITIALIZE_HINT \}\}<\/p>/);
  // The hint explains that "＋" seeds the original; the controls stay visible so
  // the operator has a way to start editing from the canvas.
  assert.match(page, /\{\{ DETAIL_INITIALIZE_HINT \}\}/);
  assert.match(page, /点「＋ 新增一项」会自动把官网原版文案写入 CMS 再追加一行/);
});

test('the delete-model button explains why a template-only model cannot be deleted', async () => {
  const page = await readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');
  assert.match(page, /:disabled="!modelCanDelete"/);
  assert.match(page, /该机型只是官网原版名称，尚未建立 CMS 记录，无法删除/);
  assert.match(page, /:data-cms-preview-action="modelCanDelete \? 'model-remove' : undefined"/);
});
