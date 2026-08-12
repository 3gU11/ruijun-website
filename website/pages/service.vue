<script setup lang="ts">
import { buildFaqHandoffUrl, createFaqConversation, faqAssistantMode, requestFaqHandoff, streamFaqMessage, submitFaqFeedback } from '~/shared/faq-bff-client.mjs';
import { readFaqSessionId, writeFaqSessionId } from '~/shared/faq-session-store.mjs';
import { resolveServiceEntry, shouldEnableServiceEntries } from '~/shared/service-assistant.mjs';
import { createServiceEntryClick, hasConfirmedServiceExit, markServiceExitConfirmed } from '~/shared/service-exit.mjs';
import { resolveRepairPortalUrl } from '~/shared/repair-portal.mjs';
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
const resources = computed(() => Array.isArray(resourceResponse.value?.data) ? resourceResponse.value.data : []);
const locations = computed(() => Array.isArray(locationResponse.value?.data) ? locationResponse.value.data : []);
const fallbackSupportModels = ['灵动工作站', 'FR-XS(AUTO)', 'FR-XS(PRO)', 'FT-XS', 'FL-XS(PRO)', 'FR-Y', 'FR-G', 'FH-C', '定制机型'].map((label) => ({ label, image: '/assets/service-model-icon.png' }));
const fallbackSupportActions = [
  { number: '01', title: '我的维修申请', query: '我想提交维修申请', image: '/assets/service-action-1.png' },
  { number: '02', title: '保修状态验核', query: '我想核验保修状态', image: '/assets/service-action-2.png' },
  { number: '03', title: '服务流程与寄修', query: '我想了解服务流程与寄修', image: '/assets/service-action-3.png' },
  { number: '04', title: '视频教学', query: '我想查看视频教学', image: '/assets/service-action-4.png' },
  { number: '05', title: '技术文件下载', query: '我想下载技术文件', image: '/assets/service-action-5.png' },
  { number: '06', title: '常见故障分析', query: '我想查询常见故障分析', image: '/assets/service-action-6.png' },
  { number: '07', title: '保养与易损件', query: '我想了解保养与易损件', image: '/assets/service-action-7.png' },
  { number: '08', title: '知识分享', query: '我想查看知识分享', image: '/assets/service-action-8.png' },
  { number: '09', title: '维修进度查询', query: '我想查询维修进度', image: '/assets/service-action-3.png' }
  ,{ number: '10', title: '我的申请', query: '我想查看我的维修申请', image: '/assets/service-action-3.png' }
];
const repairContent = computed(() => (servicePageResponse.value?.data?.sections || []).find((section: any) => section?.id === 'repair' || section?.id === 'service-repair') || null);
const repairPageConfig = computed(() => repairPageConfigResponse.value?.data || null);
const psdSupportModels = computed(() => {
  const cards = repairPageConfig.value?.modelCards;
  if (Array.isArray(cards) && cards.length) return cards.map((card: any) => ({ label: card.label || card.title, image: card.image || '/assets/service-model-icon.png' }));
  return Array.isArray(repairContent.value?.repairModels) && repairContent.value.repairModels.length ? repairContent.value.repairModels : fallbackSupportModels;
});
const psdSupportActions = computed(() => {
  const cards = repairPageConfig.value?.actionCards;
  if (Array.isArray(cards) && cards.length) return cards.map((card: any) => ({ number: card.number, title: card.title || card.label, query: card.query || card.title || '', image: card.image || '/assets/service-action-3.png' }));
  return Array.isArray(repairContent.value?.repairActions) && repairContent.value.repairActions.length ? repairContent.value.repairActions : fallbackSupportActions;
});
const selectedSupportModel = ref<string | null>(null);
const repairMode = ref<'request' | 'warranty' | 'progress' | 'requests' | null>(null);
const repairFaqContext = ref<any>(null);
const psdOfficeRegions = [
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
const repairSystemAvailable = computed(() => shouldEnableServiceEntries(serviceConfig.value?.available));
const entryUrl = computed(() => repairSystemAvailable.value ? resolveServiceEntry(serviceConfig.value?.entries, answer.value?.suggestedAction) : null);
const repairEntryUrl = computed(() => repairSystemAvailable.value ? resolveServiceEntry(serviceConfig.value?.entries, 'request') : null);
const supportPhone = computed(() => supportPhoneValue(serviceConfig.value?.supportPhone));

function selectSupportModel(model: string) {
  selectedSupportModel.value = model;
}

function openModelServiceAction(action: { number?: string, query: string }) {
  const portalAction = ({ '01': 'repair_new', '02': 'repair_warranty', '09': 'repair_requests', '10': 'repair_requests' } as Record<string, string>)[String(action.number || '')];
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

function dismissOnEscape(event: KeyboardEvent) { if (event.key === 'Escape' && dialogOpen.value) dialogOpen.value = false; }

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
    handoffError.value = '交接暂时不可用。你可以直接进入维修系统填写申请，或联系人工售后。';
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
    <section class="psd-service-hero" aria-labelledby="service-title">
      <div class="psd-service-hero-copy">
        <p class="psd-service-eyebrow">SERVICE SUPPORT</p>
        <h1 id="service-title">售后服务 <em>快人一步</em></h1>
        <p class="psd-service-statement">在线报单、进度追踪、专人支持，全程透明可查</p>
        <ul>
          <li>全球服务网络 原厂备件保障</li>
          <li>全国几十家门店 涵盖全国主要省市</li>
          <li>海外 20 余家长期合作经销商</li>
        </ul>
        <button type="button" aria-controls="ruijun-support" @click="scrollToSupport">在线服务支持 <span aria-hidden="true">→</span></button>
      </div>
    </section>
    <nav class="service-subpage-nav" aria-label="服务支持子页面">
      <NuxtLink to="/service">技术支持</NuxtLink>
      <NuxtLink to="/service/download">资料下载</NuxtLink>
    </nav>
    <section id="ruijun-support" class="psd-online-support" aria-labelledby="support-title">
      <div class="psd-support-heading">
        <h2 id="support-title">瑞钧支持</h2>
        <p>需要协助 从这里开始</p>
      </div>
      <form class="psd-support-search" @submit.prevent="openAssistant(question || '我需要服务支持')">
        <label class="sr-only" for="service-question">描述设备或服务需求</label>
        <input id="service-question" v-model="question" maxlength="300" placeholder="输入设备型号、故障现象、维修进度或保修问题">
        <button type="submit">咨询 AI <span aria-hidden="true">→</span></button>
      </form>
      <div class="psd-models" role="list" aria-label="选择设备型号">
        <button v-for="model in psdSupportModels" :key="model.label" type="button" role="listitem" :class="{ 'is-selected': selectedSupportModel === model.label }" :aria-pressed="selectedSupportModel === model.label" aria-controls="support-actions" @click="selectSupportModel(model.label)"><img :src="model.image" alt="" aria-hidden="true"><span>{{ model.label }}</span></button>
      </div>
      <section id="support-actions" class="psd-action-panel" :aria-label="selectedSupportModel ? `${selectedSupportModel} 的服务选项` : '服务选项'">
          <p>{{ selectedSupportModel ? `${selectedSupportModel} 服务支持` : '选择服务项目，机型可在后续步骤补充' }}</p>
          <div class="psd-support-actions">
            <button v-for="action in psdSupportActions.slice(0, 8)" :key="action.title" type="button" @click="openModelServiceAction(action)">
              <span class="psd-support-action-number">{{ action.number }}</span><strong>{{ action.title }}</strong><img class="psd-support-action-art" :src="action.image" alt="" aria-hidden="true"><i aria-hidden="true">→</i>
            </button>
          </div>
          <RepairInlinePanel v-if="repairMode" :model="selectedSupportModel" :mode="repairMode" :faq-context="repairFaqContext" @close="repairMode = null" />
      </section>
    </section>
    <section class="psd-office-directory" aria-labelledby="office-directory-title">
      <div class="psd-office-heading">
        <p>RUIJUN SERVICE NETWORK</p>
        <h2 id="office-directory-title">国内直属办事处</h2>
      </div>
      <div class="psd-office-regions">
        <section v-for="region in psdOfficeRegions" :key="region.name" class="psd-office-region">
          <div class="psd-office-region-media">
            <h3>{{ region.name }}</h3>
            <img :src="psdOfficeImages[region.name]" :alt="`${region.name}办事处`">
          </div>
          <div class="psd-office-region-body">
            <figure v-if="region.name === '外贸商务'" class="psd-office-map">
              <img src="/assets/service-office-map.jpg" alt="常熟总部位置地图">
            </figure>
            <ul>
              <li v-for="office in region.offices" :key="office.address">
                <span class="psd-office-detail">
                  <svg class="psd-office-detail-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.3 7-12A7 7 0 1 0 5 9c0 6.7 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>
                  <span>{{ office.address }}</span>
                </span>
                <a v-if="office.phone" class="psd-office-detail" :href="`tel:${office.phone}`"><svg class="psd-office-detail-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-4.1 3.3-6.2 7.5-6.2s6.7 2.1 7.5 6.2"/></svg><span>{{ office.manager }} · {{ office.phone }}</span></a>
                <em v-else class="psd-office-detail"><svg class="psd-office-detail-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-4.1 3.3-6.2 7.5-6.2s6.7 2.1 7.5 6.2"/></svg><span>{{ office.manager }}</span></em>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </section>
    <section class="service-hero"><div><p>SERVICE & SUPPORT</p><h1>从设备选型<br>到持续稳定生产</h1><span>围绕选型咨询、设备交付与售后响应，为用户提供清晰、直接的服务入口。</span></div></section>
    <section class="online-service"><div class="section-inner"><div class="section-heading"><h2>在线售后服务</h2><p>不需要预先判断应该进入哪个系统。先让 AI 确认设备情况和服务目标，再在需要提交或查询时打开对应页面。</p></div><div class="service-desk"><div><p>RUIJUN AI SERVICE DESK</p><h3>先描述问题<br>剩下交给 AI</h3><span>报修资料、保修核验和维修进度由服务助手逐步引导。维修系统只用于提交申请与查询状态。</span><button type="button" @click="openAssistant('我想办理售后服务')">开始服务咨询 <span aria-hidden="true">→</span></button></div><ol><li><b>01</b><div><strong>说明设备或服务需求</strong><span>可直接输入机型、故障现象、进度或保修问题。</span></div></li><li><b>02</b><div><strong>由 AI 确认办理路径</strong><span>先得到资料清单与流程说明，避免无效提交。</span></div></li><li><b>03</b><div><strong>需要时再进入维修系统</strong><span>提交工单、核验保修或查询进度均在独立系统完成。</span></div></li></ol></div></div></section>
    <section class="faq"><div class="section-inner"><div class="section-heading"><h2>常见服务问题</h2><p>先了解办理流程，再决定是否进入售后系统。涉及具体设备状态时，以售后工程师确认结果为准。</p></div><div class="faq-list"><details><summary>报修前需要准备哪些资料？</summary><p>设备型号与铭牌照片、机床编号、故障发生时间、故障现象、报警信息、现场照片或视频，以及联系人和联系电话。</p><button type="button" @click="openAssistant('报修前需要准备哪些资料？')">继续咨询 AI</button></details><details><summary>在哪里发起维修申请？</summary><p>先由 AI 确认所需资料；需要提交时，服务助手会打开独立售后系统的维修申请页面。</p><button type="button" @click="openAssistant('我想发起维修申请')">继续咨询 AI</button></details><details><summary>在哪里查看维修进度？</summary><p>服务助手会引导你进入售后系统查看审核、补充资料、维修处理、寄回物流和归档状态。</p><button type="button" @click="openAssistant('我想查询维修进度')">继续咨询 AI</button></details><details><summary>如何核验保修状态？</summary><p>准备设备型号和机床编号，再由服务助手提供售后系统入口。</p><button type="button" @click="openAssistant('我想核验保修状态')">继续咨询 AI</button></details></div></div></section>
    <section v-if="resources.length || locations.length" class="service-content"><div v-if="resources.length" class="service-content-block"><p>SERVICE RESOURCES</p><h2>已发布服务资料</h2><ul><li v-for="resource in resources" :key="String(resource.source_key)"><div><strong>{{ resource.type }}</strong><span>{{ Array.isArray(resource.applicable_models) ? resource.applicable_models.join('、') : '' }}</span></div><a v-if="resourceLink(resource.asset)" :href="resourceLink(resource.asset)" target="_blank" rel="noopener">查看资料</a></li></ul></div><div v-if="locations.length" class="service-content-block"><p>SERVICE LOCATIONS</p><h2>服务网点</h2><ul><li v-for="location in locations" :key="String(location.source_key)"><div><strong>{{ [location.region, location.city].filter(Boolean).join(' · ') }}</strong><span>{{ location.service_scope }}</span></div><a v-if="contactPhone(location)" :href="`tel:${contactPhone(location).replace(/\s/g, '')}`">{{ contactPhone(location) }}</a></li></ul></div></section>
    <section class="contact"><div class="section-inner"><div class="section-heading"><h2>联系瑞钧</h2><p>售后服务请使用上方 AI 服务台。设备选型和工厂来访可在此咨询，AI 会先整理信息，再引导至合适的后续安排。</p></div><div class="contact-grid"><article><small>AI SALES CONSULTATION</small><h3>设备选型与方案</h3><p>输入工件尺寸、材料、精度、锥度、批量和自动化需求，AI 先帮你整理选型要点。</p><button type="button" @click="openAssistant('我想咨询设备选型与方案')">咨询 AI 助手 <span aria-hidden="true">→</span></button></article><article><small>AI FACTORY VISIT</small><h3>工厂来访安排</h3><p>询问常熟或昆山工厂地址、来访前准备事项和接待安排，再确认合适的参观时间。</p><button type="button" @click="openAssistant('我想预约工厂来访')">询问来访安排 <span aria-hidden="true">→</span></button></article></div></div></section>
    <Teleport to="body"><div v-if="dialogOpen" class="assistant-overlay" @click.self="dialogOpen = false"><section class="assistant-dialog" role="dialog" aria-modal="true" aria-label="瑞钧 AI 服务助手"><header><div><p>RUIJUN AI</p><h2>服务助手</h2></div><button type="button" aria-label="关闭服务助手" @click="dialogOpen = false">×</button></header><div class="conversation" aria-live="polite"><p v-if="!answer && !generatedAnswer && !loading">请描述设备或服务需求，我会先确认资料与办理路径。</p><p v-if="loading">正在整理服务建议...</p><template v-if="generatedAnswer"><small>AI 服务答复</small><p class="generated-answer">{{ generatedAnswer }}</p></template><template v-if="answer"><small>{{ answer.matched ? '已审核服务指引' : '人工服务建议' }}</small><h3>{{ answer.title }}</h3><p>{{ answer.answer }}</p><ol><li v-for="step in answer.steps" :key="step">{{ step }}</li></ol><p class="note">{{ answer.note }}</p><a v-if="entryUrl" :href="entryUrl" target="_blank" rel="noopener">进入维修系统</a></template><ul v-if="citations.length" class="citations"><li v-for="citation in citations" :key="citation.id">{{ citation.title }}<em v-if="citation.version"> · {{ citation.version }}</em></li></ul><div v-if="faqRequestId" class="feedback"><span>这条答复是否有帮助？</span><button type="button" :disabled="feedbackLoading" @click="submitFeedback(true)">有帮助</button><button type="button" :disabled="feedbackLoading" @click="submitFeedback(false)">需要协助</button></div><p v-if="feedbackStatus" class="feedback-status" role="status">{{ feedbackStatus }}</p><p v-if="handoffError" class="notice">{{ handoffError }}</p><section v-if="bffEnabled && faqSessionId" class="handoff-panel"><label><input v-model="handoffConsent" type="checkbox"> 我确认将以下必要摘要交给维修系统，并在系统中自行检查、补充和提交。</label><textarea v-model="repairDraftSummary" maxlength="1000" :disabled="!handoffConsent" aria-label="维修草稿摘要" placeholder="填写或修改故障现象摘要"></textarea><div v-if="handoffConsent" class="handoff-actions"><button type="button" :disabled="handoffLoading" @click="startHandoff('continue_conversation')">继续至维修系统</button><button type="button" :disabled="handoffLoading || !repairDraftSummary.trim()" @click="startHandoff('repair_draft')">生成可编辑维修草稿</button></div></section><a v-if="!faqSessionId && repairEntryUrl" class="direct-repair" :href="repairEntryUrl" target="_blank" rel="noopener">直接提交维修申请</a></div><form @submit.prevent="ask()"><input v-model="question" maxlength="300" placeholder="输入问题，例如：我想查询维修进度"><button v-if="loading" type="button" class="stop" @click="stopAnswer">停止</button><button v-else type="submit">发送</button></form></section></div></Teleport>
    <Teleport to="body"><div v-if="pendingExit" class="service-exit-overlay" @click.self="pendingExit = null"><section class="service-exit-dialog" role="dialog" aria-modal="true" aria-labelledby="service-exit-title"><p>服务跳转</p><h2 id="service-exit-title">即将进入瑞钧售后服务系统</h2><span>将在新窗口打开，当前官网页面会保留。</span><div><button type="button" class="cancel" @click="pendingExit = null">暂不前往</button><button type="button" @click="openPendingServiceExit">继续前往</button></div></section></div></Teleport>
    <aside class="service-human-support" aria-label="人工售后支持">
      <span>需要人工协助？</span>
      <a :href="`tel:${supportPhone}`">{{ supportPhone }}</a>
    </aside>
    <SiteFooter />
  </main>
  <NuxtPage v-else />
</template>

<style scoped>
.service-page>.faq,.service-page>.service-content,.service-page>.contact{display:none!important}
.psd-support-actions{width:min(2560px,100%)!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:18px!important;border:0!important}
.psd-support-actions button{position:relative!important;min-height:164px!important;padding:22px 24px!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;border:0!important;background:#3f3e3a!important;color:#fff!important;text-align:left!important;overflow:hidden!important;cursor:pointer!important;transition:background .24s ease,transform .24s ease!important}
.psd-support-actions button:hover,.psd-support-actions button:focus-visible{background:#e91d28!important;transform:translateY(-4px)!important;outline:0!important}.psd-support-actions button:focus-visible{box-shadow:0 0 0 3px #161719!important}
.psd-support-actions .psd-support-action-number{position:relative!important;z-index:1!important;color:#f7c948!important;font-size:12px!important}.psd-support-actions strong{position:relative!important;z-index:1!important;margin-top:auto!important;font-size:clamp(16px,1.46vw,28px)!important;font-weight:500!important}.psd-support-actions i{position:relative!important;z-index:1!important;margin-top:11px!important;color:#f7c948!important;font-size:20px!important;font-style:normal!important}
.psd-support-action-art{position:absolute!important;top:20px!important;right:20px!important;width:86px!important;height:56px!important;object-fit:cover!important;mix-blend-mode:screen!important;opacity:.78!important;transition:opacity .24s ease,transform .24s ease!important}.psd-support-actions button:hover .psd-support-action-art,.psd-support-actions button:focus-visible .psd-support-action-art{opacity:1!important;transform:scale(1.08)!important}
.service-page{min-height:100vh;background:var(--ruijun-paper);color:#161719}.service-hero{position:relative;min-height:68svh;display:flex;align-items:flex-end;padding:150px 6.2% 8vh;isolation:isolate;overflow:hidden;color:#fff;background:#777 url('/assets/docx-service.jpg') center 16%/cover no-repeat}.service-hero::after{content:"";position:absolute;z-index:-1;inset:0;background:rgb(10 12 14/49%)}.service-hero>div{width:min(980px,100%)}.service-hero p,.service-desk>div>p,.assistant-dialog header p{margin:0;color:#ef3840;font-size:12px}.service-hero h1{max-width:920px;margin:16px 0 0;font-size:clamp(58px,6.1vw,88px);line-height:1.02;font-weight:600}.service-hero span{display:block;max-width:650px;margin-top:24px;color:rgb(255 255 255/78%);font-size:17px}.online-service,.faq,.contact{padding:90px 6.2%}.online-service{color:#fff;background:#111214}.section-inner{width:min(var(--ruijun-max),100%);margin:0 auto}.section-heading{display:grid;grid-template-columns:minmax(220px,.7fr) minmax(0,1.3fr);gap:8vw;align-items:end;margin-bottom:50px}.section-heading h2{margin:0;font-size:54px;line-height:1.12}.section-heading p{max-width:660px;margin:0;color:#6f7276;font-size:16px}.online-service .section-heading p{color:#a4a7ab}.service-desk{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,.95fr);border:1px solid #3a3c3f}.service-desk>div{display:flex;min-height:390px;padding:44px 48px;flex-direction:column;border-right:1px solid #3a3c3f}.service-desk h3{margin:42px 0 20px;font-size:54px;line-height:1.04}.service-desk>div>span{max-width:440px;color:#a4a7ab;line-height:1.8}.service-desk>div>button{width:fit-content;margin-top:auto;padding:13px 16px;color:#fff;background:var(--ruijun-red);border:0;border-radius:4px;font-weight:700;cursor:pointer}.service-desk ol{display:grid;margin:0;padding:28px 42px;list-style:none}.service-desk li{display:grid;grid-template-columns:48px 1fr;gap:16px;align-content:center;border-bottom:1px solid #3a3c3f}.service-desk li:last-child{border-bottom:0}.service-desk b{color:#ef3840;font-size:11px}.service-desk strong{display:block;color:#fff;font-size:18px}.service-desk li span{display:block;margin-top:8px;color:#a4a7ab;font-size:13px}.faq{background:#eceeeb}.faq-list{border-top:1px solid #c8cbc7}.faq-list details{border-bottom:1px solid #c8cbc7}.faq-list summary{position:relative;padding:22px 54px 22px 0;cursor:pointer;list-style:none;font-size:18px;font-weight:650}.faq-list summary::after{content:"+";position:absolute;top:14px;right:4px;color:var(--ruijun-red);font-size:28px;font-weight:300}.faq-list details[open] summary::after{transform:rotate(45deg)}.faq-list details>p{max-width:820px;margin:-4px 0 12px;color:#666a6e}.faq-list details>button{margin:0 0 22px;padding:8px 12px;color:var(--ruijun-red);background:transparent;border:1px solid var(--ruijun-red);cursor:pointer}.contact{background:var(--ruijun-paper)}.contact-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:#d1d3d2;border:1px solid #d1d3d2}.contact-grid article{min-height:230px;padding:36px;display:flex;flex-direction:column;background:var(--ruijun-paper)}.contact-grid small{color:var(--ruijun-red);font-weight:700}.contact-grid h3{margin:24px 0 12px;font-size:28px}.contact-grid p{margin:0;color:#6f7276}.contact-grid button{width:fit-content;margin-top:auto;padding:22px 0 0;color:var(--ruijun-red);background:transparent;border:0;font-weight:700;cursor:pointer}.service-content{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px;padding:70px 6.2%;background:#fff}.service-content-block>p{color:var(--ruijun-red);font-size:12px}.service-content-block ul{padding:0;list-style:none}.service-content-block li{display:flex;padding:16px 0;justify-content:space-between;border-top:1px solid var(--ruijun-line)}.service-content-block li span{display:block;color:#777}.service-content-block a{color:var(--ruijun-red)}.assistant-overlay{position:fixed;z-index:130;inset:0;display:grid;place-items:center;padding:20px;background:#0009;backdrop-filter:blur(12px)}.assistant-dialog{width:min(560px,100%);max-height:min(700px,90vh);display:flex;flex-direction:column;border:1px solid #ffffff4d;border-radius:8px;background:#181818f2;color:#fff;box-shadow:0 22px 70px #0009;overflow:hidden}.assistant-dialog header{display:flex;justify-content:space-between;padding:21px 24px;border-bottom:1px solid #ffffff2e}.assistant-dialog header h2{margin:4px 0 0;font-size:21px}.assistant-dialog header button{border:0;background:transparent;color:#fff;font-size:30px;cursor:pointer}.conversation{min-height:260px;padding:24px;overflow:auto}.conversation h3{margin:10px 0;font-size:22px}.conversation p,.conversation li{line-height:1.75}.conversation .note{color:#ffffff9c;font-size:13px}.conversation .generated-answer{white-space:pre-wrap}.citations{margin:14px 0 0;padding:10px 0 0;border-top:1px solid #ffffff24;list-style:none;font-size:12px;color:#ffffffa8}.citations li+li{margin-top:5px}.citations em{font-style:normal;color:#ffffff67}.feedback{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:14px;font-size:12px;color:#ffffffb0}.feedback button{padding:6px 8px;border:1px solid #ffffff38;border-radius:6px;background:transparent;color:#fff}.feedback-status{margin:8px 0 0;color:#ffffffa0;font-size:12px}.conversation .notice{padding:10px 12px;border-left:2px solid #e33232;background:#ffffff0d;color:#ffffffc7}.conversation a{display:inline-block;margin-top:12px;padding:11px 14px;border-radius:4px;background:#dd3030;color:#fff;text-decoration:none}.handoff-panel{display:grid;gap:10px;margin-top:20px;padding:14px;border:1px solid #ffffff30;border-radius:8px;background:#ffffff0c}.handoff-panel label{font-size:13px;line-height:1.55}.handoff-panel textarea{min-height:82px;padding:10px;border:1px solid #ffffff38;border-radius:4px;background:#111;color:#fff;resize:vertical}.handoff-actions{display:flex;gap:8px;flex-wrap:wrap}.handoff-actions button{padding:9px 12px;border:1px solid #ffffff55;border-radius:4px;background:#fff;color:#171717}.assistant-dialog form{display:flex;gap:10px;padding:16px;border-top:1px solid #ffffff2e}.assistant-dialog input{min-width:0;flex:1;padding:12px;border:1px solid #ffffff38;border-radius:4px;background:#ffffff12;color:#fff}.assistant-dialog form button{padding:0 16px;border:0;border-radius:4px;background:#fff;color:#171717}.assistant-dialog form .stop{background:#ffffff25;color:#fff}
@media(max-width:900px){.service-hero{min-height:62svh;padding:120px 22px 58px}.service-hero h1{font-size:50px}.service-hero span{font-size:15px}.online-service,.faq,.contact{padding:62px 22px}.section-heading{grid-template-columns:1fr;gap:18px;margin-bottom:34px}.section-heading h2{font-size:38px}.service-desk{grid-template-columns:1fr}.service-desk>div{min-height:360px;padding:34px;border-right:0;border-bottom:1px solid #3a3c3f}.service-desk h3{margin-top:32px;font-size:44px}.service-desk ol{padding:10px 34px}.service-desk li{min-height:110px}.contact-grid,.service-content{grid-template-columns:1fr}.service-content{padding:52px 22px}}
.service-hero{background-position:center;background-size:cover}.service-hero::after{background:rgb(7 9 11/52%)}
.service-subpage-nav{display:none}
</style>

<style scoped>
.psd-models button{min-height:172px!important;padding:0 8px 12px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-end!important;border:0!important;background:transparent!important}.psd-models button img{width:min(100%,142px);aspect-ratio:1;object-fit:contain;margin-bottom:10px}.psd-models button span{min-height:1.5em;display:block}.psd-support-actions{column-gap:clamp(36px,7.3vw,140px)!important;row-gap:38px!important;border:0!important}.psd-support-actions button{position:relative;min-height:132px!important;padding:22px 68px 22px 30px!important;border:0!important;border-radius:7px!important;background:linear-gradient(100deg,#363635 0%,#4a4948 100%)!important;color:#fff!important}.psd-support-actions button:hover{background:linear-gradient(100deg,#202120 0%,#343332 100%)!important;transform:translateY(-3px)}.psd-support-actions .psd-support-action-number,.psd-support-actions i{display:none!important}.psd-support-actions strong{margin:auto 0!important;font-weight:400!important;white-space:nowrap}.psd-support-actions .psd-support-action-symbol{position:absolute;top:50%;right:22px;display:grid!important;width:34px;height:34px;place-items:center;transform:translateY(-50%);color:#d7c39d;font-family:"Segoe UI Symbol",sans-serif;font-size:28px;line-height:1;text-shadow:0 0 10px rgb(215 195 157 / 22%)}
@media(max-width:900px){.psd-models button{min-height:132px!important}.psd-models button img{width:96px}.psd-support-actions{column-gap:12px!important;row-gap:12px!important}.psd-support-actions button{min-height:124px!important;padding:18px 52px 18px 18px!important}.psd-support-actions .psd-support-action-symbol{right:12px;font-size:22px}}
</style>

<style scoped>
.psd-office-region-media{min-width:0}.psd-office-region-media img{display:block;width:100%;margin-top:28px;aspect-ratio:850/470;object-fit:cover}
.psd-office-detail{display:flex!important;align-items:flex-start;gap:8px;min-width:0}.psd-office-detail-icon{width:16px;height:16px;flex:0 0 16px;margin-top:3px;fill:none;stroke:#f22631;stroke-linecap:round;stroke-linejoin:round;stroke-width:2.4}.psd-office-detail>span{min-width:0}
@media(max-width:900px){.psd-office-region-media img{margin-top:18px}}
</style>

<style scoped>
.service-exit-overlay{position:fixed;z-index:31;inset:0;display:grid;place-items:center;padding:20px;background:#0009;backdrop-filter:blur(12px)}.service-exit-dialog{width:min(390px,100%);padding:28px;border:1px solid #ffffff45;border-radius:16px;background:#1c1c1ce6;color:#fff;box-shadow:0 22px 70px #0009}.service-exit-dialog p{margin:0;color:#e33232;font-size:12px}.service-exit-dialog h2{margin:9px 0 10px;font-size:25px;font-weight:500}.service-exit-dialog span{color:#ffffffa8;line-height:1.65}.service-exit-dialog div{display:flex;justify-content:flex-end;gap:9px;margin-top:24px}.service-exit-dialog button{padding:10px 14px;border:0;border-radius:7px;background:#e33232;color:#fff;cursor:pointer}.service-exit-dialog .cancel{border:1px solid #ffffff3e;background:transparent}
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
.psd-service-hero{position:relative;min-height:0;aspect-ratio:3840/1930;overflow:hidden;color:#fff;background:#101215 url('/assets/service-library-hero.jpg') center/cover no-repeat}.psd-service-hero::before{display:none}.psd-service-hero-copy{position:absolute;inset:0;margin:0;padding:0}.psd-service-hero-copy>:not(button){position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.psd-service-hero button{position:absolute;top:56.6%;left:64.1%;width:14.3%;height:7%;margin:0;border:0;background:transparent;color:transparent;cursor:pointer}.psd-service-hero button:focus-visible{outline:2px solid #fff;outline-offset:4px}.psd-service-hero button span{display:none}
.service-subpage-nav{display:flex;justify-content:center;gap:28px;padding:18px 24px;background:#fff;border-bottom:1px solid #e0e1e2}.service-subpage-nav a{color:#77797c;font-size:14px;text-decoration:none}.service-subpage-nav a.router-link-exact-active{color:#e51b23}
.psd-online-support{scroll-margin-top:74px;padding:clamp(92px,9vw,172px) max(3.5vw,calc((100vw - 2740px)/2));background:#fff;color:#151619}.psd-support-heading{display:flex;align-items:baseline;justify-content:center;gap:clamp(22px,3.1vw,60px)}.psd-support-heading h2{margin:0;font-size:clamp(46px,4.69vw,90px);font-weight:500;line-height:1.1}.psd-support-heading p{margin:0;color:#ec202b;font-size:clamp(24px,3.13vw,60px);line-height:1.1}.psd-support-search{width:min(1236px,100%);display:flex;margin:54px auto 72px;border-bottom:1px solid #c9cacc}.psd-support-search input{min-width:0;flex:1;padding:18px 0;border:0;background:transparent;color:#18191c;font:inherit;font-size:clamp(16px,1.15vw,22px);outline:0}.psd-support-search input::placeholder{color:#929498}.psd-support-search button{padding:0 0 0 28px;border:0;background:transparent;color:#e91d28;font:inherit;font-size:16px;cursor:pointer}.psd-support-search button span{margin-left:15px}.psd-models{width:min(2570px,100%);display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:12px;margin:0 auto 92px}.psd-models button{min-height:150px;padding:16px 8px;display:grid;place-items:end center;border:1px solid #e2e3e4;background:#f7f7f6;color:#292a2d;font:inherit;font-size:clamp(12px,.91vw,17px);cursor:pointer;transition:border-color .2s ease,color .2s ease,transform .2s ease}.psd-models button:hover{border-color:#e91d28;color:#e91d28;transform:translateY(-4px)}.psd-support-actions{width:min(2560px,100%);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid #d9dadd;border-left:1px solid #d9dadd}.psd-support-actions button{min-height:220px;padding:28px 30px;display:flex;flex-direction:column;align-items:flex-start;border:0;border-right:1px solid #d9dadd;border-bottom:1px solid #d9dadd;background:#fff;color:#1a1b1e;text-align:left;cursor:pointer;transition:background .2s ease,color .2s ease}.psd-support-actions button:hover{background:#1a1b1e;color:#fff}.psd-support-actions span{color:#eb202b;font-size:13px}.psd-support-actions strong{margin-top:auto;font-size:clamp(16px,1.46vw,28px);font-weight:500}.psd-support-actions i{margin-top:13px;color:#eb202b;font-size:20px;font-style:normal}.psd-online-support+ .service-hero{display:none}
 .psd-office-directory{padding:clamp(92px,9vw,176px) max(7.1vw,calc((100vw - 2740px)/2));background:#f6f6f4;color:#18191c}.psd-office-heading{display:grid;grid-template-columns:minmax(210px,.6fr) minmax(0,1.4fr);gap:8vw;align-items:end;max-width:2570px;margin:0 auto 76px}.psd-office-heading p{margin:0;color:#ec202b;font-size:13px;font-weight:600}.psd-office-heading h2{margin:0;font-size:clamp(42px,4.1vw,78px);font-weight:500;line-height:1.08}.psd-office-regions{max-width:2570px;margin:0 auto;border-top:1px solid #cfd0d0}.psd-office-region{display:grid;grid-template-columns:minmax(210px,.6fr) minmax(0,1.4fr);gap:8vw;padding:48px 0;border-bottom:1px solid #d8d9d9}.psd-office-region h3{margin:0;font-size:clamp(21px,1.56vw,30px);font-weight:500}.psd-office-region-body{min-width:0}.psd-office-map{margin:0 0 28px;overflow:hidden;background:#e5e9ee}.psd-office-map img{display:block;width:100%;height:auto}.psd-office-region ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 68px;margin:0;padding:0;list-style:none}.psd-office-region li{min-height:72px;padding:0 0 20px;color:#4d5053;font-size:clamp(14px,.94vw,18px);line-height:1.55}.psd-office-region li span{display:block}.psd-office-region li em,.psd-office-region li a{display:inline-block;margin-top:5px;color:#151619;font-size:13px;font-style:normal;text-decoration:none}.psd-office-region li a:hover{color:var(--ruijun-red)}
@media(max-width:900px){.psd-service-hero{min-height:650px;aspect-ratio:auto;background-position:40% center}.psd-service-hero-copy>:not(button){position:static;width:auto;height:auto;padding:0;margin:0;overflow:visible;clip:auto;white-space:normal}.psd-service-hero-copy{display:flex;flex-direction:column;justify-content:center;width:86vw;margin:0 auto}.psd-service-eyebrow{margin:0 0 24px;color:#f22631;font-size:13px}.psd-service-hero h1{margin:0;font-size:46px;line-height:1.15;font-weight:500}.psd-service-hero h1 em{color:#f22631;font-style:normal}.psd-service-statement{max-width:760px;margin:28px 0 22px;font-size:23px;line-height:1.35}.psd-service-hero ul{display:grid;gap:10px;margin:0;padding:0;list-style:none;color:rgb(255 255 255/88%);font-size:16px}.psd-service-hero li{position:relative;padding-left:17px}.psd-service-hero li::before{content:"";position:absolute;top:.58em;left:0;width:6px;height:6px;border-radius:50%;background:#f22631}.psd-service-hero button{position:static;width:fit-content;height:auto;margin-top:32px;padding:13px 18px;border:1px solid rgb(255 255 255/50%);background:rgb(15 17 20/52%);color:#fff;font:inherit}.psd-service-hero button span{display:inline;margin-left:24px;color:#f22631}.psd-online-support{padding:76px 22px}.psd-support-heading{display:block}.psd-support-heading p{margin-top:12px;font-size:26px}.psd-support-search{margin:38px auto 48px}.psd-models{grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:48px}.psd-models button{min-height:96px;font-size:13px}.psd-support-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.psd-support-actions button{min-height:150px;padding:20px}.psd-support-actions strong{font-size:18px}.psd-office-directory{padding:74px 22px}.psd-office-heading,.psd-office-region{grid-template-columns:1fr;gap:20px}.psd-office-heading{margin-bottom:42px}.psd-office-region{padding:32px 0}.psd-office-region ul{grid-template-columns:1fr;gap:12px}.psd-office-region li{min-height:0;padding-bottom:10px}.psd-office-region li em,.psd-office-region li a{font-size:12px}}
</style>
