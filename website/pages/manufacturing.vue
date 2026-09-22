<script setup lang="ts">
import { fieldPresentationAttributes, normalizeSectionPresentation, positionedItemPresentationAttributes, sectionPresentationAttributes } from '~/shared/section-presentation.mjs';
import { manufacturingTextBinding } from '~/shared/visual-binding-paths.mjs';
import { createManufacturingMediaBinding } from '~/shared/manufacturing-media-binding.mjs';
import { buildManufacturingSections } from '~/shared/manufacturing-sections.mjs';
useSeoMeta({ title: '先进制造', description: '瑞钧智科先进制造能力、工厂与检测流程。' });

type PsdLayer = { name: string; x: number; y: number; width: number; height: number; alt: string };
type ManufacturingMedia = { path: string; managed?: boolean; mediaType?: 'image' | 'video'; posterPath?: string; alt?: string; title?: string };
type ManufacturingMediaBinding = { collection: string; itemId: string; fieldPath: string; mediaRole: 'image' | 'video'; mediaSlot?: string };
type PsdText = { id: string; text: string; x: number; y: number; width: number; height: number; size: number; tone?: 'dark' | 'light'; weight?: 400 | 500 | 700; fit?: 'title' | 'body' | 'detail'; collection?: string; itemId?: string };

const asset = (name: string) => `/assets/manufacturing-psd/layers/${name}.png`;
const route = useRoute();
const hoveredFooterLayer = ref('');
const manufacturingRoot = ref<HTMLElement | null>(null);
let manufacturingMotionCleanup: (() => void) | undefined;

const motionScenes = [
  { id: 'hero', y: 0 },
  { id: 'cnc', y: 2813 },
  { id: 'metal', y: 4183 },
  { id: 'assembly', y: 5242 },
  { id: 'inspection', y: 6609 },
  { id: 'electrical', y: 7643 },
  { id: 'warehouse', y: 8978 },
  { id: 'equipment', y: 10404 }
] as const;

function motionSceneForY(y: number) {
  let scene: typeof motionScenes[number] | undefined;
  for (const candidate of motionScenes) {
    if (y < candidate.y) break;
    scene = candidate;
  }
  return y < 11153 ? scene?.id : undefined;
}

function motionKindFor(layer: PsdLayer) {
  return !layer.alt || layer.name === 'hero-building' ? 'backdrop' : 'image';
}

function motionSideFor(layer: PsdLayer) {
  const center = layer.x + layer.width / 2;
  if (center < 1640) return 'left';
  if (center > 2200) return 'right';
  const sceneIndex = motionScenes.findIndex((scene) => scene.id === motionSceneForY(layer.y));
  return sceneIndex % 2 === 0 ? 'right' : 'left';
}

// Coordinates are the original Photoshop pixel bounds on the 3840px artboard.
const layers: PsdLayer[] = [
  { name: 'hero-building', x: 0, y: 0, width: 3840, height: 2156, alt: '瑞钧智科生产基地' },
  { name: 'hero-panel', x: 689, y: 1506, width: 2463, height: 1144, alt: '' },
  { name: 'hero-process-copy', x: 918, y: 1905, width: 607, height: 116, alt: 'World top class production process' },
  { name: 'hero-output-copy', x: 918, y: 2115, width: 567, height: 53, alt: '年产量可达10000台' },
  { name: 'hero-production-image', x: 1736, y: 1721, width: 1246, height: 701, alt: '生产车间' },
  { name: 'cnc-card-background', x: 325, y: 2813, width: 3192, height: 1130, alt: '' },
  { name: 'cnc-main', x: 607, y: 2984, width: 926, height: 527, alt: 'CNC龙门加工中心' },
  { name: 'cnc-horizontal', x: 1548, y: 2983, width: 455, height: 256, alt: '卧式加工中心' },
  { name: 'cnc-rail-grinder', x: 1548, y: 3255, width: 455, height: 256, alt: '导轨磨床' },
  { name: 'cnc-surface-grinder', x: 1548, y: 3529, width: 455, height: 256, alt: '建德磨床' },
  { name: 'cnc-vertical', x: 606, y: 3525, width: 455, height: 256, alt: '立式加工中心' },
  { name: 'cnc-gantry', x: 1079, y: 3525, width: 455, height: 256, alt: '龙门加工中心' },
  { name: 'cnc-title', x: 2927, y: 3026, width: 312, height: 79, alt: 'CNC车间' },
  { name: 'cnc-description', x: 2260, y: 3316, width: 1004, height: 123, alt: '自动化数控设备替代传统机械加工' },
  { name: 'cnc-detail', x: 2251, y: 3556, width: 822, height: 161, alt: '核心设备说明' },
  { name: 'metal-title', x: 332, y: 4269, width: 365, height: 79, alt: '钣金车间' },
  { name: 'metal-description', x: 327, y: 4470, width: 1296, height: 124, alt: '钣金车间说明' },
  { name: 'metal-detail', x: 325, y: 4717, width: 1297, height: 123, alt: '钣金核心设备说明' },
  { name: 'metal-bending-center', x: 1994, y: 4183, width: 708, height: 398, alt: '折弯中心' },
  { name: 'metal-laser', x: 2753, y: 4183, width: 708, height: 398, alt: '激光加工' },
  { name: 'metal-bending', x: 1994, y: 4631, width: 708, height: 398, alt: '折弯加工' },
  { name: 'metal-coating', x: 2747, y: 4631, width: 708, height: 398, alt: '喷涂产线' },
  { name: 'assembly-card-background', x: 325, y: 5242, width: 3192, height: 1130, alt: '' },
  { name: 'assembly-main', x: 601, y: 5524, width: 1041, height: 586, alt: '装配车间' },
  { name: 'assembly-detail', x: 1696, y: 5657, width: 592, height: 334, alt: '装配工位' },
  { name: 'assembly-title', x: 2911, y: 5438, width: 365, height: 78, alt: '装配车间' },
  { name: 'assembly-description', x: 2410, y: 5679, width: 903, height: 262, alt: '装配车间说明' },
  { name: 'inspection-title', x: 360, y: 6652, width: 367, height: 79, alt: '精密检测' },
  { name: 'inspection-description', x: 358, y: 6927, width: 824, height: 123, alt: '精密检测说明' },
  { name: 'inspection-laser', x: 348, y: 7184, width: 452, height: 254, alt: '激光干涉仪' },
  { name: 'inspection-vision', x: 835, y: 7184, width: 452, height: 254, alt: '影像仪' },
  { name: 'inspection-coordinate', x: 1321, y: 6890, width: 452, height: 254, alt: '三坐标仪' },
  { name: 'inspection-ballbar', x: 1322, y: 7184, width: 452, height: 254, alt: '球杆仪' },
  { name: 'inspection-main', x: 1971, y: 6609, width: 1490, height: 837, alt: '精密检测设备' },
  { name: 'electrical-card-background', x: 325, y: 7643, width: 3192, height: 1130, alt: '' },
  { name: 'electrical-bench', x: 581, y: 7956, width: 860, height: 483, alt: '电气装配作业' },
  { name: 'electrical-cabinet', x: 1512, y: 7951, width: 847, height: 477, alt: '电柜装配' },
  { name: 'electrical-title', x: 2885, y: 7939, width: 364, height: 80, alt: '电气装配' },
  { name: 'electrical-description', x: 2471, y: 8161, width: 824, height: 192, alt: '电气装配说明' },
  { name: 'warehouse-title', x: 344, y: 9411, width: 558, height: 79, alt: '智能物料仓储' },
  { name: 'warehouse-image', x: 1777, y: 8978, width: 1678, height: 945, alt: '智能物料仓储' },
  { name: 'equipment-title', x: 320, y: 10490, width: 561, height: 79, alt: '生产核心设备' },
  { name: 'equipment-1', x: 1017, y: 10404, width: 740, height: 416, alt: '平面磨床' },
  { name: 'equipment-2', x: 1812, y: 10404, width: 740, height: 415, alt: '大隈立加' },
  { name: 'equipment-3', x: 2607, y: 10404, width: 740, height: 415, alt: '威力双排' },
  { name: 'equipment-4', x: 3420, y: 10404, width: 740, height: 415, alt: '北一大隈' }
];
const equipmentFallbackGallery = layers.filter((layer) => layer.name.startsWith('equipment-') && layer.name !== 'equipment-title');
const equipmentGalleryOpen = ref(false);
const equipmentGalleryIndex = ref(0);
const currentEquipment = computed(() => equipmentGallery.value[equipmentGalleryIndex.value]);

function openEquipmentGallery(index: number) {
  equipmentGalleryIndex.value = index;
  equipmentGalleryOpen.value = true;
  document.body.classList.add('manufacturing-lightbox-open');
}

function closeEquipmentGallery() {
  equipmentGalleryOpen.value = false;
  document.body.classList.remove('manufacturing-lightbox-open');
}

function moveEquipmentGallery(step: number) {
  equipmentGalleryIndex.value = (equipmentGalleryIndex.value + step + equipmentGallery.value.length) % equipmentGallery.value.length;
}

function handleEquipmentGalleryKeydown(event: KeyboardEvent) {
  if (!equipmentGalleryOpen.value) return;
  if (event.key === 'Escape') closeEquipmentGallery();
  if (event.key === 'ArrowLeft') moveEquipmentGallery(-1);
  if (event.key === 'ArrowRight') moveEquipmentGallery(1);
}

const editableLayerNames = new Set([
  'hero-process-copy', 'hero-output-copy', 'cnc-title', 'cnc-description', 'cnc-detail', 'metal-title', 'metal-description', 'metal-detail',
  'assembly-title', 'assembly-description', 'inspection-title', 'inspection-description', 'electrical-title', 'electrical-description',
  'warehouse-title', 'equipment-title'
]);
const baseEditableTexts: PsdText[] = [
  { id: 'hero-process', text: 'World’s top class\nproduction process', x: 918, y: 1905, width: 607, height: 116, size: 38, tone: 'light', weight: 500 },
  { id: 'hero-output', text: '年产量可达10000台', x: 918, y: 2115, width: 567, height: 53, size: 30, tone: 'light', weight: 500 },
  { id: 'cnc-title', text: 'CNC车间', x: 2927, y: 3026, width: 312, height: 79, size: 58, weight: 500, fit: 'title' },
  { id: 'cnc-description', text: '自动化数控设备替代了传统的机械加工，\n拥有 100 多台套加工母机', x: 2260, y: 3316, width: 1004, height: 123, size: 30, fit: 'body' },
  { id: 'cnc-detail', text: '核心设备：\n五面体龙门、五轴数控、立式、卧式等\n各类加工中心、平面磨床、导轨磨床', x: 2251, y: 3556, width: 822, height: 161, size: 26, fit: 'detail' },
  { id: 'metal-title', text: '钣金车间', x: 332, y: 4269, width: 365, height: 79, size: 58, weight: 500, fit: 'title' },
  { id: 'metal-description', text: '集成先进的信息技术、自动化设备和工业软件，\n实现生产过程的高效、精准、透明和柔性。', x: 327, y: 4470, width: 1296, height: 124, size: 30, fit: 'body' },
  { id: 'metal-detail', text: '智能核心设备：智能下料单元、智能成型单元、\n智能焊接与连接单元、静电喷涂产线', x: 325, y: 4717, width: 1297, height: 123, size: 30, fit: 'detail' },
  { id: 'assembly-title', text: '装配车间', x: 2911, y: 5438, width: 365, height: 78, size: 58, weight: 500, fit: 'title' },
  { id: 'assembly-description', text: '装配体系依托于恒温洁净的作业\n环境，部署了20条全链路制程产\n线。实现MES系统全流程智能化\n管控。', x: 2410, y: 5679, width: 903, height: 262, size: 30, fit: 'body' },
  { id: 'inspection-title', text: '精密检测', x: 360, y: 6652, width: 367, height: 79, size: 58, weight: 500, fit: 'title' },
  { id: 'inspection-description', text: '精密的检测仪器是制造中走丝\n机床的必备。', x: 358, y: 6927, width: 824, height: 123, size: 30, fit: 'body' },
  { id: 'electrical-title', text: '电气装配', x: 2885, y: 7939, width: 364, height: 80, size: 58, weight: 500, fit: 'title' },
  { id: 'electrical-description', text: '用现代协同配送模式代替传统\n手工组装：料库根据信息主动\n将物料配送到工位', x: 2471, y: 8161, width: 824, height: 192, size: 30, fit: 'body' },
  { id: 'warehouse-title', text: '智能物料仓储', x: 344, y: 9411, width: 558, height: 79, size: 58, weight: 500, fit: 'title' },
  { id: 'equipment-title', text: '生产核心设备', x: 320, y: 10490, width: 561, height: 79, size: 58, weight: 500, fit: 'title' }
];
const { data: manufacturingResponse } = await useFetch('/api/public/v1/manufacturing-evidence', { default: () => ({ data: [] as Array<Record<string, any>> }) });
const { data: manufacturingPageResponse } = await useFetch('/api/public/v1/pages/manufacturing', { default: () => ({ data: null as Record<string, any> | null }) });
const { data: settingsResponse } = await useFetch('/api/public/v1/navigation', { default: () => ({ data: null as Record<string, any> | null }) });
const { overlayList, overlayRecord } = useCmsDraftPreview();
const manufacturingEvidence = computed(() => overlayList('manufacturing_evidence', Array.isArray(manufacturingResponse.value?.data) ? manufacturingResponse.value.data : []));
const manufacturingPage = computed(() => overlayRecord('pages', manufacturingPageResponse.value?.data || null, (draft) => draft.slug === 'manufacturing'));
const siteSettings = computed(() => overlayRecord('site_settings', settingsResponse.value?.data || {}));
const footerSettings = computed(() => siteSettings.value?.footer || {});
const contactSettings = computed(() => siteSettings.value?.contacts || {});
const brandSettings = computed(() => siteSettings.value?.brand || {});
const manufacturingSectionFallback = {
  title: '', description: '', body: '', detail: '', items: [] as Array<Record<string, any>>,
  media: [] as Array<Record<string, any>>
};
const manufacturingSections = shallowRef<Map<string, Record<string, any>>>(new Map());
watchEffect(() => {
  manufacturingSections.value = buildManufacturingSections(manufacturingPage.value, manufacturingSectionFallback);
});
function presentationFor(sectionId: string) {
  return normalizeSectionPresentation(manufacturingSections.value.get(sectionId) || {});
}
function textPresentationFor(text: PsdText & { sectionId?: string; fieldPath?: string }) {
  const section = manufacturingSections.value.get(String(text.sectionId || '')) || {};
  const fieldPath = String(text.fieldPath || '');
  const fields = section.field_presentation && typeof section.field_presentation === 'object' && !Array.isArray(section.field_presentation)
    ? section.field_presentation : {};
  const presentation = /^[A-Za-z_][A-Za-z0-9_]*$/.test(fieldPath) && fields[fieldPath] && typeof fields[fieldPath] === 'object' && !Array.isArray(fields[fieldPath])
    ? fields[fieldPath] : {};
  return normalizeSectionPresentation(presentation);
}
const evidenceByKey = computed(() => new Map(manufacturingEvidence.value.map((item) => [String(item.source_key || ''), item])));
const manufacturingMediaMap: Record<string, string> = {
  'hero-building': 'hero', 'hero-production-image': 'hero', 'cnc-main': 'precision-machining', 'cnc-horizontal': 'precision-machining', 'cnc-rail-grinder': 'precision-machining', 'cnc-surface-grinder': 'precision-machining', 'cnc-vertical': 'precision-machining', 'cnc-gantry': 'precision-machining',
  'metal-bending-center': 'sheet-metal', 'metal-laser': 'sheet-metal', 'metal-bending': 'sheet-metal', 'metal-coating': 'sheet-metal', 'assembly-main': 'standardized-assembly', 'assembly-detail': 'standardized-assembly', 'inspection-laser': 'whole-machine-validation', 'inspection-vision': 'whole-machine-validation', 'inspection-coordinate': 'whole-machine-validation', 'inspection-ballbar': 'whole-machine-validation', 'inspection-main': 'whole-machine-validation', 'electrical-bench': 'electrical-assembly', 'electrical-cabinet': 'electrical-assembly', 'warehouse-image': 'smart-warehouse', 'equipment-1': 'core-equipment', 'equipment-2': 'core-equipment', 'equipment-3': 'core-equipment', 'equipment-4': 'core-equipment'
};
function mediaEntry(entry: any): ManufacturingMedia | null {
  const path = typeof entry === 'string' ? entry : String(entry?.path || entry?.url || '');
  if (!path) return null;
  const mediaType = entry && typeof entry === 'object' && entry.mediaType === 'video' ? 'video' : 'image';
  return {
    path,
    mediaType,
    ...(entry && typeof entry === 'object' && (entry.managed === true || entry.media_asset_id != null || entry.file_id) ? { managed: true } : {}),
    ...(entry && typeof entry === 'object' && entry.posterPath ? { posterPath: String(entry.posterPath) } : {}),
    ...(entry && typeof entry === 'object' && entry.alt ? { alt: String(entry.alt) } : {}),
    ...(entry && typeof entry === 'object' && entry.title ? { title: String(entry.title) } : {})
  };
}
function mediaPath(entry: any) { return mediaEntry(entry)?.path || ''; }
function pageSectionMedia(sectionId: string, index = 0) {
  return mediaPath(manufacturingSections.value.get(sectionId)?.media?.[index]);
}
function pageSectionMediaEntry(sectionId: string, index = 0) {
  return mediaEntry(manufacturingSections.value.get(sectionId)?.media?.[index]);
}
function pageSectionMediaByRole(sectionId: string, role: string) {
  const media = manufacturingSections.value.get(sectionId)?.media;
  const normalizedRole = String(role || '').trim().toLowerCase();
  if (!normalizedRole) return '';
  return mediaPath(Array.isArray(media) ? media.find((item: any) => String(item?.role || '').trim().toLowerCase() === normalizedRole) : null);
}
function pageSectionMediaEntryByRole(sectionId: string, role: string) {
  const media = manufacturingSections.value.get(sectionId)?.media;
  const normalizedRole = String(role || '').trim().toLowerCase();
  if (!normalizedRole) return null;
  return mediaEntry(Array.isArray(media) ? media.find((item: any) => String(item?.role || '').trim().toLowerCase() === normalizedRole) : null);
}
function pageSectionMediaForLayer(sectionId: string, layerName: string, index: number) {
  const media = manufacturingSections.value.get(sectionId)?.media;
  if (!Array.isArray(media)) return '';
  const normalizedLayer = layerName.toLowerCase();
  const roleMatch = media.find((item: any) => {
    const role = String(item?.role || '').trim().toLowerCase();
    return role && (role === normalizedLayer || role === `${sectionId}-${normalizedLayer}` || role.endsWith(`-${normalizedLayer}`));
  });
  return mediaPath(roleMatch) || pageSectionMedia(sectionId, index);
}
function pageSectionMediaEntryForLayer(sectionId: string, layerName: string, index: number) {
  const media = manufacturingSections.value.get(sectionId)?.media;
  if (!Array.isArray(media)) return null;
  const normalizedLayer = layerName.toLowerCase();
  const roleMatch = media.find((item: any) => {
    const role = String(item?.role || '').trim().toLowerCase();
    return role && (role === normalizedLayer || role === `${sectionId}-${normalizedLayer}` || role.endsWith(`-${normalizedLayer}`));
  });
  return mediaEntry(roleMatch || media[index]);
}
function pageSectionMediaAsset(sectionId: string, role = '', fallbackIndex = -1) {
  const section = manufacturingSections.value.get(sectionId) || {};
  const media = Array.isArray(section.media) ? section.media : [];
  const normalizedRole = String(role || '').trim().toLowerCase();
  const roleIndex = normalizedRole ? media.findIndex((item: any) => String(item?.role || '').trim().toLowerCase() === normalizedRole) : -1;
  const index = roleIndex >= 0 ? roleIndex : fallbackIndex;
  const rawEntry = index >= 0 && index < media.length ? media[index] : null;
  const entry = mediaEntry(rawEntry);
  if (!entry) return null;
  const collection = String(section.cms_collection || '');
  const itemId = String(section.cms_item_id || '');
  return {
    media: entry,
    index,
    binding: createManufacturingMediaBinding({ collection, itemId, index, entry, role: String(rawEntry?.role || normalizedRole) })
  };
}
const processAnchorCoordinates = Object.freeze({
  'top-left': { x: 760, y: 1740 }, 'top-center': { x: 1660, y: 1740 }, 'top-right': { x: 2560, y: 1740 },
  'bottom-left': { x: 760, y: 2240 }, 'bottom-center': { x: 1660, y: 2240 }, 'bottom-right': { x: 2560, y: 2240 }
});
const processAnchorOrder = Object.keys(processAnchorCoordinates);
const processNodes = computed(() => {
  const processSection = manufacturingSections.value.get('process') || {};
  const items = processSection.items;
  return (Array.isArray(items) ? items.map((item: any, sourceIndex: number) => ({ ...item, sourceIndex })) : []).sort((left: any, right: any) => Number(left?.sort_order || 0) - Number(right?.sort_order || 0)).map((item: any, index: number) => {
    const requested = String(item?.anchor || 'auto');
    const anchor = requested === 'auto' || !Object.hasOwn(processAnchorCoordinates, requested) ? processAnchorOrder[index % processAnchorOrder.length] : requested;
    const roleAsset = pageSectionMediaAsset('process', String(item?.media_role || ''));
    const itemMediaField = item.video ? 'video' : 'image';
    const media = roleAsset?.media || mediaEntry(item[itemMediaField]);
    return {
      ...item,
      anchor,
      position: processAnchorCoordinates[anchor as keyof typeof processAnchorCoordinates],
      image: media?.path || '',
      media,
      collection: processSection.cms_collection,
      itemId: processSection.cms_item_id,
      sectionKey: processSection.cms_section_key,
      titlePresentationKey: item.title ? 'title' : 'label',
      bodyPresentationKey: item.body ? 'body' : 'description',
      connectionPresentationKey: 'connection_label',
      titleFieldPath: `items.${item.sourceIndex}.${item.title ? 'title' : 'label'}`,
      bodyFieldPath: `items.${item.sourceIndex}.${item.body ? 'body' : 'description'}`,
      mediaFieldPath: roleAsset?.binding?.fieldPath || (media ? `items.${item.sourceIndex}.${itemMediaField}` : ''),
      connectionFieldPath: `items.${item.sourceIndex}.connection_label`,
      titlePresentationFieldPath: `items.${item.sourceIndex}.field_presentation.${item.title ? 'title' : 'label'}`,
      bodyPresentationFieldPath: `items.${item.sourceIndex}.field_presentation.${item.body ? 'body' : 'description'}`,
      connectionPresentationFieldPath: `items.${item.sourceIndex}.field_presentation.connection_label`,
      connection_label: String(item?.connection_label || '')
    };
  });
});
const mobileManufacturingSteps = computed(() => [
  { id: 'hero', fallbackTitle: '先进制造', fallbackBody: '全产业链制造与严格质量控制。', fallbackImage: asset('hero-building') },
  { id: 'precision-machining', fallbackTitle: 'CNC车间', fallbackBody: '自动化数控设备替代了传统的机械加工。', fallbackImage: asset('cnc-main') },
  { id: 'sheet-metal', fallbackTitle: '钣金车间', fallbackBody: '实现生产过程的高效、精准、透明和柔性。', fallbackImage: asset('metal-bending-center') },
  { id: 'standardized-assembly', fallbackTitle: '装配车间', fallbackBody: '部署全链路制程产线，实现智能化管控。', fallbackImage: asset('assembly-main') },
  { id: 'whole-machine-validation', fallbackTitle: '精密检测', fallbackBody: '精密检测保障设备质量。', fallbackImage: asset('inspection-main') },
  { id: 'electrical-assembly', fallbackTitle: '电气装配', fallbackBody: '协同配送物料到装配工位。', fallbackImage: asset('electrical-bench') },
  { id: 'smart-warehouse', fallbackTitle: '智能物料仓储', fallbackBody: '智能物料仓储保障生产协同。', fallbackImage: asset('warehouse-image') },
  { id: 'core-equipment', fallbackTitle: '生产核心设备', fallbackBody: '点击图片查看设备素材。', fallbackImage: asset('equipment-1') }
].map((step) => {
  const section = manufacturingSections.value.get(step.id) || {};
  return {
    ...step,
    title: String(section.title || step.fallbackTitle),
    body: String(section.description || section.body || step.fallbackBody),
    media: pageSectionMediaEntry(step.id) || mediaEntry(evidenceByKey.value.get(step.id)?.media?.[0]) || mediaEntry(step.fallbackImage),
    image: pageSectionMedia(step.id) || mediaPath(evidenceByKey.value.get(step.id)?.media?.[0]) || step.fallbackImage
  };
}));
const mobileManufacturingFlow = computed(() => {
  const [hero, ...zones] = mobileManufacturingSteps.value;
  const nodes = processNodes.value.map((node: any, index: number) => ({
    id: `process-node-${index + 1}`,
    title: String(node.title || node.label || `工艺步骤 ${index + 1}`),
    body: String(node.body || node.description || ''),
    media: node.media || pageSectionMediaEntry('process', index) || hero?.media,
    image: node.image || pageSectionMedia('process', index) || hero?.image
  }));
  return [hero, ...nodes, ...zones].filter(Boolean);
});
const equipmentGallery = computed(() => {
  const section = manufacturingSections.value.get('core-equipment') || {};
  const pageMedia = Array.isArray(section.media) ? section.media : [];
  const evidence = evidenceByKey.value.get('core-equipment');
  const evidenceMedia = Array.isArray(evidence?.media) ? evidence.media : [];
  const usesPageMedia = pageMedia.length > 0;
  const media = usesPageMedia ? pageMedia : evidenceMedia;
  const entries = media.map((item: any, sourceIndex: number) => ({ media: mediaEntry(item), sourceIndex })).filter((item: any) => item.media) as Array<{ media: ManufacturingMedia; sourceIndex: number }>;
  if (!usesPageMedia) return entries.length ? entries.map(({ media: item, sourceIndex }, index) => ({
    ...equipmentFallbackGallery[index % equipmentFallbackGallery.length],
    name: `equipment-cms-${index}`,
    alt: item.alt || item.title || '生产核心设备',
    image: item.path,
    media: item,
    binding: usesPageMedia
      ? createManufacturingMediaBinding({ collection: 'pages', itemId: section.cms_item_id, index: sourceIndex, entry: item })
      : createManufacturingMediaBinding({ collection: 'manufacturing_evidence', itemId: evidence?.id, index: sourceIndex, entry: item })
  })) : equipmentFallbackGallery.map((item) => ({ ...item, media: mediaEntry(asset(item.name)), binding: null }));

  // Page-level media may be populated one slot at a time. Keep every fixed
  // PSD position visible and give each empty position its own governed slot.
  const equipmentPageEntryByIndex = new Map(entries.map((entry) => [entry.sourceIndex, entry]));
  const visibleEntries = equipmentFallbackGallery.map((fallback, index) => {
    const entry = equipmentPageEntryByIndex.get(index);
    if (entry) return {
      ...fallback,
      name: `equipment-cms-${index}`,
      alt: entry.media.alt || entry.media.title || fallback.alt,
      image: entry.media.path,
      media: entry.media,
      binding: createManufacturingMediaBinding({ collection: 'pages', itemId: section.cms_item_id, index, entry: entry.media })
    };
    const fallbackMedia = mediaEntry(asset(fallback.name));
    return {
      ...fallback,
      media: fallbackMedia,
      binding: createManufacturingMediaBinding({ collection: 'pages', itemId: section.cms_item_id, index, entry: fallbackMedia, role: fallback.name })
    };
  });
  const overflowEntries = entries.filter(({ sourceIndex }) => sourceIndex >= equipmentFallbackGallery.length).map(({ media: item, sourceIndex }, index) => ({
    ...equipmentFallbackGallery[index % equipmentFallbackGallery.length],
    name: `equipment-cms-${sourceIndex}`,
    alt: item.alt || item.title || '生产核心设备',
    image: item.path,
    media: item,
    binding: createManufacturingMediaBinding({ collection: 'pages', itemId: section.cms_item_id, index: sourceIndex, entry: item })
  }));
  return [...visibleEntries, ...overflowEntries];
});
const equipmentSectionTitle = computed(() => String(manufacturingSections.value.get('core-equipment')?.title || '生产核心设备'));
function dynamicLayerMedia(layer: PsdLayer): ManufacturingMedia {
  const footerAssetPaths: Record<string, string> = {
    'footer-27': String(brandSettings.value.footer_logo_path || brandSettings.value.logo_path || ''),
    'footer-01': String(footerSettings.value.address_icon_path || ''),
    'footer-03': String(footerSettings.value.phone_icon_path || ''),
    'footer-02': String(footerSettings.value.email_icon_path || '')
  };
  if (footerAssetPaths[layer.name] && /^https?:\/\//.test(footerAssetPaths[layer.name])) return mediaEntry(footerAssetPaths[layer.name])!;
  const key = manufacturingMediaMap[layer.name];
  if (!key) return mediaEntry(asset(layer.name))!;
  const layerIndex = layers.filter((candidate) => manufacturingMediaMap[candidate.name] === key).findIndex((candidate) => candidate.name === layer.name);
  const pageMedia = pageSectionMediaEntryForLayer(key, layer.name, layerIndex);
  if (pageMedia) return pageMedia;
  const media = evidenceByKey.value.get(key)?.media;
  if (!Array.isArray(media)) return mediaEntry(asset(layer.name))!;
  const roleEntry = media.find((entry: any) => {
    const role = String(entry?.role || '').trim().toLowerCase();
    const normalizedLayer = layer.name.toLowerCase();
    return role && (role === normalizedLayer || role === `${key}-${normalizedLayer}` || role.endsWith(`-${normalizedLayer}`));
  });
  const entry = roleEntry || media[layerIndex];
  return mediaEntry(entry) || mediaEntry(asset(layer.name))!;
}
function emptyMediaBinding(): ManufacturingMediaBinding {
  return { collection: '', itemId: '', fieldPath: '', mediaRole: 'image' };
}
function mediaBindingForLayer(layer: PsdLayer): ManufacturingMediaBinding {
  const sectionKey = manufacturingMediaMap[layer.name];
  if (!sectionKey) return emptyMediaBinding();
  const layerIndex = layers.filter((candidate) => manufacturingMediaMap[candidate.name] === sectionKey).findIndex((candidate) => candidate.name === layer.name);
  const pageMedia = manufacturingSections.value.get(sectionKey)?.media;
  const normalizedLayer = layer.name.toLowerCase();
  const pageRoleIndex = Array.isArray(pageMedia) ? pageMedia.findIndex((entry: any) => {
    const role = String(entry?.role || '').trim().toLowerCase();
    return role && (role === normalizedLayer || role === `${sectionKey}-${normalizedLayer}` || role.endsWith(`-${normalizedLayer}`));
  }) : -1;
  const pageAsset = pageSectionMediaAsset(sectionKey, pageRoleIndex >= 0 ? String(pageMedia?.[pageRoleIndex]?.role || '') : '', layerIndex);
  if (pageAsset?.binding) return pageAsset.binding;
  const pageCollection = String(manufacturingPage.value?.id != null ? 'pages' : '');
  const pageItemId = manufacturingPage.value?.id != null ? String(manufacturingPage.value.id) : '';
  if (pageCollection && pageItemId) {
    return createManufacturingMediaBinding({ collection: pageCollection, itemId: pageItemId, index: layerIndex, entry: mediaEntry(asset(layer.name)), role: normalizedLayer }) || emptyMediaBinding();
  }
  const record = evidenceByKey.value.get(sectionKey);
  if (!record?.id || !Array.isArray(record.media)) return emptyMediaBinding();
  const roleIndex = record.media.findIndex((entry: any) => {
    const role = String(entry?.role || '').trim().toLowerCase();
    return role && (role === normalizedLayer || role === `${sectionKey}-${normalizedLayer}` || role.endsWith(`-${normalizedLayer}`));
  });
  const index = roleIndex >= 0 ? roleIndex : layerIndex;
  if (index < 0 || index >= record.media.length) return emptyMediaBinding();
  const media = mediaEntry(record.media[index]);
  if (!media) return emptyMediaBinding();
  return createManufacturingMediaBinding({ collection: 'manufacturing_evidence', itemId: record.id, index, entry: media }) || emptyMediaBinding();
}
function dynamicLayerSrc(layer: PsdLayer) { return dynamicLayerMedia(layer).path; }
const evidenceTextTargets: Record<string, { title: string; description?: string }> = {
  'precision-machining': { title: 'cnc-title', description: 'cnc-description' },
  'standardized-assembly': { title: 'assembly-title', description: 'assembly-description' },
  'whole-machine-validation': { title: 'inspection-title', description: 'inspection-description' },
  'sheet-metal': { title: 'metal-title', description: 'metal-description' },
  'electrical-assembly': { title: 'electrical-title', description: 'electrical-description' },
  'smart-warehouse': { title: 'warehouse-title' },
  'core-equipment': { title: 'equipment-title' }
};
const editableTexts = computed(() => {
  const replacements = new Map<string, string>();
  manufacturingEvidence.value.forEach((item) => {
    const target = evidenceTextTargets[String(item.source_key || '')];
    if (!target) return;
    if (item.process) replacements.set(target.title, String(item.process));
    if (item.description) replacements.set(target.description, String(item.description));
  });
  return baseEditableTexts.map((text) => {
    const binding = manufacturingTextBinding(text.id);
    const section = binding ? manufacturingSections.value.get(binding.sectionKey) || {} : {};
    const replacement = binding?.fieldPath === 'title'
      ? section.title
      : binding?.fieldPath === 'processTitle'
        ? section.processTitle
        : binding?.fieldPath === 'outputText'
          ? section.outputText
      : binding?.fieldPath === 'detail'
        ? section.detail
        : binding?.fieldPath === 'description'
          ? (section.description || section.body)
          : section.body;
    const evidence = binding ? evidenceByKey.value.get(binding.sectionKey) : null;
    return {
      ...text,
      text: String(replacement || replacements.get(text.id) || text.text),
      sectionId: binding?.sectionKey,
      fieldPath: binding?.fieldPath,
      positionFieldPath: binding?.fieldPath ? `field_presentation.${binding.fieldPath}` : undefined,
      collection: manufacturingPage.value?.id != null ? 'pages' : (evidence?.id != null ? 'manufacturing_evidence' : undefined),
      itemId: manufacturingPage.value?.id != null ? String(manufacturingPage.value.id) : (evidence?.id != null ? String(evidence.id) : undefined)
    };
  });
});
const editableFooterLayerNames = new Set(['footer-25', 'footer-26', 'footer-24', 'footer-23', 'footer-22', 'footer-21', 'footer-20', 'footer-16', 'footer-13', 'footer-15', 'footer-14', 'footer-19', 'footer-18', 'footer-17', 'footer-12', 'footer-11', 'footer-10', 'footer-05', 'footer-04', 'footer-08', 'footer-07', 'footer-06']);
const baseEditableFooterTexts: PsdText[] = [
  { id: 'footer-products', text: '产品中心', x: 1853, y: 11591, width: 327, size: 30, tone: 'light', weight: 500 },
  { id: 'footer-workstation', text: '灵动切割工作站', x: 1857, y: 11734, width: 292, size: 16, tone: 'light' },
  { id: 'footer-auto', text: 'FR-XS(auto)', x: 1860, y: 11804, width: 261, size: 16, tone: 'light' },
  { id: 'footer-pro', text: 'FR-XS(pro)', x: 1860, y: 11868, width: 218, size: 16, tone: 'light' },
  { id: 'footer-ft', text: 'FT-XS(pro)', x: 1860, y: 11930, width: 220, size: 16, tone: 'light' },
  { id: 'footer-fry', text: 'FR-Y', x: 1860, y: 11987, width: 192, size: 16, tone: 'light' },
  { id: 'footer-fl', text: 'FL-XS(pro)', x: 1860, y: 12049, width: 216, size: 16, tone: 'light' },
  { id: 'footer-manufacturing', text: '先进智造', x: 2483, y: 11591, width: 328, size: 30, tone: 'light', weight: 500 },
  { id: 'footer-cnc', text: 'CNC车间', x: 2482, y: 11742, width: 155, size: 16, tone: 'light' },
  { id: 'footer-metal', text: '钣金车间', x: 2482, y: 11796, width: 163, size: 16, tone: 'light' },
  { id: 'footer-assembly', text: '装配车间', x: 2482, y: 11850, width: 163, size: 16, tone: 'light' },
  { id: 'footer-about', text: '关于我们', x: 3089, y: 11591, width: 326, size: 30, tone: 'light', weight: 500 },
  { id: 'footer-honors', text: '荣誉资质认证', x: 3090, y: 11748, width: 249, size: 16, tone: 'light' },
  { id: 'footer-history', text: '品牌发展历程', x: 3090, y: 11805, width: 248, size: 16, tone: 'light' },
  { id: 'footer-address-changshu', text: '常熟工厂：江苏省苏州市常熟市沙家浜儒浜路78号', x: 545, y: 12127, width: 1062, size: 16, tone: 'light' },
  { id: 'footer-address-kunshan', text: '昆山工厂：江苏省苏州市昆山市巴城苏杭路88号', x: 547, y: 12193, width: 1012, size: 16, tone: 'light' },
  { id: 'footer-phone', text: '热线：13738375470\n外贸：17751119936', x: 549, y: 12340, width: 468, size: 16, tone: 'light' },
  { id: 'footer-email-domestic', text: '国内邮箱：ksrjjx@126.com', x: 556, y: 12535, width: 602, size: 16, tone: 'light' },
  { id: 'footer-email-export', text: '外贸邮箱：kylewuedm@gmail.com', x: 549, y: 12600, width: 740, size: 16, tone: 'light' },
  { id: 'footer-purchase-title', text: '大批量采购', x: 3084, y: 12259, width: 257, size: 20, tone: 'light' },
  { id: 'footer-purchase-copy-title', text: '你有量', x: 3121, y: 12352, width: 183, size: 32, tone: 'light', weight: 700 },
  { id: 'footer-purchase-copy-subtitle', text: '我有价', x: 3121, y: 12412, width: 183, size: 32, tone: 'light', weight: 700 },
  { id: 'footer-purchase-phone', text: '15050166844', x: 3047, y: 12536, width: 330, size: 16, tone: 'light' }
];
const manufacturingFooterSlots = [
  { titleId: 'footer-products', linkIds: ['footer-workstation', 'footer-auto', 'footer-pro', 'footer-ft', 'footer-fry', 'footer-fl'] },
  { titleId: 'footer-manufacturing', linkIds: ['footer-cnc', 'footer-metal', 'footer-assembly'] },
  { titleId: 'footer-about', linkIds: ['footer-honors', 'footer-history'] }
];
const footerTextBindingById: Record<string, string> = {
  'footer-products': 'footer.columns.0.title',
  'footer-workstation': 'footer.columns.0.links.0.label',
  'footer-auto': 'footer.columns.0.links.1.label',
  'footer-pro': 'footer.columns.0.links.2.label',
  'footer-ft': 'footer.columns.0.links.3.label',
  'footer-fry': 'footer.columns.0.links.4.label',
  'footer-fl': 'footer.columns.0.links.5.label',
  'footer-manufacturing': 'footer.columns.1.title',
  'footer-cnc': 'footer.columns.1.links.0.label',
  'footer-metal': 'footer.columns.1.links.1.label',
  'footer-assembly': 'footer.columns.1.links.2.label',
  'footer-about': 'footer.columns.2.title',
  'footer-honors': 'footer.columns.2.links.0.label',
  'footer-history': 'footer.columns.2.links.1.label',
  'footer-address-changshu': 'contacts.addresses.0',
  'footer-address-kunshan': 'contacts.addresses.1',
  'footer-phone': 'contacts.domestic_phone',
  'footer-email-domestic': 'contacts.domestic_email',
  'footer-email-export': 'contacts.export_email',
  'footer-purchase-title': 'footer.purchase_label',
  'footer-purchase-copy-title': 'footer.purchase_title',
  'footer-purchase-copy-subtitle': 'footer.purchase_subtitle',
  'footer-purchase-phone': 'footer.purchase_phone'
};
function footerTextBinding(textId: string) {
  const fieldPath = footerTextBindingById[textId];
  const itemId = siteSettings.value?.id;
  return fieldPath && itemId != null
    ? { collection: 'site_settings', itemId: String(itemId), fieldPath }
    : null;
}
function footerColumns(value: unknown) {
  return Array.isArray(value) ? [...value].sort((left: any, right: any) => Number(left?.sort_order || 0) - Number(right?.sort_order || 0)).slice(0, 3) : [];
}
const editableFooterTexts = computed(() => {
  const replacements = new Map(baseEditableFooterTexts.map((item) => [item.id, item.text]));
  footerColumns(footerSettings.value.columns).forEach((column: any, columnIndex) => {
    const slot = manufacturingFooterSlots[columnIndex];
    if (!slot) return;
    replacements.set(slot.titleId, String(column?.title || ''));
    const links = Array.isArray(column?.links) ? column.links : [];
    slot.linkIds.forEach((id, linkIndex) => replacements.set(id, String(links[linkIndex]?.label || '')));
  });
  const addresses = Array.isArray(contactSettings.value.addresses) ? contactSettings.value.addresses : [];
  if (addresses.length) {
    replacements.set('footer-address-changshu', String(addresses[0] || ''));
    replacements.set('footer-address-kunshan', String(addresses[1] || ''));
  }
  const domesticPhone = String(contactSettings.value.domestic_phone || contactSettings.value.service_phone || '').trim();
  const exportPhone = String(contactSettings.value.export_phone || '').trim();
  if (domesticPhone || exportPhone) replacements.set('footer-phone', [`热线：${domesticPhone}`, exportPhone ? `外贸：${exportPhone}` : ''].filter(Boolean).join('\n'));
  if (contactSettings.value.domestic_email) replacements.set('footer-email-domestic', `国内邮箱：${contactSettings.value.domestic_email}`);
  if (contactSettings.value.export_email) replacements.set('footer-email-export', `外贸邮箱：${contactSettings.value.export_email}`);
  if (footerSettings.value.purchase_label) replacements.set('footer-purchase-title', String(footerSettings.value.purchase_label));
  if (footerSettings.value.purchase_title) replacements.set('footer-purchase-copy-title', String(footerSettings.value.purchase_title));
  if (footerSettings.value.purchase_subtitle) replacements.set('footer-purchase-copy-subtitle', String(footerSettings.value.purchase_subtitle));
  if (footerSettings.value.purchase_phone) replacements.set('footer-purchase-phone', String(footerSettings.value.purchase_phone));
  return baseEditableFooterTexts.map((item) => ({ ...item, text: replacements.get(item.id) || '' }));
});

const footerLayers: PsdLayer[] = [
  { name: 'footer-28', x: -32, y: 11153, width: 3896, height: 1888, alt: '' },
  { name: 'footer-27', x: 417, y: 11590, width: 960, height: 126, alt: '瑞钧中走丝' },
  { name: 'footer-25', x: 1853, y: 11591, width: 327, height: 70, alt: '产品中心' },
  { name: 'footer-26', x: 1857, y: 11734, width: 292, height: 35, alt: '灵动切割工作站' },
  { name: 'footer-24', x: 1860, y: 11804, width: 261, height: 34, alt: 'FR-XS(auto)' },
  { name: 'footer-23', x: 1860, y: 11868, width: 218, height: 34, alt: 'FR-XS(pro)' },
  { name: 'footer-22', x: 1860, y: 11930, width: 220, height: 34, alt: 'FT-XS(pro)' },
  { name: 'footer-21', x: 1860, y: 11987, width: 192, height: 34, alt: 'FR-Y' },
  { name: 'footer-20', x: 1860, y: 12049, width: 216, height: 34, alt: 'FL-XS(pro)' },
  { name: 'footer-16', x: 2483, y: 11591, width: 328, height: 70, alt: '先进智造' },
  { name: 'footer-13', x: 2482, y: 11742, width: 155, height: 35, alt: 'CNC车间' },
  { name: 'footer-15', x: 2482, y: 11796, width: 163, height: 36, alt: '钣金车间' },
  { name: 'footer-14', x: 2482, y: 11850, width: 163, height: 35, alt: '装配车间' },
  { name: 'footer-19', x: 3089, y: 11591, width: 326, height: 70, alt: '关于我们' },
  { name: 'footer-18', x: 3090, y: 11748, width: 249, height: 36, alt: '荣誉资质认证' },
  { name: 'footer-17', x: 3090, y: 11805, width: 248, height: 35, alt: '品牌发展历程' },
  { name: 'footer-12', x: 545, y: 12127, width: 1062, height: 40, alt: '常熟工厂地址' },
  { name: 'footer-11', x: 547, y: 12193, width: 1012, height: 40, alt: '昆山工厂地址' },
  { name: 'footer-01', x: 404, y: 12129, width: 67, height: 100, alt: '' },
  { name: 'footer-10', x: 549, y: 12340, width: 468, height: 92, alt: '服务热线' },
  { name: 'footer-03', x: 392, y: 12337, width: 90, height: 89, alt: '' },
  { name: 'footer-05', x: 556, y: 12535, width: 602, height: 41, alt: '国内邮箱' },
  { name: 'footer-04', x: 549, y: 12600, width: 740, height: 41, alt: '外贸邮箱' },
  { name: 'footer-02', x: 390, y: 12549, width: 93, height: 65, alt: '' },
  { name: 'footer-09', x: 2974, y: 12206, width: 447, height: 432, alt: '大批量采购' },
  { name: 'footer-08', x: 3067, y: 12259, width: 257, height: 44, alt: '大批量采购' },
  { name: 'footer-07', x: 3110, y: 12352, width: 183, height: 123, alt: '你有量我有价' },
  { name: 'footer-06', x: 3030, y: 12536, width: 330, height: 32, alt: '15050166844' }
];

function sectionForLayer(layer: PsdLayer) {
  return manufacturingMediaMap[layer.name] || '';
}
const styleFor = (layer: PsdLayer) => {
  const presentation = presentationFor(sectionForLayer(layer));
  const offset = presentation.layout.desktop;
  return {
  '--x': layer.x + layer.width * offset.offset_x / 100,
  '--y': layer.y + layer.height * offset.offset_y / 100,
  '--w': layer.width,
  '--h': layer.height,
  '--cms-layer-fit': presentation.media_presentation.fit,
  '--cms-layer-position': `${presentation.media_presentation.focal_x}% ${presentation.media_presentation.focal_y}%`
  };
};
const textStyleFor = (text: PsdText & { sectionId?: string; fieldPath?: string }) => {
  const presentation = textPresentationFor(text);
  const offset = presentation.layout.enabled ? presentation.layout.desktop : { offset_x: 0, offset_y: 0 };
  const isMobileHidden = presentation.responsive.enabled && presentation.responsive.mobile_visible === false;
  return {
    '--x': text.x + text.width * offset.offset_x / 100,
    '--y': text.y + text.height * offset.offset_y / 100,
    '--w': text.width,
    '--h': text.height,
    '--size': presentation.text_style.enabled && presentation.text_style.size_desktop ? presentation.text_style.size_desktop : text.size,
    '--mobile-size': presentation.text_style.enabled && presentation.text_style.size_mobile ? presentation.text_style.size_mobile : text.size,
    '--weight': presentation.text_style.enabled ? presentation.text_style.weight : text.weight || 400,
    '--line-height': presentation.text_style.enabled ? presentation.text_style.line_height : 1.33,
    '--text-color': presentation.text_style.enabled && presentation.text_style.color ? presentation.text_style.color : (text.tone === 'light' ? '#FFFFFF' : '#1D1D1D'),
    '--fit-scale': text.fit === 'title' ? 1.28 : text.fit === 'detail' ? 1.6 : text.fit === 'body' ? 1.6 : 1,
    '--mobile-visible': isMobileHidden ? 'none' : 'block'
  };
};
const footerStyleKeyByTextId: Record<string, string> = { 'footer-fry': 'fr-y' };
function footerTextStyleFor(text: PsdText) {
  const key = footerStyleKeyByTextId[text.id] || text.id.replace(/^footer-/, '');
  const candidate = footerSettings.value?.text_styles?.[key];
  const enabled = candidate && typeof candidate === 'object' && candidate.enabled === true;
  const color = enabled && /^#[0-9a-f]{6}$/i.test(String(candidate.color || '').trim()) ? String(candidate.color).trim() : undefined;
  const size = Number(candidate?.size_desktop);
  const lineHeight = Number(candidate?.line_height);
  const weight = Number(candidate?.weight);
  return {
    '--fx': text.x + 32, '--fy': text.y - 11153, '--fw': text.width, '--fh': text.height,
    '--weight': enabled && [300, 400, 500, 700, 800].includes(weight) ? weight : text.weight || 400,
    ...(enabled ? {
      fontSize: Number.isFinite(size) && size >= 12 && size <= 72 ? `calc(${size} / 3896 * 100vw)` : undefined,
      lineHeight: Number.isFinite(lineHeight) && lineHeight >= 1 && lineHeight <= 2.2 ? lineHeight : undefined,
      color
    } : {})
  };
}

type FooterLink = PsdLayer & { to?: string; href?: string };
const baseFooterLinks: FooterLink[] = [
  { name: 'footer-home', x: 417, y: 11590, width: 960, height: 126, alt: '返回首页', to: '/' },
  { name: 'footer-workstation', x: 1857, y: 11734, width: 292, height: 35, alt: '灵动切割工作站', to: '/product#workstation' },
  { name: 'footer-auto', x: 1860, y: 11804, width: 261, height: 34, alt: 'FR-XS(auto)', to: '/product#auto' },
  { name: 'footer-pro', x: 1860, y: 11868, width: 218, height: 34, alt: 'FR-XS(pro)', to: '/product#pro' },
  { name: 'footer-ft', x: 1860, y: 11930, width: 220, height: 34, alt: 'FT-XS(pro)', to: '/product#ft' },
  { name: 'footer-fr-y', x: 1860, y: 11987, width: 192, height: 34, alt: 'FR-Y', to: '/product#fr-y' },
  { name: 'footer-fl', x: 1860, y: 12049, width: 216, height: 34, alt: 'FL-XS(pro)', to: '/product#fl' },
  { name: 'footer-cnc', x: 2482, y: 11742, width: 155, height: 35, alt: 'CNC车间', to: '/manufacturing#cnc' },
  { name: 'footer-metal', x: 2482, y: 11796, width: 163, height: 36, alt: '钣金车间', to: '/manufacturing#metal' },
  { name: 'footer-assembly', x: 2482, y: 11850, width: 163, height: 35, alt: '装配车间', to: '/manufacturing#assembly' },
  { name: 'footer-honors', x: 3090, y: 11748, width: 249, height: 36, alt: '荣誉资质认证', to: '/about#honor-title' },
  { name: 'footer-history', x: 3090, y: 11805, width: 248, height: 35, alt: '品牌发展历程', to: '/about#history' },
  { name: 'footer-hotline', x: 390, y: 12337, width: 627, height: 95, alt: '拨打服务热线', href: 'tel:13738375470' },
  { name: 'footer-email-domestic', x: 390, y: 12531, width: 768, height: 49, alt: '发送国内邮件', href: 'mailto:ksrjjx@126.com' },
  { name: 'footer-email-export', x: 390, y: 12596, width: 899, height: 49, alt: '发送外贸邮件', href: 'mailto:kylewuedm@gmail.com' },
  { name: 'footer-purchase', x: 2974, y: 12206, width: 447, height: 432, alt: '大批量采购', href: 'tel:15050166844' }
];
function safeFooterHref(value: unknown) {
  const href = String(value || '').trim();
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  if (/^(?:tel:|mailto:)/.test(href)) return href;
  try { return new URL(href).protocol === 'https:' ? href : ''; } catch { return ''; }
}
const footerLinks = computed<FooterLink[]>(() => {
  const targets = new Map(baseFooterLinks.map((item) => [item.name, item.to || item.href || '']));
  footerColumns(footerSettings.value.columns).forEach((column: any, columnIndex) => {
    const links = Array.isArray(column?.links) ? column.links : [];
    manufacturingFooterSlots[columnIndex]?.linkIds.forEach((textId, linkIndex) => targets.set(textId === 'footer-fry' ? 'footer-fr-y' : textId, safeFooterHref(links[linkIndex]?.href)));
  });
  const phone = String(contactSettings.value.domestic_phone || contactSettings.value.service_phone || '').replace(/[^+\d]/g, '');
  const domesticEmail = String(contactSettings.value.domestic_email || '').trim();
  const exportEmail = String(contactSettings.value.export_email || '').trim();
  const purchasePhone = String(footerSettings.value.purchase_phone || '').replace(/[^+\d]/g, '');
  if (phone) targets.set('footer-hotline', `tel:${phone}`);
  if (domesticEmail) targets.set('footer-email-domestic', `mailto:${domesticEmail}`);
  if (exportEmail) targets.set('footer-email-export', `mailto:${exportEmail}`);
  if (purchasePhone) targets.set('footer-purchase', `tel:${purchasePhone}`);
  return baseFooterLinks.flatMap((item) => {
    const href = targets.get(item.name) || '';
    return href ? [{ ...item, to: href.startsWith('/') ? href : undefined, href: href.startsWith('/') ? undefined : href }] : [];
  });
});

function scrollToManufacturingSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - 110), behavior: 'smooth' });
}

const footerTextLayerByLink: Record<string, string> = {
  'footer-home': 'footer-27',
  'footer-workstation': 'footer-workstation',
  'footer-auto': 'footer-auto',
  'footer-pro': 'footer-pro',
  'footer-ft': 'footer-ft',
  'footer-fr-y': 'footer-fry',
  'footer-fl': 'footer-fl',
  'footer-cnc': 'footer-cnc',
  'footer-metal': 'footer-metal',
  'footer-assembly': 'footer-assembly',
  'footer-honors': 'footer-honors',
  'footer-history': 'footer-history',
  'footer-hotline': 'footer-phone',
  'footer-email-domestic': 'footer-email-domestic',
  'footer-email-export': 'footer-email-export',
  'footer-purchase': 'footer-08'
};

function isFooterTextHighlighted(id: string) {
  return hoveredFooterLayer.value === id || (hoveredFooterLayer.value === 'footer-08' && id.startsWith('footer-purchase-'));
}

function handleFooterNavigation(event: MouseEvent, link: FooterLink) {
  if (!link.to?.startsWith('/manufacturing#')) return;
  event.preventDefault();
  const id = link.to.split('#')[1];
  window.history.replaceState(null, '', `#${id}`);
  scrollToManufacturingSection(id);
}

onMounted(async () => {
  window.addEventListener('keydown', handleEquipmentGalleryKeydown);
  requestAnimationFrame(() => {
    if (route.hash) scrollToManufacturingSection(route.hash.slice(1));
  });

  const root = manufacturingRoot.value;
  if (!root || window.matchMedia('(max-width: 900px), (prefers-reduced-motion: reduce)').matches) return;

  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger')
  ]);
  if (!manufacturingRoot.value) return;
  gsap.registerPlugin(ScrollTrigger);

  const context = gsap.context(() => {
    root.classList.add('motion-ready');
    motionScenes.forEach((scene) => {
      const trigger = root.querySelector<HTMLElement>(`[data-motion-trigger="${scene.id}"]`);
      if (!trigger) return;

      const backdrops = [...root.querySelectorAll<HTMLElement>(`[data-motion-scene="${scene.id}"][data-motion-kind="backdrop"]`)];
      const images = [...root.querySelectorAll<HTMLElement>(`[data-motion-scene="${scene.id}"][data-motion-kind="image"]`)];
      const lines = [...root.querySelectorAll<HTMLElement>(`[data-motion-scene="${scene.id}"][data-motion-line]`)];
      const timeline = gsap.timeline({ defaults: { ease: 'none' } });

      timeline.fromTo(backdrops,
        { autoAlpha: 0, scale: 1.025, transformOrigin: '50% 50%' },
        { autoAlpha: 1, scale: 1, duration: .72 },
        0
      );
      images.forEach((image, index) => {
        const fromLeft = image.dataset.motionSide === 'left';
        timeline.fromTo(image,
          { autoAlpha: 0, xPercent: fromLeft ? -11 : 11 },
          { autoAlpha: 1, xPercent: 0, duration: .78 },
          .08 + index * .045
        );
      });
      timeline.fromTo(lines,
        { autoAlpha: 0, yPercent: 72 },
        { autoAlpha: 1, yPercent: 0, duration: .46, stagger: .075 },
        .16
      );

      ScrollTrigger.create({
        trigger,
        start: 'top 88%',
        end: 'top 44%',
        animation: timeline,
        scrub: .75,
        invalidateOnRefresh: true
      });
    });
  }, root);

  ScrollTrigger.refresh();
  manufacturingMotionCleanup = () => {
    context.revert();
    root.classList.remove('motion-ready');
  };
});

watch(() => route.hash, (hash) => {
  if (hash) nextTick(() => scrollToManufacturingSection(hash.slice(1)));
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEquipmentGalleryKeydown);
  document.body.classList.remove('manufacturing-lightbox-open');
  manufacturingMotionCleanup?.();
  manufacturingMotionCleanup = undefined;
});
</script>

<template>
  <main ref="manufacturingRoot" class="manufacturing">
    <SiteHeader />
    <div class="hero" aria-hidden="true"></div>
    <section id="manufacturing-flow" class="psd-stage" v-bind="sectionPresentationAttributes(manufacturingSections.get('process') || {})" data-cms-preview-key="process" aria-label="瑞钧智科先进制造">
      <template v-for="layer in [...layers, ...footerLayers].filter((layer) => !editableLayerNames.has(layer.name) && !editableFooterLayerNames.has(layer.name))" :key="layer.name">
        <template v-for="mediaBinding in [mediaBindingForLayer(layer)]" :key="`${layer.name}-binding`">
        <video
          v-if="dynamicLayerMedia(layer).mediaType === 'video'"
          class="psd-layer"
          :class="[`psd-layer--${layer.name}`, { 'psd-layer--active': hoveredFooterLayer === layer.name }]"
          :src="dynamicLayerMedia(layer).path"
          :poster="dynamicLayerMedia(layer).posterPath"
          :alt="layer.alt"
          :style="styleFor(layer)"
          :data-cms-preview-key="mediaBinding.collection && mediaBinding.itemId ? sectionForLayer(layer) : undefined"
          :data-cms-preview-editable="sectionForLayer(layer) ? 'true' : undefined"
          :data-cms-preview-collection="mediaBinding.collection"
          :data-cms-preview-item-id="mediaBinding.itemId"
          :data-cms-preview-field-path="mediaBinding.fieldPath"
           :data-cms-preview-media-role="mediaBinding.mediaRole"
           :data-cms-preview-media-slot="mediaBinding.mediaSlot"
           :data-cms-preview-allow-default="mediaBinding.collection === 'pages' && mediaBinding.fieldPath ? 'true' : undefined"
          :data-motion-scene="motionSceneForY(layer.y)"
          :data-motion-kind="motionSceneForY(layer.y) ? motionKindFor(layer) : undefined"
          :data-motion-side="motionSceneForY(layer.y) ? motionSideFor(layer) : undefined"
          autoplay muted loop playsinline preload="metadata"
        />
        <img
          v-else
          class="psd-layer"
          :class="[`psd-layer--${layer.name}`, { 'psd-layer--active': hoveredFooterLayer === layer.name }]"
          :src="dynamicLayerMedia(layer).path"
          :alt="layer.alt"
          :style="styleFor(layer)"
          :data-cms-preview-key="mediaBinding.collection && mediaBinding.itemId ? sectionForLayer(layer) : undefined"
          :data-cms-preview-editable="sectionForLayer(layer) ? 'true' : undefined"
          :data-cms-preview-collection="mediaBinding.collection"
          :data-cms-preview-item-id="mediaBinding.itemId"
          :data-cms-preview-field-path="mediaBinding.fieldPath"
           :data-cms-preview-media-role="mediaBinding.mediaRole"
           :data-cms-preview-media-slot="mediaBinding.mediaSlot"
           :data-cms-preview-allow-default="mediaBinding.collection === 'pages' && mediaBinding.fieldPath ? 'true' : undefined"
          :data-motion-scene="motionSceneForY(layer.y)"
          :data-motion-kind="motionSceneForY(layer.y) ? motionKindFor(layer) : undefined"
          :data-motion-side="motionSceneForY(layer.y) ? motionSideFor(layer) : undefined"
        >
        </template>
      </template>
      <p v-for="text in editableTexts" :key="text.id" class="psd-editable-text" :class="`psd-editable-text--${text.tone || 'dark'}`" :data-cms-preview-key="text.sectionId || undefined" :data-cms-preview-collection="text.collection || undefined" :data-cms-preview-item-id="text.itemId || undefined" :data-cms-preview-editable="text.fieldPath ? 'true' : undefined" :data-cms-preview-text="text.fieldPath ? 'true' : undefined" :data-cms-preview-field-path="text.fieldPath" :data-cms-preview-position-field-path="text.positionFieldPath" :style="textStyleFor(text)">
        <span
          v-for="(line, lineIndex) in text.text.split('\n')"
          :key="`${text.id}-${lineIndex}`"
          class="psd-editable-text-line"
          :data-motion-scene="motionSceneForY(text.y)"
          data-motion-line
        >{{ line }}</span>
      </p>
      <ol v-if="processNodes.length" class="cms-process-nodes" data-cms-preview-key="process" aria-label="可编辑制造工艺节点">
        <li v-for="(node, index) in processNodes" :key="`${node.anchor}-${node.sourceIndex}`" v-bind="positionedItemPresentationAttributes(node)" :data-cms-preview-collection="node.collection" :data-cms-preview-item-id="node.itemId" :data-cms-preview-key="node.sectionKey" :data-cms-preview-editable="node.collection && node.itemId ? 'true' : undefined" :style="styleFor({ name: `process-node-${index}`, x: node.position.x, y: node.position.y, width: 520, height: 300, alt: '' })">
          <video v-if="node.media?.mediaType === 'video'" class="cms-media" :src="node.media.path" :poster="node.media.posterPath" :data-cms-preview-field-path="node.mediaFieldPath" data-cms-preview-media-role="video" muted loop autoplay playsinline preload="metadata" :aria-label="node.alt || node.title || ''"></video><img v-else-if="node.image" class="cms-media" :src="node.image" :data-cms-preview-field-path="node.mediaFieldPath" data-cms-preview-media-role="image" :alt="node.alt || node.title || ''"><div><strong class="cms-styled-text" v-bind="fieldPresentationAttributes(node, node.titlePresentationKey)" :data-cms-preview-field-path="node.titleFieldPath" :data-cms-preview-position-field-path="node.titlePresentationFieldPath">{{ node.title || node.label }}</strong><p v-bind="fieldPresentationAttributes(node, node.bodyPresentationKey)" :data-cms-preview-field-path="node.bodyFieldPath" :data-cms-preview-position-field-path="node.bodyPresentationFieldPath">{{ node.body || node.description }}</p><small v-if="node.connection_label" class="process-connection-label" v-bind="fieldPresentationAttributes(node, node.connectionPresentationKey)" :data-cms-preview-field-path="node.connectionFieldPath" :data-cms-preview-position-field-path="node.connectionPresentationFieldPath">{{ node.connection_label }}</small></div>
        </li>
      </ol>
      <button
        v-for="(equipment, index) in equipmentGallery.slice(0, 4)"
        :key="`preview-${equipment.name}`"
        class="equipment-preview-trigger"
        type="button"
        :aria-label="`放大查看${equipment.alt}`"
        :style="styleFor(equipment)"
        :data-cms-preview-collection="equipment.binding?.collection"
        :data-cms-preview-item-id="equipment.binding?.itemId"
        :data-cms-preview-key="equipment.binding ? 'core-equipment' : undefined"
        :data-cms-preview-field-path="equipment.binding?.fieldPath"
        :data-cms-preview-media-role="equipment.binding?.mediaRole"
        :data-cms-preview-editable="equipment.binding ? 'true' : undefined"
        @click="openEquipmentGallery(index)"
      />
      <div class="editable-footer-canvas">
        <template v-for="text in editableFooterTexts" :key="text.id">
          <p v-for="footerBinding in [footerTextBinding(text.id)]" :key="text.id" :class="['psd-editable-footer-text', `psd-editable-footer-text--${text.id}`, { 'is-highlighted': isFooterTextHighlighted(text.id) }]" :style="footerTextStyleFor(text)" :data-cms-preview-key="footerBinding ? 'footer' : undefined" :data-cms-preview-collection="footerBinding?.collection" :data-cms-preview-item-id="footerBinding?.itemId" :data-cms-preview-field-path="footerBinding?.fieldPath" :data-cms-preview-editable="footerBinding ? 'true' : undefined" data-cms-preview-text="true">{{ text.text }}</p>
        </template>
      </div>
      <span id="cnc" class="section-anchor" :style="styleFor({ name: 'anchor-cnc', x: 0, y: 2813, width: 1, height: 1, alt: '' })" />
      <span id="metal" class="section-anchor" :style="styleFor({ name: 'anchor-metal', x: 0, y: 4183, width: 1, height: 1, alt: '' })" />
      <span id="assembly" class="section-anchor" :style="styleFor({ name: 'anchor-assembly', x: 0, y: 5242, width: 1, height: 1, alt: '' })" />
      <span id="inspection" class="section-anchor" :style="styleFor({ name: 'anchor-inspection', x: 0, y: 6609, width: 1, height: 1, alt: '' })" />
      <span
        v-for="scene in motionScenes"
        :key="`motion-${scene.id}`"
        class="motion-scene-trigger"
        :data-motion-trigger="scene.id"
        :style="styleFor({ name: `motion-${scene.id}`, x: 0, y: scene.y, width: 1, height: 1, alt: '' })"
        aria-hidden="true"
      />
      <NuxtLink
        v-for="link in footerLinks.filter((item) => item.to)"
        :key="link.name"
        class="footer-hit-area"
        :to="link.to!"
        :external="link.to?.startsWith('/product#')"
        :aria-label="link.alt"
        :style="styleFor(link)"
        @click="handleFooterNavigation($event, link)"
        @mouseenter="hoveredFooterLayer = footerTextLayerByLink[link.name] || ''"
        @mouseleave="hoveredFooterLayer = ''"
        @focus="hoveredFooterLayer = footerTextLayerByLink[link.name] || ''"
        @blur="hoveredFooterLayer = ''"
      />
      <a
        v-for="link in footerLinks.filter((item) => item.href)"
        :key="link.name"
        class="footer-hit-area"
        :href="link.href"
        :aria-label="link.alt"
        :style="styleFor(link)"
        @mouseenter="hoveredFooterLayer = footerTextLayerByLink[link.name] || ''"
        @mouseleave="hoveredFooterLayer = ''"
        @focus="hoveredFooterLayer = footerTextLayerByLink[link.name] || ''"
        @blur="hoveredFooterLayer = ''"
      />
    </section>
    <section class="mobile-manufacturing" aria-label="先进制造流程">
      <article v-for="(step, index) in mobileManufacturingFlow" :key="step.id" class="mobile-manufacturing-step">
        <video v-if="step.media?.mediaType === 'video'" :src="step.media.path" :poster="step.media.posterPath" muted loop autoplay playsinline preload="metadata" :aria-label="step.title"></video><img v-else :src="step.image" :alt="step.title">
        <div><span>{{ String(index + 1).padStart(2, '0') }}</span><h1 v-if="index === 0">{{ step.title }}</h1><h2 v-else>{{ step.title }}</h2><p>{{ step.body }}</p></div>
      </article>
    </section>
    <SiteFooter class="mobile-footer" />
    <Teleport to="body">
      <div v-if="equipmentGalleryOpen" class="manufacturing-lightbox" role="dialog" aria-modal="true" :aria-label="`${equipmentSectionTitle}大图`" @click.self="closeEquipmentGallery">
        <button class="manufacturing-lightbox-close" type="button" aria-label="关闭大图" @click="closeEquipmentGallery">×</button>
        <button class="manufacturing-lightbox-arrow prev" type="button" aria-label="上一张" @click="moveEquipmentGallery(-1)">←</button>
        <figure>
          <video v-if="currentEquipment?.media?.mediaType === 'video'" :src="currentEquipment.media.path" :poster="currentEquipment.media.posterPath" :data-cms-preview-collection="currentEquipment.binding?.collection" :data-cms-preview-item-id="currentEquipment.binding?.itemId" data-cms-preview-key="core-equipment" :data-cms-preview-field-path="currentEquipment?.binding?.fieldPath" data-cms-preview-media-role="equipment" controls playsinline preload="metadata" :aria-label="currentEquipment.alt"></video><img v-else-if="currentEquipment" :src="currentEquipment.image || asset(currentEquipment.name)" :data-cms-preview-collection="currentEquipment.binding?.collection" :data-cms-preview-item-id="currentEquipment.binding?.itemId" data-cms-preview-key="core-equipment" :data-cms-preview-field-path="currentEquipment?.binding?.fieldPath" data-cms-preview-media-role="equipment" :alt="currentEquipment.alt">
          <figcaption v-if="currentEquipment">{{ currentEquipment.alt }} {{ equipmentGalleryIndex + 1 }} / {{ equipmentGallery.length }}</figcaption>
        </figure>
        <button class="manufacturing-lightbox-arrow next" type="button" aria-label="下一张" @click="moveEquipmentGallery(1)">→</button>
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
.manufacturing{position:relative;min-height:100vh;background:#efefef;font-family:"Source Han Sans CN Web","Microsoft YaHei",sans-serif}
.manufacturing > .hero{position:absolute;top:0;left:0;width:100%;aspect-ratio:3840 / 2524;pointer-events:none;visibility:hidden}
.psd-stage{position:relative;width:100%;aspect-ratio:3840 / 12992;overflow:hidden;background:#efefef}
.psd-layer{position:absolute;display:block;left:calc(var(--x) / 3840 * 100%);top:calc(var(--y) / 12992 * 100%);width:calc(var(--w) / 3840 * 100%);height:auto;max-width:none;object-fit:var(--cms-layer-fit,cover);object-position:var(--cms-layer-position,50% 50%)}
.psd-layer:is(video){height:calc(var(--h) / 12992 * 100%)}
.psd-layer[alt=""]{pointer-events:none}
.equipment-preview-trigger{position:absolute;z-index:4;left:calc(var(--x) / 3840 * 100%);top:calc(var(--y) / 12992 * 100%);width:calc(var(--w) / 3840 * 100%);height:calc(var(--h) / 12992 * 100%);padding:0;border:0;background:transparent;cursor:zoom-in}
.equipment-preview-trigger:hover,.equipment-preview-trigger:focus-visible{outline:3px solid #ed1f2b;outline-offset:-3px}
[data-cms-preview-edit-mode="true"] [data-cms-preview-editable="true"]{cursor:move;outline:1px dashed transparent;outline-offset:3px}
[data-cms-preview-edit-mode="true"] [data-cms-preview-editable="true"]:hover,[data-cms-preview-edit-mode="true"] [data-cms-preview-editable="true"].cms-preview-editing,[data-cms-preview-edit-mode="true"] [data-cms-preview-editable="true"].cms-preview-dragging{outline-color:#ed1f2b}
[data-cms-preview-edit-mode="true"] [data-cms-preview-text="true"].cms-preview-editing{cursor:text;background:rgb(255 255 255 / 12%);outline-style:solid}
.cms-process-nodes{position:absolute;z-index:5;inset:0;margin:0;padding:0;list-style:none;pointer-events:none}.cms-process-nodes>li{position:absolute;left:calc(var(--x) / 3840 * 100%);top:calc(var(--y) / 12992 * 100%);width:calc(var(--w) / 3840 * 100%);min-height:calc(var(--h) / 12992 * 100%);box-sizing:border-box;display:grid;grid-template-columns:110px 1fr;gap:18px;align-items:center;padding:18px;background:rgb(12 15 17 / 82%);color:#fff;pointer-events:auto}.cms-process-nodes img,.cms-process-nodes video{width:110px;aspect-ratio:1;object-fit:cover}.cms-process-nodes strong{display:block;font-size:24px}.cms-process-nodes p{margin:8px 0 0;font-size:16px;line-height:1.5}
.editable-footer-canvas{position:absolute;z-index:3;left:0;top:calc(11153 / 12992 * 100%);width:100%;height:calc(1887 / 12992 * 100%);overflow:hidden;pointer-events:none}
.psd-editable-footer-text{position:absolute;left:calc(var(--fx) / 3896 * 100%);top:calc(var(--fy) / 1887 * 100%);width:calc(var(--fw) / 3896 * 100%);min-height:calc(var(--fh) / 1887 * 100%);margin:0;white-space:pre-line;font-family:"Source Han Sans CN Web","Microsoft YaHei",sans-serif;font-size:calc(36 / 3896 * 100vw);line-height:1.35;font-weight:400;color:#bcbcbc;pointer-events:auto;transition:color .18s ease,filter .18s ease,transform .18s ease}.psd-editable-footer-text.is-highlighted{color:#fff;filter:drop-shadow(0 0 5px rgb(242 38 49 / 75%));transform:translateY(-1px)}
.psd-editable-footer-text--footer-products,.psd-editable-footer-text--footer-manufacturing,.psd-editable-footer-text--footer-about{color:#f22631;font-size:calc(64 / 3896 * 100vw);line-height:1.1;font-weight:500}.psd-editable-footer-text--footer-address-changshu,.psd-editable-footer-text--footer-address-kunshan,.psd-editable-footer-text--footer-phone,.psd-editable-footer-text--footer-email-domestic,.psd-editable-footer-text--footer-email-export{font-size:calc(34 / 3896 * 100vw);line-height:1.35}.psd-editable-footer-text--footer-purchase-title,.psd-editable-footer-text--footer-purchase-copy-title,.psd-editable-footer-text--footer-purchase-copy-subtitle,.psd-editable-footer-text--footer-purchase-phone{text-align:center}.psd-editable-footer-text--footer-purchase-title{font-size:calc(36 / 3896 * 100vw);white-space:nowrap}.psd-editable-footer-text--footer-purchase-copy-title,.psd-editable-footer-text--footer-purchase-copy-subtitle{color:#00b9e7;font-size:calc(54 / 3896 * 100vw);font-weight:700;line-height:1.08;white-space:pre}.psd-editable-footer-text--footer-purchase-phone{font-size:calc(30 / 3896 * 100vw);font-family:"Source Han Sans CN Web",monospace;letter-spacing:.04em}
.psd-editable-text{position:absolute;z-index:1;left:calc(var(--x) / 3840 * 100%);top:calc(var(--y) / 12992 * 100%);width:calc(var(--w) / 3840 * 100%);min-height:calc(var(--h) / 12992 * 100%);margin:0;white-space:pre-line;font-size:calc(var(--size) * var(--fit-scale) / 3840 * 100vw);line-height:var(--line-height,1.33);font-weight:var(--weight);letter-spacing:0;color:var(--text-color);pointer-events:auto}.psd-editable-text--dark{color:var(--text-color,#1d1d1d)}.psd-editable-text--light{color:var(--text-color,#fff)}
.psd-editable-text-line{display:block}
.motion-scene-trigger{position:absolute;left:0;top:calc(var(--y) / 12992 * 100%);width:1px;height:1px;pointer-events:none}
.motion-ready [data-motion-kind],.motion-ready [data-motion-line]{will-change:transform,opacity}
.psd-layer--active{filter:brightness(0) saturate(100%) invert(16%) sepia(93%) saturate(3656%) hue-rotate(349deg) brightness(94%) contrast(88%)}
.section-anchor{position:absolute;left:0;top:calc(var(--y) / 12992 * 100%);width:1px;height:1px;scroll-margin-top:110px}
.footer-hit-area{position:absolute;z-index:2;display:block;left:calc(var(--x) / 3840 * 100%);top:calc(var(--y) / 12992 * 100%);width:calc(var(--w) / 3840 * 100%);height:calc(var(--h) / 12992 * 100%);outline:none}
.footer-hit-area:focus-visible{outline:2px solid #ed1f2b;outline-offset:4px}
.mobile-manufacturing{display:none}
.mobile-footer{display:none}
@media(max-width:900px){
   .psd-stage{display:none}
   .mobile-footer{display:block}
   .mobile-manufacturing{display:grid;gap:0;padding-top:58px;background:#efefef;color:#262626}
   .mobile-manufacturing-step{display:grid;gap:0;border-bottom:1px solid #ddd;background:#fff}
   .mobile-manufacturing-step:nth-child(even){background:#f4f4f2}
   .mobile-manufacturing-step img,.mobile-manufacturing-step video{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}
   .mobile-manufacturing-step div{display:grid;gap:10px;padding:24px}
   .mobile-manufacturing-step span{color:#ed1f2b;font-size:13px;font-weight:700}
   .mobile-manufacturing-step h1,.mobile-manufacturing-step h2{margin:0;font-size:28px;font-weight:500}
   .mobile-manufacturing-step p{margin:0;color:#646464;font-size:15px;line-height:1.7;white-space:pre-line}
 }
@media(prefers-reduced-motion:reduce){
  [data-motion-kind],[data-motion-line]{opacity:1!important;visibility:visible!important;transform:none!important}
}
:global(body.manufacturing-lightbox-open){overflow:hidden}
.manufacturing-lightbox{position:fixed;z-index:500;inset:0;display:grid;place-items:center;padding:72px 92px;background:rgb(0 0 0 / 90%);backdrop-filter:blur(10px)}
.manufacturing-lightbox figure{display:grid;place-items:center;max-width:min(82vw,1440px);max-height:calc(100vh - 120px);margin:0}
.manufacturing-lightbox figure img,.manufacturing-lightbox figure video{display:block;max-width:100%;max-height:calc(100vh - 160px);object-fit:contain;box-shadow:0 24px 80px rgb(0 0 0 / 50%)}
.manufacturing-lightbox figcaption{margin-top:14px;color:rgb(255 255 255 / 76%);font-size:14px}
.manufacturing-lightbox-close,.manufacturing-lightbox-arrow{position:absolute;display:grid;place-items:center;border:1px solid rgb(255 255 255 / 38%);background:rgb(0 0 0 / 28%);color:#fff;cursor:pointer}
.manufacturing-lightbox-close{top:24px;right:28px;width:44px;height:44px;font-size:28px}
.manufacturing-lightbox-arrow{top:50%;width:50px;height:50px;margin-top:-25px;font-size:22px}
.manufacturing-lightbox-arrow.prev{left:24px}.manufacturing-lightbox-arrow.next{right:24px}
.manufacturing-lightbox-close:hover,.manufacturing-lightbox-close:focus-visible,.manufacturing-lightbox-arrow:hover,.manufacturing-lightbox-arrow:focus-visible{border-color:#ed1f2b;background:#ed1f2b;outline:0}
@media(max-width:900px){.manufacturing-lightbox{padding:64px 42px}.manufacturing-lightbox-arrow{width:38px;height:38px;margin-top:-19px}.manufacturing-lightbox-arrow.prev{left:8px}.manufacturing-lightbox-arrow.next{right:8px}}
</style>
