<script setup lang="ts">
import { filterProductModels } from '~/shared/product-model-filter.mjs';
import { productResourceDownloadName } from '~/shared/product-resource-download.mjs';
import { groupPreviewProductParameters, mergePreviewParameterRows, normalizePreviewParameterGroups } from '~/shared/product-preview-parameters.mjs';
import { formatProductParameterValue, resolvePreviewProductSelection } from '~/shared/product-preview-state.mjs';
import { resolvePageSection } from '~/shared/page-sections.mjs';
import { mergeSeriesWithPreview, unpublishedSeriesSummary } from '~/shared/product-catalog-preview.mjs';
import { normalizeSeriesDetail, productSeriesDetails, seriesDetailKey, seriesDetailKeyExact } from '~/shared/product-series-details.mjs';
import { fieldPresentationAttributes, sectionPresentationAttributes } from '~/shared/section-presentation.mjs';
import { CMS_LIVE_PREVIEW_NOTICE, CMS_LIVE_PREVIEW_PAGE_ACTION, CMS_LIVE_PREVIEW_REQUEST_SERIES_MODELS, CMS_LIVE_PREVIEW_SERIES_SELECT } from '~/utils/cms-live-preview.mjs';

function normalizeModelLabel(value: unknown) {
  // Records are entered as "FR7055XS (Auto)" while the legacy template names
  // are "FR7055XS(auto)". One canonical label keeps the selected chip, the
  // record lookup and the visible text in sync.
  return String(value || '')
    .replace(/\s*\((AUTO|Auto|PRO|Pro)\)/g, (_, variant: string) => `(${variant.toLowerCase()})`)
    .replace(/\s+/g, ' ')
    .trim();
}

type ProductRecord = {
  id?: string | number;
  series_code?: string;
  slug?: string;
  name?: string;
  model_code?: string;
  parameters?: Record<string, unknown>;
  parameter_units?: Record<string, string>;
  parameter_groups?: Array<{ name?: string; items?: Array<{ label?: string; key?: string; value?: unknown; unit?: string; presentation?: Record<string, unknown> }> }>;
  configuration?: Record<string, unknown>;
  resources?: Array<{ title: string; type?: string; url?: string; path?: string; media_asset_id?: string | number | null }>;
  case_studies?: Array<{ title: string; summary?: string; url: string }>;
  media?: Array<{ path: string; alt?: string }>;
  cover_asset?: string | null;
  presentation?: Record<string, unknown>;
};

function productResourceUrl(resource: ProductRecord['resources'] extends Array<infer Item> ? Item : never) {
  return String(resource?.url || resource?.path || '').trim();
}

const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));
const productEndpoint = computed(() => slug.value
  ? `/api/public/v1/products/${encodeURIComponent(slug.value)}`
  : '/api/public/v1/products');
const { data: response, error: responseError } = await useFetch(productEndpoint, {
  watch: [slug],
  default: () => ({ data: null as ProductRecord | null, source: 'static', cache: 'unavailable' })
});
const { data: modelsResponse } = await useFetch('/api/public/v1/products', {
  default: () => ({ data: [] as ProductRecord[], source: 'static', cache: 'unavailable' })
});
const { data: seriesResponse } = await useFetch('/api/public/v1/product-series', {
  default: () => ({ data: [] as Array<{ series_code?: string; name?: string }> })
});
const { data: productPageResponse } = await useFetch('/api/public/v1/pages/product', {
  default: () => ({ data: null as any })
});
const { overlayRecord, overlayList, recordFor, recordsFor, session: previewSession, enabled: previewEnabled, error: previewError, visualEditMode: cmsVisualEditMode, refreshVisualDecorations, insidePreviewFrame } = useCmsDraftPreview();
// The canvas silently degrades to the public page when its draft session is gone
// (no 详情/＋/× anywhere). Say it out loud instead of looking like an old build.
const previewSessionLost = computed(() => Boolean(previewEnabled.value) && !previewSession.value && Boolean(previewError.value));
// Canvas-only feedback: a new draft card lives in the strip below the grid, so the
// workbench tells the page to highlight it and show a toast.
const seriesNotice = ref('');
const highlightedDraftId = ref('');
let seriesNoticeTimer = 0;
function handleCanvasNotice(event: MessageEvent) {
  const data = (event as MessageEvent).data as { type?: string; kind?: string; itemId?: string; seriesCode?: string; slug?: string; label?: string } | undefined;
  if (data?.type !== CMS_LIVE_PREVIEW_NOTICE) return;
  // The workbench's left series list is a second selection surface. When it
  // switches/creates a series, follow it here so `activeSeriesCode` (and the
  // series code written by "＋ 新增机型") matches the card the operator sees.
  if (data.kind === 'series-selected') {
    applyCanvasSeriesSelection(data);
    return;
  }
  if (data.kind !== 'series-added') return;
  seriesNotice.value = `已新增草稿卡片：${String(data.label || '新系列')}`;
  highlightedDraftId.value = String(data.itemId || '');
  window.clearTimeout(seriesNoticeTimer);
  seriesNoticeTimer = window.setTimeout(() => { seriesNotice.value = ''; highlightedDraftId.value = ''; }, 4000);
  void nextTick(() => document.querySelector('.cms-draft-cards')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
}

function applyCanvasSeriesSelection(data: { itemId?: string; seriesCode?: string; slug?: string }) {
  const recordId = String(data.itemId || '');
  const seriesCode = String(data.seriesCode || '');
  const slug = String(data.slug || '');
  const findCard = () => [...catalogCards.value, ...draftCatalogCards.value].find((card: any) => (
    (recordId && String(card.recordId || '') === recordId)
    || (slug && String(card.id || '') === slug)
    || (seriesCode && String(card.seriesCode || '') === seriesCode)
  ));
  const apply = (card: any) => {
    if (!card) return false;
    selectedCard.value = card.id;
    detailsOpen.value = true;
    // Ask for the card's models without echoing a series-select back to the
    // workbench (that message is reserved for user clicks).
    requestSeriesModels(String(card.seriesCode || seriesCode || ''));
    void nextTick(() => document.getElementById(card.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    return true;
  };
  const applyWhenReady = (attempt = 0) => {
    if (apply(findCard())) return;
    // A brand-new draft card can arrive in the same tick as this notice, and the
    // live overlay may need another frame or two to materialize it.
    if (attempt < 4) window.setTimeout(() => applyWhenReady(attempt + 1), 150);
  };
  applyWhenReady();
}


// `/product/<series-slug>` is a series landing page, not a model record. The
// upstream model endpoint answers 410 for it (there is no model with that
// slug), which must not turn every published series into "no longer published".
// Only a slug that matches neither a series nor a model is a real 410.
const routeSeriesExists = computed(() => {
  const data = seriesResponse.value?.data;
  const key = slug.value.trim().toLowerCase();
  if (!key || !Array.isArray(data)) return false;
  return data.some((record) => [record?.slug, record?.series_code].map((value) => String(value || '').toLowerCase()).includes(key));
});
// A canvas may legitimately target an unpublished model (the whole point of
// editing a draft). Only public traffic gets the 410.
const previewRoute = Boolean(route.query.cmsPreview) || previewEnabled.value;
if (responseError.value?.statusCode === 410 && !routeSeriesExists.value && !previewRoute) {
  throw createError({ statusCode: 410, statusMessage: 'Product is no longer published', fatal: true });
}

const product = computed<ProductRecord | null>(() => {
  const data = response.value?.data;
  const published = Array.isArray(data) ? data[0] || null : data || null;
  return overlayRecord('product_models', published, (draft) => previewSession.value?.collection === 'product_models' || !slug.value || [draft.slug, draft.model_code].map(String).includes(slug.value)) as ProductRecord | null;
});
// The detail panel renders the *selected* model's configuration, so every field
// binding must name that record. Binding to `product` (the first published model
// of the list endpoint) wrote edits onto another model as soon as the reader
// switched families. `selectedModelRecord` is declared further down but this
// helper only runs while rendering, after setup has completed.
function boundProductRecord(): ProductRecord | null {
  // `product` is the session's model record; only accept it when it belongs to
  // the series on screen, otherwise a card without its own records would borrow
  // another series' model (and every detail panel looked identical).
  const fallback = product.value && String(product.value.series_code || '') === activeSeriesCode.value ? product.value : null;
  return (selectedModelRecord.value as ProductRecord | null) || fallback;
}
// Published models are read-only: the delete guard in the workbench rejects
// them, so the canvas must not offer the destructive control.
const modelCanDelete = computed(() => {
  const record = boundProductRecord();
  if (!record?.id) return false;
  return ['draft', 'rejected', 'unpublished'].includes(String(record.status || ''))
    && String(record.publication_state || '') !== 'published';
});
function productBinding(fieldPath: string) {
  const record = boundProductRecord();
  const productItemId = record?.id != null
    ? String(record.id)
    : previewSession.value?.collection === 'product_models' && previewSession.value?.itemId != null
      ? String(previewSession.value.itemId)
      : '';
  return {
    'data-cms-preview-collection': productItemId ? 'product_models' : undefined,
    'data-cms-preview-item-id': productItemId || undefined,
    'data-cms-preview-field-path': fieldPath
  };
}
// Resources are read from `product` (the route record), not from the model shown
// in the detail panel, so their canvas binding must keep following `product`.
function productRecordBinding(fieldPath: string) {
  const itemId = product.value?.id != null ? String(product.value.id) : '';
  return {
    'data-cms-preview-collection': itemId ? 'product_models' : undefined,
    'data-cms-preview-item-id': itemId || undefined,
    'data-cms-preview-field-path': fieldPath
  };
}
// Detail fields are owned either by the series (`presentation.detail`, used by
// solution-type series) or by the displayed model (`configuration`). Both the
// rendered values and the canvas binding follow the same owner, otherwise edits
// would be written onto a record the panel is not showing.
// A draft card (or a card whose models only exist as template names) has no model
// record to write to, so its detail binds to the series record instead of turning
// every field read-only.
function detailSeriesRecordId(): string {
  if (activeSeriesRecord.value?.id != null) return String(activeSeriesRecord.value.id);
  const card = activeCard.value as { isDraft?: boolean; recordId?: string } | undefined;
  if (card?.recordId) return String(card.recordId);
  // The canvas may have been opened straight onto a series page.
  const session = previewSession.value;
  if (session?.collection === 'product_series' && session.itemId != null) return String(session.itemId);
  return '';
}
function detailOwner(): { mode: 'series' | 'model'; collection: string; itemId: string; prefix: string } {
  const seriesId = detailSeriesRecordId();
  if (!boundProductRecord()?.id && seriesId) {
    return { mode: 'series', collection: 'product_series', itemId: seriesId, prefix: 'detail' };
  }
  if (detailMode.value === 'series' && activeSeriesRecord.value?.id != null) {
    // `detail` is the editable path inside the workbench draft; the series form
    // persists it into `presentation.detail`.
    return { mode: 'series', collection: 'product_series', itemId: String(activeSeriesRecord.value.id), prefix: 'detail' };
  }
  const record = boundProductRecord();
  const itemId = record?.id != null
    ? String(record.id)
    : previewSession.value?.collection === 'product_models' && previewSession.value?.itemId != null
      ? String(previewSession.value.itemId)
      : '';
  return { mode: 'model', collection: itemId ? 'product_models' : '', itemId, prefix: 'configuration' };
}
function detailOwnerAttributes() {
  const owner = detailOwner();
  return {
    'data-cms-preview-collection': owner.collection || undefined,
    'data-cms-preview-item-id': owner.itemId || undefined
  };
}
// Shown on the panel and handed to the workbench when a fallback field is
// clicked, so both paths tell the editor the same next step.
const DETAIL_INITIALIZE_HINT = '当前详情来自官网原版兜底，尚未写入 CMS。点「＋ 新增一项」会自动把官网原版文案写入 CMS 再追加一行；也可以先在左侧「产品系列与型号」或「产品型号、参数与尺寸图」点击「从官网原版初始化详情」并保存。';
function detailFieldAttributes(relativePath: string, presentationPath = '') {
  const owner = detailOwner();
  const attributes: Record<string, any> = {
    'data-cms-preview-collection': owner.collection || undefined,
    'data-cms-preview-item-id': owner.itemId || undefined,
    'data-cms-preview-field-path': `${owner.prefix}.${relativePath}`
  };
  // Series-level detail has no per-field presentation contract yet; keep the
  // styling attributes for the model owner only so the property panel never
  // writes style keys into `presentation.detail`.
  if (owner.mode === 'model' && presentationPath) {
    Object.assign(attributes, fieldPresentationAttributes(displayConfig.value, presentationPath));
    attributes['data-cms-preview-position-field-path'] = `configuration.field_presentation.${presentationPath}`;
  }
  // Nothing behind these fields yet: the visible copy is the template fallback.
  // Mark them read-only so a click explains how to initialize instead of opening
  // an editor that would write to the wrong record. A model chip that only exists
  // as a template name has no CMS record either (`owner.itemId` empty), and the
  // decorator would otherwise inherit the page's id from the panel root.
  // Selectable as long as the record can be written; the workbench seeds the
  // website original on the first edit (only a missing owner stays read-only).
  if (!owner.itemId) {
    attributes['data-cms-preview-readonly'] = 'uninitialized';
    attributes['data-cms-preview-readonly-reason'] = DETAIL_INITIALIZE_HINT;
  }
  return attributes;
}
function machineImageAttributes() {
  if (detailMode.value === 'series') {
    return {
      ...detailOwnerAttributes(),
      'data-cms-preview-field-path': 'detail.machine_asset_id'
    };
  }
  return productBinding(displayImageFieldPath.value);
}
const modelQuery = ref('');
const publicModels = computed(() => {
  const data = modelsResponse.value?.data;
  return overlayList('product_models', Array.isArray(data) ? data : (Array.isArray(response.value?.data) ? response.value.data : []));
});
const filteredModels = computed(() => filterProductModels(publicModels.value, modelQuery.value));
const publishedSeries = computed(() => {
  const data = seriesResponse.value?.data;
  return Array.isArray(data) ? data.filter((record) => record && typeof record === 'object') : [];
});
const previewSeries = computed(() => overlayList('product_series', publishedSeries.value));
// The card grid mirrors the public catalog exactly: a draft may change the copy
// of a published card, but a series that has never been published must not add a
// card or a page. Draft cards (including a card created in the canvas) are listed
// in the separate "草稿卡片" strip below the grid, so they stay visible and
// deletable without changing the site's count, numbering or pagination.
const seriesCatalog = computed(() => mergeSeriesWithPreview(publishedSeries.value, previewSeries.value));
// Newest first so a card created in the canvas is at hand.
const seriesDraftCards = computed(() => [...seriesCatalog.value.unpublishedDrafts]
  .sort((left: any, right: any) => Number(left.sort_order || 0) - Number(right.sort_order || 0)));
const sortedCatalogSeries = computed(() => seriesCatalog.value.records
  .filter((series: any) => series?.series_code || series?.slug)
  .sort((left: any, right: any) => Number(left.sort_order || 0) - Number(right.sort_order || 0)));
const unpublishedSeriesDraftSummary = computed(() => unpublishedSeriesSummary(seriesCatalog.value.unpublishedDrafts));
// In authenticated visual preview, the page draft is the source of truth for
// section copy and presentation. Public data remains the fallback outside the
// preview session, while claim-review sections are rendered by the sanitized
// preview record rather than being silently replaced by PSD copy.
const productPageRecord = computed(() => overlayRecord('pages', productPageResponse.value?.data || null));
const productPageSections = computed(() => Array.isArray(productPageRecord.value?.sections) ? productPageRecord.value.sections : []);
const productPageContent = computed(() => ({
  ...(productPageRecord.value && typeof productPageRecord.value === 'object' ? productPageRecord.value : {}),
  sections: productPageSections.value
}));
function productSection(ids: string | string[], fallback: Record<string, any>) {
  for (const id of (Array.isArray(ids) ? ids : [ids])) {
    if (productPageSections.value.some((item: any) => String(item?.id || item?.section_key || '') === id)) {
      // Draft claims remain hidden on the public site, but an authenticated
      // CMS preview must show the actual draft the editor is changing.
      return resolvePageSection(productPageContent.value, id, fallback, { allowClaimReview: Boolean(previewSession.value) });
    }
  }
  return { ...fallback };
}
const overviewCopy = computed(() => productSection(['hero', 'product-overview'], { title: 'Our product', kicker: '我们的产品', body: '' }));
const categoriesCopy = computed(() => productSection('categories', { kicker: '3大', title: '选择瑞钧理由' }));
const modelListCopy = computed(() => productSection('model-list', { title: '产品系列' }));
const parametersCopy = computed(() => productSection('parameters', { title: '技术参数' }));
const dimensionsCopy = computed(() => productSection('dimensions', { title: '尺寸与资料', body: '注：1.表中所述加工性能参数是在本公司指定条件（材料、加工条件、环境、测量参数）下进行的实验结果　2.某些功能配置需要选装' }));
const paginationCopy = computed(() => productSection('pagination', {
  title: '技术参数型号翻页',
  pagination: { page_size: 6, previous_label: '上一页', next_label: '下一页' }
}));
const resourcesCopy = computed(() => productSection('resources', { kicker: 'PRODUCT RESOURCES', title: '产品资料' }));
const casesCopy = computed(() => productSection('cases', { kicker: 'APPLICATION CASES', title: '应用案例' }));
const proofCopy = computed(() => {
  const fallbacks = [
    { title: '50%', body: '产品效率性能提升', value: 50, unit: '%' },
    { title: '30 YEARS', body: '30年技术沉淀，先进智造工厂', value: 30, unit: 'YEARS' },
    { title: 'Champion', body: '销量持续领先，品质始终如一' }
  ];
  return ['proof-efficiency', 'proof-years', 'proof-champion'].map((id, index) => {
    const fallback = fallbacks[index];
    const section = productSection(id, fallback);
      return {
        id,
        ...fallback,
        ...section
      };
  });
});
const proofDomReady = ref(false);
// The public page retains its entry animation. In the authenticated editor
// preview, a field change must be visible immediately instead of waiting for
// that animation to finish.
function syncPreviewProofNumbers(proofs = proofCopy.value) {
  if (typeof document === 'undefined') return;
  proofs.forEach((proof) => {
    if (!Number.isFinite(Number(proof.value))) return;
    const valueNode = document.querySelector<HTMLElement>(`[data-cms-preview-key="${proof.id}"] [data-proof-target]`);
    if (valueNode) valueNode.textContent = String(proof.value);
  });
}
watch([proofCopy, previewSession], ([proofs, session]) => {
  if (!session || !proofDomReady.value) return;
  nextTick(() => syncPreviewProofNumbers(proofs));
}, { deep: true, immediate: true });
const seriesNames = computed(() => new Map(previewSeries.value
  .filter((series) => series?.series_code)
  .map((series) => [String(series.series_code), normalizeModelLabel(series.name || series.series_code)])));

const fallbackProductCards = [
  { id: 'workstation', index: '01', category: '无人化加工', name: '灵动工作站', model: 'Smart workstation', image: '/assets/psd/product-workstation.png' },
  { id: 'auto', index: '02', category: '自动穿丝系列', name: 'FR-XS(auto)', model: 'Automatic threading', image: '/assets/psd/product-auto.png' },
  { id: 'pro', index: '03', category: '高速切割系列', name: 'FR-XS(pro)', model: 'High-speed cutting', image: '/assets/psd/product-pro.png' },
  { id: 'ft', index: '04', category: '一体机系列', name: 'FT-XS', model: 'Integrated series', image: '/assets/psd/product-ft-xs.png' },
  { id: 'fr-y', index: '05', category: '大摇摆系列', name: 'FR-Y', model: 'Large taper series', image: '/assets/psd/product-fr-y.png' },
  { id: 'fl', index: '06', category: '重大型系列', name: 'FL-XS', model: 'Heavy-duty series', image: '/assets/psd/product-fl-xs.png' }
];
const productCards = fallbackProductCards;
function fallbackProductCardForSeries(series: any, index: number) {
  const key = String(series?.slug || series?.series_code || '').trim().toLowerCase();
  const fallbackId = ({
    'fr-xs-auto': 'auto',
    'fr-pro': 'pro',
    'fr-xs-pro': 'pro',
    'ft-xs': 'ft',
    'fl-xs': 'fl'
  } as Record<string, string>)[key] || key;
  // Identity, never position: an unknown/new series must not inherit the photo
  // of whatever card happens to sit at the same index. FR-G previously showed
  // the FR-Y machine for exactly this reason. `index` is kept for callers and
  // future explicit mappings.
  void index;
  return fallbackProductCards.find((card) => card.id === fallbackId) || null;
}
const catalogCards = computed(() => {
  const cmsCards = sortedCatalogSeries.value.map((series: any, index: number) => ({
    id: String(series.slug || series.series_code),
    recordId: series.id != null ? String(series.id) : '',
    seriesCode: String(series.series_code || ''),
    index: String(index + 1).padStart(2, '0'),
    category: String(series.positioning || series.name || series.series_code),
    name: String(series.name || series.series_code),
    model: String(series.positioning || ''),
    image: String(series.cover_asset || fallbackProductCardForSeries(series, index)?.image || ''),
    capabilities: series.capabilities,
    status: String(series.status || ''),
    publicationState: String(series.publication_state || '')
  }));
  return cmsCards.length ? cmsCards : fallbackProductCards;
});
const catalogPageSize = computed(() => {
  const value = Number(paginationCopy.value?.pagination?.page_size);
  return Number.isInteger(value) ? Math.min(Math.max(value, 1), 6) : 6;
});const catalogPage = ref(1);
const catalogPageCount = computed(() => Math.max(1, Math.ceil(catalogCards.value.length / catalogPageSize.value)));
const visibleCatalogCards = computed(() => {
  const page = Math.min(Math.max(catalogPage.value, 1), catalogPageCount.value);
  const start = (page - 1) * catalogPageSize.value;
  return catalogCards.value.slice(start, start + catalogPageSize.value);
});
// Draft series render in the grid after the published cards (canvas only) with a
// 草稿 badge. They never change the page count or the numbering above, so the
// public catalog still matches exactly.
function sessionSeriesRecord(cardId: string) {
  const key = String(cardId || '');
  if (!key) return null;
  return recordsFor('product_series').find((series: any) => String(series?.slug || '') === key || String(series?.id || '') === key) || null;
}
const draftCatalogCards = computed(() => seriesDraftCards.value.map((draft: any) => {
  const cover = String(draft.cover_asset || '').trim();
  const image = /^(https?:)?\//.test(cover)
    ? cover
    : cover && previewSession.value ? `/api/preview/media/${encodeURIComponent(cover)}` : '';
  return {
    id: String(draft.slug || draft.series_code || draft.id),
    recordId: String(draft.id),
    name: String(draft.name || draft.series_code || '新系列'),
    positioning: String(draft.positioning || draft.series_code || '待填写'),
    // The pushed draft record may omit series_code; resolve it from the session so
    // the series' models are found (otherwise the card shows no chips).
    seriesCode: String(draft.series_code || sessionSeriesRecord(String(draft.slug || draft.id))?.series_code || ''),
    image
  };
}));
const visibleDraftCards = computed(() => (catalogPage.value === catalogPageCount.value ? draftCatalogCards.value : []));
function seriesCardValue(index: number, field: 'name' | 'positioning' | 'cover_asset' | 'series_code' | 'slug', fallback: string) {
  return normalizeModelLabel(sortedCatalogSeries.value[index]?.[field] || fallback);
}
function seriesCardPresentation(index: number) {
  const presentation = sortedCatalogSeries.value[index]?.presentation;
  return presentation && typeof presentation === 'object' && !Array.isArray(presentation) ? presentation : {};
}
function seriesCardItemId(index: number, _fallback: string) {
  return String(sortedCatalogSeries.value[index]?.id || '').trim();
}
// Published cards are read-only in the canvas. Showing the red × on them used
// to offer a confirm that called DELETE on live content (when the series had no
// models) or a misleading "还有机型" error (when it did).
function seriesCardCanDelete(index: number) {
  const series = sortedCatalogSeries.value[index];
  if (!series) return false;
  return ['draft', 'rejected', 'unpublished'].includes(String(series.status || ''))
    && String(series.publication_state || '') !== 'published';
}
const selectedCard = ref('auto');
const selectedModel = ref(normalizeModelLabel(product.value?.model_code || 'FR7055XS(pro)'));
const selectedReason = ref(0);
const drawingPage = ref(0);
const detailsOpen = ref(false);
let overviewEntryFrame = 0;
let productHashScrollFrame = 0;

const activeCard = computed(() => {
  const wanted = String(selectedCard.value || '');
  // The canvas may pass either the card slug or the record id for a draft card;
  // match both so the panel always follows the card that was clicked.
  return [...catalogCards.value, ...draftCatalogCards.value].find((card) => card.id === wanted || String((card as any).recordId || '') === wanted)
    || catalogCards.value[0];
});
// A direct /product/<slug> visit (or a card click that navigates there) should
// open that series instead of leaving the reader on the overview grid.
// Apply once per route slug: reading `selectedCard` here made the effect a
// dependency of its own assignment, so every canvas card switch was immediately
// forced back to the URL's series (and "＋新增机型" kept the old series code).
let lastRouteCardSlug = '';
watchEffect(() => {
  const key = slug.value.trim().toLowerCase();
  if (!key || key === lastRouteCardSlug) return;
  const index = catalogCards.value.findIndex((card) => String(card.id).toLowerCase() === key);
  if (index < 0) return;
  lastRouteCardSlug = key;
  const card = catalogCards.value[index];
  // Do not touch activeModelOptions here: it is declared further down and the
  // immediate run of this effect would hit its temporal dead zone.
  selectedCard.value = card.id;
  catalogPage.value = Math.floor(index / catalogPageSize.value) + 1;
  detailsOpen.value = true;
  // A direct series URL must highlight a real chip. `activeModelOptions` is
  // declared further down, so run after setup instead of touching it here
  // (the immediate run would hit its temporal dead zone).
  void nextTick(() => {
    if (!activeModelOptions.value.includes(selectedModel.value)) {
      selectedModel.value = activeModelOptions.value[0] || '';
    }
  });
});
// Map a chip label to its CMS record id so the workbench never guesses by name
// (a name-based lookup used to land on another family's model).
function modelRecordId(label: string): string {
  // Chips use the normalized display label ("FR500XS(auto)") while records keep
  // "FR500XS (Auto)" / "fr500xs-auto". Comparing raw strings left every chip
  // without a record id, so the workbench resolved it as a template name and
  // never opened the real model.
  const key = normalizeModelLabel(label).toLowerCase();
  if (!key) return '';
  const record = activeModels.value.find((item: any) =>
    normalizeModelLabel(item.name || item.model_code).toLowerCase() === key
    || normalizeModelLabel(item.model_code).toLowerCase() === key
  );
  return record?.id != null ? String(record.id) : '';
}
const activeSeriesCode = computed(() => {
  // The displayed card is the only source of truth. Deriving this from the page's
  // product or the preview target made a pushed model of another family leak its
  // series into the panel (every detail then rendered that family's fallback).
  const published = sortedCatalogSeries.value.find((series: any) => String(series.slug || series.series_code) === activeCard.value?.id);
  if (published) return String(published.series_code || published.slug || '');
  // Draft cards live outside the published list; their models must still reference
  // the series_code, never the slug.
  const card = activeCard.value as { isDraft?: boolean; seriesCode?: string; id?: string } | undefined;
  if (card?.seriesCode) return String(card.seriesCode);
  // The card id is a slug; resolve the real series_code from the pushed/session
  // series records so draft-series models are found.
  const cardId = String(card?.id || '');
  const sessionSeries = recordsFor('product_series').find((series: any) => String(series?.slug || '') === cardId || String(series?.series_code || '') === cardId);
  if (sessionSeries) return String(sessionSeries.series_code || sessionSeries.slug || cardId);
  return cardId;
});
const activeSeriesRecord = computed(() => sortedCatalogSeries.value.find((series: any) => String(series.slug || series.series_code) === activeCard.value?.id) || null);
// Series-level detail (`presentation.detail`) exists for solution-type series such
// as the workstation, which has no product model record of its own. It only
// becomes active once an editor materializes it in the CMS, so a site without
// that data keeps rendering the model configuration exactly as before.
const seriesDetail = computed(() => normalizeSeriesDetail(
  activeSeriesRecord.value?.presentation?.detail,
  // A canvas "＋" adds a blank row; keep it so the editor can fill it in. Public
  // payloads never contain blank rows (the reader drops them).
  { keepEmpty: Boolean(previewSession.value) }
));
const detailMode = computed<'series' | 'model'>(() => (seriesDetail.value ? 'series' : 'model'));
// True while the panel is still rendering the template fallback: there is no CMS
// record to write canvas edits to until the editor initializes the detail.
const detailHasCmsData = computed(() => Boolean(seriesDetail.value)
  || Boolean(String(displayConfig.value.intro?.title || '').trim())
  || (Array.isArray(displayConfig.value.features) && displayConfig.value.features.length > 0));
// The canvas always offers "＋/×"; the workbench resolves the owning record from
// the series code (it sees every model record, including unpublished ones this
// page cannot load), seeds the website original when needed, and reports why when
// nothing can be seeded.
// Parameter rows are records: only offer "＋" once the table is driven by them,
// otherwise a new record would replace the visible fallback table.
const specHasRecordRows = computed(() => parameterGroups.value.some((group) => (group.items || []).some((item: any) => item?.id)));
const seriesDetailCard = computed(() => ({ ...activeCard.value, id: activeSeriesCode.value || activeCard.value?.id }));
// Only an exact template match may be shown: the heuristic key maps unknown series
// to the pro family, which is why a brand-new card used to render FL390 copy.
const seriesDetailEntry = computed(() => productSeriesDetails[seriesDetailKeyExact(seriesDetailCard.value)] || null);
// Model chips may only come from an exact template table hit: the heuristic key
// maps an unknown series onto pro, which offered another family's models.
const seriesModelCodes = computed(() => {
  const key = seriesDetailKeyExact(seriesDetailCard.value);
  return key ? [...(productSeriesDetails[key]?.models || [])] : [];
});
// pro stays as the visual fallback, but its model list belongs to another
// family and must not be offered as chips for a series that has no template.
// A series without its own template must not borrow another family's fallback:
// that is what made every new card render the same FL390 photo and features.
const emptySeriesDetail = { intro: {}, machine: '', features: [] };
const activeSeriesDetail = computed(() => seriesDetailEntry.value || emptySeriesDetail);
const activeModels = computed(() => {
  const previewModel = product.value && String(product.value.series_code || '') === activeSeriesCode.value ? product.value : null;
  // A canvas edit can push a model record that is still a draft (not in the public
  // list); without it the panel keeps rendering the template fallback and every
  // add/delete would look ignored.
  const sessionModels = recordsFor('product_models').filter((model: any) => {
    // Only records of the displayed series belong to this panel; matching the card
    // id as well let another family's models leak in.
    return String(model?.series_code || '') === activeSeriesCode.value;
  });
  const publishedModels = publicModels.value.filter((model) => String(model.series_code || '') === activeSeriesCode.value);
  // `fr400xs-auto` and `FR400XS(auto)` are the same machine written two ways, so
  // compare the base code; that lets a record hide its template twin while the
  // series' other template models stay listed.
  const modelKey = (model: any) => {
    const code = String(model?.model_code || model?.name || '').trim().toLowerCase()
      .replace(/\((auto|pro)\)$/i, '')
      .replace(/[\s-]?(auto|pro)$/i, '');
    return code || `id:${String(model?.id || '')}`;
  };
  const seen = new Set<string>();
  const realModels = [...(previewModel ? [previewModel] : []), ...sessionModels, ...publishedModels].filter((model) => {
    const key = modelKey(model);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  // Once a series has real records, they are the only chips: appending the
  // legacy template list added unpublished names with no parameters and put
  // FR400XS after FR8055. The template table remains the fallback for a series
  // that has no records yet (e.g. FL-XS before its models are published).
  const templateModels = seriesModelCodes.value
    .map((model_code) => ({ model_code, name: model_code }))
    .filter((model) => !seen.has(modelKey(model)));
  return realModels.length ? realModels : templateModels;
});
// The visible chip follows the record name ("FR7055XS (Auto)"), not the
// transport code ("fr7055xs-auto"). Template models have no name, so their
// code is already the human-readable label.
const activeModelOptions = computed(() => activeModels.value.map((model) => normalizeModelLabel(model.name || model.model_code || '')));
const selectedModelRecord = computed(() => {
  // The chip label comes from `model_code || name`, so match on the same source;
  // otherwise a label that only matched a template fallback used to fall through
  // to "the first record-backed model", and every chip then bound its images to
  // that one record (replacing an image changed every model in the panel).
  const wanted = String(selectedModel.value || '');
  const byLabel = activeModels.value.find((model) => normalizeModelLabel((model as any).name || model.model_code || '') === wanted)
    || activeModels.value.find((model) => String((model as any).model_code || '').toLowerCase() === wanted.toLowerCase());
  if (byLabel) return byLabel as any;
  // A template-only chip is a real, selectable name without a CMS record. Do not
  // borrow another model's record: that made FL400XS show FR7055XS parameters.
  // Only an unknown/stale label may fall back to a record-backed model.
  if (wanted && activeModelOptions.value.includes(wanted)) return null;
  // Nothing matched at all (e.g. a pushed record appeared after a switch): fall
  // back to a record-backed model of THIS series so the panel still has an owner.
  const recordBacked = activeModels.value.find((model: any) => model?.id != null && String(model.series_code || '') === activeSeriesCode.value);
  // Never fall back to the session's product when it belongs to another series:
  // that made every card whose series had no records render the same model.
  return recordBacked || activeModels.value[0] || null;
});
// The workbench can switch the canvas card without a card click (new card or
// left-list selection). Keep a valid model chip selected for the new series;
// otherwise the panel kept the previous series' model and a new model inherited
// the wrong context.
watch([activeSeriesCode, activeModelOptions], () => {
  if (selectedModel.value && activeModelOptions.value.includes(selectedModel.value)) return;
  selectedModel.value = activeModelOptions.value[0] || '';
  drawingPage.value = 0;
});
// Rebuild the detail panel when the displayed model changes: canvas decorations
// are written onto DOM nodes, and reusing a node across two models would leave
// the previous model's record id on it.
const detailsRecordKey = computed(() => `product-details-${boundProductRecord()?.id ?? 'fallback'}`);
function jsonObject(value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string') return {};
  try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; }
}
const displayConfig = computed(() => jsonObject(selectedModelRecord.value?.configuration));
const displayLabels = computed(() => jsonObject(displayConfig.value.labels));
const activeIntro = computed(() => {
  if (seriesDetail.value?.intro) return { title: '', subtitle: '', scene: '', body: '', ...seriesDetail.value.intro };
  const fallback = activeSeriesDetail.value.intro || {};
  const source = displayConfig.value.intro && typeof displayConfig.value.intro === 'object' ? displayConfig.value.intro : {};
  const hasFallbackCopy = Object.values(fallback).some((value) => String(value || '').trim());
  const hasRecordCopy = Object.values(source).some((value) => String(value || '').trim());
  // An empty series template is still an object (`{}`), which used to count as
  // "has intro" and rendered blank "适应场景 / 工作站设备组成" headings for any
  // series without a template (e.g. FR-G).
  if (!hasFallbackCopy && !hasRecordCopy) return null;
  return { ...(fallback || { title: '', subtitle: '', scene: '', body: '' }), ...Object.fromEntries(Object.entries(source).filter(([, value]) => String(value || '').trim())) };
});
const displayName = computed(() => normalizeModelLabel(selectedModelRecord.value?.name || selectedModel.value || activeCard.value?.name));
const displayModel = computed(() => normalizeModelLabel(selectedModelRecord.value?.model_code || selectedModel.value));
// The public reader intentionally strips `machine_asset_id` and also bakes the
// legacy PSD path into `machineImage`. In an authorized preview the raw draft
// record wins, so `machineImage` can still point at a stale static file after
// the operator binds a managed asset. Prefer the managed slot in that case and
// serve it through the token-authorized preview endpoint.
const managedMachineAssetId = computed(() => {
  const assetId = displayConfig.value.machine_asset_id;
  return assetId == null ? '' : String(assetId).trim();
});
const hasManagedMachineAsset = computed(() => managedMachineAssetId.value !== '');
// Series-level machine photo: the draft stores a governed asset id, the public
// payload carries the resolved path. The canvas resolves the id itself because
// the preview media endpoint is token-authorized.
const seriesMachineImage = computed(() => {
  const detail = seriesDetail.value;
  if (!detail) return '';
  const assetId = String(detail.machine_asset_id || '').trim();
  if (assetId && previewSession.value) return `/api/preview/media/${encodeURIComponent(assetId)}`;
  return String(detail.machine_image || '').trim();
});
const displayImage = computed(() => {
  if (detailMode.value === 'series') return seriesMachineImage.value || activeSeriesDetail.value.machine;
  if (hasManagedMachineAsset.value) return `/api/preview/media/${encodeURIComponent(managedMachineAssetId.value)}`;
  return displayConfig.value.machineImage || selectedModelRecord.value?.media?.[0]?.path || activeSeriesDetail.value.machine;
});
const displayImageAlt = computed(() => !displayImage.value
  ? '设备图片准备中'
  : (selectedModelRecord.value?.media?.[0]?.alt || `${displayName.value} 机床设备`));
// A managed asset is served through the authorized preview proxy. When that
// proxy fails (expired grant, storage hiccup, revoked file) the browser fires
// `error` and the slot used to stay blank. Fall back to the static website
// original and, in preview only, say why the selected photo is not shown.
const machineImageFailed = ref(false);
const machineImageFallback = computed(() => String(
  displayConfig.value.machineImage
  || selectedModelRecord.value?.media?.[0]?.path
  || activeSeriesDetail.value.machine
  || '/assets/psd/product-cover-placeholder.png'
));
const machineImageSrc = computed(() => (machineImageFailed.value ? machineImageFallback.value : displayImage.value) || '/assets/psd/product-cover-placeholder.png');
watch(displayImage, () => { machineImageFailed.value = false; });
function handleMachineImageError() {
  machineImageFailed.value = true;
}
const displayImageFieldPath = computed(() => {
  if (hasManagedMachineAsset.value) return 'configuration.machine_asset_id';
  // A model whose image comes from the generic media array keeps that binding.
  if (selectedModelRecord.value?.media?.[0]?.path && selectedModelRecord.value.media[0].path === displayImage.value) return 'media.0';
  // Otherwise still expose the dedicated machine slot. Returning '' here made
  // the canvas report the machine image as an uneditable static asset, so an
  // operator could not even bind one; binding it simply takes precedence over
  // the static fallback.
  return 'configuration.machine_asset_id';
});
const featureReasons = computed(() => {
  if (seriesDetail.value?.features?.length) return seriesDetail.value.features;
  return Array.isArray(displayConfig.value.features) && displayConfig.value.features.length ? displayConfig.value.features : activeSeriesDetail.value.features;
});
// The canvas "＋ / ×" buttons must name the same array the panel renders from.
const featureListPath = computed(() => (detailMode.value === 'series' ? 'detail.features' : 'configuration.features'));
// Spec rows that only exist as the website original bind to the model draft's own
// array (configuration.parameters.<n>), so they stay editable without creating
// product_parameters records.
const parameterRowsJson = computed(() => JSON.stringify(parameterGroups.value.flatMap((group: any) => (group.items || []).map((item: any) => ({
  field_name: String(item.label || ''),
  value: item.value == null ? '' : String(item.value),
  unit: String(item.unit || '')
})))));
function parameterRowOwner(): { collection: string; itemId: string; prefix: string } {
  const owner = detailOwner();
  if (owner.mode === 'model' && owner.itemId) {
    return { collection: 'product_models', itemId: owner.itemId, prefix: 'configuration.parameters' };
  }
  const seriesId = detailSeriesRecordId();
  // A template-only model has no record of its own; the series keeps the table.
  if (seriesId) return { collection: 'product_series', itemId: seriesId, prefix: 'presentation.parameters' };
  return { collection: '', itemId: '', prefix: '' };
}
function parameterRowOwnerId(): string {
  return parameterRowOwner().itemId;
}
function parameterRowCollection(): string | undefined {
  return parameterRowOwner().collection || undefined;
}
function parameterRowPath(groupIndex: number, rowIndex: number, field: 'field_name' | 'value' | 'unit'): string {
  const owner = parameterRowOwner();
  if (!owner.itemId) return '';
  let offset = 0;
  for (let index = 0; index < groupIndex; index += 1) offset += parameterGroups.value[index]?.items?.length || 0;
  return `${owner.prefix}.${offset + rowIndex}.${field}`;
}
function featurePresentationPath(index: number, field: 'label' | 'detail' | 'note' | 'image') {
  return `features_${index}_${field}`;
}
// The old PSD table was FR7055XS copy and was used for every model that had no
// published parameters, so an FL-XS page could show "机床型号 FR7055XS". Keep
// only the label mapping now: missing data is shown as missing, never as
// another machine's specification sheet.
const parameterLabels: Record<string, string> = {
  xyTravelMm: '工作台行程（X×Y）',
  zAxisTravelMm: 'Z 轴行程',
  maxWorkpieceMm: '最大工件尺寸',
  maxWorkpieceWeightKg: '最大工件重量',
  maxCuttingHeightMm: '最大切割高度',
  maxTaperDegrees: '最大锥度',
  machineDimensionsMm: '机床外形尺寸',
  machineWeightKg: '机床重量'
};
function parameterDisplayLabel(key: string) {
  return parameterLabels[key] || key;
}
const specificationRows = computed<Array<[string, string]>>(() => {
  const current = selectedModelRecord.value;
  const entries = current?.parameters && typeof current.parameters === 'object' ? Object.entries(current.parameters) : [];
  const parameterUnits = current?.parameter_units && typeof current.parameter_units === 'object' ? current.parameter_units : {};
  const configured = Array.isArray(displayConfig.value.parameters) ? displayConfig.value.parameters.flatMap((row: any) => {
    if (!row || typeof row !== 'object' || !String(row.label || row.name || '').trim()) return [];
    const value = [formatProductParameterValue(row.value), formatProductParameterValue(row.unit)].filter(Boolean).join(' ');
    return value ? [[String(row.label || row.name), value] as [string, string]] : [];
  }) : [];
  const normalizedEntries = entries.flatMap(([key, value]) => {
    const displayValue = [formatProductParameterValue(value), formatProductParameterValue(parameterUnits[key])].filter(Boolean).join(' ');
    return displayValue ? [[parameterDisplayLabel(key), displayValue] as [string, string]] : [];
  });
  const rows = configured.length ? configured : normalizedEntries;
  // A parameter row selected in the canvas keeps its live value without
  // replacing the rest of the table with static copy.
  const parameter = recordFor('product_parameters');
  if (!parameter || String(parameter.model_code || '') !== displayModel.value) return rows;
  const targetLabel = parameterDisplayLabel(String(parameter.field_name || ''));
  return rows.map(([label, value]) => label === targetLabel
    ? [label, [formatProductParameterValue(parameter.value), formatProductParameterValue(parameter.unit)].filter(Boolean).join(' ')] as [string, string]
    : [label, value] as [string, string]);
});
const parameterGroups = computed(() => {
  const previewItems = groupPreviewProductParameters(recordsFor('product_parameters'), displayModel.value)
    .flatMap((group: any) => group.items || []);
  const groups = selectedModelRecord.value?.parameter_groups;
  let baseGroups: Array<{ name: string; items: any[] }> = Array.isArray(groups) && groups.length
    ? normalizePreviewParameterGroups(groups)
    : [];
  if (!baseGroups.length) {
    // A series-level table edited from the canvas (presentation.parameters) wins over
    // the static copy so the edits are visible before a reload.
    const seriesRows = (activeSeriesRecord.value as any)?.presentation?.parameters
      || (activeCard.value as any)?.presentation?.parameters;
    if (Array.isArray(seriesRows) && seriesRows.length) {
      baseGroups = [{ name: '', items: seriesRows.map((row: any) => ({ id: '', label: String(row.field_name || ''), value: row.value == null ? '' : String(row.value), unit: String(row.unit || '') })) }];
    } else if (specificationRows.value.length) {
      baseGroups = [{ name: '', items: specificationRows.value.map(([label, value]) => ({ id: '', label, value })) }];
    }
  }
  if (!previewItems.length) return baseGroups;
  // Draft rows used to replace the whole published table, so adding one
  // parameter made every other row disappear from the live preview. Merge the
  // saved drafts over the published rows instead.
  return [{ name: '', items: mergePreviewParameterRows(baseGroups.flatMap((group: any) => group.items || []), previewItems) }];
});
const drawingPages = computed(() => {
  const drawings = displayConfig.value.drawings;
  if (!Array.isArray(drawings)) return [];
  return drawings.flatMap((drawing: any, index: number) => {
    if (typeof drawing === 'string') return [{ image: drawing, title: `VIEW ${index + 1}`, caption: '', sourceIndex: index }];
    if (!drawing || typeof drawing !== 'object' || !String(drawing.image || drawing.path || '').trim()) return [];
    return [{ image: String(drawing.image || drawing.path), title: String(drawing.title || drawing.label || `VIEW ${index + 1}`), caption: String(drawing.caption || drawing.description || ''), sourceIndex: index }];
  });
});
const visibleSpecificationRows = computed(() => specificationRows.value);
const drawingPageCount = computed(() => Math.max(1, drawingPages.value.length));
const activeDrawing = computed(() => drawingPages.value[Math.min(drawingPage.value, drawingPages.value.length - 1)] || null);
const resources = computed(() => product.value?.resources || []);
const caseStudies = computed(() => product.value?.case_studies || []);

function openProduct(id: string) {
  // Draft cards are opened by slug or record id; resolve the real card id first.
  const draft = draftCatalogCards.value.find((card) => card.id === id || String(card.recordId) === String(id));
  const cardId = draft ? draft.id : id;
  const index = catalogCards.value.findIndex((card) => card.id === cardId);
  if (index >= 0) catalogPage.value = Math.floor(index / catalogPageSize.value) + 1;
  selectedCard.value = cardId;
  selectedModel.value = activeModelOptions.value[0] || '';
  selectedReason.value = 0;
  drawingPage.value = 0;
  detailsOpen.value = true;
}

function chooseModel(model: string) {
  selectedModel.value = model;
  drawingPage.value = 0;
}

function changeDrawingPage(offset: number) {
  drawingPage.value = Math.min(Math.max(drawingPage.value + offset, 0), drawingPageCount.value - 1);
}

function closeProduct() {
  detailsOpen.value = false;
}

function changeCatalogPage(offset: number) {
  catalogPage.value = Math.min(Math.max(catalogPage.value + offset, 1), catalogPageCount.value);
  nextTick(() => document.querySelector<HTMLElement>('.catalog-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function scrollToDetails() {
  nextTick(() => document.querySelector<HTMLElement>('.product-series-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function openHashProduct() {
  const target = String(route.hash || '').replace(/^#/, '');
  if (!productCards.some((card) => card.id === target) && !catalogCards.value.some((card) => card.id === target)) return;
  openProduct(target);
  nextTick(() => {
    cancelAnimationFrame(productHashScrollFrame);
    const scrollToTarget = () => {
      const targetElement = document.getElementById(target);
      if (!targetElement) return;
      targetElement.scrollIntoView({ behavior: 'auto', block: 'center' });
    };
    productHashScrollFrame = requestAnimationFrame(() => {
      productHashScrollFrame = requestAnimationFrame(() => {
        scrollToTarget();
      });
    });
  });
}

// Inside the CMS canvas a click must open the detail panel and bring it into
// view: the panel renders below the grid, so without scrolling the editor sees
// nothing happen.
let lastSeriesOpenId = '';
let lastSeriesOpenAt = 0;
function openSeriesDetails(id: string) {
  // The canvas dispatches the page action and the button's own click handler:
  // both run for one click, which used to send duplicate series-select /
  // request-series-models messages and scroll twice.
  const now = Date.now();
  if (lastSeriesOpenId === id && now - lastSeriesOpenAt < 200) return;
  lastSeriesOpenId = id;
  lastSeriesOpenAt = now;
  const cardSeriesCode = (catalogCards.value.find((card) => card.id === id) as any)?.seriesCode
    || (draftCatalogCards.value.find((card) => card.id === id) as any)?.seriesCode
    || '';
  notifySeriesSelection(id);
  requestSeriesModels(String(cardSeriesCode || ''));
  openProduct(id);
  scrollToDetails();
}

// Tell the workbench which series card was opened. Without this the left form
// stayed on whatever series the page-level canvas started with, so the next
// model chip had to cross series and re-targeted (reloaded) the iframe.
function notifySeriesSelection(id: string) {
  if (!previewSession.value) return;
  const card = catalogCards.value.find((item) => item.id === id) || draftCatalogCards.value.find((item) => item.id === id);
  const recordId = String((card as any)?.recordId || '');
  if (!recordId) return;
  window.parent?.postMessage({
    type: CMS_LIVE_PREVIEW_SERIES_SELECT,
    collection: 'product_series',
    seriesRecordId: recordId
  }, '*');
}

// Inside the CMS canvas the card must not navigate: a route change drops
// ?cmsPreview=1 and with it the draft session, leaving a plain page that cannot
// be edited. This also covers a frame whose session already lapsed, so a click
// can never strand the operator on /product/<slug>.
// Draft cards are canvas-only; clicking one opens its detail panel in place.
// Draft series are not server-rendered, so their models are missing until the
// workbench pushes them; ask for them when the card opens.
function requestSeriesModels(seriesCodeOverride?: string) {
  if (!previewSession.value) return;
  const seriesCode = String(seriesCodeOverride || activeSeriesCode.value || '').trim();
  if (!seriesCode) return;
  window.parent?.postMessage({
    type: CMS_LIVE_PREVIEW_REQUEST_SERIES_MODELS,
    collection: 'product_series',
    itemId: String(detailSeriesRecordId() || ''),
    seriesCode
  }, '*');
}

function handleDraftCardClick(event: MouseEvent, id: string) {
  event.preventDefault();
  openSeriesDetails(id);
}

function handleCatalogCardClick(event: MouseEvent, id: string) {
  if (!previewSession.value && !insidePreviewFrame()) return;
  event.preventDefault();
  openSeriesDetails(id);
}

// Canvas affordances rendered by this page (see data-cms-preview-page-action)
// are handed back here by the preview runtime instead of being treated as field
// selections.
function applyCanvasPageAction(event: Event) {
  const detail = (event as CustomEvent)?.detail as { action?: string; dataset?: Record<string, string> } | undefined;
  if (!detail?.action) return;
  if (detail.action === 'open-product-series') openSeriesDetails(String(detail.dataset?.cmsSeriesId || ''));
  else if (detail.action === 'select-product-model') chooseModel(String(detail.dataset?.cmsModel || ''));
}

function onDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeProduct();
}

onMounted(() => {
  window.addEventListener('keydown', onDialogKeydown);
  window.addEventListener(CMS_LIVE_PREVIEW_PAGE_ACTION, applyCanvasPageAction);
  window.addEventListener('message', handleCanvasNotice);
});
onBeforeUnmount(() => {
  window.removeEventListener(CMS_LIVE_PREVIEW_PAGE_ACTION, applyCanvasPageAction);
  window.removeEventListener('message', handleCanvasNotice);
  window.clearTimeout(seriesNoticeTimer);
});
// Opening the detail panel or switching the displayed model replaces DOM nodes
// without an update message from the workbench, so re-decorate after the render
// or the new fields stay inert until the next sync.
watch([detailsOpen, selectedModel, catalogPage], () => { void refreshVisualDecorations(); }, { flush: 'post' });
function syncPreviewProductSelection() {
  const selection = resolvePreviewProductSelection(previewSession.value, catalogCards.value, sortedCatalogSeries.value);
  if (!selection) return;
  detailsOpen.value = true;
  if (selection.selectedCard) selectedCard.value = selection.selectedCard;
  const activePreviewModel = previewSession.value?.collection === 'product_models' ? product.value?.model_code : '';
  if (activePreviewModel || selection.selectedModel) selectedModel.value = normalizeModelLabel(activePreviewModel || selection.selectedModel);
  // A model canvas opens the detail record, not the page hero. Without this the
  // panel renders ~1050px below the frame top and the editor sees only the
  // product grid (the canvas looks like it ignored the selection).
  if (previewSession.value?.collection === 'product_models') void nextTick(scrollToDetails);
}
watch(
  () => [
    previewSession.value?.collection || '',
    previewSession.value?.itemId || '',
    previewSession.value?.preview?.series_code || '',
    previewSession.value?.preview?.model_code || '',
    product.value?.series_code || '',
    product.value?.model_code || '',
    catalogCards.value.map((card) => card.id).join('|'),
    sortedCatalogSeries.value.map((series: any) => `${series?.slug || ''}:${series?.series_code || ''}`).join('|')
  ],
  syncPreviewProductSelection,
  { immediate: true }
);
onMounted(() => {
  proofDomReady.value = true;
  openHashProduct();
  const overview = document.querySelector<HTMLElement>('.product-overview');
  overviewEntryFrame = requestAnimationFrame(() => {
    overviewEntryFrame = requestAnimationFrame(() => overview?.classList.add('is-entered'));
  });
  // The server already renders the published number. Never reset it to 0 just
  // to replay a count-up: a slow or failed script used to leave "0 %" and
  // "0 YEARS" next to copy claiming 50% and 30 years. The canvas still syncs
  // edits immediately through syncPreviewProofNumbers.
  syncPreviewProofNumbers();
});
watch(() => route.hash, () => nextTick(openHashProduct));
watch(drawingPageCount, (count) => {
  if (drawingPage.value >= count) drawingPage.value = Math.max(0, count - 1);
});
watch(catalogPageCount, (count) => {
  if (catalogPage.value > count) catalogPage.value = count;
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onDialogKeydown);
  cancelAnimationFrame(overviewEntryFrame);
  cancelAnimationFrame(productHashScrollFrame);
});
// A series URL must name the series, not whichever model happens to be selected
// in the panel (the browser tab used to read "FR7055XS(auto) 产品详情" for
// /product/fr-xs-auto).
const seoDisplayName = computed(() => routeSeriesExists.value ? (activeCard.value?.name || displayName.value) : displayName.value);
useSeoMeta({
  title: () => slug.value ? `${seoDisplayName.value} 产品详情` : '产品中心',
  description: () => slug.value
    ? (routeSeriesExists.value ? `${seoDisplayName.value}系列的产品配置、特点与公开技术参数。` : `${seoDisplayName.value} 的产品配置、特点与公开技术参数。`)
    : '瑞钧智科中走丝线切割机床产品中心、设备特点与技术参数。'
});
</script>

<template>
  <main class="product-detail-page">
    <p v-if="seriesNotice" class="cms-canvas-toast" role="status">{{ seriesNotice }}（在下方「草稿卡片」区，发布后进入上方网格）</p>
    <p v-if="previewSessionLost" class="cms-session-lost" role="alert">预览会话已失效，画布暂时回到普通页面（所以看不到「详情 / ＋ / ×」）。页面会自动重连；若一直停在这里，请点右上角 ↻ 重新连接。</p>
    <SiteHeader />

    <section class="product-overview" v-bind="sectionPresentationAttributes(overviewCopy)" data-cms-preview-key="hero" aria-labelledby="product-overview-title">
      <div class="overview-heading cms-positioned">
        <h1 id="product-overview-title" class="cms-styled-text"><span v-if="slug" class="sr-only">{{ seoDisplayName }}</span><span v-bind="fieldPresentationAttributes(overviewCopy, 'title')" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ overviewCopy.title }}</span> <span v-bind="fieldPresentationAttributes(overviewCopy, 'kicker')" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation.kicker">{{ overviewCopy.kicker }}</span></h1>
      </div>
      <div class="overview-kicker cms-positioned" v-bind="sectionPresentationAttributes(categoriesCopy)" data-cms-preview-key="categories" aria-hidden="true"><b v-bind="fieldPresentationAttributes(categoriesCopy, 'kicker')" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation.kicker">{{ categoriesCopy.kicker || '3大' }}</b><span class="cms-styled-text" v-bind="fieldPresentationAttributes(categoriesCopy, 'title')" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ categoriesCopy.title }}</span></div>
      <div class="proof-grid">
        <article v-for="proof in proofCopy" :key="proof.id" class="cms-positioned" v-bind="sectionPresentationAttributes(proof)" :data-cms-preview-key="proof.id">
          <strong v-if="proof.value" class="cms-styled-text"><span :data-proof-target="proof.value" :data-cms-preview-field-path="proof.value ? 'value' : 'title'">{{ proof.value }}</span><em :data-cms-preview-field-path="proof.value ? 'unit' : 'body'">{{ proof.unit }}</em></strong>
          <strong v-else class="cms-styled-text" data-cms-preview-field-path="title">{{ proof.title }}</strong>
          <span class="cms-styled-text" data-cms-preview-field-path="body">{{ proof.body }}</span>
        </article>
      </div>
    </section>

    <section class="catalog-section" v-bind="sectionPresentationAttributes(modelListCopy)" data-cms-preview-key="model-list" aria-labelledby="catalog-title">
      <h2 id="catalog-title" class="sr-only">{{ modelListCopy.title }}</h2>
      <p v-if="previewSession && unpublishedSeriesDraftSummary.count" class="catalog-draft-note" data-cms-preview-draft-note>未发布草稿：{{ unpublishedSeriesDraftSummary.text }} 不显示在官网，也不计入编号与分页；发布后会出现在这里。</p>
      <div class="product-grid cms-positioned" :class="{ 'has-selection': detailsOpen }">
        <div v-for="(family, pageIndex) in visibleCatalogCards" :key="family.id" class="product-card-wrap" data-cms-preview-collection="product_series" :data-cms-preview-item-id="seriesCardItemId((catalogPage - 1) * catalogPageSize + pageIndex, family.id)" :data-cms-preview-key="seriesCardItemId((catalogPage - 1) * catalogPageSize + pageIndex, family.id) ? seriesCardValue((catalogPage - 1) * catalogPageSize + pageIndex, 'series_code', seriesCardValue((catalogPage - 1) * catalogPageSize + pageIndex, 'slug', family.id)) : undefined">
          <button v-if="previewSession && seriesCardItemId((catalogPage - 1) * catalogPageSize + pageIndex, family.id)" type="button" class="cms-card-remove" :class="{ 'is-disabled': !seriesCardCanDelete((catalogPage - 1) * catalogPageSize + pageIndex) }" :disabled="!seriesCardCanDelete((catalogPage - 1) * catalogPageSize + pageIndex)" :title="seriesCardCanDelete((catalogPage - 1) * catalogPageSize + pageIndex) ? '删除卡片' : '已发布系列不能直接删除；请先在发布队列下线并退回草稿'" :data-cms-preview-action="seriesCardCanDelete((catalogPage - 1) * catalogPageSize + pageIndex) ? 'series-remove' : undefined" :data-cms-series-record-id="seriesCardItemId((catalogPage - 1) * catalogPageSize + pageIndex, family.id)" :aria-label="`${seriesCardCanDelete((catalogPage - 1) * catalogPageSize + pageIndex) ? '删除' : '已发布，不能删除'} ${family.name} 卡片`">×</button>
          <NuxtLink :id="family.id" :to="`/product/${encodeURIComponent(family.id)}`" class="product-card" :class="{ 'is-selected': detailsOpen && selectedCard === family.id }" :aria-expanded="detailsOpen && selectedCard === family.id" data-cms-preview-field-path="name" @click="handleCatalogCardClick($event, family.id)">
          <img :src="seriesCardValue((catalogPage - 1) * catalogPageSize + pageIndex, 'cover_asset', family.image) || '/assets/psd/product-cover-placeholder.png'" data-cms-preview-field-path="cover_asset" data-cms-preview-placement-key="product.series.cover" data-cms-preview-media-role="cover" :alt="`${seriesCardValue((catalogPage - 1) * catalogPageSize + pageIndex, 'name', family.name)} 产品图`">
          <span class="product-copy"><span class="product-kicker" v-bind="fieldPresentationAttributes(seriesCardPresentation((catalogPage - 1) * catalogPageSize + pageIndex), 'positioning')" data-cms-preview-field-path="positioning" data-cms-preview-position-field-path="presentation.field_presentation.positioning">{{ family.index.replace(/^0/, '') }}/{{ seriesCardValue((catalogPage - 1) * catalogPageSize + pageIndex, 'positioning', family.category) }}</span><span class="product-name" v-bind="fieldPresentationAttributes(seriesCardPresentation((catalogPage - 1) * catalogPageSize + pageIndex), 'name')" data-cms-preview-field-path="name" data-cms-preview-position-field-path="presentation.field_presentation.name">{{ seriesCardValue((catalogPage - 1) * catalogPageSize + pageIndex, 'name', family.name) }}</span></span>
          </NuxtLink>
          <button v-if="previewSession" type="button" class="series-detail-action" data-cms-preview-page-action="open-product-series" :data-cms-series-id="family.id" :aria-label="`打开 ${family.name} 详情`" @click.stop="openSeriesDetails(family.id)">详情</button>
          <button v-if="detailsOpen && selectedCard === family.id" class="details-jump" type="button" aria-label="向下查看系列详情" @click="scrollToDetails">&#8595;</button>
        </div>
        <!-- With five published series the 3-column grid used to leave an empty
             cell. Fill it with a conversion card instead of a hole. Hidden in the
             canvas: it is not editable and would navigate the preview away. -->
        <NuxtLink v-if="!previewSession && catalogPage === catalogPageCount && visibleCatalogCards.length % 3 !== 0" to="/contact" class="catalog-cta-card">
          <span class="catalog-cta-kicker">SELECTION SUPPORT</span>
          <strong>没有找到合适机型？</strong>
          <span>告诉我们加工材料、行程和精度要求，工程师协助选型。</span>
          <b>获取选型建议 →</b>
        </NuxtLink>
        <div v-for="draft in visibleDraftCards" :key="draft.id" class="product-card-wrap is-draft" data-cms-preview-collection="product_series" :data-cms-preview-item-id="draft.recordId">
          <button type="button" class="cms-card-remove" data-cms-preview-action="series-remove" :data-cms-series-record-id="draft.recordId" :aria-label="`删除 ${draft.name} 卡片`">×</button>
          <div class="product-card" :class="{ 'is-selected': detailsOpen && selectedCard === draft.id }" :aria-expanded="detailsOpen && selectedCard === draft.id" @click="handleDraftCardClick($event, draft.id)">
            <img v-if="draft.image" :src="draft.image" :alt="`${draft.name} 产品图`" data-cms-preview-editable="true" data-cms-preview-field-path="cover_asset" data-cms-preview-collection="product_series" :data-cms-preview-item-id="draft.recordId" data-cms-preview-placement-key="product.series.cover" data-cms-preview-media-role="cover">
            <img v-else src="/assets/psd/product-dimensions.png" alt="设置封面" class="cms-draft-cover-empty" data-cms-preview-editable="true" data-cms-preview-field-path="cover_asset" data-cms-preview-collection="product_series" :data-cms-preview-item-id="draft.recordId" data-cms-preview-placement-key="product.series.cover" data-cms-preview-media-role="cover">
            <span class="product-copy">
              <span class="product-kicker" data-cms-preview-editable="true" data-cms-preview-field-path="positioning" data-cms-preview-collection="product_series" :data-cms-preview-item-id="draft.recordId">草稿 · {{ draft.positioning }}</span>
              <span class="product-name" data-cms-preview-editable="true" data-cms-preview-field-path="name" data-cms-preview-collection="product_series" :data-cms-preview-item-id="draft.recordId">{{ draft.name }}</span>
            </span>
          </div>
          <!-- A draft card is opened through the workbench (canvas actions are the only ones the runtime reliably forwards inside the draw): the left panel switches to this series and its models get pushed back. -->
          <button v-if="previewSession" type="button" class="series-detail-action" data-cms-preview-page-action="open-product-series" :data-cms-series-id="draft.id" :data-cms-series-record-id="String(draft.recordId)" :aria-label="`打开 ${draft.name} 详情`" @click.stop="openSeriesDetails(draft.id)">详情</button>
        </div>
      </div>
      <div v-if="previewSession" class="cms-series-actions">
        <button type="button" class="cms-series-add" data-cms-preview-action="series-add" aria-label="新增产品系列卡片">＋ 新增系列卡片</button>
      </div>
      <section v-if="previewSession && seriesDraftCards.length" class="cms-draft-cards" aria-label="草稿卡片">
        <p class="cms-draft-cards-title">草稿卡片（仅画布可见，发布后才进入上方网格与分页）</p>
        <ul class="cms-draft-cards-list">
          <li v-for="draft in seriesDraftCards" :key="draft.id" class="cms-draft-card" :class="{ 'is-new': String(draft.id) === highlightedDraftId }">
            <span class="cms-draft-badge">草稿</span>
            <button type="button" class="cms-draft-name" data-cms-preview-action="series-select" :data-cms-series-record-id="String(draft.id)" :title="`编辑草稿卡片 ${draft.name || draft.series_code}`">{{ draft.name || draft.series_code }}</button>
            <span class="cms-draft-code">{{ draft.series_code }}</span>
            <button type="button" class="cms-draft-remove" data-cms-preview-action="series-remove" :data-cms-series-record-id="String(draft.id)" :aria-label="`删除 ${draft.name || draft.series_code} 卡片`">×</button>
          </li>
        </ul>
      </section>
      <nav v-if="catalogPageCount > 1" class="catalog-pager" :aria-label="paginationCopy.title" data-cms-preview-key="pagination">
          <button type="button" :disabled="catalogPage === 1" data-cms-preview-field-path="pagination.previous_label" @click="changeCatalogPage(-1)">{{ paginationCopy.pagination?.previous_label || '上一页' }}</button>
        <span>第 {{ catalogPage }} / {{ catalogPageCount }} 页</span>
          <button type="button" :disabled="catalogPage === catalogPageCount" data-cms-preview-field-path="pagination.next_label" @click="changeCatalogPage(1)">{{ paginationCopy.pagination?.next_label || '下一页' }}</button>
      </nav>
      <section v-if="detailsOpen" :key="detailsRecordKey" id="product-details" class="product-series-panel" v-bind="{ ...sectionPresentationAttributes(parametersCopy), ...detailOwnerAttributes() }" data-cms-preview-key="parameters" :aria-label="`${activeCard.name} ${parametersCopy.title}`">
        <div class="series-feature-panel">
          <h2 class="sr-only">{{ seoDisplayName }} 产品详情</h2>
          <button class="series-panel-close" type="button" aria-label="收起机型详情" @click="closeProduct">×</button>
          <p v-if="previewSession && !detailHasCmsData" class="series-draft-note" data-cms-preview-draft-note>{{ DETAIL_INITIALIZE_HINT }}</p>
          <div class="series-panel-main" :class="{ 'is-workstation': activeIntro }">
            <div v-if="activeIntro" class="workstation-intro">
              <h2 v-bind="detailFieldAttributes('intro.title', 'intro_title')">{{ activeIntro.title }}</h2>
              <strong v-bind="detailFieldAttributes('intro.subtitle', 'intro_subtitle')">{{ activeIntro.subtitle }}</strong>
              <p><b>适应场景：</b><span v-bind="detailFieldAttributes('intro.scene', 'intro_scene')">{{ activeIntro.scene }}</span></p>
              <p v-bind="detailFieldAttributes('intro.body', 'intro_body')">{{ activeIntro.body }}</p>
            </div>
            <nav v-else class="series-model-list" aria-label="该系列机型">
              <button v-for="model in activeModelOptions" :key="model" type="button" :class="{ active: selectedModel === model }" :data-cms-preview-page-action="previewSession ? 'select-product-model' : undefined" :data-cms-model="previewSession ? model : undefined" data-cms-preview-action="select-model-target" :data-cms-model-code="model" :data-cms-model-name="model" :data-cms-model-id="modelRecordId(model)" :data-cms-list-series="activeSeriesCode" @click="chooseModel(model)"><span v-bind="fieldPresentationAttributes(selectedModelRecord?.presentation, 'name')" data-cms-preview-field-path="name" data-cms-preview-label="型号名称" data-cms-preview-position-field-path="presentation.field_presentation.name">{{ model }}</span></button>
              <div v-if="previewSession" class="cms-model-actions">
                <button type="button" class="cms-model-add" data-cms-preview-action="model-add" :data-cms-list-series="activeSeriesCode" aria-label="新增机型">＋ 新增机型</button>
                <!-- Only a CMS record can be deleted; a template-only model keeps the
                     button visible but disabled so its absence is explained instead of
                     looking like a missing feature. -->
                <button type="button" class="cms-model-remove" :disabled="!modelCanDelete" :title="boundProductRecord()?.id == null ? '该机型只是官网原版名称，尚未建立 CMS 记录，无法删除；先点「＋ 新增机型」建立记录' : (!modelCanDelete ? '已发布或审核中的机型不能直接删除；请先在发布队列下线并退回草稿' : '删除当前机型')" :data-cms-preview-action="modelCanDelete ? 'model-remove' : undefined" :data-cms-list-series="activeSeriesCode" :data-cms-model-id="boundProductRecord()?.id != null ? String(boundProductRecord()?.id) : undefined" :data-cms-model-code="String(boundProductRecord()?.model_code || '')" aria-label="删除当前机型">× 删除当前机型</button>
              </div>
            </nav>
            <div class="series-machine-visual"><img :src="machineImageSrc" :alt="displayImageAlt" v-bind="machineImageAttributes()" data-cms-preview-placement-key="product.gallery.image" data-cms-preview-media-role="machine" @error="handleMachineImageError"><span v-if="previewSession && machineImageFailed" class="series-machine-media-error">所选素材读取失败，已回退到官网原图</span></div>
            <div class="series-capabilities" :class="{ 'is-text-only': featureReasons.every((reason) => !reason.image) }" aria-label="核心能力">
              <p v-if="activeIntro" class="capability-heading">{{ parametersCopy.label || '工作站设备组成：' }}</p>
              <div v-for="(reason, index) in featureReasons" :key="`${index}-${reason.label}`" class="series-capability" :class="{ 'has-image': reason.image, 'has-detail': reason.detail }">
                <button v-if="previewSession" type="button" class="cms-list-remove" data-cms-preview-action="list-remove" :data-cms-list-path="featureListPath" :data-cms-list-series="activeSeriesCode" :data-cms-list-index="String(index)" :data-cms-list-label="reason.label || `第 ${index + 1} 项`" :data-cms-list-collection="detailOwner().collection" :data-cms-list-item-id="detailOwner().itemId" :aria-label="`删除第 ${index + 1} 项`">×</button>
                <img v-if="reason.image" :src="reason.image" :alt="reason.label" v-bind="detailFieldAttributes(`features.${index}.image`, featurePresentationPath(index, 'image'))" data-cms-preview-placement-key="product.gallery.image" data-cms-preview-media-role="feature">
                <span v-bind="detailFieldAttributes(`features.${index}.label`, featurePresentationPath(index, 'label'))">{{ reason.image ? `${index + 1}.` : '' }}{{ reason.label }}</span>
                <small v-if="reason.detail" v-bind="detailFieldAttributes(`features.${index}.detail`, featurePresentationPath(index, 'detail'))">{{ reason.detail }}</small>
                <small v-if="reason.note" v-bind="detailFieldAttributes(`features.${index}.note`, featurePresentationPath(index, 'note'))">（{{ reason.note }}）</small>
              </div>
              <button v-if="previewSession" type="button" class="cms-list-add" data-cms-preview-action="list-add" :data-cms-list-path="featureListPath" :data-cms-list-series="activeSeriesCode" :data-cms-list-collection="detailOwner().collection" :data-cms-list-item-id="detailOwner().itemId" aria-label="新增一项设备组成">＋ 新增一项</button>
            </div>
          </div>
          <div class="series-panel-cta">
            <div class="series-panel-cta-copy"><strong>需要选型建议？</strong><span>告诉我们加工材料、行程和精度要求，技术工程师协助选型。</span></div>
            <div class="series-panel-cta-actions">
              <NuxtLink class="series-cta-primary" to="/contact">获取选型建议 <span aria-hidden="true">→</span></NuxtLink>
              <a v-if="resources.length" class="series-cta-secondary" :href="productResourceUrl(resources[0])" target="_blank" rel="noreferrer">下载产品资料</a>
              <NuxtLink v-else class="series-cta-secondary" to="/service">服务支持</NuxtLink>
            </div>
          </div>
        </div>
        <section id="specifications" class="series-specification" :class="{ 'is-empty': !parameterGroups.length }" v-bind="{ ...sectionPresentationAttributes(dimensionsCopy), ...productBinding('configuration') }" data-cms-preview-key="dimensions" aria-labelledby="series-specification-title">
          <div class="specification-side-label"><span id="series-specification-title"><img :src="String(displayConfig.labels?.technicalImage || '/assets/psd/technical-label-psd.png')" :alt="String(displayLabels.technical || parametersCopy.title || '技术参数')" v-bind="productBinding('configuration.labels.technical_image_asset_id')" data-cms-preview-placement-key="product.gallery.image" data-cms-preview-media-role="technical"></span></div>
          <div class="specification-table"><div v-if="previewSession && modelCanDelete && boundProductRecord()?.id != null" class="spec-table-toolbar"><button type="button" class="spec-row-add" data-cms-preview-action="parameter-add" :data-cms-model-code="selectedModelRecord?.model_code || displayModel" aria-label="新增技术参数">＋ 新增参数</button></div><p v-if="!parameterGroups.length" class="specification-empty" data-cms-preview-key="parameters-empty">{{ previewSession ? '该机型还没有技术参数；点上方「＋ 新增参数」添加第一条。' : '该产品暂未发布结构化参数，请联系瑞钧获取选型资料。' }}</p><dl v-if="parameterGroups.length"><template v-for="(group, groupIndex) in parameterGroups" :key="groupIndex"><template v-for="(item, rowIndex) in group.items" :key="item.id || item.label"><dt v-bind="fieldPresentationAttributes(item.presentation, 'field_name')" :data-cms-preview-key="item.id ? `parameter-${item.id}` : undefined" :data-cms-preview-collection="item.id ? 'product_parameters' : parameterRowCollection()" :data-cms-preview-item-id="item.id || parameterRowOwnerId() || undefined" :data-cms-preview-field-path="item.id ? 'field_name' : parameterRowPath(groupIndex, rowIndex, 'field_name')" :data-cms-parameter-rows="parameterRowsJson">{{ item.label }}</dt><dd v-bind="fieldPresentationAttributes(item.presentation, 'value')" :data-cms-preview-key="item.id ? `parameter-${item.id}` : undefined" :data-cms-preview-collection="item.id ? 'product_parameters' : parameterRowCollection()" :data-cms-preview-item-id="item.id || parameterRowOwnerId() || undefined" :data-cms-preview-field-path="item.id ? 'value' : parameterRowPath(groupIndex, rowIndex, 'value')" :data-cms-parameter-rows="parameterRowsJson">{{ item.value }}<span v-if="item.unit" v-bind="fieldPresentationAttributes(item.presentation, 'unit')" :data-cms-preview-key="item.id ? `parameter-${item.id}` : undefined" :data-cms-preview-collection="item.id ? 'product_parameters' : parameterRowCollection()" :data-cms-preview-item-id="item.id || parameterRowOwnerId() || undefined" :data-cms-preview-field-path="item.id ? 'unit' : parameterRowPath(groupIndex, rowIndex, 'unit')"> {{ item.unit }}</span><button v-if="previewSession && item.id && modelCanDelete" type="button" class="spec-row-remove" data-cms-preview-action="parameter-remove" :data-cms-parameter-id="item.id" :data-cms-model-code="selectedModelRecord?.model_code || displayModel" :aria-label="`删除参数 ${item.label}`">×</button></dd></template></template><div v-if="previewSession && specHasRecordRows && modelCanDelete" class="spec-row-actions"><button type="button" class="spec-row-add" data-cms-preview-action="parameter-add" :data-cms-model-code="selectedModelRecord?.model_code || displayModel" aria-label="新增技术参数">＋ 新增参数</button></div></dl><p v-if="parameterGroups.length" v-bind="fieldPresentationAttributes(dimensionsCopy, 'body')" data-cms-preview-field-path="body" data-cms-preview-position-field-path="field_presentation.body">{{ dimensionsCopy.body || '注：1.表中所述加工性能参数是在本公司指定条件（材料、加工条件、环境、测量参数）下进行的实验结果　2.某些功能配置需要选装' }}</p></div>
          <div class="specification-drawings" aria-label="机型工程视图"><template v-if="activeDrawing"><img :src="activeDrawing.image" v-bind="productBinding(`configuration.drawings.${activeDrawing.sourceIndex}.media_asset_id`)" :data-cms-preview-placement-key="'product.gallery.image'" data-cms-preview-media-role="drawing" :alt="activeDrawing.caption || activeDrawing.title"><span v-if="activeDrawing.caption" :data-cms-preview-field-path="`configuration.drawings.${activeDrawing.sourceIndex}.caption`">{{ activeDrawing.caption }}</span></template><img v-else src="/assets/psd/product-dimensions.png" v-bind="productBinding('configuration.drawings.0.media_asset_id')" data-cms-preview-placement-key="product.gallery.image" data-cms-preview-media-role="drawing" :alt="String(displayLabels.drawing || '机型工程视图')"></div>
        </section>
           <nav v-if="drawingPageCount > 1" class="specification-pager" data-cms-preview-key="pagination" :aria-label="paginationCopy.title"><button type="button" :disabled="drawingPage === 0" @click="changeDrawingPage(-1)">‹ {{ paginationCopy.pagination?.previous_label || '上页' }}</button><span aria-live="polite">{{ drawingPage + 1 }} / {{ drawingPageCount }}</span><button type="button" :disabled="drawingPage === drawingPageCount - 1" @click="changeDrawingPage(1)">{{ paginationCopy.pagination?.next_label || '下页' }} ›</button></nav>
      </section>
    </section>

    <Teleport to="body">
      <div v-if="false" class="product-dialog-backdrop" role="presentation" @click.self="closeProduct">
        <section class="product-dialog" role="dialog" aria-modal="true" :aria-labelledby="'dialog-title-' + selectedCard">
          <button class="dialog-close" type="button" aria-label="关闭产品详情" @click="closeProduct">×</button>
          <div class="dialog-main">
            <div class="dialog-product-picker" aria-label="产品选择">
              <button v-for="card in catalogCards" :key="card.id" type="button" :class="{ active: selectedCard === card.id }" :aria-label="`查看${card.name}`" @click="selectedCard = card.id">
                <img :src="card.image" alt="">
                <span>{{ card.name }}</span>
              </button>
            </div>
            <div class="dialog-product-visual">
              <p>PRODUCT CENTER</p>
              <h2 :id="'dialog-title-' + selectedCard">{{ displayName }}</h2>
              <span>{{ displayModel }}</span>
              <img :src="displayImage" :alt="displayImageAlt">
              <div class="dialog-model-options" aria-label="型号选择"><button v-for="model in activeModelOptions" :key="model" type="button" :class="{ active: selectedModel === model }" @click="chooseModel(model)">{{ model }}</button></div>
            </div>
            <div class="dialog-capabilities">
              <button v-for="(reason, index) in featureReasons" :key="reason.label" type="button" :aria-pressed="selectedReason === index" :class="{ active: selectedReason === index }" @click="selectedReason = index">
                <img v-if="reason.image" :src="reason.image" alt="" aria-hidden="true"><span>{{ index + 1 }}. {{ reason.label }}</span><small>{{ reason.detail || reason.note }}</small>
              </button>
            </div>
          </div>
          <section v-if="!slug" class="dialog-model-search" aria-labelledby="dialog-model-search-title">
            <div>
              <p class="eyebrow">MODEL SEARCH</p>
              <h3 id="dialog-model-search-title">按型号查找设备</h3>
            </div>
            <label class="model-search-input"><span class="sr-only">搜索型号</span><input v-model="modelQuery" type="search" placeholder="输入型号、系列或名称" autocomplete="off"></label>
            <div class="product-model-results" aria-live="polite">
              <NuxtLink v-for="model in filteredModels" :key="model.model_code" :to="model.slug ? `/product/${encodeURIComponent(model.slug)}` : '/product'" class="model-result">
                <span>{{ normalizeModelLabel(model.model_code) }}</span><strong>{{ normalizeModelLabel(model.name || seriesNames.get(String(model.series_code)) || model.model_code) }}</strong><b aria-hidden="true">→</b>
              </NuxtLink>
              <p v-if="!filteredModels.length" class="model-search-empty">没有找到匹配的已发布型号。</p>
            </div>
          </section>
          <div class="dialog-specification">
            <div class="dialog-spec-label"><span>01</span><b>技术参数</b></div>
            <div><h3>{{ displayModel }}</h3><dl><template v-for="[key, value] in specificationRows" :key="String(key)"><dt>{{ key }}</dt><dd>{{ value }}</dd></template></dl></div>
            <div class="dialog-spec-drawing"><strong>{{ displayModel.split('(')[0] }}</strong><img :src="displayImage" :alt="displayImageAlt"></div>
          </div>
        </section>
      </div>
    </Teleport>

    <section v-if="resources.length || caseStudies.length" class="product-resources" :aria-label="resourcesCopy.title">
      <article v-if="resources.length" v-bind="sectionPresentationAttributes(resourcesCopy)" data-cms-preview-key="resources" :data-cms-preview-collection="productRecordBinding('resources')['data-cms-preview-collection']" :data-cms-preview-item-id="productRecordBinding('resources')['data-cms-preview-item-id']"><p class="eyebrow">{{ resourcesCopy.kicker }}</p><a v-for="(resource, resourceIndex) in resources" :key="`${productResourceUrl(resource)}-${resourceIndex}`" :href="productResourceUrl(resource)" :data-cms-preview-field-path="`resources.${resourceIndex}.title`" :data-cms-preview-link-field-path="`resources.${resourceIndex}.url`" :download="productResourceDownloadName(resource)" :target="productResourceUrl(resource).startsWith('https://') ? '_blank' : undefined" :rel="productResourceUrl(resource).startsWith('https://') ? 'noreferrer' : undefined"><span :data-cms-preview-field-path="`resources.${resourceIndex}.type`">{{ resource.type || '资料' }}</span><strong :data-cms-preview-field-path="`resources.${resourceIndex}.title`">{{ resource.title }}</strong><b aria-hidden="true">-></b></a></article>
      <article v-if="caseStudies.length" v-bind="sectionPresentationAttributes(casesCopy)" data-cms-preview-key="cases"><p class="eyebrow" data-cms-preview-field-path="kicker">{{ casesCopy.kicker }}</p><a v-for="caseStudy in caseStudies" :key="caseStudy.url" :href="caseStudy.url" :target="caseStudy.url.startsWith('https://') ? '_blank' : undefined" :rel="caseStudy.url.startsWith('https://') ? 'noreferrer' : undefined"><strong>{{ caseStudy.title }}</strong><span v-if="caseStudy.summary">{{ caseStudy.summary }}</span><b aria-hidden="true">-></b></a></article>
    </section>

    <CmsCustomSections :page="productPageRecord" page-slug="product" :visual-edit-mode="cmsVisualEditMode" />
    <PsdFooter />
  </main>
</template>

<style scoped>
.product-overview .overview-heading,.product-overview.is-entered .overview-heading{opacity:1;transform:none;transition:none}.product-overview .proof-grid article{opacity:0;transform:translate3d(0,38px,0) rotate(-8deg);transform-origin:100% 100%;will-change:transform,opacity;transition:opacity .72s ease,transform .96s cubic-bezier(.22,.8,.24,1)}.product-overview.is-entered .proof-grid article{opacity:1;transform:translate3d(0,0,0) rotate(0)}.product-overview.is-entered .proof-grid article:nth-child(1){transition-delay:.18s}.product-overview.is-entered .proof-grid article:nth-child(2){transition-delay:.34s}.product-overview.is-entered .proof-grid article:nth-child(3){transition-delay:.5s}
.product-detail-page { overflow: hidden; background: #f3f3f2; color: #302f2f; font-family: var(--ruijun-font-cn); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.eyebrow { margin: 0; color: #e51b23; font-family: var(--ruijun-font-latin); font-size: 12px; font-weight: 700; letter-spacing: .1em; }
.product-overview { --product-content-edge: max(6.2%, calc((100% - 1400px) / 2)); --product-grid-width: min(1280px, calc(100% - (2 * var(--product-content-edge)))); --product-arc-width: min(22.526vw, 432.5px); --product-arc-height: min(14.167vw, 272px); --product-arc-outset: min(12.5vw, 240px); --product-kicker-outset: min(3.4375vw, 66px); position: relative; height: 395px; min-height: 0; box-sizing: border-box; overflow: hidden; background: #f4f4f3; }
.dialog-model-search { display: grid; grid-template-columns: minmax(180px, .55fr) minmax(230px, .8fr) minmax(300px, 1.4fr); gap: 24px; align-items: end; margin: 0 56px; padding: 12px 0 34px; border-top: 1px solid #303030; }
.dialog-model-search h3 { margin: 8px 0 0; color: #fff; font-size: 24px; line-height: 1.15; }
.model-search-input input { width: 100%; padding: 14px 16px; color: #191a1b; background: #fff; border: 1px solid #c7c9c6; border-radius: 3px; font: inherit; }
.model-search-input input:focus { outline: 2px solid #e51b23; outline-offset: 2px; }
.product-model-results { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid #494949; }
.model-result { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 12px 0 12px 14px; color: #dedede; border-bottom: 1px solid #373737; text-decoration: none; }
.model-result:hover strong { color: #e51b23; }
.model-result span { color: #e51b23; font-family: var(--ruijun-font-latin); font-size: 12px; }
.model-result strong { overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.model-result b { padding: 0 12px; color: #e51b23; font-weight: 400; }
.model-search-empty { grid-column: 1 / -1; margin: 0; padding: 16px 0; color: #767a7c; font-size: 14px; }
.product-overview::after { position: absolute; top: calc(min(3.36vw, 64.5px) - 72px); right: calc(var(--product-content-edge) - var(--product-arc-outset)); width: var(--product-arc-width); height: var(--product-arc-height); background: url('/assets/psd/product-overview-arc.png') center / 100% 100% no-repeat; content: ''; pointer-events: none; }
.overview-heading { position: absolute; top: min(6.875vw, 132px); left: max(6.2%, calc((100% - 1280px) / 2)); }
.overview-heading h1 { margin: 0; color: #000; font-family: var(--ruijun-font-latin); font-size: clamp(42px, 3.15vw, 60px); font-weight: 400; line-height: 1; }
.overview-heading h1 span { margin-left: .35em; color: #fe0a0a; font-family: var(--ruijun-font-cn); font-size: .6em; font-weight: 600; }
.overview-kicker { position: absolute; z-index: 1; top: min(5.469vw, 105px); right: calc(var(--product-content-edge) - var(--product-kicker-outset)); display: grid; gap: min(.9375vw, 18px); color: #777; text-align: right; }
.overview-kicker b { color: #fe0a0a; font-size: min(1.823vw, 35px); font-weight: 500; line-height:1; }
.overview-kicker span { font-size: min(1.875vw, 36px); line-height:1.18; }
.proof-grid { position: absolute; top: min(13.646vw, 261px); left: 50%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; width: var(--product-grid-width); margin: 0; text-align: center; transform: translateX(-50%); }
.proof-grid article { display: grid; gap: 14px; justify-items: center; }
.proof-grid strong { color: #fe0a0a; font-family: Arial, sans-serif; font-size: clamp(30px, 3.4vw, 54px); font-weight: 500; line-height: 1; }
.proof-grid strong em { margin-left: .16em; font-size: .48em; font-style: normal; }
.proof-grid span { color: #302f2f; font-size: clamp(17px, 1.4vw, 24px); }
.proof-grid strong>span { color: inherit; font-size: inherit; }
.proof-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: clamp(22px, 2.2vw, 42px); width: 100%; }
.proof-metric { display: grid; gap: 14px; justify-items: center; }
.proof-metric strong { display: flex; align-items: baseline; justify-content: center; }
.proof-metric>span { white-space: nowrap; }
.proof-grid small { display: block; margin-top: 5px; color: #848282; font-size: .54em; }
.catalog-section { padding: 0 max(6.2%, calc((100% - 1400px) / 2)) 76px; background: #f4f4f3; }
.catalog-draft-note { max-width:1280px; margin:0 auto 16px; padding:10px 14px; color:#8a4b00; background:#fff6e6; border:1px dashed #e0b45c; font-size:13px; line-height:1.6; }
.product-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; max-width: 1280px; margin: 0 auto; }
.catalog-pager { display:flex; align-items:center; justify-content:center; gap:18px; max-width:1280px; margin:28px auto 0; color:#333; font-size:14px; }.catalog-pager button { min-width:92px; border:1px solid #1f1f1f; background:#fff; color:#1f1f1f; padding:9px 14px; font:inherit; cursor:pointer; }.catalog-pager button:hover:not(:disabled),.catalog-pager button:focus-visible { border-color:#ed1f2b; background:#ed1f2b; color:#fff; outline:0; }.catalog-pager button:disabled { cursor:not-allowed; opacity:.4; }
.cms-session-lost { position: sticky; top: 0; z-index: 50; margin: 0; padding: 10px 16px; background: #b3261e; color: #fff; font-size: 13px; line-height: 1.5; text-align: center; }
.product-card-wrap { position: relative; min-width: 0; }
.catalog-cta-card { display:flex; flex-direction:column; justify-content:center; gap:10px; min-width:0; aspect-ratio:420/259; padding:30px; background:#17191b; color:#fff; text-decoration:none; }
.catalog-cta-kicker { color:#ff9a9e; font-size:11px; font-weight:700; letter-spacing:.08em; }
.catalog-cta-card strong { font-size:22px; font-weight:600; line-height:1.25; }
.catalog-cta-card > span:not(.catalog-cta-kicker) { color:rgb(255 255 255 / 68%); font-size:13px; line-height:1.6; }
.catalog-cta-card b { margin-top:6px; color:#fff; font-size:13px; font-weight:600; }
.catalog-cta-card:hover b { color:#ff5252; }
@media (max-width:1100px) { .catalog-cta-card { padding:20px; gap:6px; }.catalog-cta-card > span:not(.catalog-cta-kicker) { display:none; }.catalog-cta-card strong { font-size:18px; }.catalog-cta-card b { font-size:12px; } }
.product-card-wrap.is-draft .product-card { outline: 2px dashed #c9a227; outline-offset: -2px; }
.is-draft .product-kicker { color: #8a6d1b; font-weight: 700; }
.cms-draft-cover-empty { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 6px; opacity: .55; filter: grayscale(.2); }
/* Canvas-only card controls: create/delete a whole series card in place. */
.cms-card-remove { position: absolute; z-index: 4; top: 8px; right: 8px; display: grid; place-items: center; width: 26px; height: 26px; padding: 0; border: 2px solid #fff; border-radius: 50%; background: #e53935; box-shadow: 0 2px 8px rgba(0,0,0,.35); color: #fff; font-size: 16px; font-weight: 700; line-height: 1; cursor: pointer; }
.cms-card-remove:hover,.cms-card-remove:focus-visible { background: #b71c1c; outline: 0; }
.cms-card-remove:disabled { background: #8b9094; border-color: rgb(255 255 255 / 80%); cursor: not-allowed; opacity: .85; }
.cms-card-remove:disabled:hover { background: #8b9094; }
.cms-series-actions { display: flex; justify-content: center; margin: 18px 0 4px; }
.cms-draft-cards { margin: 14px 0 0; padding: 14px 18px; border: 1px dashed #c9a227; border-radius: 10px; background: #fffaf0; }
.cms-draft-cards-title { margin: 0 0 10px; color: #8a6d1b; font-size: 12px; }
.cms-draft-cards-list { display: flex; flex-wrap: wrap; gap: 10px; margin: 0; padding: 0; list-style: none; }
.cms-draft-card { display: inline-flex; align-items: center; gap: 8px; padding: 6px 8px 6px 10px; border: 1px solid #e0cf9a; border-radius: 999px; background: #fff; font-size: 13px; }
.cms-draft-badge { padding: 2px 8px; border-radius: 999px; background: #f0c050; color: #4a3600; font-size: 11px; font-weight: 700; }
.cms-draft-name { padding: 0; border: 0; background: none; color: #11139a; font-size: 13px; font-weight: 700; line-height: 1.2; text-decoration: underline dotted; cursor: pointer; }
.cms-draft-name:hover,.cms-draft-name:focus-visible { color: #b71c1c; outline: 0; }
.cms-draft-code { color: #8b8b8b; font-size: 11px; }
.cms-draft-remove { display: grid; place-items: center; width: 22px; height: 22px; padding: 0; border: 2px solid #fff; border-radius: 50%; background: #e53935; box-shadow: 0 1px 4px rgba(0,0,0,.3); color: #fff; font-size: 14px; font-weight: 700; line-height: 1; cursor: pointer; }
.cms-draft-remove:hover,.cms-draft-remove:focus-visible { background: #b71c1c; outline: 0; }
.cms-canvas-toast { position: fixed; left: 50%; bottom: 26px; z-index: 60; transform: translateX(-50%); max-width: min(560px, 90vw); margin: 0; padding: 10px 18px; border-radius: 999px; background: #11139a; box-shadow: 0 6px 24px rgba(0,0,0,.28); color: #fff; font-size: 13px; line-height: 1.5; text-align: center; }
.cms-draft-card.is-new { border-color: #11139a; box-shadow: 0 0 0 3px rgba(17,19,154,.25); }
.cms-series-add { padding: 10px 22px; border: 2px dashed #11139a; border-radius: 999px; background: #eef0ff; box-shadow: 0 2px 6px rgba(17,19,154,.12); color: #11139a; font-size: 14px; font-weight: 600; line-height: 1; cursor: pointer; }
.cms-series-add:hover,.cms-series-add:focus-visible { background: #11139a; color: #fff; outline: 0; }
/* Preview-only affordance: opens the series detail panel inside the canvas. */
.series-detail-action { position:absolute; z-index:2; top:10px; left:10px; min-height:28px; padding:0 10px; border:1px solid rgb(255 255 255 / 72%); border-radius:3px; background:rgb(24 26 28 / 74%); color:#fff; font-size:12px; font-weight:600; line-height:26px; cursor:pointer; }
.series-detail-action:hover,.series-detail-action:focus-visible { border-color:#ed1f2b; background:#ed1f2b; outline:0; }
.product-card { position: relative; display: block; width: 100%; aspect-ratio: 420 / 259; min-height: 0; padding: 0; overflow: hidden; color: #fff; background: #dbe1e3; border: 0; border-radius: 0; text-decoration: none; cursor: pointer; text-align: left; transition: transform .35s cubic-bezier(.22,.8,.24,1), box-shadow .35s ease; }
.product-card:hover { z-index: 1; transform:translateY(-5px); box-shadow:0 16px 30px rgb(24 32 34 / 16%); }
.product-grid.has-selection .product-card { transition:transform .45s cubic-bezier(.22,.8,.24,1), box-shadow .35s ease; }
.product-grid.has-selection .product-card.is-selected { z-index:2; transform:translateY(-18px); box-shadow:0 18px 32px rgb(24 32 34 / 20%); }
.details-jump { position:absolute; z-index:3; top:100%; left:50%; display:grid; width:44px; height:44px; place-items:center; padding:0; color:#fff; background:#e51b23; border:0; border-radius:50%; cursor:pointer; font-size:25px; line-height:1; box-shadow:0 7px 16px rgb(24 32 34 / 20%); transform:translate(-50%, calc(-50% - 18px)); transition:transform .25s ease,background .25s ease; }
.details-jump:hover { background:#b91920; transform:translate(-50%, calc(-50% - 15px)); }
.product-card img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transition:transform .7s cubic-bezier(.22,.8,.24,1); }
.product-card:hover img { transform:scale(1.035); }
.product-copy { position:absolute; z-index:1; top:50%; right:0; display:grid; align-content:center; gap:6px; width:38%; min-height:34%; box-sizing:border-box; padding:12px; color:#fff; background:rgb(42 45 47 / 84%); transform:translateY(-50%); }
.product-kicker { display:-webkit-box; overflow:hidden; color:rgb(255 255 255 / 82%); font-size:clamp(10px,.7vw,13px); font-weight:600; line-height:1.25; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.product-name { display:-webkit-box; overflow:hidden; color:#fff; font-size:clamp(15px,1.02vw,20px); font-weight:500; line-height:1.18; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.product-series-panel { position:relative; max-width:1280px; margin:54px auto 0; padding:0; background:transparent; scroll-margin-top:120px; }
.series-feature-panel { position:relative; padding:64px 72px 48px; background:#e8e8e9; border-radius:26px; }
.series-panel-cta { display:flex; align-items:center; justify-content:space-between; gap:24px; margin-top:32px; padding:20px 24px; background:#f7f8f7; border:1px solid #d5d8da; border-radius:14px; }
.series-panel-cta-copy { display:grid; gap:4px; }
.series-panel-cta-copy strong { color:#17191b; font-size:16px; font-weight:600; }
.series-panel-cta-copy span { color:#62666a; font-size:12px; line-height:1.6; }
.series-panel-cta-actions { display:flex; flex-shrink:0; gap:10px; }
.series-cta-primary { display:inline-flex; align-items:center; gap:8px; padding:10px 18px; color:#fff; background:#e51b23; border-radius:2px; font-size:13px; font-weight:600; text-decoration:none; }
.series-cta-primary:hover { background:#b91920; }
.series-cta-secondary { display:inline-flex; align-items:center; padding:10px 16px; color:#17191b; background:#fff; border:1px solid #c7cacc; border-radius:2px; font-size:13px; text-decoration:none; }
.series-cta-secondary:hover { color:#e51b23; border-color:#e51b23; }
.series-draft-note { margin:0 0 24px; padding:10px 14px; color:#8a4b00; background:#fff6e6; border:1px dashed #e0b45c; border-radius:4px; font-size:13px; line-height:1.6; }
.series-panel-close { position:absolute; top:-23px; left:50%; display:grid; width:46px; height:46px; place-items:center; padding:0; color:#fff; background:#1f2224; border:0; border-radius:50%; cursor:pointer; font-family:Arial,sans-serif; font-size:40px; line-height:1; transform:translateX(-50%); }
.series-panel-close:hover,.series-panel-close:focus-visible { background:#000; outline:0; }
.series-panel-main { display:grid; grid-template-columns:190px minmax(0,1fr) minmax(250px,300px); min-height:408px; gap:42px; align-items:stretch; }
.series-model-list { display:grid; align-content:center; gap:18px; }
.series-model-list button { min-height:48px; padding:0 16px; color:#f0eeee; background:#4d4e4e; border:0; border-radius:6px; cursor:pointer; font-family:Arial,var(--ruijun-font-latin),sans-serif; font-size:17px; text-align:left; transition:background .2s ease,color .2s ease; }
.series-model-list button:hover { color:#fff; background:#5c5f61; }
.series-model-list button.active { color:#fff; background:#e51b23; }
.cms-model-actions { display:grid; gap:8px; }
.cms-model-add { min-height:34px; padding:0 14px; color:#11139a; background:#eef0ff; border:2px dashed #11139a; border-radius:8px; font-size:13px; font-weight:600; line-height:1; cursor:pointer; }
.cms-model-add:hover,.cms-model-add:focus-visible { background:#11139a; color:#fff; outline:0; }
.cms-model-remove { min-height:30px; padding:0 12px; color:#fff; background:#e53935; border:2px solid #fff; border-radius:8px; box-shadow:0 1px 4px rgba(0,0,0,.25); font-size:12px; font-weight:600; line-height:1; cursor:pointer; }
.cms-model-remove:hover,.cms-model-remove:focus-visible { background:#b71c1c; outline:0; }
.cms-model-remove:disabled { background:#f6d9d7; color:#a5332c; box-shadow:none; cursor:not-allowed; }
.cms-model-remove:disabled:hover { background:#f6d9d7; }
.workstation-intro { align-self:center; color:#3e4144; }
.workstation-intro h2 { margin:0 0 12px; font-size:24px; font-weight:500; line-height:1.15; }
.workstation-intro > strong { display:block; margin-bottom:32px; color:#404347; font-size:18px; font-weight:400; }
.workstation-intro p { margin:0 0 15px; font-size:13px; line-height:1.75; }
.workstation-intro p b { display:block; margin-bottom:5px; font-size:14px; font-weight:500; }
.series-machine-visual { position:relative; display:grid; min-width:0; min-height:370px; align-items:end; justify-items:center; }
.series-machine-media-error { position:absolute; left:0; bottom:0; padding:4px 8px; border-radius:6px; background:rgb(211 34 34 / 8%); color:#b3261e; font-size:12px; line-height:1.5; }
.series-machine-visual img { width:min(100%,680px); max-height:390px; object-fit:contain; }
.series-capabilities { display:grid; align-content:center; gap:18px; min-width:0; }
.capability-heading { margin:0 0 2px; color:#44484b; font-size:14px; font-weight:500; }
.series-capability { position:relative; display:grid; justify-items:center; gap:7px; color:#17191b; font-size:13px; line-height:1.35; text-align:center; }
.series-capability img { width:108px; height:108px; object-fit:cover; border-radius:17px; }
.series-capability small { color:#4f5357; font-size:11px; font-weight:400; line-height:1.6; white-space:pre-line; }
/* Canvas-only list controls: they render inside the preview document, never on
   the public page, and are excluded from text selection by the capture handler.
   Deliberately high contrast so they cannot be mistaken for design copy. */
.cms-list-remove { position:absolute; z-index:3; top:-8px; right:-8px; display:grid; place-items:center; width:24px; height:24px; padding:0; border:2px solid #fff; border-radius:50%; background:#e53935; box-shadow:0 2px 6px rgba(0,0,0,.3); color:#fff; font-size:15px; font-weight:700; line-height:1; cursor:pointer; }
.cms-list-remove:hover,.cms-list-remove:focus-visible { background:#b71c1c; outline:0; }
.cms-list-add { display:inline-flex; align-items:center; gap:6px; justify-self:start; margin-top:14px; padding:9px 18px; border:2px dashed #11139a; border-radius:999px; background:#eef0ff; box-shadow:0 2px 6px rgba(17,19,154,.12); color:#11139a; font-size:14px; font-weight:600; line-height:1; cursor:pointer; }
.cms-list-add:hover,.cms-list-add:focus-visible { background:#11139a; color:#fff; outline:0; }
.series-capability.has-detail { grid-template-columns:92px minmax(0,1fr); justify-items:start; gap:3px 16px; text-align:left; }
.series-capability.has-detail img { grid-row:1 / span 3; width:92px; height:92px; }
.series-capability.has-detail span { align-self:end; font-weight:500; }
.series-capability.has-detail small { align-self:start; }
.series-capabilities.is-text-only { justify-items:stretch; gap:26px; }
.series-capabilities.is-text-only .series-capability { grid-template-columns:14px minmax(0,1fr); justify-items:start; gap:3px 14px; color:#17191b; font-size:20px; text-align:left; }
.series-capabilities.is-text-only .series-capability::before { width:13px; height:13px; margin-top:5px; background:#e51b23; border-radius:50%; content:""; }
.series-capabilities.is-text-only .series-capability small { grid-column:2; color:#55595d; }
.series-specification { display:grid; grid-template-columns:52px minmax(0,1fr) clamp(260px, 15.625vw, 300px); gap:34px; align-items:start; margin-top:36px; padding:44px 46px 36px; background:#dedfe1; border:0; border-radius:26px; }
.specification-side-label { display:flex; justify-content:flex-start; padding-top:14px; padding-left:26px; }
.specification-side-label span { display:block; width:38px; min-height:0; padding:0; background:transparent; border-radius:0; }
.specification-side-label img { display:block; width:100%; height:auto; }
.specification-table { display:flex; flex-direction:column; align-self:start; min-width:0; padding-top:2px; }
.specification-table > img { display:block; width:100%; height:auto; }
.specification-table dl { display:grid; grid-template-columns:minmax(122px,.78fr) minmax(0,1.55fr); gap:11px 24px; margin:0; }
.specification-table dt { color:#4e5154; font-size:12px; line-height:1.25; text-align:right; }
.specification-table dd { margin:0; color:#4c4f53; font-family:var(--ruijun-font-latin); font-size:12px; line-height:1.25; }
.specification-empty { max-width:560px; margin:6px 0 0; padding:26px 0; color:#62666a; font-size:14px; line-height:1.8; }
.specification-empty + .spec-row-add { margin-top:14px; }
.specification-table p { margin:24px 0 0; color:#6a6c70; font-size:8px; line-height:1.45; }
.specification-drawings { align-self:end; min-width:0; padding-top:2px; }
/* Canvas-only parameter row controls (preview document only). */
.spec-row-remove { margin-left:10px; width:20px; height:20px; padding:0; border:2px solid #fff; border-radius:50%; background:#e53935; box-shadow:0 1px 4px rgba(0,0,0,.28); color:#fff; font-size:13px; font-weight:700; line-height:1; vertical-align:middle; cursor:pointer; }
.spec-row-remove:hover,.spec-row-remove:focus-visible { background:#b71c1c; outline:0; }
.spec-row-actions { margin-top:18px; }
.spec-table-toolbar { display:flex; justify-content:flex-start; margin:0 0 10px; }
.spec-row-add { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border:2px dashed #11139a; border-radius:999px; background:#eef0ff; color:#11139a; font-size:13px; font-weight:600; line-height:1; cursor:pointer; }
.spec-row-add:hover,.spec-row-add:focus-visible { background:#11139a; color:#fff; outline:0; }
.specification-drawings img { display:block; width:100%; height:auto; }
.specification-pager { display:flex; justify-content:center; align-items:center; gap:18px; margin:0; padding:28px 0 30px; color:#5a5d60; background:#f4f4f3; font-family:var(--ruijun-font-latin); font-size:13px; }.specification-pager button { min-width:76px; padding:9px 13px; color:#fff; background:#17191b; border:0; border-radius:3px; cursor:pointer; font-size:14px; line-height:1; }.specification-pager button:hover:not(:disabled) { background:#e51b23; }.specification-pager button:disabled { cursor:not-allowed; opacity:.35; }
.machine-showcase { display: grid; grid-template-columns: 190px minmax(0, 1fr) 205px; gap: 36px; max-width: 1400px; min-height: 575px; margin: 0 auto; padding: 65px 52px; background: #e7e7e9; border-radius: 8px; }
.model-list { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 13px; }
.model-list button { min-width: 136px; padding: 10px 14px; color: #f0eeee; background: #565656; border: 0; border-radius: 4px; cursor: pointer; font-family: var(--ruijun-font-latin); font-size: 13px; text-align: left; transition: background .2s ease, color .2s ease; }
.model-list button:hover, .model-list button.active { color: #fff; background: #e51b23; }
.machine-visual { position: relative; display: grid; place-items: center; min-width: 0; }
.machine-visual img { width: min(100%, 650px); max-height: 420px; object-fit: contain; }
.machine-copy { position: absolute; top: 0; left: 0; z-index: 1; display: grid; gap: 4px; }
.machine-copy p { margin: 0; color: #e51b23; font-size: 11px; letter-spacing: .12em; }
.machine-copy h2 { margin: 0; color: #2a2929; font-size: clamp(26px, 2.7vw, 42px); line-height: 1.05; }
.machine-copy span { color: #68686a; font-family: var(--ruijun-font-latin); font-size: 14px; }
.feature-list { display: grid; align-content: center; gap: 14px; }
.feature-list button { position: relative; display: grid; min-height: 114px; padding: 0; overflow: hidden; color: #070192; background: #27292c; border: 0; border-radius: 4px; cursor: pointer; text-align: center; }
.feature-list button::after { position: absolute; inset: 0; background: rgb(18 20 22 / 48%); content: ''; }
.feature-list button.active::after { background: rgb(229 27 35 / 18%); }
.feature-list img { width: 100%; height: 114px; object-fit: cover; }
.feature-list span { position: absolute; z-index: 1; right: 8px; bottom: 8px; left: 8px; color: #fff; font-size: 11px; }
.specification-section { display: grid; grid-template-columns: 128px minmax(0, 1fr) minmax(280px, .85fr); gap: 44px; max-width: 1400px; margin: 0 auto 90px; padding: 65px 56px; background: #e7e7e9; border-radius: 8px; }
.specification-label { display: flex; align-items: flex-start; gap: 10px; color: #fff; }
.specification-label span { display: grid; width: 42px; height: 118px; place-items: center; background: #1757a8; border-radius: 20px; font-family: var(--ruijun-font-latin); font-size: 13px; writing-mode: vertical-rl; }
.specification-label b { color: #1757a8; font-size: 18px; writing-mode: vertical-rl; }
.specification-data h2 { margin: 0 0 26px; color: #3d3d3d; font-family: var(--ruijun-font-latin); font-size: 25px; }
.specification-data dl { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px 30px; margin: 0; font-size: 14px; }
.specification-data dt { color: #57575a; }
.specification-data dd { margin: 0; color: #2b2b2d; text-align: right; }
.specification-drawing { display: grid; align-content: center; justify-items: center; min-width: 0; }
.specification-drawing strong { align-self: start; color: #1757a8; font-family: var(--ruijun-font-latin); font-size: clamp(28px, 3vw, 46px); }
.specification-drawing img { width: 100%; max-height: 220px; object-fit: contain; }
.specification-drawing span { color: #68686a; font-size: 12px; text-align: center; }
.product-resources { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 42px; max-width: 1400px; margin: 0 auto 90px; }
.product-resources article { border-top: 1px solid #c8c8c6; }
.product-resources .eyebrow { padding-top: 18px; }
.product-resources a { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px 24px; padding: 18px 0; color: #302f2f; border-bottom: 1px solid #d6d6d4; text-decoration: none; }
.product-resources a:hover strong { color: #e51b23; }
.product-resources a span { color: #777; font-size: 13px; }
.product-resources a strong { font-size: 17px; }
.product-resources a b { grid-column: 2; grid-row: 1 / span 2; align-self: center; color: #e51b23; font-family: var(--ruijun-font-latin); }
.product-dialog-backdrop { position: fixed; z-index: 500; inset: 0; display: grid; place-items: center; padding: 82px 30px 30px; overflow-y: auto; background: rgb(243 243 242 / 78%); backdrop-filter: blur(5px); }
.product-dialog { position: relative; width: min(1240px, 100%); max-height: calc(100svh - 112px); overflow: auto; color: #fff; background: #090909; box-shadow: 0 28px 82px rgb(0 0 0 / 34%); }
.dialog-close { position: fixed; z-index: 1; top: max(32px, calc((100svh - min(1240px, 100vw - 60px)) / 2 - 29px)); left: 50%; display: grid; width: 58px; height: 58px; place-items: center; padding: 0; color: #fff; background: #ef111c; border: 0; border-radius: 50%; cursor: pointer; font-family: Arial, sans-serif; font-size: 42px; line-height: 1; transform: translateX(-50%); }
.dialog-close:hover { background: #ff2932; }
.dialog-main { display: grid; grid-template-columns: 112px minmax(0, 1.25fr) minmax(300px, .9fr); min-height: 530px; padding: 72px 56px 36px; gap: 34px; }
.dialog-product-picker { display: flex; flex-direction: column; justify-content: center; gap: 10px; }
.dialog-product-picker button { width: 100%; height: 58px; padding: 3px; overflow: hidden; background: #232323; border: 1px solid transparent; border-radius: 3px; cursor: pointer; }
.dialog-product-picker button:hover, .dialog-product-picker button.active { border-color: #ef111c; }
.dialog-product-picker img { width: 100%; height: 100%; object-fit: contain; }
.dialog-product-visual { position: relative; display: grid; align-content: center; justify-items: center; min-width: 0; }
.dialog-product-visual p { position: absolute; top: 0; left: 0; margin: 0; color: #ef111c; font-family: var(--ruijun-font-latin); font-size: 11px; letter-spacing: .12em; }
.dialog-product-visual h2 { position: absolute; top: 22px; left: 0; margin: 0; font-size: clamp(28px, 3vw, 44px); line-height: 1; }
.dialog-product-visual > span { position: absolute; top: 77px; left: 0; color: #a6a6a6; font-family: var(--ruijun-font-latin); font-size: 13px; }
.dialog-product-visual > img { width: min(100%, 580px); max-height: 338px; object-fit: contain; }
.dialog-model-options { position: absolute; right: 0; bottom: 0; left: 0; display: flex; flex-wrap: wrap; gap: 7px; }
.dialog-model-options button { padding: 7px 9px; color: #c8c8c8; background: #242424; border: 1px solid transparent; border-radius: 2px; cursor: pointer; font-family: var(--ruijun-font-latin); font-size: 11px; }
.dialog-model-options button:hover, .dialog-model-options button.active { color: #fff; border-color: #ef111c; }
.dialog-capabilities { display: grid; align-content: center; gap: 13px; }
.dialog-capabilities button { position: relative; display: grid; grid-template-columns: 118px minmax(0, 1fr); grid-template-rows: auto auto; min-height: 102px; overflow: hidden; color: #fff; background: #181818; border: 1px solid transparent; cursor: pointer; text-align: left; }
.dialog-capabilities button:hover, .dialog-capabilities button.active { border-color: #ef111c; }
.dialog-capabilities img { grid-row: 1 / span 2; width: 118px; height: 102px; object-fit: cover; filter: brightness(.68); }
.dialog-capabilities span { align-self: end; padding: 0 15px 4px; color: #fff; font-size: 14px; font-weight: 600; }
.dialog-capabilities small { padding: 0 15px 13px; color: #a7a7a7; font-size: 11px; line-height: 1.4; }
.dialog-specification { display: grid; grid-template-columns: 80px minmax(0, 1fr) minmax(220px, .65fr); gap: 28px; padding: 35px 56px 48px; background: #f1f1f2; color: #292929; }
.dialog-spec-label { display: flex; align-items: flex-start; gap: 9px; }
.dialog-spec-label span { display: grid; width: 34px; height: 90px; place-items: center; color: #fff; background: #1459af; border-radius: 17px; font-family: var(--ruijun-font-latin); font-size: 12px; writing-mode: vertical-rl; }
.dialog-spec-label b { color: #1459af; font-size: 14px; writing-mode: vertical-rl; }
.dialog-specification h3 { margin: 0 0 18px; color: #3c3c3c; font-family: var(--ruijun-font-latin); font-size: 21px; font-weight: 500; }
.dialog-specification dl { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 7px 24px; margin: 0; font-size: 12px; }
.dialog-specification dt { color: #6c6c6e; }
.dialog-specification dd { margin: 0; color: #333; text-align: right; }
.dialog-spec-drawing { display: grid; justify-items: center; align-content: center; min-width: 0; }
.dialog-spec-drawing strong { color: #1459af; font-family: var(--ruijun-font-latin); font-size: 30px; font-weight: 500; }
.dialog-spec-drawing img { width: 100%; max-height: 160px; object-fit: contain; }
@media (max-width: 900px) { .dialog-model-search { grid-template-columns: 1fr; gap: 18px; margin: 0 32px; padding: 8px 0 28px; }.product-model-results { grid-template-columns: 1fr; } }
@media (max-width: 1500px) { .machine-showcase, .reason-section, .specification-section, .product-resources { margin-right: 6.2%; margin-left: 6.2%; } }
@media (max-width: 900px) { .product-overview { height: auto; min-height: auto; padding: 104px 24px 48px; }.overview-heading { position: static; }.product-overview::after { display: none; }.overview-kicker { top: 110px; right: 24px; }.overview-kicker span { font-size: 14px; }.proof-grid { position: static; width: auto; gap: 24px; margin-top: 108px; transform: none; }.product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }.product-card { min-height: 290px; }.product-card img { top: 55px; height: 148px; }.catalog-section { padding: 0 24px 60px; }.product-resources { margin-right: 6.2%; margin-left: 6.2%; }.product-dialog-backdrop { padding: 78px 18px 18px; }.product-dialog { max-height: calc(100svh - 96px); }.dialog-main { grid-template-columns: 112px minmax(0, 1fr); padding: 54px 32px 28px; gap: 24px; }.dialog-capabilities { grid-column: 1 / -1; grid-template-columns: repeat(3, 1fr); }.dialog-capabilities button { grid-template-columns: 1fr; grid-template-rows: 94px auto auto; }.dialog-capabilities img { grid-row: 1; width: 100%; height: 94px; }.dialog-capabilities span { padding-top: 9px; }.dialog-specification { grid-template-columns: 60px minmax(0, 1fr); padding: 28px 32px 38px; }.dialog-spec-drawing { grid-column: 2; }.dialog-close { top: 25px; } }
@media (max-width: 620px) { .product-overview { padding-top: 90px; }.overview-heading h1 { display: grid; gap: 8px; font-size: 42px; }.overview-heading h1 span { margin-left: 0; }.overview-kicker { top: 93px; }.overview-kicker b { font-size: 21px; }.proof-grid { grid-template-columns: 1fr; gap: 28px; margin-top: 74px; text-align: left; }.proof-grid article { justify-items: start; }.product-grid { grid-template-columns: 1fr; }.product-card { min-height: 318px; }.product-card img { height: 175px; }.product-resources { grid-template-columns: 1fr; margin: 0 16px 64px; }.product-dialog-backdrop { display: block; padding: 58px 0 0; }.product-dialog { width: 100%; max-height: calc(100svh - 58px); }.dialog-close { position: fixed; top: 14px; width: 44px; height: 44px; font-size: 31px; }.dialog-main { grid-template-columns: 1fr; min-height: auto; padding: 34px 20px 26px; }.dialog-product-picker { display: grid; grid-template-columns: repeat(3, 1fr); order: 2; }.dialog-product-picker button { height: 62px; }.dialog-product-visual { min-height: 330px; }.dialog-product-visual h2 { font-size: 31px; }.dialog-product-visual > img { margin-top: 55px; max-height: 222px; }.dialog-model-options { position: relative; margin-top: 7px; }.dialog-capabilities { grid-column: auto; grid-template-columns: 1fr; order: 3; }.dialog-capabilities button { grid-template-columns: 105px minmax(0, 1fr); grid-template-rows: auto auto; }.dialog-capabilities img { grid-row: 1 / span 2; width: 105px; height: 94px; }.dialog-model-search { margin: 0 20px; padding-bottom: 28px; }.dialog-model-search h3 { font-size: 22px; }.dialog-specification { grid-template-columns: 1fr; padding: 26px 20px 34px; }.dialog-spec-label span { width: 100%; height: 32px; border-radius: 3px; writing-mode: horizontal-tb; }.dialog-spec-label b { writing-mode: horizontal-tb; }.dialog-specification dl { grid-template-columns: 1fr; }.dialog-specification dd { padding-bottom: 8px; text-align: left; }.dialog-spec-drawing { grid-column: auto; } }

@media (max-width: 900px) { .product-card { min-height:0; }.product-card img { inset:0; width:100%; height:100%; }.product-series-panel { margin-top:38px; }.series-feature-panel { padding:52px 34px 34px; }.series-panel-main { grid-template-columns:150px minmax(0,1fr); gap:28px; }.series-capabilities { grid-column:1 / -1; grid-template-columns:repeat(3,1fr); justify-items:center; }.series-specification { grid-template-columns:64px minmax(0,1fr); gap:30px; padding:42px 34px; }.specification-side-label { padding-left:0; }.specification-drawings { grid-column:2; }.specification-table dl { grid-template-columns:minmax(120px,.8fr) minmax(0,1.45fr); } }
@media (max-width: 620px) { .product-copy { width:42%; min-height:46%; padding:14px; }.product-name { font-size:20px; }.product-series-panel { margin-top:28px; }.series-feature-panel { padding:46px 20px 28px; border-radius:16px; }.series-panel-main { grid-template-columns:1fr; min-height:0; }.series-model-list { grid-template-columns:repeat(2,minmax(0,1fr)); }.series-machine-visual { min-height:290px; }.series-capabilities { grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }.series-capabilities img { width:82px; height:72px; }.series-specification { grid-template-columns:1fr; gap:24px; padding:32px 20px; border-radius:16px; }.specification-side-label { justify-content:flex-start; padding:0; }.specification-side-label span { width:34px; min-width:0; min-height:0; padding:0; }.specification-table dl { grid-template-columns:1fr; gap:4px; }.specification-table dt { margin-top:10px; text-align:left; }.specification-table dd { font-size:13px; }.specification-drawings { grid-column:auto; }.specification-pager { gap:9px; }.specification-pager button { min-width:70px; } }
@media (min-width: 901px) {
  .series-panel-main {
    width: 100%;
    max-width: 1400px;
    margin-right: auto;
    margin-left: auto;
    /* Keep the side columns balanced around the centered machine image. */
    grid-template-columns: 16% 4% 56% 4% 20%;
    gap: 0;
  }
  .series-model-list,
  .workstation-intro {
    grid-column: 1;
    width: 100%;
    justify-self: stretch;
  }
  .series-machine-visual { grid-column: 3; }
  .series-capabilities {
    grid-column: 5;
    width: 100%;
    justify-self: stretch;
  }
  .series-machine-visual img {
    width: 100%;
  }
  .series-capabilities.is-text-only {
    align-content: start;
    padding-top: 15px;
  }
  /* Keep the specification copy on the same vertical rhythm as the dimension drawing. */
  .series-specification {
    grid-template-columns: 40px minmax(0, 1fr) clamp(300px, 20vw, 360px);
    min-height: 650px;
    align-items: stretch;
  }
  .series-specification.is-empty { min-height: 0; }
  .specification-table {
    align-self: stretch;
    justify-content: stretch;
    padding-top: 0;
  }
  .specification-table dl {
    flex: 1 1 auto;
    min-height: 520px;
    grid-auto-rows: minmax(32px, auto);
    align-items: center;
    gap: 0 24px;
  }
  .specification-table dt,
  .specification-table dd {
    font-size: clamp(14px, .85vw, 16px);
    line-height: 1.35;
  }
  .specification-drawings {
    align-self: stretch;
    display: grid;
    place-items: center;
    padding-top: 0;
  }
  .specification-drawings img {
    width: 100%;
    height: 100%;
    max-height: 650px;
    object-fit: contain;
  }
  /* PSD parameter marker: narrow vertical pill with a clear gap before copy. */
  .specification-side-label {
    padding-left: 6px;
    padding-top: 12px;
  }
  .specification-side-label span,
  .specification-side-label img {
    width: 28px;
  }
}
@media (max-width: 900px) {
  .specification-table dl {
    min-height: 0;
    height: auto;
    grid-auto-rows: auto;
  }
}
@media (max-width: 620px) {
  .series-panel-cta { flex-direction: column; align-items: stretch; gap: 14px; padding: 18px; }
  .series-panel-cta-actions { flex-wrap: wrap; }
  .catalog-cta-card { aspect-ratio: auto; min-height: 220px; padding: 24px; }
  .catalog-cta-card > span:not(.catalog-cta-kicker) { display: block; }
}
</style>
