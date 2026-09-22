<script setup lang="ts">
import { filterProductModels } from '~/shared/product-model-filter.mjs';
import { productResourceDownloadName } from '~/shared/product-resource-download.mjs';
import { groupPreviewProductParameters, normalizePreviewParameterGroups } from '~/shared/product-preview-parameters.mjs';
import { formatProductParameterValue, resolvePreviewProductSelection } from '~/shared/product-preview-state.mjs';
import { resolvePageSection } from '~/shared/page-sections.mjs';
import { fieldPresentationAttributes, sectionPresentationAttributes } from '~/shared/section-presentation.mjs';

function normalizeModelLabel(value: unknown) {
  return String(value || '').replace(/\((AUTO|Auto|PRO|Pro)\)/g, (_, variant: string) => `(${variant.toLowerCase()})`);
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
const { overlayRecord, overlayList, recordFor, recordsFor, session: previewSession } = useCmsDraftPreview();

if (responseError.value?.statusCode === 410) {
  throw createError({ statusCode: 410, statusMessage: 'Product is no longer published', fatal: true });
}

const product = computed<ProductRecord | null>(() => {
  const data = response.value?.data;
  const published = Array.isArray(data) ? data[0] || null : data || null;
  return overlayRecord('product_models', published, (draft) => previewSession.value?.collection === 'product_models' || !slug.value || [draft.slug, draft.model_code].map(String).includes(slug.value)) as ProductRecord | null;
});
function productBinding(fieldPath: string) {
  const productItemId = product.value?.id != null
    ? String(product.value.id)
    : previewSession.value?.collection === 'product_models' && previewSession.value?.itemId != null
      ? String(previewSession.value.itemId)
      : '';
  return {
    'data-cms-preview-collection': productItemId ? 'product_models' : undefined,
    'data-cms-preview-item-id': productItemId || undefined,
    'data-cms-preview-field-path': fieldPath
  };
}
function productVisualBinding(fieldPath: string, presentationPath: string) {
  return { ...productBinding(fieldPath), ...fieldPresentationAttributes(displayConfig.value, presentationPath) };
}
const modelQuery = ref('');
const publicModels = computed(() => {
  const data = modelsResponse.value?.data;
  return overlayList('product_models', Array.isArray(data) ? data : (Array.isArray(response.value?.data) ? response.value.data : []));
});
const filteredModels = computed(() => filterProductModels(publicModels.value, modelQuery.value));
const previewSeries = computed(() => overlayList('product_series', Array.isArray(seriesResponse.value?.data) ? seriesResponse.value.data : []));
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
  return fallbackProductCards.find((card) => card.id === fallbackId) || fallbackProductCards[index];
}
const catalogCards = computed(() => {
  const cmsCards = [...previewSeries.value]
    .filter((series) => series?.series_code || series?.slug)
    .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0))
    .map((series, index) => ({
      id: String(series.slug || series.series_code),
      index: String(index + 1).padStart(2, '0'),
      category: String(series.positioning || series.name || series.series_code),
      name: String(series.name || series.series_code),
      model: String(series.positioning || ''),
      image: String(series.cover_asset || fallbackProductCardForSeries(series, index)?.image || ''),
      capabilities: series.capabilities
    }));
  return cmsCards.length ? cmsCards : fallbackProductCards;
});
const catalogPageSize = computed(() => {
  const value = Number(paginationCopy.value?.pagination?.page_size);
  return Number.isInteger(value) ? Math.min(Math.max(value, 1), 6) : 6;
});
const catalogPage = ref(1);
const catalogPageCount = computed(() => Math.max(1, Math.ceil(catalogCards.value.length / catalogPageSize.value)));
const visibleCatalogCards = computed(() => {
  const page = Math.min(Math.max(catalogPage.value, 1), catalogPageCount.value);
  const start = (page - 1) * catalogPageSize.value;
  return catalogCards.value.slice(start, start + catalogPageSize.value);
});
const sortedPreviewSeries = computed(() => [...previewSeries.value].sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0)));
function seriesCardValue(index: number, field: 'name' | 'positioning' | 'cover_asset' | 'series_code' | 'slug', fallback: string) {
  return normalizeModelLabel(sortedPreviewSeries.value[index]?.[field] || fallback);
}
function seriesCardPresentation(index: number) {
  const presentation = sortedPreviewSeries.value[index]?.presentation;
  return presentation && typeof presentation === 'object' && !Array.isArray(presentation) ? presentation : {};
}
function seriesCardItemId(index: number, _fallback: string) {
  return String(sortedPreviewSeries.value[index]?.id || '').trim();
}

type PsdFeature = { label: string; detail?: string; note?: string; image?: string };
type PsdSeriesDetail = {
  models: readonly string[];
  machine: string;
  features: readonly PsdFeature[];
  intro?: { title: string; subtitle: string; scene: string; body: string };
};

const psdSeriesDetails: Record<string, PsdSeriesDetail> = {
  workstation: {
    models: [],
    machine: '/assets/psd/product-detail/workstation-machine.png',
    intro: {
      title: '灵动切割工作站',
      subtitle: '无人化加工解决方案',
      scene: '批量化精密零部件自动切割',
      body: '灵动切割工作站搭载自动穿丝系统，与机器人高效协作，精密夹具快速定位，自动化上下料无缝衔接；实现切割流程全自动化，全程精准把控，开启智能制造新时代！'
    },
    features: [
      { label: '自动穿丝系统' },
      { label: '六轴协作机器人', note: '多种方式可供选择' },
      { label: '多工位零点夹具', note: '多种夹具可供选择' },
      { label: '精密中走丝机床', note: '多种机型可供选择' }
    ]
  },
  auto: {
    models: ['FR400XS(auto)', 'FR500XS(auto)', 'FR600XS(auto)', 'FR7055XS(auto)', 'FR8055XS(auto)', 'FR8060XS(auto)'],
    machine: '/assets/psd/product-detail/auto-machine.png',
    features: [
      { label: '自动穿丝', detail: '全自动穿丝模式\n半自动穿丝模式\n带动态感知穿丝功能', image: '/assets/psd/product-detail/auto-threading.png' },
      { label: '伺服张力控制', detail: '多组传感器和伺服驱动技术，实时感知并动态调整钼丝张力', image: '/assets/psd/product-detail/auto-tension.png' },
      { label: '自适应切割功能', detail: '针对不同高度材料，自动调节放电参数，无需人工干涉', image: '/assets/psd/product-detail/auto-adaptive.png' }
    ]
  },
  pro: {
    models: ['FR400XS(pro)', 'FR500XS(pro)', 'FR600XS(pro)', 'FR7055XS(pro)', 'FR8055XS(pro)', 'FR8060XS(pro)'],
    machine: '/assets/psd/product-detail/pro-machine.png',
    features: [
      { label: '自适应切割功能', image: '/assets/psd/product-detail/pro-adaptive.png' },
      { label: '效率提升50%', image: '/assets/psd/product-detail/pro-efficiency.png' },
      { label: '屏显手持单元', image: '/assets/psd/product-detail/pro-handheld.png' }
    ]
  },
  ft: {
    models: ['FT400XS(pro)', 'FT500XS(pro)', 'FT600XS(pro)', 'FT7055XS(pro)', 'FT8055XS(pro)', 'FT8060XS(pro)'],
    machine: '/assets/psd/product-detail/ft-machine.png',
    features: [
      { label: '五轴数控' },
      { label: '四轴螺距补偿' },
      { label: '机电一体化设计' },
      { label: '全新3.0控制系统' }
    ]
  },
  'fr-y': {
    models: ['FR-Y8060', 'FR-Y1080'],
    machine: '/assets/psd/product-detail/fr-y-machine.png',
    features: [
      { label: '高精度摇摆装置', note: '获国家发明专利', image: '/assets/psd/product-detail/fr-y-swing.png' },
      { label: '单边35度大锥度', image: '/assets/psd/product-detail/fr-y-taper.png' },
      { label: '全新屏显手持单元', image: '/assets/psd/product-detail/fr-y-handheld.png' }
    ]
  },
  fl: {
    models: ['FL8060XS(pro)', 'FL1180XS(pro)', 'FL1390XS(pro)', 'FL1610XS(pro)', 'FL2160XS(pro)'],
    machine: '/assets/psd/product-detail/fl-machine.png',
    features: [
      { label: '五轴数控' },
      { label: '四轴螺距补偿' },
      { label: '辅助上丝功能' },
      { label: '全新3.0控制系统' }
    ]
  }
};
const selectedCard = ref('auto');
const selectedModel = ref(normalizeModelLabel(product.value?.model_code || 'FR7055XS(pro)'));
const selectedReason = ref(0);
const drawingPage = ref(0);
const detailsOpen = ref(false);
let proofFrame = 0;
let overviewEntryFrame = 0;
let productHashScrollFrame = 0;

const activeCard = computed(() => catalogCards.value.find((card) => card.id === selectedCard.value) || catalogCards.value[0]);
function psdDetailKey(card: any) {
  const value = [card?.id, card?.name, card?.category].filter(Boolean).join(' ').toLowerCase();
  if (value.includes('workstation') || value.includes('工作站') || value.includes('无人化')) return 'workstation';
  if (value.includes('auto') || value.includes('自动穿丝')) return 'auto';
  if (value.includes('fr-y') || value.includes('摇摆')) return 'fr-y';
  if (value.includes('ft')) return 'ft';
  if (value.includes('fl') || value.includes('重大型')) return 'fl';
  return 'pro';
}
const activeSeriesCode = computed(() => {
  const previewModelSeries = previewSession.value?.collection === 'product_models'
    ? String(product.value?.series_code || previewSession.value.preview?.series_code || '')
    : '';
  return previewModelSeries || String(previewSeries.value.find((series) => String(series.slug || series.series_code) === activeCard.value?.id)?.series_code || activeCard.value?.id || '');
});
const activeSeriesDetail = computed(() => psdSeriesDetails[psdDetailKey({ ...activeCard.value, id: activeSeriesCode.value || activeCard.value?.id })] || psdSeriesDetails.pro);
const activeModels = computed(() => {
  const psdModels = activeSeriesDetail.value.models.map((model_code) => ({ model_code, name: model_code }));
  const previewModel = product.value && String(product.value.series_code || '') === activeSeriesCode.value ? product.value : null;
  if (!slug.value || !publicModels.value.length) return previewModel ? [previewModel, ...psdModels.filter((model) => normalizeModelLabel(model.model_code) !== normalizeModelLabel(previewModel.model_code))] : psdModels;
  const models = publicModels.value.filter((model) => String(model.series_code || '') === activeSeriesCode.value);
  const visibleModels = models.length ? models : psdModels;
  return previewModel ? [previewModel, ...visibleModels.filter((model) => normalizeModelLabel(model.model_code) !== normalizeModelLabel(previewModel.model_code))] : visibleModels;
});
const activeModelOptions = computed(() => activeModels.value.map((model) => normalizeModelLabel(model.model_code || model.name || '')));
const selectedModelRecord = computed(() => activeModels.value.find((model) => normalizeModelLabel(model.model_code) === selectedModel.value) || activeModels.value[0] || product.value || null);
function jsonObject(value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string') return {};
  try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; }
}
const displayConfig = computed(() => jsonObject(selectedModelRecord.value?.configuration));
const displayLabels = computed(() => jsonObject(displayConfig.value.labels));
const activeIntro = computed(() => {
  const fallback = activeSeriesDetail.value.intro;
  const source = displayConfig.value.intro && typeof displayConfig.value.intro === 'object' ? displayConfig.value.intro : {};
  if (!fallback && !Object.values(source).some((value) => String(value || '').trim())) return null;
  return { ...(fallback || { title: '', subtitle: '', scene: '', body: '' }), ...Object.fromEntries(Object.entries(source).filter(([, value]) => String(value || '').trim())) };
});
const displayName = computed(() => normalizeModelLabel(selectedModelRecord.value?.name || activeCard.value?.name || selectedModel.value));
const displayModel = computed(() => normalizeModelLabel(selectedModelRecord.value?.model_code || selectedModel.value));
const displayImage = computed(() => displayConfig.value.machineImage || selectedModelRecord.value?.media?.[0]?.path || activeSeriesDetail.value.machine);
const displayImageAlt = computed(() => selectedModelRecord.value?.media?.[0]?.alt || `${displayName.value} 机床设备`);
const displayImageFieldPath = computed(() => selectedModelRecord.value?.media?.[0]?.path && selectedModelRecord.value.media[0].path === displayImage.value ? 'media.0' : '');
const featureReasons = computed(() => Array.isArray(displayConfig.value.features) && displayConfig.value.features.length ? displayConfig.value.features : activeSeriesDetail.value.features);
function featurePresentationPath(index: number, field: 'label' | 'detail' | 'note' | 'image') {
  return `features_${index}_${field}`;
}
const fallbackParameters = [
  ['机床型号', 'FR7055XS'],
  ['X,Y,Z轴行程', '700*550*400'],
  ['U,V轴行程', '± 40'],
  ['最佳表面粗糙度', 'Ra≤0.8~1.0 μm（多次切割）Multi-cutting'],
  ['多次切割精度', '± 0.005mm（12mm*12mm*30mm 对边六角 Regular hexagon）'],
  ['最大工件重量', '1000KG'],
  ['机床重量', '≈ 3250KG'],
  ['X,Y,U,V轴驱动', '四轴交流伺服 4axis Servo'],
  ['储液箱容量', '≈ 180L'],
  ['过滤方式', '双泵强压单滤循环系统 Double pump filtration'],
  ['电源输入规格', '220V / 380V 50~60Hz'],
  ['总电气功率', '3KVA']
];
const specificationRows = computed(() => {
  const current = selectedModelRecord.value;
  const parameter = recordFor('product_parameters');
  if (parameter && (!slug.value || String(parameter.model_code || '') === displayModel.value)) {
    return fallbackParameters.map((row) => row[0] === parameter.field_name ? [row[0], [formatProductParameterValue(parameter.value), formatProductParameterValue(parameter.unit)].filter(Boolean).join(' ')] : row);
  }
  const entries = current?.parameters && typeof current.parameters === 'object' ? Object.entries(current.parameters) : [];
  const parameterUnits = current?.parameter_units && typeof current.parameter_units === 'object' ? current.parameter_units : {};
  const configured = Array.isArray(displayConfig.value.parameters) ? displayConfig.value.parameters.flatMap((row: any) => {
    if (!row || typeof row !== 'object' || !String(row.label || row.name || '').trim()) return [];
    const value = [formatProductParameterValue(row.value), formatProductParameterValue(row.unit)].filter(Boolean).join(' ');
    return value ? [[String(row.label || row.name), value]] : [];
  }) : [];
  const normalizedEntries = entries.flatMap(([key, value]) => {
    const displayValue = [formatProductParameterValue(value), formatProductParameterValue(parameterUnits[key])].filter(Boolean).join(' ');
    return displayValue ? [[key, displayValue]] : [];
  });
  return configured.length ? configured : (normalizedEntries.length ? normalizedEntries : fallbackParameters);
});
const parameterGroups = computed(() => {
  const previewGroups = groupPreviewProductParameters(recordsFor('product_parameters'), displayModel.value);
  if (previewGroups.length) return previewGroups;
  const groups = selectedModelRecord.value?.parameter_groups;
  if (Array.isArray(groups) && groups.length) {
    const normalized = normalizePreviewParameterGroups(groups);
    if (normalized.length) return normalized;
  }
  return [{ name: '', items: specificationRows.value.map(([label, value]) => ({ id: '', label, value })) }];
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
  const index = catalogCards.value.findIndex((card) => card.id === id);
  if (index >= 0) catalogPage.value = Math.floor(index / catalogPageSize.value) + 1;
  selectedCard.value = id;
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

function onDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeProduct();
}

onMounted(() => window.addEventListener('keydown', onDialogKeydown));
function syncPreviewProductSelection() {
  const selection = resolvePreviewProductSelection(previewSession.value, catalogCards.value, previewSeries.value);
  if (!selection) return;
  detailsOpen.value = true;
  if (selection.selectedCard) selectedCard.value = selection.selectedCard;
  const activePreviewModel = previewSession.value?.collection === 'product_models' ? product.value?.model_code : '';
  if (activePreviewModel || selection.selectedModel) selectedModel.value = normalizeModelLabel(activePreviewModel || selection.selectedModel);
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
    previewSeries.value.map((series) => `${series?.slug || ''}:${series?.series_code || ''}`).join('|')
  ],
  syncPreviewProductSelection,
  { immediate: true }
);
onMounted(() => {
  proofDomReady.value = true;
  openHashProduct();
  const overview = document.querySelector<HTMLElement>('.product-overview');
  const proofNumberNodes = [...document.querySelectorAll<HTMLElement>('[data-proof-target]')];
  overviewEntryFrame = requestAnimationFrame(() => {
    overviewEntryFrame = requestAnimationFrame(() => overview?.classList.add('is-entered'));
  });
  const duration = 1500;
  const startedAt = performance.now();
  const animateProof = (now: number) => {
    if (previewSession.value) {
      syncPreviewProofNumbers();
      return;
    }
    const elapsed = now - startedAt;
    proofNumberNodes.forEach((node) => {
      const target = Number(node.dataset.proofTarget || 0);
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = String(Math.round(target * eased));
    });
    if (elapsed < duration) proofFrame = requestAnimationFrame(animateProof);
  };
  if (previewSession.value) syncPreviewProofNumbers();
  else proofFrame = requestAnimationFrame(animateProof);
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
  cancelAnimationFrame(proofFrame);
  cancelAnimationFrame(overviewEntryFrame);
  cancelAnimationFrame(productHashScrollFrame);
});
useSeoMeta({
  title: () => slug.value ? `${displayName.value} 产品详情` : '产品中心',
  description: () => slug.value ? `${displayName.value} 的产品配置、特点与公开技术参数。` : '瑞钧智科中走丝线切割机床产品中心、设备特点与技术参数。'
});
</script>

<template>
  <main class="product-detail-page">
    <SiteHeader />

    <section class="product-overview" v-bind="sectionPresentationAttributes(overviewCopy)" data-cms-preview-key="hero" aria-labelledby="product-overview-title">
      <div class="overview-heading cms-positioned">
        <h1 id="product-overview-title" class="cms-styled-text"><span v-bind="fieldPresentationAttributes(overviewCopy, 'title')" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ overviewCopy.title }}</span> <span v-bind="fieldPresentationAttributes(overviewCopy, 'kicker')" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation.kicker">{{ overviewCopy.kicker }}</span></h1>
      </div>
      <div class="overview-kicker cms-positioned" v-bind="sectionPresentationAttributes(categoriesCopy)" data-cms-preview-key="categories" aria-hidden="true"><b v-bind="fieldPresentationAttributes(categoriesCopy, 'kicker')" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation.kicker">{{ categoriesCopy.kicker || '3大' }}</b><span class="cms-styled-text" v-bind="fieldPresentationAttributes(categoriesCopy, 'title')" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ categoriesCopy.title }}</span></div>
      <div class="proof-grid">
        <article v-for="proof in proofCopy" :key="proof.id" class="cms-positioned" v-bind="sectionPresentationAttributes(proof)" :data-cms-preview-key="proof.id">
          <strong v-if="proof.value" class="cms-styled-text"><span :data-proof-target="proof.value" :data-cms-preview-field-path="proof.value ? 'value' : 'title'">0</span><em :data-cms-preview-field-path="proof.value ? 'unit' : 'body'">{{ proof.unit }}</em></strong>
          <strong v-else class="cms-styled-text" data-cms-preview-field-path="title">{{ proof.title }}</strong>
          <span class="cms-styled-text" data-cms-preview-field-path="body">{{ proof.body }}</span>
        </article>
      </div>
    </section>

    <section class="catalog-section" v-bind="sectionPresentationAttributes(modelListCopy)" data-cms-preview-key="model-list" aria-labelledby="catalog-title">
      <h2 id="catalog-title" class="sr-only">{{ modelListCopy.title }}</h2>
      <div class="product-grid cms-positioned" :class="{ 'has-selection': detailsOpen }">
        <div v-for="(family, pageIndex) in visibleCatalogCards" :key="family.id" class="product-card-wrap" data-cms-preview-collection="product_series" :data-cms-preview-item-id="seriesCardItemId((catalogPage - 1) * catalogPageSize + pageIndex, family.id)" :data-cms-preview-key="seriesCardItemId((catalogPage - 1) * catalogPageSize + pageIndex, family.id) ? seriesCardValue((catalogPage - 1) * catalogPageSize + pageIndex, 'series_code', seriesCardValue((catalogPage - 1) * catalogPageSize + pageIndex, 'slug', family.id)) : undefined">
          <button :id="family.id" type="button" class="product-card" :class="{ 'is-selected': detailsOpen && selectedCard === family.id }" :aria-expanded="detailsOpen && selectedCard === family.id" data-cms-preview-field-path="name" @click="openProduct(family.id)">
          <img :src="seriesCardValue((catalogPage - 1) * catalogPageSize + pageIndex, 'cover_asset', family.image)" data-cms-preview-field-path="cover_asset" data-cms-preview-media-role="cover" :alt="`${seriesCardValue((catalogPage - 1) * catalogPageSize + pageIndex, 'name', family.name)} 产品图`">
          <span class="product-copy"><span class="product-kicker" v-bind="fieldPresentationAttributes(seriesCardPresentation((catalogPage - 1) * catalogPageSize + pageIndex), 'positioning')" data-cms-preview-field-path="positioning" data-cms-preview-position-field-path="presentation.field_presentation.positioning">{{ family.index.replace(/^0/, '') }}/{{ seriesCardValue((catalogPage - 1) * catalogPageSize + pageIndex, 'positioning', family.category) }}</span><span class="product-name" v-bind="fieldPresentationAttributes(seriesCardPresentation((catalogPage - 1) * catalogPageSize + pageIndex), 'name')" data-cms-preview-field-path="name" data-cms-preview-position-field-path="presentation.field_presentation.name">{{ seriesCardValue((catalogPage - 1) * catalogPageSize + pageIndex, 'name', family.name) }}</span></span>
          </button>
          <button v-if="detailsOpen && selectedCard === family.id" class="details-jump" type="button" aria-label="向下查看系列详情" @click="scrollToDetails">&#8595;</button>
        </div>
      </div>
      <nav v-if="catalogPageCount > 1" class="catalog-pager" :aria-label="paginationCopy.title" data-cms-preview-key="pagination">
          <button type="button" :disabled="catalogPage === 1" data-cms-preview-field-path="pagination.previous_label" @click="changeCatalogPage(-1)">{{ paginationCopy.pagination?.previous_label || '上一页' }}</button>
        <span>第 {{ catalogPage }} / {{ catalogPageCount }} 页</span>
          <button type="button" :disabled="catalogPage === catalogPageCount" data-cms-preview-field-path="pagination.next_label" @click="changeCatalogPage(1)">{{ paginationCopy.pagination?.next_label || '下一页' }}</button>
      </nav>
      <section v-if="detailsOpen" id="product-details" class="product-series-panel" v-bind="sectionPresentationAttributes(parametersCopy)" data-cms-preview-key="parameters" :data-cms-preview-collection="productBinding('title')['data-cms-preview-collection']" :data-cms-preview-item-id="productBinding('title')['data-cms-preview-item-id']" :aria-label="`${activeCard.name} ${parametersCopy.title}`">
        <div class="series-feature-panel">
          <button class="series-panel-close" type="button" aria-label="收起机型详情" @click="closeProduct">×</button>
          <div class="series-panel-main" :class="{ 'is-workstation': activeIntro }">
            <div v-if="activeIntro" class="workstation-intro">
              <h3 v-bind="fieldPresentationAttributes(displayConfig, 'intro_title')" data-cms-preview-field-path="configuration.intro.title">{{ activeIntro.title }}</h3>
              <strong v-bind="fieldPresentationAttributes(displayConfig, 'intro_subtitle')" data-cms-preview-field-path="configuration.intro.subtitle">{{ activeIntro.subtitle }}</strong>
              <p><b>适应场景：</b><span v-bind="fieldPresentationAttributes(displayConfig, 'intro_scene')" data-cms-preview-field-path="configuration.intro.scene">{{ activeIntro.scene }}</span></p>
              <p v-bind="fieldPresentationAttributes(displayConfig, 'intro_body')" data-cms-preview-field-path="configuration.intro.body">{{ activeIntro.body }}</p>
            </div>
            <nav v-else class="series-model-list" aria-label="该系列机型">
              <button v-for="model in activeModelOptions" :key="model" type="button" :class="{ active: selectedModel === model }" @click="chooseModel(model)"><span v-bind="fieldPresentationAttributes(selectedModelRecord?.presentation, 'model_code')" data-cms-preview-field-path="model_code" data-cms-preview-position-field-path="presentation.field_presentation.model_code">{{ model }}</span></button>
            </nav>
            <div class="series-machine-visual"><img :src="displayImage" :alt="displayImageAlt" v-bind="productBinding(displayImageFieldPath)" data-cms-preview-media-role="machine"></div>
            <div class="series-capabilities" :class="{ 'is-text-only': featureReasons.every((reason) => !reason.image) }" aria-label="核心能力">
              <p v-if="activeIntro" class="capability-heading">{{ parametersCopy.label || '工作站设备组成：' }}</p>
              <div v-for="(reason, index) in featureReasons" :key="reason.label" class="series-capability" :class="{ 'has-image': reason.image, 'has-detail': reason.detail }">
                <img v-if="reason.image" :src="reason.image" :alt="reason.label" v-bind="productVisualBinding(`configuration.features.${index}.image`, featurePresentationPath(index, 'image'))" :data-cms-preview-position-field-path="`configuration.field_presentation.${featurePresentationPath(index, 'image')}`" data-cms-preview-placement-key="product.gallery.image" data-cms-preview-media-role="feature">
                <span v-bind="fieldPresentationAttributes(displayConfig, featurePresentationPath(index, 'label'))" :data-cms-preview-field-path="`configuration.features.${index}.label`" :data-cms-preview-position-field-path="`configuration.field_presentation.${featurePresentationPath(index, 'label')}`">{{ reason.image ? `${index + 1}.` : '' }}{{ reason.label }}</span>
                <small v-if="reason.detail" v-bind="fieldPresentationAttributes(displayConfig, featurePresentationPath(index, 'detail'))" :data-cms-preview-field-path="`configuration.features.${index}.detail`" :data-cms-preview-position-field-path="`configuration.field_presentation.${featurePresentationPath(index, 'detail')}`">{{ reason.detail }}</small>
                <small v-if="reason.note" v-bind="fieldPresentationAttributes(displayConfig, featurePresentationPath(index, 'note'))" :data-cms-preview-field-path="`configuration.features.${index}.note`" :data-cms-preview-position-field-path="`configuration.field_presentation.${featurePresentationPath(index, 'note')}`">（{{ reason.note }}）</small>
              </div>
            </div>
          </div>
        </div>
        <section id="specifications" class="series-specification" v-bind="{ ...sectionPresentationAttributes(dimensionsCopy), ...productBinding('configuration') }" data-cms-preview-key="dimensions" aria-labelledby="series-specification-title">
          <div class="specification-side-label"><span id="series-specification-title"><img :src="String(displayConfig.labels?.technicalImage || '/assets/psd/technical-label-psd.png')" :alt="String(displayLabels.technical || parametersCopy.title || '技术参数')" v-bind="productBinding('configuration.labels.technical_image_asset_id')" data-cms-preview-placement-key="product.gallery.image" data-cms-preview-media-role="technical"></span></div>
          <div class="specification-table"><dl><template v-for="(group, groupIndex) in parameterGroups" :key="`${group.name}-${groupIndex}`"><dt v-if="group.name" class="parameter-group-title" :data-cms-preview-key="group.groupBinding?.itemId ? `parameter-${group.groupBinding.itemId}` : undefined" :data-cms-preview-collection="group.groupBinding?.collection" :data-cms-preview-item-id="group.groupBinding?.itemId" data-cms-preview-field-path="group_name" :data-cms-preview-group-record-ids="group.groupBinding?.recordIds?.join(',') || undefined">{{ group.name }}</dt><dd v-if="group.name" class="parameter-group-spacer" aria-hidden="true"></dd><template v-for="item in group.items" :key="`${group.name}-${item.id || item.label}`"><dt v-bind="fieldPresentationAttributes(item.presentation, 'field_name')" :data-cms-preview-key="item.id ? `parameter-${item.id}` : undefined" :data-cms-preview-collection="item.id ? 'product_parameters' : undefined" :data-cms-preview-item-id="item.id || undefined" :data-cms-preview-field-path="item.id ? 'field_name' : undefined">{{ item.label }}</dt><dd v-bind="fieldPresentationAttributes(item.presentation, 'value')" :data-cms-preview-key="item.id ? `parameter-${item.id}` : undefined" :data-cms-preview-collection="item.id ? 'product_parameters' : undefined" :data-cms-preview-item-id="item.id || undefined" :data-cms-preview-field-path="item.id ? 'value' : undefined">{{ item.value }}<span v-if="item.unit" v-bind="fieldPresentationAttributes(item.presentation, 'unit')" :data-cms-preview-key="item.id ? `parameter-${item.id}` : undefined" :data-cms-preview-collection="item.id ? 'product_parameters' : undefined" :data-cms-preview-item-id="item.id || undefined" :data-cms-preview-field-path="item.id ? 'unit' : undefined"> {{ item.unit }}</span></dd></template></template></dl><p v-bind="fieldPresentationAttributes(dimensionsCopy, 'body')" data-cms-preview-field-path="body" data-cms-preview-position-field-path="field_presentation.body">{{ dimensionsCopy.body || '注：1.表中所述加工性能参数是在本公司指定条件（材料、加工条件、环境、测量参数）下进行的实验结果　2.某些功能配置需要选装' }}</p></div>
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
      <article v-if="resources.length" v-bind="sectionPresentationAttributes(resourcesCopy)" data-cms-preview-key="resources" :data-cms-preview-collection="productBinding('resources')['data-cms-preview-collection']" :data-cms-preview-item-id="productBinding('resources')['data-cms-preview-item-id']"><p class="eyebrow">{{ resourcesCopy.kicker }}</p><a v-for="(resource, resourceIndex) in resources" :key="`${productResourceUrl(resource)}-${resourceIndex}`" :href="productResourceUrl(resource)" :data-cms-preview-field-path="`resources.${resourceIndex}.title`" :data-cms-preview-link-field-path="`resources.${resourceIndex}.url`" :download="productResourceDownloadName(resource)" :target="productResourceUrl(resource).startsWith('https://') ? '_blank' : undefined" :rel="productResourceUrl(resource).startsWith('https://') ? 'noreferrer' : undefined"><span :data-cms-preview-field-path="`resources.${resourceIndex}.type`">{{ resource.type || '资料' }}</span><strong :data-cms-preview-field-path="`resources.${resourceIndex}.title`">{{ resource.title }}</strong><b aria-hidden="true">-></b></a></article>
      <article v-if="caseStudies.length" v-bind="sectionPresentationAttributes(casesCopy)" data-cms-preview-key="cases"><p class="eyebrow" data-cms-preview-field-path="kicker">{{ casesCopy.kicker }}</p><a v-for="caseStudy in caseStudies" :key="caseStudy.url" :href="caseStudy.url" :target="caseStudy.url.startsWith('https://') ? '_blank' : undefined" :rel="caseStudy.url.startsWith('https://') ? 'noreferrer' : undefined"><strong>{{ caseStudy.title }}</strong><span v-if="caseStudy.summary">{{ caseStudy.summary }}</span><b aria-hidden="true">-></b></a></article>
    </section>

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
.product-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; max-width: 1280px; margin: 0 auto; }
.catalog-pager { display:flex; align-items:center; justify-content:center; gap:18px; max-width:1280px; margin:28px auto 0; color:#333; font-size:14px; }.catalog-pager button { min-width:92px; border:1px solid #1f1f1f; background:#fff; color:#1f1f1f; padding:9px 14px; font:inherit; cursor:pointer; }.catalog-pager button:hover:not(:disabled),.catalog-pager button:focus-visible { border-color:#ed1f2b; background:#ed1f2b; color:#fff; outline:0; }.catalog-pager button:disabled { cursor:not-allowed; opacity:.4; }
.product-card-wrap { position: relative; min-width: 0; }
.product-card { position: relative; display: block; width: 100%; aspect-ratio: 420 / 259; min-height: 0; padding: 0; overflow: hidden; color: #fff; background: #dbe1e3; border: 0; border-radius: 0; cursor: pointer; text-align: left; transition: transform .35s cubic-bezier(.22,.8,.24,1), box-shadow .35s ease; }
.product-card:hover { z-index: 1; transform:translateY(-5px); box-shadow:0 16px 30px rgb(24 32 34 / 16%); }
.product-grid.has-selection .product-card { transition:transform .45s cubic-bezier(.22,.8,.24,1), box-shadow .35s ease; }
.product-grid.has-selection .product-card.is-selected { z-index:2; transform:translateY(-18px); box-shadow:0 18px 32px rgb(24 32 34 / 20%); }
.details-jump { position:absolute; z-index:3; top:100%; left:50%; display:grid; width:44px; height:44px; place-items:center; padding:0; color:#fff; background:#f1373b; border:0; border-radius:50%; cursor:pointer; font-size:25px; line-height:1; box-shadow:0 7px 16px rgb(24 32 34 / 20%); transform:translate(-50%, calc(-50% - 18px)); transition:transform .25s ease,background .25s ease; }
.details-jump:hover { background:#d9272f; transform:translate(-50%, calc(-50% - 15px)); }
.product-card img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transition:transform .7s cubic-bezier(.22,.8,.24,1); }
.product-card:hover img { transform:scale(1.035); }
.product-copy { position:absolute; z-index:1; top:50%; right:0; display:grid; align-content:center; gap:6px; width:36%; min-height:34%; box-sizing:border-box; padding:12px; color:#fff; background:rgb(63 65 66 / 74%); transform:translateY(-50%); }
.product-kicker { overflow:hidden; color:#13c7e8; font-size:clamp(10px,.66vw,13px); line-height:1.2; text-overflow:ellipsis; white-space:nowrap; }
.product-name { overflow:hidden; color:#fff; font-size:clamp(14px,1.02vw,20px); font-weight:500; line-height:1.18; text-overflow:ellipsis; white-space:nowrap; }
.product-series-panel { position:relative; max-width:1280px; margin:54px auto 0; padding:0; background:transparent; }
.series-feature-panel { position:relative; padding:64px 72px 48px; background:#e8e8e9; border-radius:26px; }
.series-panel-close { position:absolute; top:-23px; left:50%; display:grid; width:46px; height:46px; place-items:center; padding:0; color:#fff; background:#f1373b; border:0; border-radius:50%; cursor:pointer; font-family:Arial,sans-serif; font-size:40px; line-height:1; transform:translateX(-50%); }
.series-panel-main { display:grid; grid-template-columns:190px minmax(0,1fr) minmax(250px,300px); min-height:408px; gap:42px; align-items:stretch; }
.series-model-list { display:grid; align-content:center; gap:18px; }
.series-model-list button { min-height:48px; padding:0 16px; color:#f0eeee; background:#4d4e4e; border:0; border-radius:6px; cursor:pointer; font-family:Arial,var(--ruijun-font-latin),sans-serif; font-size:17px; text-align:left; transition:background .2s ease,color .2s ease; }
.series-model-list button:hover,.series-model-list button.active { color:#2a2929; background:#7e7e7e; }
.workstation-intro { align-self:center; color:#3e4144; }
.workstation-intro h3 { margin:0 0 12px; font-size:24px; font-weight:500; line-height:1.15; }
.workstation-intro > strong { display:block; margin-bottom:32px; color:#404347; font-size:18px; font-weight:400; }
.workstation-intro p { margin:0 0 15px; font-size:13px; line-height:1.75; }
.workstation-intro p b { display:block; margin-bottom:5px; font-size:14px; font-weight:500; }
.series-machine-visual { position:relative; display:grid; min-width:0; min-height:370px; align-items:end; justify-items:center; }
.series-machine-visual img { width:min(100%,680px); max-height:390px; object-fit:contain; }
.series-capabilities { display:grid; align-content:center; gap:18px; min-width:0; }
.capability-heading { margin:0 0 2px; color:#44484b; font-size:14px; font-weight:500; }
.series-capability { position:relative; display:grid; justify-items:center; gap:7px; color:#11139a; font-size:13px; line-height:1.35; text-align:center; }
.series-capability img { width:108px; height:108px; object-fit:cover; border-radius:17px; }
.series-capability small { color:#4f5357; font-size:11px; font-weight:400; line-height:1.6; white-space:pre-line; }
.series-capability.has-detail { grid-template-columns:92px minmax(0,1fr); justify-items:start; gap:3px 16px; text-align:left; }
.series-capability.has-detail img { grid-row:1 / span 3; width:92px; height:92px; }
.series-capability.has-detail span { align-self:end; font-weight:500; }
.series-capability.has-detail small { align-self:start; }
.series-capabilities.is-text-only { justify-items:stretch; gap:26px; }
.series-capabilities.is-text-only .series-capability { grid-template-columns:14px minmax(0,1fr); justify-items:start; gap:3px 14px; color:#070192; font-size:20px; text-align:left; }
.series-capabilities.is-text-only .series-capability::before { width:13px; height:13px; margin-top:5px; background:#070192; border-radius:50%; content:""; }
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
.specification-table p { margin:24px 0 0; color:#6a6c70; font-size:8px; line-height:1.45; }
.specification-drawings { align-self:end; min-width:0; padding-top:2px; }
.specification-table .parameter-group-title { grid-column: 1 / -1; margin-top: 10px; padding-top: 10px; color: #686c70; border-top: 1px solid var(--ruijun-line); font-weight: 600; }
.specification-table .parameter-group-spacer { display: none; }
.specification-drawings img { display:block; width:100%; height:auto; }
.specification-pager { display:flex; justify-content:center; align-items:center; gap:18px; margin:0; padding:28px 0 30px; color:#5a5d60; background:#f4f4f3; font-family:var(--ruijun-font-latin); font-size:13px; }.specification-pager button { min-width:76px; padding:9px 13px; color:#fff; background:#225da8; border:0; border-radius:3px; cursor:pointer; font-size:14px; line-height:1; }.specification-pager button:disabled { cursor:default; opacity:1; }
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
</style>
