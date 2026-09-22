<script setup lang="ts">
import { buildFaqHandoffUrl, createFaqConversation, faqAssistantMode, requestFaqHandoff, streamFaqMessage, submitFaqFeedback } from '~/shared/faq-bff-client.mjs';
import { readFaqSessionId, writeFaqSessionId } from '~/shared/faq-session-store.mjs';
import { resolveServiceEntry, shouldEnableServiceEntries } from '~/shared/service-assistant.mjs';
import { createServiceEntryClick, hasConfirmedServiceExit, markServiceExitConfirmed } from '~/shared/service-exit.mjs';
import { resolveRepairPortalUrl } from '~/shared/repair-portal.mjs';
import { resolvePageSection } from '~/shared/page-sections.mjs';
import { fieldPresentationAttributes, sectionPresentationAttributes } from '~/shared/section-presentation.mjs';
import { selectSectionMediaEntry, serviceLocationRecordBinding, serviceOfficeBinding, serviceSectionMediaBinding } from '~/shared/visual-binding-paths.mjs';
import '~/assets/service-content.css';

const FAQ_CONSENT_UI_VERSION = 'website-service-v1';
const question = ref('');
const answer = ref<any>(null);
const generatedAnswer = ref('');
const loading = ref(false);
const dialogOpen = ref(false);
const faqSessionId = ref('');
const handoffConsent = ref(false);
const repairDraftSummary = ref('');
const handoffError = ref('');
const handoffLoading = ref(false);
const citations = ref<Array<{ id: string, title: string, version?: string }>>([]);
const faqRequestId = ref('');
const feedbackStatus = ref('');
const feedbackLoading = ref(false);
const pendingExit = ref<{ entryType: string, url: string } | null>(null);
const route = useRoute();
const runtimeConfig = useRuntimeConfig();
const faqBffUrl = String(runtimeConfig.public.faqBffUrl || '');
const repairPortalBaseUrl = String(runtimeConfig.public.repairPortalUrl || '');
const bffEnabled = computed(() => faqAssistantMode(faqBffUrl) === 'bff');
let activeRequest: AbortController | null = null;
let lastFocusTarget: HTMLElement | null = null;
let lastExitFocusTarget: HTMLElement | null = null;

const { data: serviceConfig } = await useFetch('/api/public/v1/service-entries', { default: () => ({ entries: {}, supportPhone: '150 5016 6844', available: false }) });
const { data: servicePageResponse } = await useFetch('/api/public/v1/pages/service', { default: () => ({ data: null }) });
const { data: repairPageConfigResponse } = await useFetch('/api/public/v1/repair-pages/repair_home', { default: () => ({ data: null }) });
const { data: resourceResponse } = await useFetch('/api/public/v1/service-resources', { default: () => ({ data: [] as Array<Record<string, unknown>> }) });
const { data: locationResponse } = await useFetch('/api/public/v1/service-locations', { default: () => ({ data: [] as Array<Record<string, unknown>> }) });
const { overlayRecord, overlayList } = useCmsDraftPreview();
const resources = computed(() => overlayList('service_resources', Array.isArray(resourceResponse.value?.data) ? resourceResponse.value.data : []));
const locations = computed(() => overlayList('service_locations', Array.isArray(locationResponse.value?.data) ? locationResponse.value.data : []));
const fallbackSupportModels = ['灵动工作站', 'FR-XS(auto)', 'FR-XS(pro)', 'FT-XS', 'FL-XS(pro)', 'FR-Y', 'FR-G', 'FH-C', '定制机型'].map((label) => ({ label, image: '/assets/service-model-icon.png' }));
const fallbackSupportActions = [
  { number: '01', title: '我的维修申请', query: '我想提交维修申请', image: '/assets/service-action-1.png?v=20260812c' },
  { number: '02', title: '保修状态验核', query: '我想核验保修状态', image: '/assets/service-action-2.png?v=20260812c' },
  { number: '03', title: '服务流程与寄修', query: '我想了解服务流程与寄修', image: '/assets/service-action-3.png?v=20260812c' },
  { number: '04', title: '视频教学', query: '我想查看视频教学', image: '/assets/service-action-4.png?v=20260812c' },
  { number: '05', title: '技术文件下载', query: '我想下载技术文件', image: '/assets/service-action-5.png?v=20260812c' },
  { number: '06', title: '常见故障分析', query: '我想查询常见故障分析', image: '/assets/service-action-6.png?v=20260812c' },
  { number: '07', title: '保养与易损件', query: '我想了解保养与易损件', image: '/assets/service-action-7.png?v=20260812c' },
  { number: '08', title: '知识分享', query: '我想查看知识分享', image: '/assets/service-action-8.png?v=20260812c' },
  { number: '09', title: '维修进度查询', query: '我想查询维修进度', image: '/assets/service-action-3.png?v=20260812c' }
  ,{ number: '10', title: '我的申请', query: '我想查看我的维修申请', image: '/assets/service-action-3.png?v=20260812c' }
];
const servicePageContent = computed(() => overlayRecord('pages', servicePageResponse.value?.data || null, (draft) => draft.slug === 'service'));
const serviceSections = computed(() => Array.isArray(servicePageContent.value?.sections) ? servicePageContent.value.sections : []);
const serviceSectionFallback = { kicker: '', title: '', body: '', description: '', label: '', items: [], media: [], content: {} };
const serviceSection = (id: string, fallback = serviceSectionFallback) => computed(() => resolvePageSection(servicePageContent.value, id, fallback));
const heroSection = serviceSection('hero');
const supportSection = serviceSection('support');
const supportModelsSection = serviceSection('support-models');
const supportActionsSection = serviceSection('support-actions');
const officeDirectorySection = serviceSection('office-directory');
const repairContent = computed(() => serviceSections.value.find((section: any) => section?.id === 'repair' || section?.id === 'service-repair') || null);
const repairPageConfig = computed(() => overlayRecord('repair_page_configs', repairPageConfigResponse.value?.data || null, (draft) => draft.page_key === 'repair_home'));
function sectionText(section: any, field: string, fallback: string) {
  const value = section?.[field];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function contentText(section: any, field: string, fallback: string) {
  const value = section?.content?.[field];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function supportCopy(field: string, fallback: string) {
  const direct = contentText(supportSection.value, field, '');
  if (direct) return direct;
  const raw = contentText(supportSection.value, 'assistant_copy_json', '');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const value = parsed && typeof parsed === 'object' ? parsed[field] : '';
      if (typeof value === 'string' && value.trim()) return value.trim();
    } catch { /* Keep the controlled fallback for malformed optional copy JSON. */ }
  }
  return fallback;
}
function officeCopy(field: string, fallback: string) {
  return contentText(officeDirectorySection.value, field, fallback);
}
function sectionItems(section: any) { return Array.isArray(section?.items) ? section.items.filter((item: any) => item && typeof item === 'object') : []; }
function sectionMediaAsset(section: any, role: string, fallback = '', fallbackFieldPath = '') {
  const media = Array.isArray(section?.media) ? section.media : [];
  const selected = selectSectionMediaEntry(media, role);
  const resolvedIndex = selected?.index ?? -1;
  const entry = selected?.entry || null;
  const binding = serviceSectionMediaBinding(entry, resolvedIndex);
  return typeof entry?.path === 'string' && entry.path
    ? { path: entry.path, fieldPath: binding?.fieldPath || fallbackFieldPath }
    : { path: fallback, fieldPath: binding?.fieldPath || fallbackFieldPath };
}
function sectionMedia(section: any, role: string, fallback = '') {
  return sectionMediaAsset(section, role, fallback).path;
}
function cmsSectionAttrs(section: any, extraStyle: Record<string, string> = {}) {
  const attrs = sectionPresentationAttributes(section || {});
  return { ...attrs, style: { ...attrs.style, ...extraStyle } };
}
const heroBackground = computed(() => sectionMediaAsset(heroSection.value, 'background', '/assets/service-library-hero-v4.jpg', 'media.0'));
const heroItems = computed(() => {
  const items = sectionItems(heroSection.value).map((item: any, index: number) => {
    const field = ['label', 'title', 'body'].find((key) => typeof item[key] === 'string' && item[key].trim()) || '';
    return {
      value: field ? String(item[field]).trim() : '',
      fieldPath: field ? `items.${index}.${field}` : '',
      presentation: item,
      presentationKey: field,
      presentationFieldPath: field ? `items.${index}.field_presentation.${field}` : ''
    };
  }).filter((item: any) => item.value);
  return items.length ? items : ['全球服务网络 原厂备件保障', '国内50多个直属办事处，覆盖全国主要省市', '海外 20 余家长期合作经销商'].map((value) => ({ value, fieldPath: '', presentation: undefined, presentationKey: '', presentationFieldPath: '' }));
});
const psdSupportModels = computed(() => {
  const serviceModels = sectionItems(supportModelsSection.value);
  if (serviceModels.length) return serviceModels.map((card: any, index: number) => {
    const media = sectionMediaAsset(supportModelsSection.value, String(card.media_role || `model-${index + 1}`), card.image || '/assets/service-model-icon.png', `items.${index}.image`);
    const presentationKey = typeof card.label === 'string' && card.label.trim() ? 'label' : 'title';
    return { label: String(card.label || card.title || '').trim(), labelFieldPath: `items.${index}.${presentationKey}`, image: media.path, imageFieldPath: media.fieldPath, presentation: card, presentationKey, presentationFieldPath: `items.${index}.field_presentation.${presentationKey}` };
  }).filter((card: any) => card.label);
  const cards = repairPageConfig.value?.modelCards;
  if (Array.isArray(cards) && cards.length) return cards.map((card: any) => ({ label: card.label || card.title, image: card.image || '/assets/service-model-icon.png' }));
  return Array.isArray(repairContent.value?.repairModels) && repairContent.value.repairModels.length ? repairContent.value.repairModels : fallbackSupportModels;
});
const serviceActionDisplaySize: Record<string, { width: number, height: number }> = {
  '/assets/service-action-1.png?v=20260812c': { width: 65, height: 42 },
  '/assets/service-action-2.png?v=20260812c': { width: 61, height: 91 },
  '/assets/service-action-3.png?v=20260812c': { width: 34, height: 93 },
  '/assets/service-action-4.png?v=20260812c': { width: 71, height: 71 },
  '/assets/service-action-5.png?v=20260812c': { width: 68, height: 81 },
  '/assets/service-action-6.png?v=20260812c': { width: 73, height: 73 },
  '/assets/service-action-7.png?v=20260812c': { width: 73, height: 72 },
  '/assets/service-action-8.png?v=20260812c': { width: 81, height: 81 },
};

const serviceActionIconStyle = ({ width, height }: { width: number; height: number }) => ({
  '--service-icon-width': `${width}px`,
  '--service-icon-height': `${height}px`,
  '--service-icon-desktop-width': `${(width / 38.4).toFixed(4)}vw`,
  '--service-icon-desktop-height': `${(height / 38.4).toFixed(4)}vw`,
});

const psdSupportActions = computed(() => {
  const serviceActions = sectionItems(supportActionsSection.value);
  if (serviceActions.length) return serviceActions.map((card: any, index: number) => {
    const media = sectionMediaAsset(supportActionsSection.value, String(card.media_role || `action-${index + 1}`), card.image || '/assets/service-action-3.png', `items.${index}.image`);
    const titlePresentationKey = typeof card.title === 'string' && card.title.trim() ? 'title' : 'label';
    return { number: String(card.number || '').padStart(2, '0'), title: String(card.title || card.label || '').trim(), titleFieldPath: `items.${index}.${titlePresentationKey}`, titlePresentationKey, titlePresentationFieldPath: `items.${index}.field_presentation.${titlePresentationKey}`, query: String(card.body || card.query || card.title || ''), description: String(card.description || ''), descriptionFieldPath: `items.${index}.description`, descriptionPresentationFieldPath: `items.${index}.field_presentation.description`, image: media.path, imageFieldPath: media.fieldPath, mediaSlot: String(card.media_role || `action-${index + 1}`), iconSize: serviceActionDisplaySize[media.path] || { width: 72, height: 72 }, presentation: card };
  }).filter((card: any) => card.title);
  const cards = repairPageConfig.value?.actionCards;
  const actionCards = Array.isArray(cards) && cards.length
    ? cards.map((card: any) => ({ number: card.number, title: card.title || card.label, query: card.query || card.title || '', image: String(card.image || '/assets/service-action-3.png').replace(/(\.png)(\?.*)?$/i, '$1?v=20260812c') }))
    : (Array.isArray(repairContent.value?.repairActions) && repairContent.value.repairActions.length ? repairContent.value.repairActions : fallbackSupportActions);
  return actionCards.map((action: any) => ({ ...action, iconSize: serviceActionDisplaySize[action.image] || { width: 72, height: 72 } }));
});
const selectedSupportModel = ref<string | null>(null);
const repairMode = ref<'request' | 'warranty' | 'progress' | 'requests' | null>(null);
const repairFaqContext = ref<any>(null);
const fallbackOfficeRegions = [
  { name: '外贸商务', offices: [{ address: '常熟总部：常熟东南高新区儒浜路78号', manager: '吴龙经理', phone: '18050194994' }] },
  { name: '长三角区', offices: [
    { address: '昆山店：昆山市城北路1255号', manager: '王晓枫经理' }, { address: '无锡店：无锡市五洲国际工业博览城香港街86栋11号', manager: '贺翔蓝经理' },
    { address: '安徽店：安徽省芜湖市鸠江区九华北路336号', manager: '刘贝经理' }, { address: '常州店：常州武进区武宜南路588号长三角模具城303-2', manager: '郑州经理' },
    { address: '南通店：南通市通州区金沙街道通掘路336号', manager: '叶国元经理' }, { address: '苏州店：苏州吴中区木渎镇木东路32号南区六区2号', manager: '宋建华经理' }
  ] },
  { name: '珠三角区', offices: [
    { address: '东莞长安店：东莞市长安镇振安东路768号', manager: '孙金诚经理' }, { address: '广州佛山店：佛山市顺德区顺联机械城4座4号', manager: '李亮经理' },
    { address: '深圳店：东莞市南城区高盛科技园北区A102室', manager: '卢振彪经理' }, { address: '惠州店：惠州市惠阳区秋宝路344号', manager: '华鸿真经理' },
    { address: '厦门店：厦门市同安新民镇后宅里470号', manager: '施源顺经理' }, { address: '潮汕店：汕头市护堤路53号', manager: '黄本港经理' }
  ] },
  { name: '浙江地区', offices: [
    { address: '温州店：温州市锦绣路1089-1091号', manager: '陈利春经理' }, { address: '泽国店：台州温岭市泽国西桐128号', manager: '王桂鹏经理' },
    { address: '金华店：永康市九州路299号神州模具城B1-6', manager: '卢振彪经理' }, { address: '宁波店：宁波市海曙区广蔺路601号', manager: '仇永火经理' },
    { address: '嘉兴店：新丰镇双龙路2025号1-1层2037', manager: '施源顺经理' }, { address: '杭州店：杭州萧山义桥五金科创园二期C106', manager: '戚小进经理' },
    { address: '余姚慈溪店：宁波市余姚模具城314-316号', manager: '俞文涛经理' }
  ] },
  { name: '华中地区', offices: [
    { address: '武汉孝感店：港边田路金能创客基地3号楼20', manager: '刘利军经理' }, { address: '长沙店：长沙市芙蓉区东二路新安小区19栋102', manager: '王正中经理' },
    { address: '河南郑州店：郑州市荥阳市中原西路五洲城一期A5-3073', manager: '陈永林经理' }, { address: '襄阳荆州店：樊城区中原路绿地中央广场3期（襄阳柏霖机电有限公司）', manager: '范金雷经理' },
    { address: '株洲店：长沙市东二路新安小区19栋102', manager: '傅艺伟经理' }, { address: '鹤壁店：河南省鹤壁市淇滨区创业路1号', manager: '杜经理' },
    { address: '江西店：江西省吉安县白云南路君山湖畔149号', manager: '邓志平经理' }
  ] },
  { name: '西南地区', offices: [
    { address: '绵阳店：绵阳市游仙区中绵路丰泰工业园', manager: '周雄经理' }, { address: '成都店：金牛区西华大道608号60栋1503号', manager: '邓志平经理' },
    { address: '重庆店：重庆高新区白市驿赣江五金机电采购中心61幢1510号', manager: '傅艺伟经理' }
  ] },
  { name: '华北地区', offices: [
    { address: '石家庄店：石家庄高新区兴业街20号', manager: '曹海斌经理' }, { address: '河北店：南皮县金刚西路48号（尚城国际对过）全凯公司', manager: '尹家乐经理' },
    { address: '天津店：津南区双港工业园鑫港五号路五大街12号', manager: '张明强经理' }, { address: '廊坊店：廊坊霸州市益津南路432号', manager: '彭烈民经理' },
    { address: '北京店：北京市通州区次渠镇美达大厦', manager: '刘国瑞经理' }, { address: '沧州店：黄骅模具城四期3-36号', manager: '尹家乐经理' }
  ] },
  { name: '山东地区', offices: [
    { address: '烟台店：山东省烟台开发区北京南路', manager: '徐顺丰经理' }, { address: '泰安店：泰安市泰山区九州机电大市场7-19号', manager: '刘宁经理' },
    { address: '青岛店：城阳区华东路99号-16', manager: '高望经理' }, { address: '青岛店：城阳区棘洪滩街道南万社区1369号', manager: '王丹伟经理' },
    { address: '潍坊店：山东省潍坊市潍城区于河街道', manager: '秦东东经理' }
  ] },
  { name: '东北地区', offices: [{ address: '黑龙江店：黑龙江哈尔滨道里区安广街31号', manager: '丁志建经理' }, { address: '辽宁店：沈阳市皇姑区嫩江街', manager: '宾有生经理' }] },
  { name: '西北地区', offices: [{ address: '西安店：陕西省西安市莲湖区玉祥门天朗蔚蓝机电广场', manager: '肖鹏飞经理' }] }
];
const psdOfficeImages: Record<string, string> = {
  '外贸商务': '/assets/service-office-region-1.jpg',
  '长三角区': '/assets/service-office-region-2.jpg',
  '珠三角区': '/assets/service-office-region-3.jpg',
  '浙江地区': '/assets/service-office-region-4.jpg',
  '华中地区': '/assets/service-office-region-5.jpg',
  '西南地区': '/assets/service-office-region-6.jpg',
  '华北地区': '/assets/service-office-region-7.jpg',
  '山东地区': '/assets/service-office-region-8.jpg',
  '东北地区': '/assets/service-office-region-9.jpg',
  '西北地区': '/assets/service-office-region-10.jpg'
};
const psdOfficeRegions = computed(() => {
  const configuredRegions = sectionItems(officeDirectorySection.value);
  if (configuredRegions.length) return configuredRegions.map((region: any, index: number) => {
    const image = sectionMediaAsset(officeDirectorySection.value, String(region.media_role || `office-${index + 1}`), region.image || '', `items.${index}.image`);
    const map = sectionMediaAsset(officeDirectorySection.value, String(region.map_media_role || `office-map-${index + 1}`), region.map || '', `items.${index}.map`);
    const titlePresentationKey = typeof region.title === 'string' && region.title.trim() ? 'title' : 'label';
    return {
      sectionIndex: index,
      name: String(region.title || region.label || '').trim(),
      titleFieldPath: `items.${index}.${titlePresentationKey}`,
      titlePresentationKey,
      titlePresentationFieldPath: `items.${index}.field_presentation.${titlePresentationKey}`,
      presentation: region,
      image: image.path,
      imageFieldPath: image.fieldPath,
      mediaSlot: String(region.media_role || `office-${index + 1}`),
      map: map.path,
      mapFieldPath: map.fieldPath,
      mapMediaSlot: String(region.map_media_role || `office-map-${index + 1}`),
      offices: Array.isArray(region.offices) ? region.offices.map((office: any, officeIndex: number) => ({
      itemIndex: officeIndex,
      binding: serviceOfficeBinding(index, officeIndex),
      sourceKey: String(office?.source_key || office?.sourceKey || '').trim(),
      address: String(office?.address || '').trim(), manager: String(office?.manager || '').trim(), phone: String(office?.phone || '').trim()
    })).filter((office: any) => office.address) : []
    };
  }).filter((region: any) => region.name && region.offices.length);
  const publishedLocations = locations.value.filter((location: any) => String(location?.region || '').trim());
  if (!publishedLocations.length) return fallbackOfficeRegions;
  const groups = new Map<string, any[]>();
  for (const location of publishedLocations) {
    const region = String(location.region || '').trim();
    const list = groups.get(region) || [];
    list.push(location);
    groups.set(region, list);
  }
  return [...groups.entries()].map(([name, records]) => {
    const first = records[0];
    return {
      name,
      image: String(first?.image || psdOfficeImages[name] || ''),
      map: String(first?.map || ''),
      offices: records.map((location: any) => {
        const contact = location?.contact || {};
        const store = String(location.city || '').trim();
        const address = String(contact.address || location.service_scope || '').trim();
        return { binding: serviceLocationRecordBinding(location), sourceKey: String(location?.source_key || '').trim(), city: store, address, manager: String(contact.name || '').trim(), phone: String(contact.phone || '').trim() };
      }).filter((office: any) => office.address)
    };
  });
});
const headquartersNavigationAddress = '常熟东南高新区儒浜路78号';
const headquartersBaiduShortUrl = 'https://j.map.baidu.com/0c/c51M';
// Verified from the user-provided Amap POI short link (B0KBFUQZC0).
const headquartersAmapCoordinate = { longitude: 120.825681, latitude: 31.570147 };
const mapNavigationOpen = ref(false);
const navigationNotice = ref('');
// Both providers receive a route request: the current location is the origin and
// the headquarters address is the destination. Baidu's qt=nav entry opens its
// route panel directly, avoiding the POI search page and its captcha flow.
const mapNavigationChoices = computed(() => [
  { id: 'amap', label: contentText(officeDirectorySection.value, 'map_amap_label', '高德地图'), description: contentText(officeDirectorySection.value, 'map_amap_description', '先获取当前位置，再打开路线规划'), href: '#', target: '_blank' },
  { id: 'baidu', label: contentText(officeDirectorySection.value, 'map_baidu_label', '百度地图'), description: contentText(officeDirectorySection.value, 'map_baidu_description', '先获取当前位置，再打开百度地图'), href: '#', target: '_blank' },
  { id: 'system', label: contentText(officeDirectorySection.value, 'map_system_label', '手机系统地图'), description: contentText(officeDirectorySection.value, 'map_system_description', '在手机上调用系统默认地图应用'), href: `geo:0,0?q=${encodeURIComponent(headquartersNavigationAddress)}`, target: undefined }
]);
const repairSystemAvailable = computed(() => shouldEnableServiceEntries(serviceConfig.value?.available));
const entryUrl = computed(() => repairSystemAvailable.value ? resolveServiceEntry(serviceConfig.value?.entries, answer.value?.suggestedAction) : null);
const repairEntryUrl = computed(() => repairSystemAvailable.value ? resolveServiceEntry(serviceConfig.value?.entries, 'request') : null);
const supportPhone = computed(() => supportPhoneValue(serviceConfig.value?.supportPhone));

function selectSupportModel(model: string) {
  selectedSupportModel.value = model;
}

function openHeadquartersNavigation() {
  navigationNotice.value = '';
  mapNavigationOpen.value = true;
}

function handleMapChoiceClick(event: MouseEvent, choiceId: string) {
  mapNavigationOpen.value = false;
  if (!import.meta.client || (choiceId !== 'amap' && choiceId !== 'baidu') && choiceId !== 'system') return;
  if (choiceId === 'amap' || choiceId === 'baidu') {
    event.preventDefault();
    const destination = `${headquartersAmapCoordinate.longitude},${headquartersAmapCoordinate.latitude}`;
    const fallbackUrl = choiceId === 'amap'
      ? `https://uri.amap.com/navigation?to=${destination},${encodeURIComponent(headquartersNavigationAddress)}&mode=car`
      : headquartersBaiduShortUrl;
    const pendingWindow = window.open('about:blank', '_blank');
    const openFallback = () => {
      navigationNotice.value = '当前页面无法读取定位，已打开总部位置，请在地图中选择“我的位置”作为起点。';
      if (pendingWindow) pendingWindow.location.href = fallbackUrl;
      else window.location.href = fallbackUrl;
    };
    if (!navigator.geolocation) {
      openFallback();
      return;
    }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const origin = `${coords.longitude.toFixed(6)},${coords.latitude.toFixed(6)}`;
      const url = choiceId === 'amap'
        ? `https://uri.amap.com/navigation?from=${origin},当前位置&to=${destination},${encodeURIComponent(headquartersNavigationAddress)}&mode=car`
        : `baidumap://map/direction?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(`name:${headquartersNavigationAddress}|latlng:${destination}`)}&mode=driving&coord_type=gcj02`;
      if (choiceId === 'baidu' && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        if (pendingWindow) pendingWindow.location.href = headquartersBaiduShortUrl;
        else window.location.href = headquartersBaiduShortUrl;
      } else {
        if (pendingWindow) pendingWindow.location.href = url;
        else window.location.href = url;
      }
    }, () => {
      openFallback();
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
    return;
  }
  if (choiceId !== 'system' || !/iPad|iPhone|iPod/i.test(navigator.userAgent)) return;
  event.preventDefault();
  window.location.href = `https://maps.apple.com/?daddr=${encodeURIComponent(headquartersNavigationAddress)}&dirflg=d`;
}

function openModelServiceAction(action: { number?: string, query: string }) {
  const pageRoute = ({
    '01': '/service/repair',
    '02': '/service/warranty',
    '03': '/service/process',
    '04': '/service/video',
    '05': '/service/download',
    '06': '/service/faults',
    '07': '/service/maintenance',
    '08': '/service/knowledge'
  } as Record<string, string>)[String(action.number || '')];
  if (pageRoute) {
    void navigateTo({ path: pageRoute, query: selectedSupportModel.value ? { model: selectedSupportModel.value } : undefined });
    return;
  }
  const portalAction = ({ '09': 'repair_requests', '10': 'repair_requests' } as Record<string, string>)[String(action.number || '')];
  if (portalAction) {
    const url = resolveRepairPortalUrl(portalAction, repairPortalBaseUrl, selectedSupportModel.value ? { model: selectedSupportModel.value } : {});
    if (url) { requestServiceExit(portalAction, url); return; }
  }
  openAssistant(`${selectedSupportModel.value ? `${selectedSupportModel.value} ` : ''}${action.query}`);
}

function actionSymbol(number: string) {
  return ({ '01': '♙', '02': '▣', '03': '⌘', '04': '◉', '05': '▤', '06': '⚒', '07': '⚙', '08': '✧' } as Record<string, string>)[number] || '◇';
}

function scrollToSupport() {
  document.getElementById('ruijun-support')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resourceLink(asset: unknown) { const value = String(asset || '').trim(); return value.startsWith('/') || /^https?:\/\//i.test(value) ? value : ''; }
function contactPhone(location: Record<string, any>) { return String(location?.contact?.phone || '').trim(); }
function supportPhoneValue(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 16 ? digits : '15050166844';
}
function newIdempotencyKey() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`; }
function faqContext() { return { pageType: 'service', pageSlug: route.path.slice(0, 120) }; }
function faqSessionStorage() { try { return window.sessionStorage; } catch { return null; } }
function requestServiceExit(entryType: unknown, url: unknown) {
  const click = createServiceEntryClick(entryType, route.path);
  const destination = String(url || '');
  if (!click || !destination) return;
  const activeElement = document.activeElement;
  lastExitFocusTarget = activeElement instanceof HTMLElement ? activeElement : null;
  pendingExit.value = { entryType: click.entryType, url: destination };
  if (!hasConfirmedServiceExit(faqSessionStorage())) {
    return;
  }
  openPendingServiceExit();
}
function openPendingServiceExit() {
  if (!pendingExit.value) return;
  const click = createServiceEntryClick(pendingExit.value.entryType, route.path);
  if (!click) { pendingExit.value = null; return; }
  markServiceExitConfirmed(faqSessionStorage());
  void $fetch('/api/public/v1/service-entry-clicks', { method: 'POST', body: click }).catch(() => undefined);
  window.open(pendingExit.value.url, '_blank', 'noopener,noreferrer');
  pendingExit.value = null;
}
function handleServiceExitClick(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest<HTMLAnchorElement>('.service-page .conversation a[href]');
  if (!anchor) return;
  event.preventDefault();
  requestServiceExit(anchor.classList.contains('direct-repair') ? 'request' : answer.value?.suggestedAction, anchor.href);
}

async function staticAnswer(value: string) {
  answer.value = await $fetch('/api/public/v1/faq/answer', { method: 'POST', body: { question: value, entry: 'support' } });
}

async function ask(value = question.value) {
  const normalized = value.trim();
  if (!normalized || loading.value) return;
  question.value = normalized;
  loading.value = true;
  answer.value = null;
  generatedAnswer.value = '';
  handoffConsent.value = false;
  handoffError.value = '';
  citations.value = [];
  faqRequestId.value = '';
  feedbackStatus.value = '';
  try {
    if (!bffEnabled.value) {
      await staticAnswer(normalized);
      return;
    }
    const session = await createFaqConversation({ baseUrl: faqBffUrl, faqSessionId: faqSessionId.value, context: faqContext() });
    faqSessionId.value = session.faqSessionId;
    writeFaqSessionId(faqSessionStorage(), faqSessionId.value);
    repairDraftSummary.value = normalized;
    activeRequest = new AbortController();
    await streamFaqMessage({
      baseUrl: faqBffUrl,
      faqSessionId: faqSessionId.value,
      message: normalized,
      context: faqContext(),
      idempotencyKey: newIdempotencyKey(),
      signal: activeRequest.signal,
      onEvent: ({ event, data }: any) => {
        if (event === 'ack') faqRequestId.value = String(data?.requestId || '');
        if (event === 'delta') generatedAnswer.value += String(data?.text || '');
        if (event === 'citation' && data?.id && !citations.value.some((item) => item.id === data.id)) citations.value.push({ id: String(data.id), title: String(data.title || '已审核知识'), version: String(data.version || '') });
        if (event === 'error') handoffError.value = 'AI 服务暂时不可用，已保留直接报修和人工支持入口。';
      }
    });
    if (!generatedAnswer.value && !handoffError.value) handoffError.value = '当前未返回可展示的答复，请选择人工支持或直接报修。';
  } catch (error: any) {
    if (error?.code === 'FAQ_REQUEST_CANCELLED') return;
    faqSessionId.value = '';
    handoffError.value = 'AI 服务暂时不可用，已切换为审核过的静态服务指引。';
    await staticAnswer(normalized);
  } finally {
    activeRequest = null;
    loading.value = false;
  }
}

function stopAnswer() { activeRequest?.abort(); }

function dismissOnEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  if (mapNavigationOpen.value) mapNavigationOpen.value = false;
  if (dialogOpen.value) dialogOpen.value = false;
}

watch(dialogOpen, (isOpen, wasOpen) => {
  if (!isOpen && wasOpen) nextTick(() => lastFocusTarget?.focus());
});
watch(pendingExit, (exit, previousExit) => {
  if (exit && !previousExit) nextTick(() => document.querySelector<HTMLButtonElement>('.service-exit-dialog button:not(.cancel)')?.focus());
  if (!exit && previousExit) nextTick(() => lastExitFocusTarget?.focus());
});

async function submitFeedback(helpful: boolean) {
  if (!bffEnabled.value || !faqSessionId.value || !faqRequestId.value || feedbackLoading.value) return;
  feedbackLoading.value = true;
  feedbackStatus.value = '';
  try {
    await submitFaqFeedback({ baseUrl: faqBffUrl, faqSessionId: faqSessionId.value, requestId: faqRequestId.value, helpful, escalateToHuman: !helpful });
    feedbackStatus.value = helpful ? '感谢你的反馈。' : '已记录为需要进一步协助。';
  } catch {
    feedbackStatus.value = '反馈暂未送达，请稍后重试。';
  } finally {
    feedbackLoading.value = false;
  }
}

async function startHandoff(handoffType: 'continue_conversation' | 'repair_draft') {
  if (!handoffConsent.value || !faqSessionId.value || handoffLoading.value) return;
  const targetUrl = repairEntryUrl.value;
  if (handoffType === 'continue_conversation' && !targetUrl) { handoffError.value = '维修系统入口暂不可用，请联系人工售后。'; return; }
  handoffLoading.value = true;
  handoffError.value = '';
  try {
    const handoff = await requestFaqHandoff({
      baseUrl: faqBffUrl,
      handoffType,
      faqSessionId: faqSessionId.value,
      consentConfirmed: handoffConsent.value,
      consentUiVersion: FAQ_CONSENT_UI_VERSION,
      repairDraft: handoffType === 'repair_draft' ? { symptomSummary: repairDraftSummary.value.trim(), errorCodes: [], attemptedSteps: [], knowledgeReferences: [] } : null
    });
    if (handoffType !== 'repair_draft') {
      const destination = buildFaqHandoffUrl(targetUrl, handoff.token);
      if (!destination) throw new Error('INVALID_HANDOFF_DESTINATION');
      window.location.assign(destination);
      return;
    }
    repairFaqContext.value = {
      conversationReference: faqSessionId.value,
      handoffReference: handoff.token,
      symptomSummary: repairDraftSummary.value.trim(),
      errorCodes: [],
      attemptedSteps: [],
      knowledgeReferences: citations.value.map((item) => item.id)
    };
    repairMode.value = 'request';
    dialogOpen.value = false;
  } catch {
    handoffError.value = supportCopy('handoff_error', '交接暂时不可用。你可以直接进入维修系统填写申请，或联系人工售后。');
  } finally {
    handoffLoading.value = false;
  }
}

function openAssistant(seed = '') {
  const activeElement = document.activeElement;
  lastFocusTarget = activeElement instanceof HTMLElement ? activeElement : null;
  dialogOpen.value = true;
  nextTick(() => document.querySelector<HTMLInputElement>('.assistant-dialog input')?.focus());
  if (seed) ask(seed);
}
useSeoMeta({ title: '服务支持', description: '瑞钧智科售前选型、服务问答、维修申请与售后支持入口。' });
onMounted(() => { faqSessionId.value = readFaqSessionId(faqSessionStorage()); window.addEventListener('keydown', dismissOnEscape); document.addEventListener('click', handleServiceExitClick); });
onBeforeUnmount(() => { activeRequest?.abort(); window.removeEventListener('keydown', dismissOnEscape); document.removeEventListener('click', handleServiceExitClick); });
</script>

<template>
  <main v-if="route.path === '/service'" class="service-page">
    <SiteHeader/>
    <section class="psd-service-hero" v-bind="cmsSectionAttrs(heroSection, { '--service-hero-background': `url(${heroBackground.path})` })" :data-cms-preview-field-path="heroBackground.fieldPath" data-cms-preview-media-slot="background" data-cms-preview-placement-key="service.hero.image" data-cms-preview-media-role="background" data-cms-preview-allow-default="true" data-cms-preview-key="hero" aria-labelledby="service-title">
      <div class="psd-service-hero-copy cms-positioned">
        <p class="psd-service-eyebrow" v-bind="fieldPresentationAttributes(heroSection, 'kicker')" data-cms-preview-field="kicker" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation.kicker">{{ sectionText(heroSection, 'kicker', 'SERVICE SUPPORT') }}</p>
        <h1 id="service-title" class="cms-styled-text" v-bind="fieldPresentationAttributes(heroSection, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ sectionText(heroSection, 'title', '售后服务') }} <em v-bind="fieldPresentationAttributes(heroSection, 'description')" data-cms-preview-field="description" data-cms-preview-field-path="description" data-cms-preview-position-field-path="field_presentation.description">{{ sectionText(heroSection, 'description', '快人一步') }}</em></h1>
        <p class="psd-service-statement" v-bind="fieldPresentationAttributes(heroSection, 'body')" data-cms-preview-field="body" data-cms-preview-field-path="body" data-cms-preview-position-field-path="field_presentation.body">{{ sectionText(heroSection, 'body', '在线报单、进度追踪、专人支持，全程透明可查') }}</p>
        <span class="psd-service-hero-global-copy" v-bind="fieldPresentationAttributes(heroItems[0]?.presentation, heroItems[0]?.presentationKey)" :data-cms-preview-field-path="heroItems[0]?.fieldPath" :data-cms-preview-position-field-path="heroItems[0]?.presentationFieldPath">{{ heroItems[0]?.value }}</span>
        <ul>
          <li v-for="item in heroItems" :key="item.value" v-bind="fieldPresentationAttributes(item.presentation, item.presentationKey)" :data-cms-preview-field-path="item.fieldPath" :data-cms-preview-position-field-path="item.presentationFieldPath">{{ item.value }}</li>
        </ul>
        <span class="psd-service-hero-network-copy" v-bind="fieldPresentationAttributes(heroItems[1]?.presentation, heroItems[1]?.presentationKey)" :data-cms-preview-field-path="heroItems[1]?.fieldPath" :data-cms-preview-position-field-path="heroItems[1]?.presentationFieldPath">{{ heroItems[1]?.value || '' }}</span>
        <span class="psd-service-hero-overseas-copy" v-bind="fieldPresentationAttributes(heroItems[2]?.presentation, heroItems[2]?.presentationKey)" :data-cms-preview-field-path="heroItems[2]?.fieldPath" :data-cms-preview-position-field-path="heroItems[2]?.presentationFieldPath">{{ heroItems[2]?.value || '' }}</span>
        <button type="button" v-bind="fieldPresentationAttributes(heroSection, 'label')" data-cms-preview-field="label" data-cms-preview-field-path="label" data-cms-preview-position-field-path="field_presentation.label" aria-controls="ruijun-support" @click="scrollToSupport">{{ sectionText(heroSection, 'label', '在线支持') }} <span aria-hidden="true">→</span></button>
      </div>
    </section>
    <section id="ruijun-support" class="psd-online-support" v-bind="cmsSectionAttrs(supportSection)" data-cms-preview-key="support" aria-labelledby="support-title">
      <div class="psd-support-heading cms-positioned">
        <h2 id="support-title" class="cms-styled-text" v-bind="fieldPresentationAttributes(supportSection, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ sectionText(supportSection, 'title', '瑞钧支持') }}</h2>
        <p v-bind="fieldPresentationAttributes(supportSection, 'body')" data-cms-preview-field="body" data-cms-preview-field-path="body" data-cms-preview-position-field-path="field_presentation.body">{{ sectionText(supportSection, 'body', '需要协助 从这里开始') }}</p>
      </div>
      <form class="psd-support-search" @submit.prevent="openAssistant(question || '我需要服务支持')">
        <label class="sr-only" for="service-question">{{ sectionText(supportSection, 'description', '描述设备或服务需求') }}</label>
        <input id="service-question" v-model="question" maxlength="300" v-bind="fieldPresentationAttributes(supportSection, 'description')" data-cms-preview-field-path="description" data-cms-preview-position-field-path="field_presentation.description" :placeholder="sectionText(supportSection, 'description', '输入设备型号、故障现象、维修进度或保修问题')">
        <button type="submit" v-bind="fieldPresentationAttributes(supportSection, 'label')" data-cms-preview-field="label" data-cms-preview-field-path="label" data-cms-preview-position-field-path="field_presentation.label">{{ sectionText(supportSection, 'label', '咨询 AI') }} <span aria-hidden="true">→</span></button>
      </form>
      <div class="psd-models cms-positioned" v-bind="cmsSectionAttrs(supportModelsSection)" data-cms-preview-key="support-models" role="list" aria-label="选择设备型号">
        <button v-for="model in psdSupportModels" :key="model.label" type="button" role="listitem" class="cms-positioned-item" v-bind="sectionPresentationAttributes(model.presentation)" :class="{ 'is-selected': selectedSupportModel === model.label }" :aria-pressed="selectedSupportModel === model.label" aria-controls="support-actions" @click="selectSupportModel(model.label)"><img class="cms-media" :src="model.image" :data-cms-preview-field-path="model.imageFieldPath" data-cms-preview-media-role="icon" alt="" aria-hidden="true"><span class="cms-styled-text" v-bind="fieldPresentationAttributes(model.presentation, model.presentationKey)" :data-cms-preview-field-path="model.labelFieldPath" :data-cms-preview-position-field-path="model.presentationFieldPath">{{ model.label }}</span></button>
      </div>
      <section id="support-actions" class="psd-action-panel cms-positioned" v-bind="cmsSectionAttrs(supportActionsSection)" data-cms-preview-key="support-actions" :aria-label="selectedSupportModel ? `${selectedSupportModel} 的服务选项` : '服务选项'">
          <p>{{ selectedSupportModel ? `${selectedSupportModel} ${sectionText(supportActionsSection, 'title', '服务支持')}` : sectionText(supportActionsSection, 'body', '选择服务项目，机型可在后续步骤补充') }}</p>
          <div class="psd-support-actions">
            <button v-for="(action, index) in psdSupportActions.slice(0, 8)" :key="action.title" type="button" class="cms-positioned-item" v-bind="sectionPresentationAttributes(action.presentation)" @click="openModelServiceAction(action)">
              <strong class="cms-styled-text" v-bind="fieldPresentationAttributes(action.presentation, action.titlePresentationKey)" :data-cms-preview-field-path="action.titleFieldPath" :data-cms-preview-position-field-path="action.titlePresentationFieldPath">{{ action.title }}</strong>
              <small v-if="action.description" v-bind="fieldPresentationAttributes(action.presentation, 'description')" :data-cms-preview-field-path="action.descriptionFieldPath" :data-cms-preview-position-field-path="action.descriptionPresentationFieldPath">{{ action.description }}</small>
              <span class="psd-support-action-icon" :style="serviceActionIconStyle(action.iconSize)" aria-hidden="true"><img :src="action.image" :data-cms-preview-field-path="action.imageFieldPath" :data-cms-preview-media-slot="action.mediaSlot" data-cms-preview-placement-key="service.action.icon" data-cms-preview-media-role="icon" alt=""></span>
            </button>
          </div>
          <RepairInlinePanel v-if="repairMode" :model="selectedSupportModel" :mode="repairMode" :faq-context="repairFaqContext" @close="repairMode = null" />
      </section>
    </section>
    <section class="psd-office-directory" v-bind="cmsSectionAttrs(officeDirectorySection)" data-cms-preview-key="office-directory" aria-labelledby="office-directory-title">
      <div class="psd-office-heading cms-positioned">
        <p v-bind="fieldPresentationAttributes(officeDirectorySection, 'kicker')" data-cms-preview-field="kicker" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation.kicker">{{ sectionText(officeDirectorySection, 'kicker', 'RUIJUN SERVICE NETWORK') }}</p>
        <h2 id="office-directory-title" class="cms-styled-text" v-bind="fieldPresentationAttributes(officeDirectorySection, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ sectionText(officeDirectorySection, 'title', '国内直属办事处覆盖全国主要省市') }}</h2>
      </div>
      <div class="psd-office-regions">
        <section v-for="region in psdOfficeRegions" :key="region.name" class="psd-office-region">
          <h3 v-bind="fieldPresentationAttributes(region.presentation, region.titlePresentationKey)" :data-cms-preview-field-path="region.titleFieldPath || region.offices[0]?.binding?.regionTitle" :data-cms-preview-position-field-path="region.titlePresentationFieldPath">{{ region.name }}</h3>
<img v-if="region.image || psdOfficeImages[region.name]" class="psd-office-region-photo cms-media" v-bind="fieldPresentationAttributes(region.presentation, 'image')" :data-cms-preview-position-field-path="region.presentation ? `items.${region.sectionIndex}.field_presentation.image` : undefined" :src="region.image || psdOfficeImages[region.name]" :alt="`${region.name}办事处`" :data-cms-preview-field-path="region.imageFieldPath || region.offices[0]?.binding?.regionImage" :data-cms-preview-media-slot="region.mediaSlot" :data-cms-preview-placement-key="region.imageFieldPath ? 'service.office.image' : undefined" :data-cms-preview-media-role="region.imageFieldPath || region.offices[0]?.binding ? 'gallery' : undefined">
          <div class="psd-office-region-body" :class="{ 'is-compact-office-list': region.name !== '外贸商务' && region.offices.length <= 3 }">
            <figure v-if="region.map || region.name === '外贸商务'" class="psd-office-map">
              <!-- Default accessibility copy remains the controlled fallback: aria-label="选择常熟总部导航软件". -->
              <button type="button" class="psd-office-map-link" :aria-label="officeCopy('map_button_aria', '选择常熟总部导航软件')" :title="officeCopy('map_button_title', '选择导航软件')" @click="openHeadquartersNavigation">
<img v-bind="fieldPresentationAttributes(region.presentation, 'map')" :data-cms-preview-position-field-path="region.presentation ? `items.${region.sectionIndex}.field_presentation.map` : undefined" :src="region.map || '/assets/service-office-map.jpg'" :alt="`${region.name}位置地图`" :data-cms-preview-field-path="region.mapFieldPath" :data-cms-preview-media-slot="region.mapMediaSlot" :data-cms-preview-placement-key="region.mapFieldPath ? 'service.office.map' : undefined" data-cms-preview-media-role="map">
              </button>
            </figure>
            <ul>
               <li v-for="office in region.offices" :key="office.address" :data-cms-preview-key="office.sourceKey || undefined" :data-cms-preview-collection="office.binding?.collection" :data-cms-preview-item-id="office.binding?.itemId">
                <span class="psd-office-detail">
                  <svg class="psd-office-detail-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.3 7-12A7 7 0 1 0 5 9c0 6.7 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>
                  {{ office.city ? `${office.city}：` : '' }}<span :data-cms-preview-field-path="office.binding?.address">{{ office.address }}</span>
                </span>
                <a v-if="office.phone" class="psd-office-detail" :href="`tel:${office.phone}`"><svg class="psd-office-detail-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-4.1 3.3-6.2 7.5-6.2s6.7 2.1 7.5 6.2"/></svg><span v-if="office.manager" :data-cms-preview-field-path="office.binding?.manager">{{ office.manager }}</span><span v-if="office.manager" aria-hidden="true"> · </span><span :data-cms-preview-field-path="office.binding?.phone">{{ office.phone }}</span></a>
                <em v-else class="psd-office-detail"><svg class="psd-office-detail-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-4.1 3.3-6.2 7.5-6.2s6.7 2.1 7.5 6.2"/></svg><span :data-cms-preview-field-path="office.binding?.manager">{{ office.manager }}</span><span v-if="office.binding?.phone" class="cms-office-phone-empty" :data-cms-preview-field-path="office.binding?.phone" data-cms-preview-editable="true">未填写联系电话</span></em>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </section>
    <section class="service-hero"><div><p>SERVICE & SUPPORT</p><h1>从设备选型<br>到持续稳定生产</h1><span>围绕选型咨询、设备交付与售后响应，为用户提供清晰、直接的服务入口。</span></div></section>
    <section class="online-service" v-bind="sectionPresentationAttributes(supportSection)"><div class="section-inner"><div class="section-heading"><h2 v-bind="fieldPresentationAttributes(supportSection, 'content_online_title')" data-cms-preview-field-path="content.online_title" data-cms-preview-position-field-path="field_presentation.content_online_title">{{ supportCopy('online_title', '在线售后服务') }}</h2><p v-bind="fieldPresentationAttributes(supportSection, 'content_online_intro')" data-cms-preview-field-path="content.online_intro" data-cms-preview-position-field-path="field_presentation.content_online_intro">{{ supportCopy('online_intro', '不需要预先判断应该进入哪个系统。先让 AI 确认设备情况和服务目标，再在需要提交或查询时打开对应页面。') }}</p></div><div class="service-desk"><div><p v-bind="fieldPresentationAttributes(supportSection, 'content_assistant_brand')" data-cms-preview-field-path="content.assistant_brand" data-cms-preview-position-field-path="field_presentation.content_assistant_brand">{{ supportCopy('assistant_brand', 'RUIJUN AI SERVICE DESK') }}</p><h3 class="cms-styled-text" v-bind="fieldPresentationAttributes(supportSection, 'content_assistant_heading')" data-cms-preview-field-path="content.assistant_heading" data-cms-preview-position-field-path="field_presentation.content_assistant_heading">{{ supportCopy('assistant_heading', '先描述问题\n剩下交给 AI') }}</h3><span v-bind="fieldPresentationAttributes(supportSection, 'content_assistant_intro')" data-cms-preview-field-path="content.assistant_intro" data-cms-preview-position-field-path="field_presentation.content_assistant_intro">{{ supportCopy('assistant_intro', '报修资料、保修核验和维修进度由服务助手逐步引导。维修系统只用于提交申请与查询状态。') }}</span><button type="button" v-bind="fieldPresentationAttributes(supportSection, 'content_assistant_cta')" data-cms-preview-field-path="content.assistant_cta" data-cms-preview-position-field-path="field_presentation.content_assistant_cta" @click="openAssistant('我想办理售后服务')">{{ supportCopy('assistant_cta', '开始服务咨询') }} <span aria-hidden="true">→</span></button></div><ol><li><b>01</b><div><strong v-bind="fieldPresentationAttributes(supportSection, 'content_step_1_title')" data-cms-preview-field-path="content.step_1_title" data-cms-preview-position-field-path="field_presentation.content_step_1_title">{{ supportCopy('step_1_title', '说明设备或服务需求') }}</strong><span v-bind="fieldPresentationAttributes(supportSection, 'content_step_1_body')" data-cms-preview-field-path="content.step_1_body" data-cms-preview-position-field-path="field_presentation.content_step_1_body">{{ supportCopy('step_1_body', '可直接输入机型、故障现象、进度或保修问题。') }}</span></div></li><li><b>02</b><div><strong v-bind="fieldPresentationAttributes(supportSection, 'content_step_2_title')" data-cms-preview-field-path="content.step_2_title" data-cms-preview-position-field-path="field_presentation.content_step_2_title">{{ supportCopy('step_2_title', '由 AI 确认办理路径') }}</strong><span v-bind="fieldPresentationAttributes(supportSection, 'content_step_2_body')" data-cms-preview-field-path="content.step_2_body" data-cms-preview-position-field-path="field_presentation.content_step_2_body">{{ supportCopy('step_2_body', '先得到资料清单与流程说明，避免无效提交。') }}</span></div></li><li><b>03</b><div><strong v-bind="fieldPresentationAttributes(supportSection, 'content_step_3_title')" data-cms-preview-field-path="content.step_3_title" data-cms-preview-position-field-path="field_presentation.content_step_3_title">{{ supportCopy('step_3_title', '需要时再进入维修系统') }}</strong><span v-bind="fieldPresentationAttributes(supportSection, 'content_step_3_body')" data-cms-preview-field-path="content.step_3_body" data-cms-preview-position-field-path="field_presentation.content_step_3_body">{{ supportCopy('step_3_body', '提交工单、核验保修或查询进度均在独立系统完成。') }}</span></div></li></ol></div></div></section>
    <section class="faq" v-bind="cmsSectionAttrs(supportSection)" data-cms-preview-key="support"><div class="section-inner"><div class="section-heading"><h2 v-bind="fieldPresentationAttributes(supportSection, 'content_faq_title')" data-cms-preview-field-path="content.faq_title" data-cms-preview-position-field-path="field_presentation.content_faq_title">{{ supportCopy('faq_title', '常见服务问题') }}</h2><p v-bind="fieldPresentationAttributes(supportSection, 'content_faq_intro')" data-cms-preview-field-path="content.faq_intro" data-cms-preview-position-field-path="field_presentation.content_faq_intro">{{ supportCopy('faq_intro', '先了解办理流程，再决定是否进入售后系统。涉及具体设备状态时，以售后工程师确认结果为准。') }}</p></div><div class="faq-list"><details><summary v-bind="fieldPresentationAttributes(supportSection, 'content_faq_1_question')" data-cms-preview-field-path="content.faq_1_question" data-cms-preview-position-field-path="field_presentation.content_faq_1_question">{{ supportCopy('faq_1_question', '报修前需要准备哪些资料？') }}</summary><p v-bind="fieldPresentationAttributes(supportSection, 'content_faq_1_answer')" data-cms-preview-field-path="content.faq_1_answer" data-cms-preview-position-field-path="field_presentation.content_faq_1_answer">{{ supportCopy('faq_1_answer', '设备型号与铭牌照片、机床编号、故障发生时间、故障现象、报警信息、现场照片或视频，以及联系人和联系电话。') }}</p><button type="button" v-bind="fieldPresentationAttributes(supportSection, 'content_faq_1_cta')" data-cms-preview-field-path="content.faq_1_cta" data-cms-preview-position-field-path="field_presentation.content_faq_1_cta" @click="openAssistant('报修前需要准备哪些资料？')">{{ supportCopy('faq_1_cta', '继续咨询 AI') }}</button></details><details><summary v-bind="fieldPresentationAttributes(supportSection, 'content_faq_2_question')" data-cms-preview-field-path="content.faq_2_question" data-cms-preview-position-field-path="field_presentation.content_faq_2_question">{{ supportCopy('faq_2_question', '在哪里发起维修申请？') }}</summary><p v-bind="fieldPresentationAttributes(supportSection, 'content_faq_2_answer')" data-cms-preview-field-path="content.faq_2_answer" data-cms-preview-position-field-path="field_presentation.content_faq_2_answer">{{ supportCopy('faq_2_answer', '先由 AI 确认所需资料；需要提交时，服务助手会打开独立售后系统的维修申请页面。') }}</p><button type="button" v-bind="fieldPresentationAttributes(supportSection, 'content_faq_2_cta')" data-cms-preview-field-path="content.faq_2_cta" data-cms-preview-position-field-path="field_presentation.content_faq_2_cta" @click="openAssistant('我想发起维修申请')">{{ supportCopy('faq_2_cta', '继续咨询 AI') }}</button></details><details><summary v-bind="fieldPresentationAttributes(supportSection, 'content_faq_3_question')" data-cms-preview-field-path="content.faq_3_question" data-cms-preview-position-field-path="field_presentation.content_faq_3_question">{{ supportCopy('faq_3_question', '在哪里查看维修进度？') }}</summary><p v-bind="fieldPresentationAttributes(supportSection, 'content_faq_3_answer')" data-cms-preview-field-path="content.faq_3_answer" data-cms-preview-position-field-path="field_presentation.content_faq_3_answer">{{ supportCopy('faq_3_answer', '服务助手会引导你进入售后系统查看审核、补充资料、维修处理、寄回物流和归档状态。') }}</p><button type="button" v-bind="fieldPresentationAttributes(supportSection, 'content_faq_3_cta')" data-cms-preview-field-path="content.faq_3_cta" data-cms-preview-position-field-path="field_presentation.content_faq_3_cta" @click="openAssistant('我想查询维修进度')">{{ supportCopy('faq_3_cta', '继续咨询 AI') }}</button></details><details><summary v-bind="fieldPresentationAttributes(supportSection, 'content_faq_4_question')" data-cms-preview-field-path="content.faq_4_question" data-cms-preview-position-field-path="field_presentation.content_faq_4_question">{{ supportCopy('faq_4_question', '如何核验保修状态？') }}</summary><p v-bind="fieldPresentationAttributes(supportSection, 'content_faq_4_answer')" data-cms-preview-field-path="content.faq_4_answer" data-cms-preview-position-field-path="field_presentation.content_faq_4_answer">{{ supportCopy('faq_4_answer', '准备设备型号和机床编号，再由服务助手提供售后系统入口。') }}</p><button type="button" v-bind="fieldPresentationAttributes(supportSection, 'content_faq_4_cta')" data-cms-preview-field-path="content.faq_4_cta" data-cms-preview-position-field-path="field_presentation.content_faq_4_cta" @click="openAssistant('我想核验保修状态')">{{ supportCopy('faq_4_cta', '继续咨询 AI') }}</button></details></div></div></section>
    <section v-if="resources.length || locations.length" class="service-content"><div v-if="resources.length" class="service-content-block"><p>SERVICE RESOURCES</p><h2>已发布服务资料</h2><ul><li v-for="resource in resources" :key="String(resource.source_key)"><div><strong>{{ resource.type }}</strong><span>{{ Array.isArray(resource.applicable_models) ? resource.applicable_models.join('、') : '' }}</span></div><a v-if="resourceLink(resource.asset)" :href="resourceLink(resource.asset)" target="_blank" rel="noopener">查看资料</a></li></ul></div><div v-if="locations.length" class="service-content-block"><p>SERVICE LOCATIONS</p><h2>服务网点</h2><ul><li v-for="location in locations" :key="String(location.source_key)"><div><strong>{{ [location.region, location.city].filter(Boolean).join(' · ') }}</strong><span>{{ location.service_scope }}</span></div><a v-if="contactPhone(location)" :href="`tel:${contactPhone(location).replace(/\s/g, '')}`">{{ contactPhone(location) }}</a></li></ul></div></section>
    <section class="contact" v-bind="cmsSectionAttrs(supportSection)" data-cms-preview-key="support"><div class="section-inner"><div class="section-heading"><h2 v-bind="fieldPresentationAttributes(supportSection, 'content_contact_title')" data-cms-preview-field-path="content.contact_title" data-cms-preview-position-field-path="field_presentation.content_contact_title">{{ supportCopy('contact_title', '联系瑞钧') }}</h2><p v-bind="fieldPresentationAttributes(supportSection, 'content_contact_intro')" data-cms-preview-field-path="content.contact_intro" data-cms-preview-position-field-path="field_presentation.content_contact_intro">{{ supportCopy('contact_intro', '售后服务请使用上方 AI 服务台。设备选型和工厂来访可在此咨询，AI 会先整理信息，再引导至合适的后续安排。') }}</p></div><div class="contact-grid"><article><small v-bind="fieldPresentationAttributes(supportSection, 'content_contact_sales_eyebrow')" data-cms-preview-field-path="content.contact_sales_eyebrow" data-cms-preview-position-field-path="field_presentation.content_contact_sales_eyebrow">{{ supportCopy('contact_sales_eyebrow', 'AI SALES CONSULTATION') }}</small><h3 v-bind="fieldPresentationAttributes(supportSection, 'content_contact_sales_title')" data-cms-preview-field-path="content.contact_sales_title" data-cms-preview-position-field-path="field_presentation.content_contact_sales_title">{{ supportCopy('contact_sales_title', '设备选型与方案') }}</h3><p v-bind="fieldPresentationAttributes(supportSection, 'content_contact_sales_body')" data-cms-preview-field-path="content.contact_sales_body" data-cms-preview-position-field-path="field_presentation.content_contact_sales_body">{{ supportCopy('contact_sales_body', '输入工件尺寸、材料、精度、锥度、批量和自动化需求，AI 先帮你整理选型要点。') }}</p><button type="button" v-bind="fieldPresentationAttributes(supportSection, 'content_contact_sales_cta')" data-cms-preview-field-path="content.contact_sales_cta" data-cms-preview-position-field-path="field_presentation.content_contact_sales_cta" @click="openAssistant('我想咨询设备选型与方案')">{{ supportCopy('contact_sales_cta', '咨询 AI 助手') }} <span aria-hidden="true">→</span></button></article><article><small v-bind="fieldPresentationAttributes(supportSection, 'content_contact_visit_eyebrow')" data-cms-preview-field-path="content.contact_visit_eyebrow" data-cms-preview-position-field-path="field_presentation.content_contact_visit_eyebrow">{{ supportCopy('contact_visit_eyebrow', 'AI FACTORY VISIT') }}</small><h3 v-bind="fieldPresentationAttributes(supportSection, 'content_contact_visit_title')" data-cms-preview-field-path="content.contact_visit_title" data-cms-preview-position-field-path="field_presentation.content_contact_visit_title">{{ supportCopy('contact_visit_title', '工厂来访安排') }}</h3><p v-bind="fieldPresentationAttributes(supportSection, 'content_contact_visit_body')" data-cms-preview-field-path="content.contact_visit_body" data-cms-preview-position-field-path="field_presentation.content_contact_visit_body">{{ supportCopy('contact_visit_body', '询问常熟或昆山工厂地址、来访前准备事项和接待安排，再确认合适的参观时间。') }}</p><button type="button" v-bind="fieldPresentationAttributes(supportSection, 'content_contact_visit_cta')" data-cms-preview-field-path="content.contact_visit_cta" data-cms-preview-position-field-path="field_presentation.content_contact_visit_cta" @click="openAssistant('我想预约工厂来访')">{{ supportCopy('contact_visit_cta', '询问来访安排') }} <span aria-hidden="true">→</span></button></article></div></div></section>
    <Teleport to="body"><div v-if="dialogOpen" class="assistant-overlay" @click.self="dialogOpen = false"><section class="assistant-dialog" role="dialog" aria-modal="true" :aria-label="supportCopy('assistant_dialog_label', '瑞钧 AI 服务助手')"><header><div><p>{{ supportCopy('assistant_brand_short', 'RUIJUN AI') }}</p><h2>{{ supportCopy('assistant_title', '服务助手') }}</h2></div><button type="button" :aria-label="supportCopy('assistant_close', '关闭服务助手')" @click="dialogOpen = false">×</button></header><div class="conversation" aria-live="polite"><p v-if="!answer && !generatedAnswer && !loading">{{ supportCopy('assistant_empty', '请描述设备或服务需求，我会先确认资料与办理路径。') }}</p><p v-if="loading">{{ supportCopy('assistant_loading', '正在整理服务建议...') }}</p><template v-if="generatedAnswer"><small>{{ supportCopy('assistant_answer_label', 'AI 服务答复') }}</small><p class="generated-answer">{{ generatedAnswer }}</p></template><template v-if="answer"><small>{{ answer.matched ? supportCopy('assistant_matched_label', '已审核服务指引') : supportCopy('assistant_human_label', '人工服务建议') }}</small><h3>{{ answer.title }}</h3><p>{{ answer.answer }}</p><ol><li v-for="step in answer.steps" :key="step">{{ step }}</li></ol><p class="note">{{ answer.note }}</p><a v-if="entryUrl" :href="entryUrl" target="_blank" rel="noopener">{{ supportCopy('assistant_entry', '进入维修系统') }}</a></template><ul v-if="citations.length" class="citations"><li v-for="citation in citations" :key="citation.id">{{ citation.title }}<em v-if="citation.version"> · {{ citation.version }}</em></li></ul><div v-if="faqRequestId" class="feedback"><span>{{ supportCopy('feedback_prompt', '这条答复是否有帮助？') }}</span><button type="button" :disabled="feedbackLoading" @click="submitFeedback(true)">{{ supportCopy('feedback_yes', '有帮助') }}</button><button type="button" :disabled="feedbackLoading" @click="submitFeedback(false)">{{ supportCopy('feedback_no', '需要协助') }}</button></div><p v-if="feedbackStatus" class="feedback-status" role="status">{{ feedbackStatus }}</p><p v-if="handoffError" class="notice">{{ handoffError }}</p><section v-if="bffEnabled && faqSessionId" class="handoff-panel"><label><input v-model="handoffConsent" type="checkbox"> {{ supportCopy('handoff_consent', '我确认将以下必要摘要交给维修系统，并在系统中自行检查、补充和提交。') }}</label><textarea v-model="repairDraftSummary" maxlength="1000" :disabled="!handoffConsent" :aria-label="supportCopy('handoff_summary_label', '维修草稿摘要')" :placeholder="supportCopy('handoff_summary_placeholder', '填写或修改故障现象摘要')"></textarea><div v-if="handoffConsent" class="handoff-actions"><button type="button" :disabled="handoffLoading" @click="startHandoff('continue_conversation')">{{ supportCopy('handoff_continue', '继续至维修系统') }}</button><button type="button" :disabled="handoffLoading || !repairDraftSummary.trim()" @click="startHandoff('repair_draft')">{{ supportCopy('handoff_draft', '生成可编辑维修草稿') }}</button></div></section><a v-if="!faqSessionId && repairEntryUrl" class="direct-repair" :href="repairEntryUrl" target="_blank" rel="noopener">{{ supportCopy('assistant_direct_entry', '直接提交维修申请') }}</a></div><form @submit.prevent="ask()"><input v-model="question" maxlength="300" :placeholder="supportCopy('assistant_input_placeholder', '输入问题，例如：我想查询维修进度')"><button v-if="loading" type="button" class="stop" @click="stopAnswer">{{ supportCopy('assistant_stop', '停止') }}</button><button v-else type="submit">{{ supportCopy('assistant_send', '发送') }}</button></form></section></div></Teleport>
    <Teleport to="body"><div v-if="mapNavigationOpen" class="map-navigation-overlay" @click.self="mapNavigationOpen = false"><section class="map-navigation-dialog" role="dialog" aria-modal="true" aria-labelledby="map-navigation-title"><header><div><p>{{ officeCopy('map_dialog_kicker', '总部导航') }}</p><h2 id="map-navigation-title">{{ officeCopy('map_dialog_title', '选择导航软件') }}</h2></div><button type="button" :aria-label="officeCopy('map_dialog_close', '关闭导航选择')" @click="mapNavigationOpen = false">×</button></header><p class="map-navigation-address">{{ officeCopy('map_dialog_destination', '目的地') }}：{{ headquartersNavigationAddress }}</p><p v-if="navigationNotice" class="map-navigation-notice" role="status">{{ navigationNotice }}</p><div class="map-navigation-options"><a v-for="choice in mapNavigationChoices" :key="choice.id" class="map-navigation-option" :href="choice.href" :target="choice.target" :rel="choice.target ? 'noopener noreferrer' : undefined" @click="handleMapChoiceClick($event, choice.id)"><strong>{{ choice.label }}</strong><span>{{ choice.description }}</span><i aria-hidden="true">→</i></a></div></section></div></Teleport>
    <Teleport to="body"><div v-if="pendingExit" class="service-exit-overlay" @click.self="pendingExit = null"><section class="service-exit-dialog" role="dialog" aria-modal="true" aria-labelledby="service-exit-title"><p>{{ supportCopy('exit_kicker', '服务跳转') }}</p><h2 id="service-exit-title">{{ supportCopy('exit_title', '即将进入瑞钧售后服务系统') }}</h2><span>{{ supportCopy('exit_body', '将在新窗口打开，当前官网页面会保留。') }}</span><div><button type="button" class="cancel" @click="pendingExit = null">{{ supportCopy('exit_cancel', '暂不前往') }}</button><button type="button" @click="openPendingServiceExit">{{ supportCopy('exit_confirm', '继续前往') }}</button></div></section></div></Teleport>
    <aside
      class="service-human-support"
      aria-label="人工售后支持"
      v-bind="sectionPresentationAttributes(supportSection)"
    >
      <span
        v-bind="fieldPresentationAttributes(supportSection, 'content_human_support_label')"
        data-cms-preview-field-path="content.human_support_label"
        data-cms-preview-position-field-path="field_presentation.content_human_support_label"
      >
        {{ contentText(supportSection, 'human_support_label', '需要人工协助？') }}
      </span>
      <a :href="`tel:${supportPhone}`">{{ supportPhone }}</a>
    </aside>
    <PsdFooter />
  </main>
  <NuxtPage v-else />
</template>

<style scoped>
.service-page>.faq,.service-page>.service-content,.service-page>.contact{display:none!important}
.psd-support-actions{width:min(2560px,100%)!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:18px!important;border:0!important}
.psd-support-actions button{position:relative!important;min-height:164px!important;padding:22px 24px!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;border:0!important;background:#3f3e3a!important;color:#fff!important;text-align:left!important;overflow:hidden!important;cursor:pointer!important;transition:background .24s ease,transform .24s ease!important}
.psd-support-actions button:hover,.psd-support-actions button:focus-visible{background:#e91d28!important;transform:translateY(-4px)!important;outline:0!important}.psd-support-actions button:focus-visible{box-shadow:0 0 0 3px #161719!important}
.psd-support-actions .psd-support-action-number{position:relative!important;z-index:1!important;color:#f7c948!important;font-size:12px!important}.psd-support-actions strong{position:relative!important;z-index:1!important;margin-top:auto!important;font-size:clamp(16px,1.46vw,28px)!important;font-weight:500!important}.psd-support-actions i{position:relative!important;z-index:1!important;margin-top:11px!important;color:#f7c948!important;font-size:20px!important;font-style:normal!important}
.service-page{min-height:100vh;background:var(--ruijun-paper);color:#161719}.service-hero{position:relative;min-height:68svh;display:flex;align-items:flex-end;padding:150px 6.2% 8vh;isolation:isolate;overflow:hidden;color:#fff;background:#777 url('/assets/docx-service.jpg') center 16%/cover no-repeat}.service-hero::after{content:"";position:absolute;z-index:-1;inset:0;background:rgb(10 12 14 / 49%)}.service-hero>div{width:min(980px,100%)}.service-hero p,.service-desk>div>p,.assistant-dialog header p{margin:0;color:#ef3840;font-size:12px}.service-hero h1{max-width:920px;margin:16px 0 0;font-size:clamp(58px,6.1vw,88px);line-height:1.02;font-weight:600}.service-hero span{display:block;max-width:650px;margin-top:24px;color:rgb(255 255 255 / 78%);font-size:17px}.online-service,.faq,.contact{padding:90px 6.2%}.online-service{color:#fff;background:#111214}.section-inner{width:min(var(--ruijun-max),100%);margin:0 auto}.section-heading{display:grid;grid-template-columns:minmax(220px,.7fr) minmax(0,1.3fr);gap:8vw;align-items:end;margin-bottom:50px}.section-heading h2{margin:0;font-size:54px;line-height:1.12}.section-heading p{max-width:660px;margin:0;color:#6f7276;font-size:16px}.online-service .section-heading p{color:#a4a7ab}.service-desk{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,.95fr);border:1px solid #3a3c3f}.service-desk>div{display:flex;min-height:390px;padding:44px 48px;flex-direction:column;border-right:1px solid #3a3c3f}.service-desk h3{margin:42px 0 20px;font-size:54px;line-height:1.04}.service-desk>div>span{max-width:440px;color:#a4a7ab;line-height:1.8}.service-desk>div>button{width:fit-content;margin-top:auto;padding:13px 16px;color:#fff;background:var(--ruijun-red);border:0;border-radius:4px;font-weight:700;cursor:pointer}.service-desk ol{display:grid;margin:0;padding:28px 42px;list-style:none}.service-desk li{display:grid;grid-template-columns:48px 1fr;gap:16px;align-content:center;border-bottom:1px solid #3a3c3f}.service-desk li:last-child{border-bottom:0}.service-desk b{color:#ef3840;font-size:11px}.service-desk strong{display:block;color:#fff;font-size:18px}.service-desk li span{display:block;margin-top:8px;color:#a4a7ab;font-size:13px}.faq{background:#eceeeb}.faq-list{border-top:1px solid #c8cbc7}.faq-list details{border-bottom:1px solid #c8cbc7}.faq-list summary{position:relative;padding:22px 54px 22px 0;cursor:pointer;list-style:none;font-size:18px;font-weight:650}.faq-list summary::after{content:"+";position:absolute;top:14px;right:4px;color:var(--ruijun-red);font-size:28px;font-weight:300}.faq-list details[open] summary::after{transform:rotate(45deg)}.faq-list details>p{max-width:820px;margin:-4px 0 12px;color:#666a6e}.faq-list details>button{margin:0 0 22px;padding:8px 12px;color:var(--ruijun-red);background:transparent;border:1px solid var(--ruijun-red);cursor:pointer}.contact{background:var(--ruijun-paper)}.contact-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:#d1d3d2;border:1px solid #d1d3d2}.contact-grid article{min-height:230px;padding:36px;display:flex;flex-direction:column;background:var(--ruijun-paper)}.contact-grid small{color:var(--ruijun-red);font-weight:700}.contact-grid h3{margin:24px 0 12px;font-size:28px}.contact-grid p{margin:0;color:#6f7276}.contact-grid button{width:fit-content;margin-top:auto;padding:22px 0 0;color:var(--ruijun-red);background:transparent;border:0;font-weight:700;cursor:pointer}.service-content{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px;padding:70px 6.2%;background:#fff}.service-content-block>p{color:var(--ruijun-red);font-size:12px}.service-content-block ul{padding:0;list-style:none}.service-content-block li{display:flex;padding:16px 0;justify-content:space-between;border-top:1px solid var(--ruijun-line)}.service-content-block li span{display:block;color:#777}.service-content-block a{color:var(--ruijun-red)}.assistant-overlay{position:fixed;z-index:130;inset:0;display:grid;place-items:center;padding:20px;background:#0009;backdrop-filter:blur(12px)}.assistant-dialog{width:min(560px,100%);max-height:min(700px,90vh);display:flex;flex-direction:column;border:1px solid #ffffff4d;border-radius:8px;background:#181818f2;color:#fff;box-shadow:0 22px 70px #0009;overflow:hidden}.assistant-dialog header{display:flex;justify-content:space-between;padding:21px 24px;border-bottom:1px solid #ffffff2e}.assistant-dialog header h2{margin:4px 0 0;font-size:21px}.assistant-dialog header button{border:0;background:transparent;color:#fff;font-size:30px;cursor:pointer}.conversation{min-height:260px;padding:24px;overflow:auto}.conversation h3{margin:10px 0;font-size:22px}.conversation p,.conversation li{line-height:1.75}.conversation .note{color:#ffffff9c;font-size:13px}.conversation .generated-answer{white-space:pre-wrap}.citations{margin:14px 0 0;padding:10px 0 0;border-top:1px solid #ffffff24;list-style:none;font-size:12px;color:#ffffffa8}.citations li+li{margin-top:5px}.citations em{font-style:normal;color:#ffffff67}.feedback{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:14px;font-size:12px;color:#ffffffb0}.feedback button{padding:6px 8px;border:1px solid #ffffff38;border-radius:6px;background:transparent;color:#fff}.feedback-status{margin:8px 0 0;color:#ffffffa0;font-size:12px}.conversation .notice{padding:10px 12px;border-left:2px solid #e33232;background:#ffffff0d;color:#ffffffc7}.conversation a{display:inline-block;margin-top:12px;padding:11px 14px;border-radius:4px;background:#dd3030;color:#fff;text-decoration:none}.handoff-panel{display:grid;gap:10px;margin-top:20px;padding:14px;border:1px solid #ffffff30;border-radius:8px;background:#ffffff0c}.handoff-panel label{font-size:13px;line-height:1.55}.handoff-panel textarea{min-height:82px;padding:10px;border:1px solid #ffffff38;border-radius:4px;background:#111;color:#fff;resize:vertical}.handoff-actions{display:flex;gap:8px;flex-wrap:wrap}.handoff-actions button{padding:9px 12px;border:1px solid #ffffff55;border-radius:4px;background:#fff;color:#171717}.assistant-dialog form{display:flex;gap:10px;padding:16px;border-top:1px solid #ffffff2e}.assistant-dialog input{min-width:0;flex:1;padding:12px;border:1px solid #ffffff38;border-radius:4px;background:#ffffff12;color:#fff}.assistant-dialog form button{padding:0 16px;border:0;border-radius:4px;background:#fff;color:#171717}.assistant-dialog form .stop{background:#ffffff25;color:#fff}
@media(max-width:900px){.service-hero{min-height:62svh;padding:120px 22px 58px}.service-hero h1{font-size:50px}.service-hero span{font-size:15px}.online-service,.faq,.contact{padding:62px 22px}.section-heading{grid-template-columns:1fr;gap:18px;margin-bottom:34px}.section-heading h2{font-size:38px}.service-desk{grid-template-columns:1fr}.service-desk>div{min-height:360px;padding:34px;border-right:0;border-bottom:1px solid #3a3c3f}.service-desk h3{margin-top:32px;font-size:44px}.service-desk ol{padding:10px 34px}.service-desk li{min-height:110px}.contact-grid,.service-content{grid-template-columns:1fr}.service-content{padding:52px 22px}}
.service-hero{background-position:center;background-size:cover}.service-hero::after{background:rgb(7 9 11 / 52%)}
</style>
<style scoped>
.psd-models button{min-height:172px!important;padding:0 8px 12px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-end!important;border:0!important;background:transparent!important}.psd-models button img{width:min(100%,142px);aspect-ratio:1;object-fit:contain;margin-bottom:10px}.psd-models button span{min-height:1.5em;display:block}.psd-support-actions{column-gap:clamp(36px,7.3vw,140px)!important;row-gap:38px!important;border:0!important}.psd-support-actions button{position:relative;min-height:132px!important;padding:22px 68px 22px 30px!important;border:0!important;border-radius:7px!important;background:linear-gradient(100deg,#363635 0%,#4a4948 100%)!important;color:#fff!important}.psd-support-actions button:hover{background:linear-gradient(100deg,#202120 0%,#343332 100%)!important;transform:translateY(-3px)}.psd-support-actions .psd-support-action-number,.psd-support-actions i{display:none!important}.psd-support-actions strong{margin:auto 0!important;font-weight:400!important;white-space:nowrap}.psd-support-actions .psd-support-action-symbol{position:absolute;top:50%;right:22px;display:grid!important;width:34px;height:34px;place-items:center;transform:translateY(-50%);color:#d7c39d;font-family:"Segoe UI Symbol",sans-serif;font-size:28px;line-height:1;text-shadow:0 0 10px rgb(215 195 157 / 22%)}
@media(max-width:900px){.psd-models button{min-height:132px!important}.psd-models button img{width:96px}.psd-support-actions{column-gap:12px!important;row-gap:12px!important}.psd-support-actions button{min-height:124px!important;padding:18px 52px 18px 18px!important}.psd-support-actions .psd-support-action-symbol{right:12px;font-size:22px}}
</style>
<style scoped>
.psd-office-region-photo{display:block;width:100%;min-width:0;aspect-ratio:835/469;object-fit:cover}.psd-office-detail{display:flex!important;align-items:flex-start;gap:8px;min-width:0}.psd-office-detail-icon{width:16px;height:16px;flex:0 0 16px;margin-top:3px;fill:none;stroke:#f22631;stroke-linecap:round;stroke-linejoin:round;stroke-width:2.4}.psd-office-detail>span{min-width:0}
</style>
<style scoped>
/* PSD button construction: one flat color plate, text, and the original transparent line-art asset. */
.psd-support-actions button{box-sizing:border-box!important;height:86px!important;min-height:86px!important;padding:16px 126px 16px 30px!important;border:0!important;border-radius:18px!important;background:#414140!important;color:#fff!important;box-shadow:inset 0 1px 0 rgb(255 255 255 / 5%)!important}
.psd-support-actions button:hover,.psd-support-actions button:focus-visible{background:#353534!important;transform:none!important;outline:2px solid #ef2630!important;outline-offset:4px}
.psd-support-actions strong{position:relative;z-index:1;margin:auto 0!important;font-weight:400!important;white-space:nowrap}
.psd-support-actions .psd-support-action-icon{position:absolute;top:50%;right:24px;display:grid;place-items:center;width:var(--service-icon-width);height:var(--service-icon-height);max-width:42%;max-height:calc(100% - 28px);transform:translateY(-50%);background:transparent!important;pointer-events:none}
.psd-support-actions .psd-support-action-icon img{display:block;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;opacity:.9;transition:opacity .24s ease,transform .24s ease}
.psd-support-actions button:hover .psd-support-action-icon img,.psd-support-actions button:focus-visible .psd-support-action-icon img{opacity:1;transform:scale(1.04)}
@media(max-width:900px){.psd-support-actions button{height:76px!important;min-height:76px!important;padding:14px 72px 14px 18px!important;border-radius:16px!important}.psd-support-actions .psd-support-action-icon{right:14px;max-width:30%;max-height:calc(100% - 20px)}.psd-support-actions strong{white-space:normal}}
</style>
<style scoped>
.service-exit-overlay{position:fixed;z-index:31;inset:0;display:grid;place-items:center;padding:20px;background:#0009;backdrop-filter:blur(12px)}.service-exit-dialog{width:min(390px,100%);padding:28px;border:1px solid #ffffff45;border-radius:16px;background:#1c1c1ce6;color:#fff;box-shadow:0 22px 70px #0009}.service-exit-dialog p{margin:0;color:#e33232;font-size:12px}.service-exit-dialog h2{margin:9px 0 10px;font-size:25px;font-weight:500}.service-exit-dialog span{color:#ffffffa8;line-height:1.65}.service-exit-dialog div{display:flex;justify-content:flex-end;gap:9px;margin-top:24px}.service-exit-dialog button{padding:10px 14px;border:0;border-radius:7px;background:#e33232;color:#fff;cursor:pointer}.service-exit-dialog .cancel{border:1px solid #ffffff3e;background:transparent}
</style>

<style scoped>
.map-navigation-overlay{position:fixed;z-index:150;inset:0;display:grid;place-items:center;padding:20px;background:rgb(0 0 0 / 68%);backdrop-filter:blur(10px)}
.map-navigation-dialog{width:min(520px,100%);padding:26px;border:1px solid rgb(255 255 255 / 22%);border-radius:8px;background:#f4f4f2;color:#17191b;box-shadow:0 24px 70px rgb(0 0 0 / 44%)}
.map-navigation-dialog header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px}.map-navigation-dialog header p{margin:0 0 5px;color:#e4242e;font-size:12px}.map-navigation-dialog h2{margin:0;font-size:27px;font-weight:600}.map-navigation-dialog header button{display:grid;width:34px;height:34px;padding:0;place-items:center;border:0;background:transparent;color:#383b3e;font-size:28px;line-height:1;cursor:pointer}.map-navigation-dialog header button:focus-visible{outline:2px solid #e4242e;outline-offset:2px}
.map-navigation-address{margin:18px 0;color:#666a6d;font-size:14px}.map-navigation-options{display:grid;gap:8px}.map-navigation-option{position:relative;min-height:72px;display:flex;padding:14px 52px 14px 16px;flex-direction:column;justify-content:center;border:1px solid #d7d9d8;border-radius:6px;background:#fff;color:#17191b;text-decoration:none;transition:border-color .2s ease,background-color .2s ease}.map-navigation-option:hover,.map-navigation-option:focus-visible{border-color:#e4242e;background:#fffafa;outline:0}.map-navigation-option strong{font-size:17px;font-weight:600}.map-navigation-option span{margin-top:5px;color:#74777a;font-size:13px}.map-navigation-option i{position:absolute;top:50%;right:18px;color:#e4242e;font-size:22px;font-style:normal;transform:translateY(-50%)}
@media(max-width:600px){.map-navigation-dialog{padding:22px 18px}.map-navigation-dialog h2{font-size:23px}.map-navigation-option{min-height:68px}}
</style>

<style scoped>
.service-human-support{display:flex;align-items:center;justify-content:center;gap:12px;padding:24px 32px;background:#121212;color:#ffffffb3;font-size:14px}.service-human-support a{color:#fff;font-size:18px;text-decoration:none}.service-human-support a:hover{text-decoration:underline}@media(max-width:760px){.service-human-support{padding:22px 20px}}
</style>

<style scoped>
.psd-models{margin-bottom:44px}.psd-models button.is-selected{border-color:#e91d28;color:#e91d28;transform:translateY(-4px)}.psd-action-panel{width:min(2560px,100%);margin:0 auto 48px}.psd-action-panel>p{margin:0 0 24px;color:#e91d28;font-size:clamp(19px,1.35vw,26px);font-weight:500}.support-actions-enter-active,.support-actions-leave-active{transition:opacity .2s ease,transform .2s ease}.support-actions-enter-from,.support-actions-leave-to{opacity:0;transform:translateY(-14px)}
@media(max-width:900px){.psd-action-panel{margin-bottom:32px}.psd-action-panel>p{margin-bottom:16px}}
</style>

<style scoped>
 .service-page>.service-hero,.service-page>.online-service{display:none}
 html[data-cms-preview-edit-mode="true"] .service-page>.online-service{display:block}
 html[data-cms-preview-edit-mode="true"] .service-page>.faq,html[data-cms-preview-edit-mode="true"] .service-page>.contact{display:block!important}
.psd-service-hero{position:relative;min-height:0;aspect-ratio:3840/1930;overflow:hidden;color:#fff;background:#101215 url('/assets/service-library-hero.jpg') center/cover no-repeat}.psd-service-hero::before{display:none}.psd-service-hero-copy{position:absolute;inset:0;margin:0;padding:0}.psd-service-hero-copy>:not(button){position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.psd-service-hero button{position:absolute;top:56.6%;left:64.1%;width:14.3%;height:7%;margin:0;border:0;background:transparent;color:transparent;cursor:pointer}.psd-service-hero button:focus-visible{outline:2px solid #fff;outline-offset:4px}.psd-service-hero button span{display:none}
.psd-online-support{scroll-margin-top:0;padding:clamp(72px,7.2vw,132px) max(3.5vw,calc((100vw - 2740px)/2)) clamp(86px,8vw,146px);background:#fff;color:#151619}.psd-support-heading{display:flex;align-items:flex-end;justify-content:center;gap:clamp(22px,2.2vw,42px)}.psd-support-heading h2{margin:0;color:#2c2c30;font-size:clamp(34px,3.2vw,62px);font-weight:600;line-height:1}.psd-support-heading p{margin:0 0 .14em;color:#2c2c30;font-size:clamp(18px,1.7vw,34px);font-weight:600;line-height:1}.psd-support-search{width:min(980px,100%);display:flex;align-items:center;gap:18px;margin:32px auto 72px;padding:0 20px 0 28px;border:2px solid #727377;border-radius:15px;background:#f5f5f3;box-shadow:inset 0 1px 0 rgb(255 255 255 / 45%)}.psd-support-search input{min-width:0;flex:1;height:64px;padding:0;border:0;background:transparent;color:#25262a;font:inherit;font-size:clamp(16px,1vw,20px);outline:0}.psd-support-search input::placeholder{color:#c9c9cc;font-weight:600}.psd-support-search button{padding:0;border:0;background:transparent;color:#ef2630;font:inherit;font-size:16px;cursor:pointer}.psd-support-search button span{margin-left:15px}.psd-models{width:min(2570px,100%);display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:12px;margin:0 auto 92px}.psd-models button{min-height:150px;padding:16px 8px;display:grid;place-items:end center;border:1px solid #e2e3e4;background:#f7f7f6;color:#292a2d;font:inherit;font-size:clamp(12px,.91vw,17px);cursor:pointer;transition:border-color .2s ease,color .2s ease,transform .2s ease}.psd-models button:hover{border-color:#e91d28;color:#e91d28;transform:translateY(-4px)}.psd-support-actions{width:min(2560px,100%);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid #d9dadd;border-left:1px solid #d9dadd}.psd-support-actions button{min-height:220px;padding:28px 30px;display:flex;flex-direction:column;align-items:flex-start;border:0;border-right:1px solid #d9dadd;border-bottom:1px solid #d9dadd;background:#fff;color:#1a1b1e;text-align:left;cursor:pointer;transition:background .2s ease,color .2s ease}.psd-support-actions button:hover{background:#1a1b1e;color:#fff}.psd-support-actions span{color:#eb202b;font-size:13px}.psd-support-actions strong{margin-top:auto;font-size:clamp(16px,1.46vw,28px);font-weight:500}.psd-support-actions i{margin-top:13px;color:#eb202b;font-size:20px;font-style:normal}.psd-online-support+ .service-hero{display:none}
 .psd-office-directory{padding:clamp(92px,9vw,176px) 0;background:#f6f6f4;color:#18191c}.psd-office-heading{width:min(70.39vw,2703px);margin:0 auto 3.54vw}.psd-office-heading p{display:none}.psd-office-heading h2{margin:0;font-size:min(1.64vw,63px);font-weight:500;line-height:1}.psd-office-regions{width:min(70.39vw,2703px);margin:0 auto}.psd-office-region{display:grid;grid-template-columns:30.89% minmax(0,65%);grid-template-areas:"title ." "photo body";column-gap:4.11%;row-gap:min(.6vw,23px);align-items:start;padding:min(1.77vw,68px) 0;border-bottom:1px solid #d8d9d9}.psd-office-region h3{grid-area:title;margin:0;font-size:min(1.38vw,53px);font-weight:500;line-height:1}.psd-office-region-photo{grid-area:photo}.psd-office-region-body{grid-area:body;min-width:0;height:100%}.psd-office-map{margin:0 0 min(.73vw,28px);overflow:hidden;background:#e5e9ee}.psd-office-map-link{display:block;width:100%;height:100%;padding:0;border:0;background:transparent;cursor:pointer}.psd-office-map-link:focus-visible{outline:3px solid var(--ruijun-red);outline-offset:3px}.psd-office-map img{display:block;width:100%;height:auto}.psd-office-region ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:1fr;column-gap:min(2.2vw,84px);row-gap:0;height:100%;margin:0;padding:0;list-style:none}.psd-office-region-body.is-compact-office-list ul{grid-template-columns:1fr}.psd-office-region li{min-height:0;padding:0;color:#4d5053;font-size:min(.833vw,32px);line-height:1.2}.psd-office-region li span{display:block}.psd-office-region li em,.psd-office-region li a{display:flex!important;margin-top:clamp(4px,.42vw,8px);color:#151619;font-size:inherit;font-style:normal;text-decoration:none}.psd-office-region li a:hover{color:var(--ruijun-red)}
.cms-office-phone-empty{display:none}html[data-cms-preview-edit-mode="true"] .cms-office-phone-empty{display:inline-flex;align-items:center;margin-left:.55em;padding:.12em .4em;border:1px dashed currentColor;color:#a62027;cursor:text;font-size:.82em;line-height:1.2}
@media(max-width:900px){.psd-service-hero{min-height:650px;aspect-ratio:auto;background-position:40% center}.psd-service-hero-copy>:not(button){position:static;width:auto;height:auto;padding:0;margin:0;overflow:visible;clip:auto;white-space:normal}.psd-service-hero-copy{display:flex;flex-direction:column;justify-content:center;width:86vw;margin:0 auto}.psd-service-eyebrow{margin:0 0 24px;color:#f22631;font-size:13px}.psd-service-hero h1{margin:0;font-size:46px;line-height:1.15;font-weight:500}.psd-service-hero h1 em{color:#f22631;font-style:normal}.psd-service-statement{max-width:760px;margin:28px 0 22px;font-size:23px;line-height:1.35}.psd-service-hero ul{display:grid;gap:10px;margin:0;padding:0;list-style:none;color:rgb(255 255 255/88%);font-size:16px}.psd-service-hero li{position:relative;padding-left:17px}.psd-service-hero li::before{content:"";position:absolute;top:.58em;left:0;width:6px;height:6px;border-radius:50%;background:#f22631}.psd-service-hero button{position:static;width:fit-content;height:auto;margin-top:32px;padding:13px 18px;border:1px solid rgb(255 255 255/50%);background:rgb(15 17 20/52%);color:#fff;font:inherit}.psd-service-hero button span{display:inline;margin-left:24px;color:#f22631}.psd-online-support{padding:62px 22px 74px}.psd-support-heading{justify-content:flex-start;gap:16px}.psd-support-heading h2{font-size:34px}.psd-support-heading p{font-size:18px;margin-bottom:.08em}.psd-support-search{margin:22px auto 48px;padding:0 16px 0 20px;border-radius:12px}.psd-support-search input{height:54px;font-size:15px}.psd-models{grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:48px}.psd-models button{min-height:96px;font-size:13px}.psd-support-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.psd-support-actions button{min-height:150px;padding:20px}.psd-support-actions strong{font-size:18px}.psd-office-directory{padding:74px 22px}.psd-office-heading,.psd-office-regions{width:100%}.psd-office-heading{margin-bottom:42px}.psd-office-heading h2{font-size:30px}.psd-office-region{grid-template-columns:1fr;grid-template-areas:"title" "photo" "body";gap:18px;padding:32px 0}.psd-office-region h3{font-size:20px}.psd-office-region-body{height:auto}.psd-office-region ul,.psd-office-region-body.is-compact-office-list ul{grid-template-columns:1fr;grid-auto-rows:auto;gap:12px;height:auto}.psd-office-region li{min-height:0;padding-bottom:10px;font-size:13px;line-height:1.35}.psd-office-region li em,.psd-office-region li a{margin-top:3px;font-size:12px}}
</style>

<style scoped>
/* Desktop geometry measured from the 3840px 技术支持(1).psd artboard. */
@media(min-width:901px){
  .psd-service-hero button{top:55.2%;left:64.1%;width:7.3%;height:4.5%;display:grid;place-items:center;color:#fff;font-size:1.4vw;font-weight:300;line-height:1}
  .psd-office-detail{gap:min(.47vw,18px)}
  .psd-office-detail-icon{width:min(.625vw,24px);height:min(.625vw,24px);flex-basis:min(.625vw,24px);margin-top:min(.1vw,4px);stroke-width:2.2}
  .psd-office-map{
    aspect-ratio:1757/321;
  }
  .psd-office-map img{
    width:100%;
    height:100%;
    object-fit:cover;
  }
  .psd-service-hero-copy ul{
    position:absolute!important;
    top:44.65%;
    left:64.1%;
    width:25%!important;
    height:auto!important;
    margin:0!important;
    padding:0!important;
    overflow:visible!important;
    clip:auto!important;
    white-space:nowrap!important;
    border:0;
    list-style:none;
  }
  .psd-service-hero-copy li{display:none}
  .psd-service-hero-copy li:nth-child(2){
    display:block;
    width:100%;
    padding:.28vw 0;
    color:#f1f1ee;
    background:rgb(29 31 29 / 92%);
    box-shadow:0 0 .55vw .38vw rgb(29 31 29 / 92%);
    backdrop-filter:blur(.3vw);
    font-size:.9375vw;
    font-weight:400;
    line-height:1.4;
  }
  .psd-online-support{
    box-sizing:border-box;
    min-height:0;
    padding:9.9219vw 0 7.7604vw!important;
  }
  .psd-support-heading{gap:1.7448vw}
  .psd-support-heading h2{font-size:2.0573vw}
  .psd-support-heading p{margin-bottom:.1302vw;font-size:1.4063vw}
  .psd-support-search{
    width:32.2135vw;
    height:2.9427vw;
    margin:1.3542vw auto 3.4115vw!important;
    padding:0 1.1458vw 0 1.4583vw;
    gap:.9375vw;
    border-width:1px;
    border-radius:.3125vw;
  }
  .psd-support-search input{height:100%;font-size:.8333vw}
  .psd-support-search button{font-size:.8333vw}
  .psd-support-search button span{margin-left:.7813vw}
  .psd-models{
    width:66.6146vw;
    grid-template-columns:repeat(9,5.7292vw);
    justify-content:space-between;
    gap:0;
    margin:0 auto 3.776vw!important;
  }
  .psd-models button{
    width:5.7292vw;
    height:7.5vw;
    min-height:0!important;
    padding:0!important;
    justify-content:flex-start!important;
    font-size:.8073vw;
  }
  .psd-models button img{
    width:5.7292vw!important;
    height:5.7031vw;
    margin:0 0 1.0156vw!important;
  }
  .psd-models button span{min-height:0;line-height:.8073vw;white-space:nowrap}
  .psd-action-panel{width:66.7708vw;margin:0 auto!important}
  .psd-action-panel>p{position:absolute;width:1px;height:1px;margin:-1px!important;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
  .psd-support-actions{
    width:100%!important;
    grid-template-columns:repeat(4,13.0469vw)!important;
    justify-content:space-between;
    column-gap:0!important;
    row-gap:1.3542vw!important;
  }
  .psd-support-actions button{
    width:13.0469vw;
    height:4.5vw;
    min-height:0!important;
    padding:0 3.2813vw 0 2.1354vw!important;
    border-radius:.94vw!important;
  }
  .psd-support-actions strong{font-size:.9375vw!important}
  .psd-support-actions .psd-support-action-icon{
    right:1.6667vw;
    width:var(--service-icon-desktop-width);
    height:var(--service-icon-desktop-height);
  }
}
@media(max-width:900px){
  .psd-support-actions{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  .psd-support-actions button{width:100%;min-width:0}
}
.psd-online-support,
.psd-office-directory{background:#eee}
.psd-service-hero{background-image:var(--service-hero-background, url('/assets/service-library-hero-v4.jpg'))!important}
.psd-service-hero-copy .psd-service-hero-network-copy{position:absolute!important;top:44.65%;left:64.1%;display:block!important;width:auto!important;height:auto!important;padding:0!important;margin:0!important;overflow:visible!important;clip:auto!important;color:#eeecec;font-size:.9375vw;font-weight:300;line-height:1.4;white-space:nowrap}
.psd-service-hero-copy .psd-service-hero-overseas-copy{position:absolute!important;top:48.1%;left:64.1%;display:block!important;width:auto!important;height:auto!important;padding:0!important;margin:0!important;overflow:visible!important;clip:auto!important;color:#eeecec;font-size:.9375vw;font-weight:300;line-height:1.4;white-space:nowrap}
.psd-service-hero-copy ul{display:none!important}
@media(min-width:901px){
  .psd-service-hero-copy h1{position:absolute!important;top:31.2%;left:64.1%;display:block!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;overflow:visible!important;clip:auto!important;color:#eeecec;font-size:2.0573vw;font-weight:300;line-height:1.1;white-space:nowrap!important}
  .psd-service-hero-copy h1 em{color:inherit;font-style:normal}
  .psd-service-hero-copy .psd-service-statement{position:absolute!important;top:37.1%;left:64.1%;display:block!important;width:auto!important;height:auto!important;max-width:none!important;margin:0!important;padding:0!important;overflow:visible!important;clip:auto!important;color:#eeecec;font-size:.9375vw;font-weight:300;line-height:1.4;white-space:nowrap!important}
  .psd-service-hero-copy .psd-service-hero-global-copy{position:absolute!important;top:40%;left:64.1%;display:block!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;overflow:visible!important;clip:auto!important;color:#eeecec;font-size:.9375vw;font-weight:300;line-height:1.4;white-space:nowrap!important}
}
@media(max-width:900px){
  .psd-service-hero-copy>:not(button){position:static;width:auto;height:auto;padding:0;margin:0;overflow:visible;clip:auto;white-space:normal}
  .psd-service-hero-copy ul{display:grid!important}
  .psd-service-hero-copy .psd-service-hero-global-copy{position:static!important;display:block!important;width:auto!important;height:auto!important;margin:0 0 10px!important;padding:0!important;overflow:visible!important;clip:auto!important;color:rgb(255 255 255/88%);font-size:16px;line-height:1.35;white-space:normal}
  .psd-service-hero-copy .psd-service-hero-network-copy,.psd-service-hero-copy .psd-service-hero-overseas-copy{display:none!important}
  .psd-service-hero-network-copy{display:none}
  .psd-service-hero button{position:static;width:fit-content;height:auto;margin-top:32px;padding:13px 18px;border:1px solid rgb(255 255 255/50%);background:rgb(15 17 20/52%);color:#fff;font:inherit}
}
</style>

<style scoped>
.psd-service-hero button span{display:none!important}
@media(min-width:901px){
  .psd-service-hero button{
    top:55.2%;
    left:64.1%;
    width:7.8%;
    height:4.5%;
    display:grid;
    place-items:center;
    margin:0;
    padding:0;
    border:0;
    border-radius:999px;
    background:#e51b23;
    color:#fff;
    font-size:clamp(13px,1.02vw,20px);
    font-weight:500;
    line-height:1;
    box-shadow:0 5px 16px rgb(229 27 35 / 28%);
    transition:background-color .2s ease,transform .2s ease,box-shadow .2s ease;
  }
  .psd-service-hero button:hover{background:#f02a32;transform:translateY(-1px);box-shadow:0 7px 20px rgb(229 27 35 / 36%)}
}
@media(max-width:900px){
  .psd-service-hero button{
    min-width:120px;
    display:grid;
    place-items:center;
    padding:13px 22px;
    border:0;
    border-radius:999px;
    background:#e51b23;
    color:#fff;
    line-height:1;
  }
}
</style>
