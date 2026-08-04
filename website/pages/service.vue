<script setup lang="ts">
import { buildFaqHandoffUrl, createFaqConversation, faqAssistantMode, requestFaqHandoff, streamFaqMessage, submitFaqFeedback } from '~/shared/faq-bff-client.mjs';
import { readFaqSessionId, writeFaqSessionId } from '~/shared/faq-session-store.mjs';
import { resolveServiceEntry, shouldEnableServiceEntries } from '~/shared/service-assistant.mjs';
import { createServiceEntryClick, hasConfirmedServiceExit, markServiceExitConfirmed } from '~/shared/service-exit.mjs';
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
const bffEnabled = computed(() => faqAssistantMode(faqBffUrl) === 'bff');
let activeRequest: AbortController | null = null;
let lastFocusTarget: HTMLElement | null = null;
let lastExitFocusTarget: HTMLElement | null = null;

const { data: serviceConfig } = await useFetch('/api/public/v1/service-entries', { default: () => ({ entries: {}, supportPhone: '150 5016 6844', available: false }) });
const { data: resourceResponse } = await useFetch('/api/public/v1/service-resources', { default: () => ({ data: [] as Array<Record<string, unknown>> }) });
const { data: locationResponse } = await useFetch('/api/public/v1/service-locations', { default: () => ({ data: [] as Array<Record<string, unknown>> }) });
const resources = computed(() => Array.isArray(resourceResponse.value?.data) ? resourceResponse.value.data : []);
const locations = computed(() => Array.isArray(locationResponse.value?.data) ? locationResponse.value.data : []);
const repairSystemAvailable = computed(() => shouldEnableServiceEntries(serviceConfig.value?.available));
const entryUrl = computed(() => repairSystemAvailable.value ? resolveServiceEntry(serviceConfig.value?.entries, answer.value?.suggestedAction) : null);
const repairEntryUrl = computed(() => repairSystemAvailable.value ? resolveServiceEntry(serviceConfig.value?.entries, 'request') : null);
const supportPhone = computed(() => supportPhoneValue(serviceConfig.value?.supportPhone));

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
  if (!targetUrl) { handoffError.value = '维修系统入口暂不可用，请联系人工售后。'; return; }
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
    const destination = buildFaqHandoffUrl(targetUrl, handoff.token);
    if (!destination) throw new Error('INVALID_HANDOFF_DESTINATION');
    window.location.assign(destination);
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
  <main class="service-page">
    <SiteHeader/>
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
</template>

<style scoped>
.service-page{min-height:100vh;background:var(--ruijun-paper);color:#161719}.service-hero{position:relative;min-height:68svh;display:flex;align-items:flex-end;padding:150px 6.2% 8vh;isolation:isolate;overflow:hidden;color:#fff;background:#777 url('/assets/docx-service.jpg') center 16%/cover no-repeat}.service-hero::after{content:"";position:absolute;z-index:-1;inset:0;background:rgb(10 12 14/49%)}.service-hero>div{width:min(980px,100%)}.service-hero p,.service-desk>div>p,.assistant-dialog header p{margin:0;color:#ef3840;font-size:12px}.service-hero h1{max-width:920px;margin:16px 0 0;font-size:clamp(58px,6.1vw,88px);line-height:1.02;font-weight:600}.service-hero span{display:block;max-width:650px;margin-top:24px;color:rgb(255 255 255/78%);font-size:17px}.online-service,.faq,.contact{padding:90px 6.2%}.online-service{color:#fff;background:#111214}.section-inner{width:min(var(--ruijun-max),100%);margin:0 auto}.section-heading{display:grid;grid-template-columns:minmax(220px,.7fr) minmax(0,1.3fr);gap:8vw;align-items:end;margin-bottom:50px}.section-heading h2{margin:0;font-size:54px;line-height:1.12}.section-heading p{max-width:660px;margin:0;color:#6f7276;font-size:16px}.online-service .section-heading p{color:#a4a7ab}.service-desk{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,.95fr);border:1px solid #3a3c3f}.service-desk>div{display:flex;min-height:390px;padding:44px 48px;flex-direction:column;border-right:1px solid #3a3c3f}.service-desk h3{margin:42px 0 20px;font-size:54px;line-height:1.04}.service-desk>div>span{max-width:440px;color:#a4a7ab;line-height:1.8}.service-desk>div>button{width:fit-content;margin-top:auto;padding:13px 16px;color:#fff;background:var(--ruijun-red);border:0;border-radius:4px;font-weight:700;cursor:pointer}.service-desk ol{display:grid;margin:0;padding:28px 42px;list-style:none}.service-desk li{display:grid;grid-template-columns:48px 1fr;gap:16px;align-content:center;border-bottom:1px solid #3a3c3f}.service-desk li:last-child{border-bottom:0}.service-desk b{color:#ef3840;font-size:11px}.service-desk strong{display:block;color:#fff;font-size:18px}.service-desk li span{display:block;margin-top:8px;color:#a4a7ab;font-size:13px}.faq{background:#eceeeb}.faq-list{border-top:1px solid #c8cbc7}.faq-list details{border-bottom:1px solid #c8cbc7}.faq-list summary{position:relative;padding:22px 54px 22px 0;cursor:pointer;list-style:none;font-size:18px;font-weight:650}.faq-list summary::after{content:"+";position:absolute;top:14px;right:4px;color:var(--ruijun-red);font-size:28px;font-weight:300}.faq-list details[open] summary::after{transform:rotate(45deg)}.faq-list details>p{max-width:820px;margin:-4px 0 12px;color:#666a6e}.faq-list details>button{margin:0 0 22px;padding:8px 12px;color:var(--ruijun-red);background:transparent;border:1px solid var(--ruijun-red);cursor:pointer}.contact{background:var(--ruijun-paper)}.contact-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:#d1d3d2;border:1px solid #d1d3d2}.contact-grid article{min-height:230px;padding:36px;display:flex;flex-direction:column;background:var(--ruijun-paper)}.contact-grid small{color:var(--ruijun-red);font-weight:700}.contact-grid h3{margin:24px 0 12px;font-size:28px}.contact-grid p{margin:0;color:#6f7276}.contact-grid button{width:fit-content;margin-top:auto;padding:22px 0 0;color:var(--ruijun-red);background:transparent;border:0;font-weight:700;cursor:pointer}.service-content{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px;padding:70px 6.2%;background:#fff}.service-content-block>p{color:var(--ruijun-red);font-size:12px}.service-content-block ul{padding:0;list-style:none}.service-content-block li{display:flex;padding:16px 0;justify-content:space-between;border-top:1px solid var(--ruijun-line)}.service-content-block li span{display:block;color:#777}.service-content-block a{color:var(--ruijun-red)}.assistant-overlay{position:fixed;z-index:130;inset:0;display:grid;place-items:center;padding:20px;background:#0009;backdrop-filter:blur(12px)}.assistant-dialog{width:min(560px,100%);max-height:min(700px,90vh);display:flex;flex-direction:column;border:1px solid #ffffff4d;border-radius:8px;background:#181818f2;color:#fff;box-shadow:0 22px 70px #0009;overflow:hidden}.assistant-dialog header{display:flex;justify-content:space-between;padding:21px 24px;border-bottom:1px solid #ffffff2e}.assistant-dialog header h2{margin:4px 0 0;font-size:21px}.assistant-dialog header button{border:0;background:transparent;color:#fff;font-size:30px;cursor:pointer}.conversation{min-height:260px;padding:24px;overflow:auto}.conversation h3{margin:10px 0;font-size:22px}.conversation p,.conversation li{line-height:1.75}.conversation .note{color:#ffffff9c;font-size:13px}.conversation .generated-answer{white-space:pre-wrap}.citations{margin:14px 0 0;padding:10px 0 0;border-top:1px solid #ffffff24;list-style:none;font-size:12px;color:#ffffffa8}.citations li+li{margin-top:5px}.citations em{font-style:normal;color:#ffffff67}.feedback{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:14px;font-size:12px;color:#ffffffb0}.feedback button{padding:6px 8px;border:1px solid #ffffff38;border-radius:6px;background:transparent;color:#fff}.feedback-status{margin:8px 0 0;color:#ffffffa0;font-size:12px}.conversation .notice{padding:10px 12px;border-left:2px solid #e33232;background:#ffffff0d;color:#ffffffc7}.conversation a{display:inline-block;margin-top:12px;padding:11px 14px;border-radius:4px;background:#dd3030;color:#fff;text-decoration:none}.handoff-panel{display:grid;gap:10px;margin-top:20px;padding:14px;border:1px solid #ffffff30;border-radius:8px;background:#ffffff0c}.handoff-panel label{font-size:13px;line-height:1.55}.handoff-panel textarea{min-height:82px;padding:10px;border:1px solid #ffffff38;border-radius:4px;background:#111;color:#fff;resize:vertical}.handoff-actions{display:flex;gap:8px;flex-wrap:wrap}.handoff-actions button{padding:9px 12px;border:1px solid #ffffff55;border-radius:4px;background:#fff;color:#171717}.assistant-dialog form{display:flex;gap:10px;padding:16px;border-top:1px solid #ffffff2e}.assistant-dialog input{min-width:0;flex:1;padding:12px;border:1px solid #ffffff38;border-radius:4px;background:#ffffff12;color:#fff}.assistant-dialog form button{padding:0 16px;border:0;border-radius:4px;background:#fff;color:#171717}.assistant-dialog form .stop{background:#ffffff25;color:#fff}
@media(max-width:900px){.service-hero{min-height:62svh;padding:120px 22px 58px}.service-hero h1{font-size:50px}.service-hero span{font-size:15px}.online-service,.faq,.contact{padding:62px 22px}.section-heading{grid-template-columns:1fr;gap:18px;margin-bottom:34px}.section-heading h2{font-size:38px}.service-desk{grid-template-columns:1fr}.service-desk>div{min-height:360px;padding:34px;border-right:0;border-bottom:1px solid #3a3c3f}.service-desk h3{margin-top:32px;font-size:44px}.service-desk ol{padding:10px 34px}.service-desk li{min-height:110px}.contact-grid,.service-content{grid-template-columns:1fr}.service-content{padding:52px 22px}}
.service-hero{background-position:center;background-size:cover}.service-hero::after{background:rgb(7 9 11/52%)}
</style>

<style scoped>
.service-exit-overlay{position:fixed;z-index:31;inset:0;display:grid;place-items:center;padding:20px;background:#0009;backdrop-filter:blur(12px)}.service-exit-dialog{width:min(390px,100%);padding:28px;border:1px solid #ffffff45;border-radius:16px;background:#1c1c1ce6;color:#fff;box-shadow:0 22px 70px #0009}.service-exit-dialog p{margin:0;color:#e33232;font-size:12px}.service-exit-dialog h2{margin:9px 0 10px;font-size:25px;font-weight:500}.service-exit-dialog span{color:#ffffffa8;line-height:1.65}.service-exit-dialog div{display:flex;justify-content:flex-end;gap:9px;margin-top:24px}.service-exit-dialog button{padding:10px 14px;border:0;border-radius:7px;background:#e33232;color:#fff;cursor:pointer}.service-exit-dialog .cancel{border:1px solid #ffffff3e;background:transparent}
</style>

<style scoped>
.service-human-support{display:flex;align-items:center;justify-content:center;gap:12px;padding:24px 32px;background:#121212;color:#ffffffb3;font-size:14px}.service-human-support a{color:#fff;font-size:18px;text-decoration:none}.service-human-support a:hover{text-decoration:underline}@media(max-width:760px){.service-human-support{padding:22px 20px}}
</style>
