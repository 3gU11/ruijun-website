<script setup lang="ts">
import { createFaqConversation, faqAssistantMode, streamFaqMessage, submitFaqFeedback } from '~/shared/faq-bff-client.mjs';
import { readFaqSessionId, writeFaqSessionId } from '~/shared/faq-session-store.mjs';
import { getFaqRouteState, shouldShowFaq } from '~/shared/faq-visibility.mjs';
import { resolveServiceEntry, shouldEnableServiceEntries } from '~/shared/service-assistant.mjs';
import { createServiceEntryClick } from '~/shared/service-exit.mjs';

type AssistantView = 'faq' | 'next';
type RepairEntry = 'support' | 'request' | 'requests' | 'warranty';
type AssistantIntent = 'repair' | 'sales' | 'visit';

const suggestions = Object.freeze([
  '如何发起维修申请',
  '维修进度在哪里查询',
  '如何核验保修状态',
  '报修前需要准备哪些资料'
]);

const repairSteps = Object.freeze({
  support: {
    label: '售后服务中心',
    action: '打开售后服务中心',
    copy: 'AI 已说明官网可提供的流程信息。下一步可在售后服务中心选择维修申请、保修核验或进度查询；该系统仅处理工单，不提供实时人工对话。'
  },
  request: {
    label: '提交维修申请',
    action: '开始填写维修申请',
    copy: 'AI 已帮你确认提交前需要准备的资料。下一步将在独立售后系统填写设备、故障和联系人信息并提交维修申请；该系统不提供实时人工对话。'
  },
  requests: {
    label: '查询维修进度',
    action: '查询维修申请进度',
    copy: 'AI 已说明查询步骤。下一步将在独立售后系统核验身份后查看审核、补充资料、维修与寄回状态；该系统不提供实时人工对话。'
  },
  warranty: {
    label: '核验保修状态',
    action: '开始保修核验',
    copy: 'AI 已确认核验所需的设备型号和机床编号。下一步将在独立售后系统提交信息并查看保修结果；该系统不提供实时人工对话。'
  }
});

const open = ref(false);
const activeView = ref<AssistantView>('faq');
const question = ref('');
const lastQuestion = ref('');
const answer = ref<any>(null);
const loading = ref(false);
const errorMessage = ref('');
const citations = ref<Array<{ id: string, title: string, version?: string }>>([]);
const faqRequestId = ref('');
const feedbackStatus = ref('');
const feedbackLoading = ref(false);
const currentEntry = ref<RepairEntry>('support');
const currentIntent = ref<AssistantIntent>('repair');
const serviceConfig = ref<any>(null);
const serviceLoading = ref(false);
const serviceLoadFailed = ref(false);
const route = useRoute();
const runtimeConfig = useRuntimeConfig();
const faqBffUrl = String(runtimeConfig.public.faqBffUrl || '');
const bffEnabled = computed(() => faqAssistantMode(faqBffUrl) === 'bff');
const homeHeroReady = ref(route.path !== '/');
const trigger = ref<HTMLButtonElement | null>(null);
const questionInput = ref<HTMLInputElement | null>(null);
const backButton = ref<HTMLButtonElement | null>(null);
let faqSessionId = '';
let activeRequest: AbortController | null = null;

const visible = computed(() => shouldShowFaq(route.path, homeHeroReady.value));
const hasAnswer = computed(() => Boolean(lastQuestion.value && (loading.value || answer.value)));
const supportPhoneDisplay = computed(() => String(serviceConfig.value?.supportPhone || '150 5016 6844').trim() || '150 5016 6844');
const supportPhoneHref = computed(() => {
  const digits = supportPhoneDisplay.value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 16 ? digits : '15050166844';
});
const nextStep = computed(() => {
  if (currentIntent.value === 'sales') return {
    kicker: 'RUIJUN SALES CONSULTATION', label: '销售顾问', action: '拨打销售电话',
    copy: '销售顾问将根据你的加工任务和设备需求，提供后续方案沟通。', status: '销售咨询：137 3837 5470', href: 'tel:13738375470', external: false
  };
  if (currentIntent.value === 'visit') return {
    kicker: 'RUIJUN FACTORY VISIT', label: '工厂来访咨询', action: '联系来访接待',
    copy: '请先与销售顾问确认来访时间、接待工厂和参观安排。', status: '来访咨询：137 3837 5470', href: 'tel:13738375470', external: false
  };
  const content = repairSteps[currentEntry.value];
  if (currentEntry.value === 'support') return {
    kicker: 'RUIJUN SERVICE CENTER', ...content, status: '官网服务支持入口可用', href: '/service', external: false
  };
  const entries = serviceConfig.value?.entries || {};
  const normalizedEntries = { ...entries, requests: entries.requests || entries.progress };
  const href = shouldEnableServiceEntries(serviceConfig.value?.available)
    ? resolveServiceEntry(normalizedEntries, currentEntry.value)
    : null;
  return {
    kicker: 'RUIJUN REPAIR APPLICATION', ...content,
    status: serviceLoading.value ? '正在检查维修申请系统...' : href ? '在线服务连接正常' : '在线系统暂时无法连接，请电话联系售后',
    href, external: true
  };
});

watch(() => route.path, (path) => {
  const nextState = getFaqRouteState(path);
  homeHeroReady.value = nextState.homeHeroReady;
  if (nextState.closeDialog) open.value = false;
});

function newIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function faqContext() {
  return { pageType: route.name ? 'page' : 'general', pageSlug: route.path.slice(0, 120) };
}

function faqSessionStorage() {
  try { return window.sessionStorage; } catch { return null; }
}

function syncSuggestedAction(result: any) {
  const action = String(result?.suggestedAction || 'support');
  if (['request', 'requests', 'warranty'].includes(action)) {
    currentEntry.value = action as RepairEntry;
    currentIntent.value = 'repair';
  } else if (action === 'sales' || action === 'visit') {
    currentEntry.value = 'support';
    currentIntent.value = action;
  } else {
    currentEntry.value = 'support';
    currentIntent.value = 'repair';
  }
}

async function ask(value = question.value) {
  const normalized = value.trim();
  if (!normalized) {
    errorMessage.value = '请先输入一个问题。';
    nextTick(() => questionInput.value?.focus());
    return;
  }
  if (loading.value) return;
  question.value = '';
  lastQuestion.value = normalized;
  loading.value = true;
  answer.value = null;
  errorMessage.value = '';
  citations.value = [];
  faqRequestId.value = '';
  feedbackStatus.value = '';
  currentEntry.value = 'support';
  currentIntent.value = 'repair';
  try {
    if (!bffEnabled.value) {
      answer.value = await $fetch('/api/public/v1/faq/answer', { method: 'POST', body: { question: normalized, entry: 'support' } });
      syncSuggestedAction(answer.value);
      return;
    }
    const session = await createFaqConversation({ baseUrl: faqBffUrl, faqSessionId, context: faqContext() });
    faqSessionId = session.faqSessionId;
    writeFaqSessionId(faqSessionStorage(), faqSessionId);
    activeRequest = new AbortController();
    let generated = '';
    await streamFaqMessage({
      baseUrl: faqBffUrl,
      faqSessionId,
      message: normalized,
      context: faqContext(),
      idempotencyKey: newIdempotencyKey(),
      signal: activeRequest.signal,
      onEvent: ({ event, data }: any) => {
        if (event === 'ack') faqRequestId.value = String(data?.requestId || '');
        if (event === 'delta') {
          generated += String(data?.text || '');
          answer.value = { title: 'AI 服务答复', answer: generated, matched: true, mode: 'bff' };
        }
        if (event === 'citation' && data?.id && !citations.value.some((item) => item.id === data.id)) citations.value.push({ id: String(data.id), title: String(data.title || '已审核知识'), version: String(data.version || '') });
        if (event === 'error') answer.value = { title: '服务暂时不可用', answer: '请稍后重试、联系人工售后，或直接提交维修申请。', matched: false, mode: 'bff' };
      }
    });
    if (!answer.value) answer.value = { title: 'AI 服务答复', answer: '当前未返回可展示的答复，请联系人工售后。', matched: false, mode: 'bff' };
  } catch (error: any) {
    if (error?.code !== 'FAQ_REQUEST_CANCELLED') answer.value = {
      title: '问答服务暂时不可用',
      steps: ['整理设备型号、机床编号和故障现象', '进入维修系统提交申请', '安全风险或紧急停机时拨打 150 5016 6844'],
      note: '已经输入的官网页面内容不会自动提交为维修申请。',
      matched: false
    };
  } finally {
    activeRequest = null;
    loading.value = false;
  }
}

function stopAnswer() {
  activeRequest?.abort();
}

function resetConversation() {
  activeView.value = 'faq';
  question.value = '';
  lastQuestion.value = '';
  answer.value = null;
  errorMessage.value = '';
  citations.value = [];
  faqRequestId.value = '';
  feedbackStatus.value = '';
  currentEntry.value = 'support';
  currentIntent.value = 'repair';
}

function openAssistantWithSeed(seed = '') {
  resetConversation();
  open.value = true;
  nextTick(() => questionInput.value?.focus());
  if (seed) void ask(seed);
}

function openAssistant() {
  openAssistantWithSeed();
}

function closeAssistant() {
  activeRequest?.abort();
  open.value = false;
  nextTick(() => trigger.value?.focus());
}

function showFaq() {
  activeView.value = 'faq';
  nextTick(() => questionInput.value?.focus());
}

async function loadServiceConfig() {
  if (serviceConfig.value || serviceLoading.value) return;
  serviceLoading.value = true;
  serviceLoadFailed.value = false;
  try {
    serviceConfig.value = await $fetch('/api/public/v1/service-entries');
  } catch {
    serviceLoadFailed.value = true;
    serviceConfig.value = { available: false, entries: {}, supportPhone: '150 5016 6844' };
  } finally {
    serviceLoading.value = false;
  }
}

async function showNextStep() {
  activeView.value = 'next';
  if (currentIntent.value === 'repair' && currentEntry.value !== 'support') await loadServiceConfig();
  nextTick(() => backButton.value?.focus());
}

function handleNextAction() {
  if (currentIntent.value === 'repair' && currentEntry.value !== 'support') {
    const click = createServiceEntryClick(currentEntry.value, route.path);
    if (click) void $fetch('/api/public/v1/service-entry-clicks', { method: 'POST', body: click }).catch(() => undefined);
  }
  closeAssistant();
}

function dismissOnEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) closeAssistant();
}

function markHomeHeroReady() {
  homeHeroReady.value = true;
}

function handleAssistantLink(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const prompt = target.closest<HTMLElement>('[data-ai-question]');
  const launcher = target.closest<HTMLElement>('[data-ai-open]');
  if (!prompt && !launcher) return;
  event.preventDefault();
  openAssistantWithSeed(prompt?.dataset.aiQuestion || '');
}

async function submitFeedback(helpful: boolean) {
  if (!bffEnabled.value || !faqSessionId || !faqRequestId.value || feedbackLoading.value) return;
  feedbackLoading.value = true;
  feedbackStatus.value = '';
  try {
    await submitFaqFeedback({ baseUrl: faqBffUrl, faqSessionId, requestId: faqRequestId.value, helpful, escalateToHuman: !helpful });
    feedbackStatus.value = helpful ? '感谢你的反馈。' : '已记录为需要进一步协助。';
  } catch {
    feedbackStatus.value = '反馈暂未送达，请稍后重试。';
  } finally {
    feedbackLoading.value = false;
  }
}

onMounted(() => {
  faqSessionId = readFaqSessionId(faqSessionStorage());
  window.addEventListener('ruijun:hero-ready', markHomeHeroReady);
  window.addEventListener('keydown', dismissOnEscape);
  document.addEventListener('click', handleAssistantLink);
});
onBeforeUnmount(() => {
  activeRequest?.abort();
  window.removeEventListener('ruijun:hero-ready', markHomeHeroReady);
  window.removeEventListener('keydown', dismissOnEscape);
  document.removeEventListener('click', handleAssistantLink);
});
</script>

<template>
  <div v-if="visible" class="faq-float">
    <button v-show="!open" ref="trigger" class="service-ai-launcher" type="button" aria-label="打开瑞钧 AI 客服" @click="openAssistant()">
      <span class="service-ai-launcher__status" aria-hidden="true"></span>
      <span><b>AI 服务助手</b><small>维修 · 保修 · 进度</small></span>
    </button>
    <Teleport to="body">
      <section v-if="open" :class="['service-ai-dialog', { 'has-answer': hasAnswer }]" role="dialog" aria-modal="true" aria-labelledby="service-ai-title">
        <header class="service-ai-head">
          <span class="service-ai-mark" aria-hidden="true">R</span>
          <div><h2 id="service-ai-title">瑞钧服务助手</h2><p><i aria-hidden="true"></i>在线 · 官网流程问答</p></div>
          <button class="dialog-close" type="button" aria-label="关闭 AI 客服" title="关闭" @click="closeAssistant">×</button>
        </header>

        <section v-if="activeView === 'faq'" class="service-ai-panel">
          <div class="service-ai-feed" role="log" aria-live="polite" aria-atomic="true">
            <div v-if="!hasAnswer" class="service-ai-welcome">
              <span class="service-ai-avatar" aria-hidden="true">R</span>
              <div><b>你好，我是瑞钧服务助手</b><p>我可以先帮你确认报修资料、维修进度和保修办理流程。</p></div>
            </div>
            <template v-else>
              <div class="service-ai-current-question"><p class="service-ai-label">你的问题</p><p class="service-ai-question-text">{{ lastQuestion }}</p></div>
              <div v-if="loading && !answer" class="service-ai-answer-card is-loading">
                <span class="service-ai-avatar" aria-hidden="true">R</span><div><p>正在查找已审核的服务信息...</p></div>
              </div>
              <div v-if="answer" :class="['service-ai-answer-card', { 'is-fallback': !answer.matched }]">
                <span class="service-ai-avatar" aria-hidden="true">R</span>
                <div>
                  <small>{{ answer.mode === 'bff' ? 'AI 服务答复' : '已审核服务指引' }}</small>
                  <h3>{{ answer.title || '服务信息' }}</h3>
                  <ol v-if="answer.steps?.length"><li v-for="step in answer.steps" :key="step">{{ step }}</li></ol>
                  <p v-else class="service-ai-answer-copy">{{ answer.answer }}</p>
                  <p v-if="answer.note" class="service-ai-answer-note">{{ answer.note }}</p>
                  <ul v-if="citations.length" class="citations"><li v-for="citation in citations" :key="citation.id">{{ citation.title }}<em v-if="citation.version"> · {{ citation.version }}</em></li></ul>
                  <div v-if="faqRequestId" class="feedback"><span>这条答复是否有帮助？</span><button type="button" :disabled="feedbackLoading" @click="submitFeedback(true)">有帮助</button><button type="button" :disabled="feedbackLoading" @click="submitFeedback(false)">需要协助</button></div>
                  <p v-if="feedbackStatus" class="feedback-status" role="status">{{ feedbackStatus }}</p>
                </div>
              </div>
            </template>
          </div>

          <div class="service-ai-quick-head"><b>常用服务</b><span>选择一个问题快速开始</span></div>
          <div class="service-ai-suggestions" aria-label="常用服务">
            <button v-for="(item, index) in suggestions" :key="item" type="button" @click="ask(item)"><span>{{ String(index + 1).padStart(2, '0') }}</span><b>{{ item }}</b></button>
          </div>
          <form class="service-ai-form" :class="{ 'is-loading': loading }" @submit.prevent="ask()">
            <label class="sr-only" for="service-ai-question">输入问题</label>
            <input id="service-ai-question" ref="questionInput" v-model="question" maxlength="300" autocomplete="off" placeholder="输入你的问题">
            <button v-if="loading" class="stop" type="button" aria-label="停止生成" title="停止生成" @click="stopAnswer">■</button>
            <button v-else type="submit" aria-label="发送问题" title="发送问题">→</button>
          </form>
          <p class="service-ai-error" role="alert">{{ errorMessage }}</p>
          <div class="service-ai-actions">
            <button type="button" class="service-ai-resolved" @click="closeAssistant">关闭对话</button>
            <button type="button" class="service-ai-escalate" @click="showNextStep">查看下一步 <span aria-hidden="true">→</span></button>
          </div>
        </section>

        <section v-else class="service-ai-panel service-ai-escalation">
          <button ref="backButton" class="service-ai-back" type="button" @click="showFaq">← 返回 AI 客服</button>
          <div class="service-ai-route-icon" aria-hidden="true">→</div>
          <p class="repair-exit-kicker">{{ nextStep.kicker }}</p>
          <h2>前往<span>{{ nextStep.label }}</span></h2>
          <p class="repair-exit-copy">{{ nextStep.copy }}</p>
          <p :class="['repair-exit-status', { 'is-error': serviceLoadFailed || (!nextStep.href && !serviceLoading) }]" role="status">{{ nextStep.status }}</p>
          <div class="repair-exit-actions">
            <NuxtLink v-if="nextStep.href === '/service'" to="/service" @click="handleNextAction">{{ nextStep.action }} <span aria-hidden="true">→</span></NuxtLink>
            <a v-else-if="nextStep.href" :href="nextStep.href" :target="nextStep.external ? '_blank' : undefined" :rel="nextStep.external ? 'noopener noreferrer' : undefined" @click="handleNextAction">{{ nextStep.action }} <span aria-hidden="true">→</span></a>
            <button v-else type="button" disabled>{{ serviceLoading ? '正在检查...' : '服务入口暂不可用' }}</button>
            <button type="button" @click="showFaq">继续咨询 AI 客服</button>
          </div>
          <p class="repair-exit-fallback human-support">安全风险、紧急停机或无法提交：<a :href="`tel:${supportPhoneHref}`">{{ supportPhoneDisplay }}</a></p>
        </section>
      </section>
    </Teleport>
  </div>
</template>

<style scoped>
.faq-float{position:fixed;z-index:105;right:24px;bottom:24px}.service-ai-launcher{display:flex;min-width:158px;min-height:50px;padding:8px 13px;align-items:center;gap:9px;color:#fff;background:rgb(22 24 27/78%);border:1px solid rgb(255 255 255/24%);border-radius:8px;backdrop-filter:blur(18px) saturate(125%);box-shadow:0 12px 32px rgb(0 0 0/25%),inset 0 1px 0 rgb(255 255 255/14%);cursor:pointer;transition:background .2s ease,transform .3s ease}.service-ai-launcher:hover{background:#050506;transform:translateY(-2px)}.service-ai-launcher__status{flex:0 0 8px;width:8px;height:8px;background:var(--ruijun-red);border-radius:50%;box-shadow:0 0 0 4px rgb(229 27 35/14%)}.service-ai-launcher>span:last-child{display:grid;text-align:left}.service-ai-launcher b{font-size:12px;line-height:1.25}.service-ai-launcher small{color:#a9acb0;font-size:9px}.service-ai-dialog{position:fixed;z-index:130;right:22px;bottom:22px;width:430px;max-width:calc(100vw - 28px);max-height:calc(100svh - 44px);margin:0;overflow:hidden;color:#1c1e21;background:rgb(240 242 240/78%);border:1px solid rgb(255 255 255/74%);border-radius:8px;backdrop-filter:blur(26px) saturate(125%);box-shadow:0 22px 70px rgb(0 0 0/28%),inset 0 1px 0 rgb(255 255 255/70%);font-family:Arial,"Microsoft YaHei",sans-serif}.service-ai-head{height:72px;display:flex;gap:11px;padding:0 16px;align-items:center;color:#fff;background:rgb(17 19 22/88%);border-bottom:1px solid rgb(229 27 35/85%);backdrop-filter:blur(20px) saturate(125%);box-shadow:inset 0 1px 0 rgb(255 255 255/10%)}.service-ai-mark{flex:0 0 38px;width:38px;height:38px;display:grid;place-items:center;color:#fff;background:rgb(229 27 35/90%);border:1px solid rgb(255 255 255/20%);border-radius:6px;box-shadow:inset 0 1px 0 rgb(255 255 255/24%);font-size:18px;font-weight:800}.service-ai-head h2{margin:0;font-size:16px;line-height:1.25}.service-ai-head p{display:flex;margin:3px 0 0;align-items:center;gap:5px;color:#aeb1b5;font-size:9px}.service-ai-head p i{width:6px;height:6px;background:#36c76c;border-radius:50%;box-shadow:0 0 0 3px rgb(54 199 108/12%)}.dialog-close{width:38px;height:38px;margin-left:auto;padding:0;color:#b8bbc0;background:transparent;border:0;font-size:25px;cursor:pointer}.dialog-close:hover{color:#fff}.service-ai-panel{height:548px;max-height:calc(100svh - 116px);display:flex;min-height:0;padding:0 0 12px;flex-direction:column;background:rgb(248 249 247/72%)}.service-ai-feed{flex:1 1 auto;min-height:195px;margin:0;padding:18px 16px;overflow-y:auto;overscroll-behavior:contain;background:rgb(230 233 231/48%);box-shadow:inset 0 -1px 0 rgb(255 255 255/72%);scrollbar-width:thin;scrollbar-color:#b6b8b5 transparent}.service-ai-welcome{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:start}.service-ai-avatar{width:30px;height:30px;display:grid;place-items:center;color:#fff;background:var(--ruijun-red);font-size:11px;font-weight:800}.service-ai-welcome>div{padding:12px 13px;background:rgb(255 255 255/68%);border:1px solid rgb(255 255 255/90%);border-radius:0 8px 8px;box-shadow:0 7px 22px rgb(24 27 29/8%),inset 0 1px 0 rgb(255 255 255/80%)}.service-ai-welcome b{display:block;margin-bottom:5px;font-size:13px}.service-ai-welcome p{margin:0;color:#62666a;font-size:12px;line-height:1.65}.service-ai-current-question{width:82%;margin:0 0 13px auto;padding:10px 12px;color:#fff;background:rgb(31 34 38/86%);border:1px solid rgb(255 255 255/12%);border-radius:8px 0 8px 8px;box-shadow:0 6px 20px rgb(18 20 22/12%),inset 0 1px 0 rgb(255 255 255/8%)}.service-ai-label{margin:0 0 2px;color:#aeb1b5;font-size:8px;font-weight:700}.service-ai-question-text{margin:0;font-size:12px;line-height:1.5}.service-ai-answer-card{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:start}.service-ai-answer-card>div{padding:13px;background:rgb(255 255 255/72%);border:1px solid rgb(255 255 255/94%);border-radius:0 8px 8px;box-shadow:0 8px 24px rgb(24 27 29/8%),inset 0 1px 0 rgb(255 255 255/82%)}.service-ai-answer-card.is-fallback>div{border-left:3px solid var(--ruijun-red)}.service-ai-answer-card small{color:#8b8e92;font-size:9px}.service-ai-answer-card h3{margin:5px 0 10px;font-size:14px;line-height:1.4}.service-ai-answer-card ol{margin:0;padding:0;list-style:none;counter-reset:service-step}.service-ai-answer-card li{position:relative;min-height:24px;margin-top:7px;padding-left:28px;color:#474b4f;font-size:11px;line-height:1.55;counter-increment:service-step}.service-ai-answer-card li::before{content:counter(service-step,decimal-leading-zero);position:absolute;top:0;left:0;color:var(--ruijun-red);font-size:9px;font-weight:800}.service-ai-answer-copy{margin:0;color:#474b4f;font-size:11px;line-height:1.65;white-space:pre-wrap}.service-ai-answer-note{margin:10px 0 0;padding-top:9px;color:#777b7f;border-top:1px solid #e3e4e1;font-size:10px;line-height:1.55}.service-ai-answer-card.is-loading>div p{margin:0;color:#6d7175;font-size:11px}.citations{margin:10px 0 0;padding:9px 0 0;border-top:1px solid #e3e4e1;list-style:none;color:#777b7f;font-size:10px}.citations em{font-style:normal;color:#9a9da0}.feedback{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:10px;color:#777b7f;font-size:10px}.feedback button{padding:5px 7px;border:1px solid #d3d5d2;border-radius:4px;background:#fff;color:#343639;cursor:pointer}.feedback-status{margin:7px 0 0;color:#777b7f;font-size:10px}.service-ai-quick-head{display:flex;padding:13px 16px 9px;align-items:baseline;justify-content:space-between}.service-ai-quick-head b{font-size:12px}.service-ai-quick-head span{color:#8b8e92;font-size:9px}.service-ai-suggestions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:0 16px 13px}.service-ai-suggestions button{min-width:0;min-height:52px;display:grid;grid-template-columns:24px 1fr;gap:7px;padding:8px 9px;align-items:center;color:#393c40;background:rgb(255 255 255/48%);border:1px solid rgb(255 255 255/90%);border-radius:6px;box-shadow:inset 0 1px 0 rgb(255 255 255/68%);text-align:left;cursor:pointer;transition:border-color .2s ease,background .2s ease,box-shadow .2s ease}.service-ai-suggestions button:hover{color:#151719;background:rgb(255 255 255/82%);border-color:rgb(229 27 35/80%);box-shadow:0 5px 16px rgb(24 27 29/8%),inset 0 1px 0 #fff}.service-ai-suggestions button span{color:var(--ruijun-red);font-size:9px;font-weight:800}.service-ai-suggestions button b{overflow-wrap:anywhere;font-size:10px;line-height:1.45}.service-ai-dialog.has-answer .service-ai-quick-head{padding-top:8px;padding-bottom:5px}.service-ai-dialog.has-answer .service-ai-quick-head span{display:none}.service-ai-dialog.has-answer .service-ai-suggestions{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;scrollbar-width:none}.service-ai-dialog.has-answer .service-ai-suggestions button{flex:0 0 auto;min-height:32px;display:flex;padding:0 9px}.service-ai-dialog.has-answer .service-ai-suggestions button span{display:none}.service-ai-dialog.has-answer .service-ai-suggestions button b{white-space:nowrap}.service-ai-form{display:grid;grid-template-columns:1fr 44px;height:44px;margin:0 16px;overflow:hidden;border:1px solid rgb(255 255 255/92%);border-radius:6px;background:rgb(255 255 255/60%);box-shadow:0 5px 18px rgb(24 27 29/7%),inset 0 1px 0 rgb(255 255 255/82%)}.service-ai-form:focus-within{border-color:#303236;box-shadow:0 0 0 2px rgb(48 50 54/10%)}.service-ai-form input{min-width:0;padding:0 12px;border:0;outline:0;color:#1f2124;background:transparent;font-size:11px}.service-ai-form button{padding:0;color:#fff;background:var(--ruijun-red);border:0;font-size:18px;cursor:pointer}.service-ai-form .stop{background:#34373a;font-size:11px}.service-ai-error{min-height:17px;margin:3px 16px 0;color:#b4232b;font-size:10px}.service-ai-actions{display:grid;grid-template-columns:.8fr 1.35fr;gap:7px;margin:0 16px}.service-ai-actions button{min-height:38px;padding:0 10px;border:1px solid #242629;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer}.service-ai-resolved{color:#55585c;background:rgb(255 255 255/46%);border-color:rgb(255 255 255/90%)!important}.service-ai-escalate{color:#fff;background:rgb(29 32 35/94%)}.service-ai-escalate span{margin-left:8px;color:var(--ruijun-red)}.service-ai-back{width:fit-content;margin:0 0 46px;padding:0;color:#6f7276;background:transparent;border:0;font-size:10px;cursor:pointer}.service-ai-escalation{padding:25px 22px}.service-ai-route-icon{width:54px;height:54px;display:grid;margin-bottom:26px;place-items:center;color:#fff;background:rgb(229 27 35/90%);border:1px solid rgb(255 255 255/34%);border-radius:8px;box-shadow:inset 0 1px 0 rgb(255 255 255/24%);font-size:25px}.repair-exit-kicker{margin:0 0 12px;color:var(--ruijun-red);font-size:10px;font-weight:700;letter-spacing:.14em}.service-ai-escalation h2{margin:0;font-size:28px;line-height:1.18}.service-ai-escalation h2 span{display:block;margin-top:4px;color:var(--ruijun-red)}.repair-exit-copy{margin:16px 0 0;color:#62666b;font-size:14px;line-height:1.7}.repair-exit-status{min-height:22px;margin:20px 0 0;color:#167548;font-size:12px}.repair-exit-status.is-error{color:#b4232b}.repair-exit-actions{display:flex;gap:10px;margin-top:22px}.repair-exit-actions a,.repair-exit-actions button{min-height:42px;display:inline-flex;align-items:center;justify-content:center;padding:0 18px;border:1px solid #1c1e21;border-radius:0;font-size:12px;font-weight:700;text-decoration:none}.repair-exit-actions a{color:#fff;background:#1c1e21}.repair-exit-actions button{color:#1c1e21;background:#fff;cursor:pointer}.repair-exit-actions button:disabled{opacity:.45;cursor:wait}.repair-exit-fallback{margin:18px 0 0;color:#797d82;font-size:11px}.repair-exit-fallback a{color:#1c1e21;font-weight:700}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:760px){.faq-float{right:16px;bottom:16px}.service-ai-launcher{width:48px;min-width:48px;height:48px;min-height:48px;padding:0;place-content:center;background:var(--ruijun-red);border-color:rgb(255 255 255/40%);border-radius:50%;box-shadow:0 10px 26px rgb(0 0 0/30%),inset 0 1px 0 rgb(255 255 255/25%)}.service-ai-launcher__status{width:auto;height:auto;color:#fff;background:transparent;border-radius:0;box-shadow:none}.service-ai-launcher__status::after{content:"AI";display:block;font-size:12px;font-weight:800;line-height:1}.service-ai-launcher>span:last-child{display:none}.service-ai-dialog{right:8px;bottom:70px;left:8px;width:auto;max-width:none;max-height:calc(100svh - 82px)}.service-ai-head{height:66px;padding:0 12px}.service-ai-head h2{font-size:15px}.service-ai-panel{height:min(610px,calc(100svh - 148px));max-height:calc(100svh - 148px);padding-bottom:10px}.service-ai-feed{min-height:170px;padding:14px 12px}.service-ai-quick-head,.service-ai-suggestions{padding-right:12px;padding-left:12px}.service-ai-suggestions button{min-height:50px}.service-ai-form,.service-ai-error,.service-ai-actions{margin-right:12px;margin-left:12px}.service-ai-escalation{height:min(520px,calc(100svh - 148px));padding:20px 18px}.service-ai-back{margin-bottom:32px}.service-ai-escalation h2{font-size:26px}.repair-exit-actions{align-items:stretch;flex-direction:column}.repair-exit-actions a,.repair-exit-actions button{width:100%}}
@media(prefers-reduced-motion:reduce){.service-ai-launcher{transition:none}}
</style>
