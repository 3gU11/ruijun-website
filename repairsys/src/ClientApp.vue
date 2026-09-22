<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus/es/components/message/index.mjs';
import 'element-plus/es/components/message/style/css';
import {
  ArrowRight,
  Box,
  CircleCheck,
  Clock,
  Close,
  Cpu,
  Document,
  FullScreen,
  House,
  Monitor,
  Phone,
  Picture,
  Plus,
  Refresh,
  Search,
  Service,
  SwitchButton,
  Tools,
  UploadFilled,
  User,
  Warning
} from '@element-plus/icons-vue';
import { api, apiAssetUrl } from './api';
import { createFaqConversation, faqAssistantMode, streamFaqMessage, submitFaqFeedback } from './faq-bff-client';
import brandLogo from './assets/ruijun-logo.png';
import RepairSelectionSummary from './client/components/RepairSelectionSummary.vue';
import ServiceWorkspace from './client/components/ServiceWorkspace.vue';
import ServiceTimeline from './client/components/ServiceTimeline.vue';
import { useRepairMotion } from './client/composables/useRepairMotion';
import { useRepairDraft } from './client/composables/useRepairDraft';
import { clientRoutes } from './client/router';
import { BrowserQRCodeReader } from '@zxing/browser';

const route = useRoute();
const router = useRouter();
const { playPageEntry } = useRepairMotion();
const officialSiteUrl = String(import.meta.env.VITE_OFFICIAL_SITE_URL || `${window.location.protocol}//${window.location.hostname}:4175/`).trim();
const officialServiceUrl = computed(() => {
  try {
    return new URL('/service', officialSiteUrl).toString();
  } catch {
    return officialSiteUrl;
  }
});
const portalMenuOpen = ref(false);
const ENTRY_CONTEXT_KEY = 'repair_entry_context_v1';
const FAQ_CONTINUATION_KEY = 'repair_faq_continuation_v1';
const SAFE_FAQ_SESSION_ID = /^[A-Za-z0-9_-]{20,80}$/;
const ENTRY_CONTEXT_TTL = 2 * 60 * 60 * 1000;
const MAX_SUPPLEMENT_TOTAL_BYTES = 6 * 1024 * 1024;
const allowedSourceChannels = new Set(['official_site', 'website_faq', 'repair_portal_faq']);

function queryValue(value) {
  return String(Array.isArray(value) ? value[0] : value || '').trim();
}

function storedEntryContext() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(ENTRY_CONTEXT_KEY) || 'null');
    if (!value || Date.now() - Number(value.receivedAt || 0) > ENTRY_CONTEXT_TTL) return null;
    return allowedSourceChannels.has(value.sourceChannel) ? value : null;
  } catch {
    return null;
  }
}

const entryContext = ref(storedEntryContext());
const sourceChannel = computed(() => entryContext.value?.sourceChannel || 'direct');

function captureEntryContext(value = route.query.source) {
  const source = queryValue(value).toLowerCase();
  if (!allowedSourceChannels.has(source)) return;
  entryContext.value = { sourceChannel: source, receivedAt: Date.now() };
  window.sessionStorage.setItem(ENTRY_CONTEXT_KEY, JSON.stringify(entryContext.value));
}

watch(() => route.query.source, captureEntryContext, { immediate: true });

const loading = ref(false);
const sessionReady = ref(false);
const submitLoading = ref(false);
const authLoading = ref(false);
const master = ref({ machines: [], materials: [] });
const modelDictionary = ref([]);
const photoConfigs = ref([]);
const requests = ref([]);
const currentUser = ref(null);
const authMode = ref('login');
const authDialog = ref(false);
const authPrompt = ref('');
const pendingAuthAction = ref('home');
const clientView = computed(() => route.meta.clientView || 'home');
const scannedBoardNo = computed(() => queryValue(route.query.boardNo));
const scannedBoardMaterialCode = computed(() => queryValue(route.query.boardMaterialCode));
const submittedRequest = ref(null);
const successDialog = ref(false);
const guideStep = ref(1);
const modelDialog = ref(false);
const selectedFamily = ref(null);
const warrantyResult = ref(null);
const supplementDialog = ref(false);
const supplementLoading = ref(false);
const supplementRequest = ref(null);
const supplementPhotos = ref([]);
const warrantyDialog = ref(false);
const warrantyCheckLoading = ref(false);
const quickWarrantyResult = ref(null);
const boardQrResult = ref(null);
const boardQrError = ref('');
const boardQrLoading = ref(false);
const boardWarrantyResult = ref(null);
const boardWarrantyError = ref('');
const boardWarrantyLoading = ref(false);
const scanTokenInput = ref('');
const scanInputError = ref('');
let qrReader = null;
const serviceGuideDialog = ref(false);
const faqDialog = ref(false);
const faqQuestion = ref('');
const faqAnswer = ref(null);
const faqLoading = ref(false);
const faqSessionId = ref('');
const faqRequestId = ref('');
const faqCitations = ref([]);
const faqBffAvailable = ref(true);
const faqBffBaseUrl = String(import.meta.env.VITE_FAQ_BFF_PUBLIC_URL || '').trim();
const faqMode = computed(() => faqAssistantMode(faqBffBaseUrl));
const useFaqBff = computed(() => faqMode.value === 'bff' && faqBffAvailable.value);
let faqAbortController = null;
const catalogSearch = ref('');

const authForm = reactive({
  username: '',
  password: '',
  name: '',
  agent: '',
  contact: '',
  phone: '',
  address: ''
});

const guideForm = reactive({
  agent: '',
  customerName: '',
  contact: '',
  phone: '',
  address: '',
  modelCode: '',
  modelName: '',
  machineNo: '',
  warrantyScope: 'in',
  sendMethod: '寄回',
  outboundExpressCompany: '',
  outboundTrackingNo: '',
  faultDescription: '',
  faqContext: null,
  customProductName: '',
  selectedMaterialCodes: [],
  items: []
});

const quickWarrantyForm = reactive({
  modelCode: '',
  modelName: '',
  machineNo: ''
});

const faultPresets = ['无法上电', '报警提示', '通讯异常', '运行不稳定', '外观损坏', '其他'];

const productGroups = computed(() => {
  const source = modelDictionary.value.length
    ? modelDictionary.value
    : master.value.machines.map((item) => ({ id: item.machineNo, code: item.model, name: item.model, series: '机床' }));
  const groups = source.reduce((acc, item) => {
    const key = item.series || '机床型号';
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
  return Object.entries(groups).map(([name, items]) => ({ name, items }));
});

const filteredProductGroups = computed(() => {
  const keyword = catalogSearch.value.trim().toLowerCase();
  if (!keyword) return productGroups.value;
  return productGroups.value
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        [group.name, item.code, item.name].some((value) => String(value || '').toLowerCase().includes(keyword))
      )
    }))
    .filter((group) => group.items.length);
});

const selectedFamilyModels = computed(() => selectedFamily.value?.items || []);

const myRequests = computed(() => {
  return requests.value;
});

const materialOptions = computed(() => {
  const modelConfig = photoConfigs.value.find((item) => item.code === guideForm.modelCode);
  return modelConfig?.photoItems || [];
});
const materialUsesFallback = computed(() => photoConfigs.value.find((item) => item.code === guideForm.modelCode)?.materialSource === 'repair-system:material-fallback');

const currentVerificationIssues = computed(() =>
  guideForm.items.filter((item) => item.verification?.requiresManualReview)
);

const activeRequestCount = computed(() =>
  myRequests.value.filter((item) => !['已完成', '已寄回', '已驳回'].includes(item.status)).length
);

const attentionRequestCount = computed(() =>
  myRequests.value.filter((item) => ['待补充资料', '已驳回'].includes(item.status)).length
);

const completedRequestCount = computed(() =>
  myRequests.value.filter((item) => ['已完成', '已寄回'].includes(item.status)).length
);

const recentRequests = computed(() => myRequests.value.slice(0, 3));

const guideDisplayStep = computed(() => guideStep.value);

const guideTitle = computed(() => ({
  1: '选择需要服务的设备',
  2: '选择需要维修的物料',
  3: '描述故障与服务方式',
  4: '确认服务选择',
  5: '核验设备并提交申请'
}[guideStep.value] || '发起维修申请'));

const guideSteps = ['选择设备', '选择物料', '描述故障', '服务摘要', '核验提交'];

const { clearDraft, restoreDraft } = useRepairDraft(guideForm, guideStep);

function statusTag(status) {
  if (status === '在保') return 'success';
  if (['不在保', '出保', '过保'].includes(status)) return 'danger';
  if (status === '出库时间待补充') return 'warning';
  if (['已完成', '已寄回'].includes(status)) return 'success';
  if (['待审核', '已生成工单', '维修中', '待寄回'].includes(status)) return 'warning';
  if (['已驳回', '无法维修', '机床编号未找到', '机床和零件编号未找到', '零件编号未找到', '编号绑定不一致', '零件已解绑', '机型不一致', '物料信息不一致', '未建档'].includes(status)) return 'danger';
  return 'info';
}

function statusAlert(status) {
  const type = statusTag(status);
  return type === 'danger' ? 'error' : type;
}

function progressActive(status) {
  const map = {
    待审核: 1,
    待补充资料: 1,
    已驳回: 1,
    已生成工单: 2,
    待接单: 2,
    维修中: 3,
    待寄回: 4,
    无法维修: 4,
    已寄回: 5,
    已完成: 6
  };
  return map[status] || 1;
}

function modelIcon(index) {
  return [Monitor, Cpu, Box, Tools][index % 4];
}

function familyImage(group) {
  const model = group?.items?.find((item) => item.imageUrl || item.photoUrl || item.image);
  const source = model?.imageUrl || model?.photoUrl || model?.image || '';
  return source ? apiAssetUrl(source) : '';
}

function storedFaqContinuation() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(FAQ_CONTINUATION_KEY) || 'null');
    const sessionId = String(value?.faqSessionId || '').trim();
    return SAFE_FAQ_SESSION_ID.test(sessionId) ? sessionId : '';
  } catch {
    return '';
  }
}

function createFaqIdempotencyKey() {
  const random = window.crypto?.randomUUID?.() || `${Math.random()}`.slice(2);
  return `repair-faq-${Date.now().toString(36)}-${random}`;
}

async function ensureFaqConversation() {
  if (!useFaqBff.value) return '';
  const conversation = await createFaqConversation({
    baseUrl: faqBffBaseUrl,
    faqSessionId: faqSessionId.value || storedFaqContinuation(),
    context: { page: clientView.value }
  });
  faqSessionId.value = conversation.faqSessionId;
  window.sessionStorage.setItem(FAQ_CONTINUATION_KEY, JSON.stringify({ faqSessionId: faqSessionId.value, receivedAt: Date.now() }));
  return faqSessionId.value;
}

async function openFaqAssistant() {
  faqDialog.value = true;
  faqAnswer.value = null;
  faqRequestId.value = '';
  faqCitations.value = [];
  if (!useFaqBff.value) return;
  try {
    await ensureFaqConversation();
  } catch {
    faqBffAvailable.value = false;
    ElMessage.warning('AI 服务暂时不可用，已切换为基础问答');
  }
}

async function submitFaqQuestion() {
  if (!faqQuestion.value.trim()) {
    ElMessage.warning('请输入设备或服务问题');
    return;
  }
  faqLoading.value = true;
  try {
    if (!useFaqBff.value) {
      faqAnswer.value = await api.faqAnswer(faqQuestion.value.trim());
      return;
    }
    const sessionId = await ensureFaqConversation();
    faqAbortController?.abort();
    faqAbortController = new AbortController();
    faqAnswer.value = { title: 'AI 服务建议', answer: '' };
    faqRequestId.value = '';
    faqCitations.value = [];
    let streamError = '';
    await streamFaqMessage({
      baseUrl: faqBffBaseUrl,
      faqSessionId: sessionId,
      message: faqQuestion.value.trim(),
      context: { page: clientView.value },
      idempotencyKey: createFaqIdempotencyKey(),
      signal: faqAbortController.signal,
      onEvent: ({ event, data }) => {
        if (event === 'ack') faqRequestId.value = String(data?.requestId || '');
        if (event === 'delta') faqAnswer.value.answer += String(data?.text || '');
        if (event === 'citation' && data?.title) faqCitations.value.push({ title: String(data.title), version: String(data.version || '') });
        if (event === 'done' && !faqAnswer.value.answer) faqAnswer.value.answer = String(data?.answer || '');
        if (event === 'error') streamError = String(data?.code || 'FAQ_BFF_UNAVAILABLE');
      }
    });
    if (streamError) throw new Error(streamError);
    if (!faqAnswer.value.answer) faqAnswer.value.answer = '暂未生成明确建议，请提交维修申请或联系人工售后。';
  } catch (error) {
    if (faqMode.value === 'bff') faqBffAvailable.value = false;
    faqAnswer.value = null;
    ElMessage.warning(error.message || '服务问答暂时不可用，可直接提交维修申请');
  } finally {
    faqLoading.value = false;
    faqAbortController = null;
  }
}

async function sendFaqFeedback(helpful) {
  if (!useFaqBff.value || !faqSessionId.value || !faqRequestId.value) return;
  try {
    await submitFaqFeedback({
      baseUrl: faqBffBaseUrl,
      faqSessionId: faqSessionId.value,
      requestId: faqRequestId.value,
      helpful,
      reason: helpful ? '' : 'needs technician',
      escalateToHuman: !helpful
    });
    ElMessage.success(helpful ? '感谢你的反馈' : '已记录人工协助请求');
  } catch {
    ElMessage.warning('反馈暂未发送成功，可直接提交维修申请');
  }
}

function applyDeepLinkModel(restoredDraft) {
  if (restoredDraft || clientView.value !== 'request') return;
  const requestedCode = queryValue(route.query.modelCode);
  if (!requestedCode) return;
  const model = modelDictionary.value.find((item) => String(item.code).toLowerCase() === requestedCode.toLowerCase());
  if (!model) {
    ElMessage.warning('官网传入的机型暂未匹配，请从机型列表中重新选择');
    return;
  }
  selectedFamily.value = productGroups.value.find((group) => group.items.some((item) => item.code === model.code)) || null;
  guideForm.modelCode = model.code;
  guideForm.modelName = model.name;
  guideStep.value = 2;
}

async function removeFaqHandoffQuery() {
  const query = { ...route.query };
  delete query.faqHandoff;
  await router.replace({ path: route.path, query });
}

async function applyFaqHandoff(restoredDraft) {
  const token = queryValue(route.query.faqHandoff);
  if (!token || clientView.value !== 'request') return restoredDraft;
  try {
    const handoff = await api.redeemFaqHandoff(token);
    captureEntryContext(handoff.sourceChannel);
    if (SAFE_FAQ_SESSION_ID.test(String(handoff.faqSessionId || '').trim())) {
      faqSessionId.value = String(handoff.faqSessionId).trim();
      window.sessionStorage.setItem(FAQ_CONTINUATION_KEY, JSON.stringify({ faqSessionId: faqSessionId.value, receivedAt: Date.now() }));
    }
    await removeFaqHandoffQuery();
    if (handoff.handoffType !== 'repair_draft') {
      ElMessage.success('官网 FAQ 会话已安全接续');
      return restoredDraft;
    }

    guideForm.faqContext = {
      conversationReference: handoff.faqConversationReference,
      errorCodes: handoff.errorCodes || [],
      attemptedSteps: handoff.attemptedSteps || [],
      knowledgeReferences: handoff.knowledgeReferences || [],
      consentAt: handoff.consentAt,
      consentUiVersion: handoff.consentUiVersion
    };
    if (!restoredDraft && handoff.modelCode) {
      const model = modelDictionary.value.find((item) => String(item.code).toLowerCase() === String(handoff.modelCode).toLowerCase());
      if (model) {
        selectedFamily.value = productGroups.value.find((group) => group.items.some((item) => item.code === model.code)) || null;
        guideForm.modelCode = model.code;
        guideForm.modelName = model.name;
        guideStep.value = 2;
      } else {
        ElMessage.warning('FAQ 中的机型暂未匹配，请重新选择机型');
      }
    }
    if (!guideForm.faultDescription) {
      const summary = [
        handoff.symptomSummary,
        handoff.errorCodes?.length ? `错误码：${handoff.errorCodes.join('、')}` : '',
        handoff.attemptedSteps?.length ? `已尝试：${handoff.attemptedSteps.join('；')}` : ''
      ].filter(Boolean);
      guideForm.faultDescription = summary.join('\n');
    }
    ElMessage.success(restoredDraft ? 'FAQ 摘要已关联，原有维修草稿内容保持不变' : 'FAQ 排障摘要已填入维修草稿，请检查并补充信息');
    return restoredDraft || Boolean(guideForm.modelCode);
  } catch (error) {
    if (error.status === 410) await removeFaqHandoffQuery();
    ElMessage.warning(error.message || 'FAQ 交接读取失败，可直接填写维修申请');
    return restoredDraft;
  }
}

function applyWarrantyDeepLink() {
  if (!route.meta.warrantyEntry) return;
  const requestedCode = queryValue(route.query.modelCode);
  const model = requestedCode
    ? modelDictionary.value.find((item) => String(item.code).toLowerCase() === requestedCode.toLowerCase())
    : modelDictionary.value[0];
  if (requestedCode && !model) ElMessage.warning('官网传入的机型暂未匹配，请重新选择机型');
  const selectedModel = model || modelDictionary.value[0];
  if (selectedModel) {
    quickWarrantyForm.modelCode = selectedModel.code;
    quickWarrantyForm.modelName = selectedModel.name;
  }
}

function extractBoardQrToken(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/');
    const markerIndex = parts.findIndex((part) => part === 'scan');
    if (markerIndex >= 0) return decodeURIComponent(parts[markerIndex + 1] || '');
  } catch {
    // USB QR scanners may emit the opaque token without a URL.
  }
  return raw.replace(/^scan[/:]/i, '').trim();
}

async function resolveBoardQr(inputToken = '') {
  if (clientView.value !== 'scan') return;
  const token = extractBoardQrToken(inputToken || queryValue(route.params.token));
  if (!token) {
    if (route.params.token) boardQrError.value = '二维码内容无效，请检查标签后重试。';
    return;
  }
  boardQrLoading.value = true;
  boardQrResult.value = null;
  boardQrError.value = '';
  boardWarrantyResult.value = null;
  boardWarrantyError.value = '';
  try {
    boardQrResult.value = await api.resolveBoardQr(token);
    if (boardQrResult.value?.machine) {
      boardWarrantyLoading.value = true;
      try {
        boardWarrantyResult.value = await api.warrantyCheck({
          machineNo: boardQrResult.value.machine.machineNo,
          serialNo: boardQrResult.value.boardId,
          modelCode: boardQrResult.value.machine.modelCode,
          materialCode: boardQrResult.value.material.code,
          materialName: boardQrResult.value.material.name
        });
      } catch (error) {
        boardWarrantyError.value = error.message || '保修状态暂时无法自动核验。';
      } finally {
        boardWarrantyLoading.value = false;
      }

      // A verified board label is a service-entry shortcut. Move the resolved
      // identity into the repair draft before routing so the form is not
      // rebuilt from untrusted URL query values.
      startRepairFromBoard();
    }
  } catch (error) {
    boardQrError.value = error.message || '二维码无效、已过期或已作废。';
  } finally {
    boardQrLoading.value = false;
  }
}

async function submitQrScan(value = scanTokenInput.value) {
  const token = extractBoardQrToken(value);
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    scanInputError.value = '请输入完整二维码地址，或使用扫码枪重新扫描。';
    return;
  }
  scanInputError.value = '';
  scanTokenInput.value = token;
  await resolveBoardQr(token);
}

async function handleQrImageChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  scanInputError.value = '';
  try {
    qrReader ||= new BrowserQRCodeReader();
    const objectUrl = URL.createObjectURL(file);
    try {
      const result = await qrReader.decodeFromImageUrl(objectUrl);
      await submitQrScan(result.getText());
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    scanInputError.value = '图片中没有识别到有效二维码，请重新选择清晰图片。';
  } finally {
    event.target.value = '';
  }
}

function startRepairFromBoard() {
  const board = boardQrResult.value;
  const machine = board?.machine;
  if (!machine?.machineNo || !machine.modelCode || !board?.material?.code || !board?.boardId) return false;

  const model = modelDictionary.value.find((item) => String(item.code).toLowerCase() === String(machine.modelCode).toLowerCase());
  if (!model) {
    boardQrError.value = '该板卡关联的机型不在当前服务目录中，无法自动创建维修申请。';
    return false;
  }

  resetGuide();
  selectedFamily.value = productGroups.value.find((group) => group.items.some((item) => item.code === model.code)) || null;
  guideForm.modelCode = model.code;
  guideForm.modelName = model.name;
  guideForm.machineNo = machine.machineNo;

  const material = materialOptions.value.find((item) => item.code === board.material.code);
  if (!material) {
    boardQrError.value = '该板卡物料尚未配置到对应机型的维修目录，请联系售后处理。';
    return false;
  }

  guideForm.selectedMaterialCodes = [material.code];
  guideForm.items = [{
    materialCode: material.code,
    positionCode: material.code,
    materialType: material.type,
    materialName: material.name,
    spec: material.spec,
    photoRequirement: material.shootingRequirement || '',
    photoRequired: material.required,
    boardNo: board.boardId,
    serviceType: guideForm.warrantyScope === 'in' ? '维修' : '直接更换',
    faultCategory: '',
    faultPhenomenon: '',
    verification: null
  }];
  guideStep.value = 3;
  router.replace({ path: clientRoutes.request, query: { source: 'board_qr' } });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  return true;
}

function openWarrantyFromBoard() {
  const board = boardQrResult.value;
  if (board?.machine) {
    quickWarrantyForm.modelCode = board.machine.modelCode || '';
    quickWarrantyForm.modelName = modelDictionary.value.find((item) => item.code === board.machine.modelCode)?.name || board.machine.modelCode || '';
    quickWarrantyForm.machineNo = board.machine.machineNo || '';
    quickWarrantyResult.value = boardWarrantyResult.value;
  }
  navigateClient('warranty');
}

function navigateClient(view, replace = false) {
  const target = view === 'scan' ? '/scan' : clientRoutes[view] || clientRoutes.home;
  return replace ? router.replace(target) : router.push(target);
}

async function loadClientData() {
  loading.value = true;
  try {
    if (!currentUser.value) return;
    requests.value = await api.requests();
  } finally {
    loading.value = false;
  }
}

async function loadPublicModelData() {
  const [models, photoConfigData] = await Promise.all([api.modelDictionary(), api.modelPhotoConfig()]);
  modelDictionary.value = models;
  photoConfigs.value = photoConfigData;
}

function loadCurrentUser() {
  currentUser.value = null;
}

function saveCurrentUser(user) {
  currentUser.value = user;
  applyAccountToGuide();
}

function applyAccountToGuide() {
  if (!currentUser.value) return;
  guideForm.agent = currentUser.value.agent || currentUser.value.name || '';
  guideForm.contact = currentUser.value.contact || '';
  guideForm.phone = currentUser.value.phone || '';
  guideForm.address = currentUser.value.address || '';
}

async function submitAuth() {
  authLoading.value = true;
  try {
    const payload = {
      username: authForm.username,
      password: authForm.password,
      name: authForm.name,
      agent: authForm.agent,
      contact: authForm.contact,
      phone: authForm.phone,
      address: authForm.address
    };
    if (authMode.value === 'register') {
      await api.register(payload);
      authMode.value = 'login';
      authForm.password = '';
      ElMessage.success('注册申请已提交，等待后台审核通过后再登录');
      return;
    }
    const user = await api.login(payload);
    saveCurrentUser(user);
    const destination = pendingAuthAction.value;
    if (destination === 'request') guideStep.value = 5;
    authDialog.value = false;
    authPrompt.value = '';
    pendingAuthAction.value = 'home';
    await loadClientData();
    await navigateClient(destination);
    ElMessage.success('登录成功');
  } catch (error) {
    ElMessage.error(error.message || '账号操作失败');
  } finally {
    authLoading.value = false;
  }
}

async function logout() {
  try {
    await api.logout('client');
  } catch {
    // Clear the local view even if the server session has already expired.
  }
  currentUser.value = null;
  requests.value = [];
  pendingAuthAction.value = 'home';
  resetGuide();
  await navigateClient('home', true);
}

async function logoutAll() {
  try {
    await api.logoutAll();
    ElMessage.success('已退出所有设备');
  } catch (error) {
    ElMessage.error(error.message || '退出所有设备失败');
    return;
  }
  currentUser.value = null;
  requests.value = [];
  pendingAuthAction.value = 'home';
  resetGuide();
  await navigateClient('home', true);
}

function resetGuide({ clearSaved = true } = {}) {
  if (clearSaved) clearDraft();
  guideStep.value = 1;
  selectedFamily.value = null;
  warrantyResult.value = null;
  Object.assign(guideForm, {
    agent: currentUser.value?.agent || currentUser.value?.name || '',
    customerName: '',
    contact: currentUser.value?.contact || '',
    phone: currentUser.value?.phone || '',
    address: currentUser.value?.address || '',
    modelCode: '',
    modelName: '',
    machineNo: '',
    warrantyScope: 'in',
    sendMethod: '寄回',
    outboundExpressCompany: '',
    outboundTrackingNo: '',
    faultDescription: '',
    faqContext: null,
    customProductName: '',
    selectedMaterialCodes: [],
    items: []
  });
  applyAccountToGuide();
}

function startNewRequest() {
  resetGuide();
  navigateClient('request');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openAuth(action = 'home', prompt = '') {
  pendingAuthAction.value = action;
  authPrompt.value = prompt;
  authMode.value = 'login';
  authDialog.value = true;
}

function handleAuthClosed() {
  authPrompt.value = '';
}

function openWarrantyEntry() {
  const model = modelDictionary.value[0];
  if (!model) {
    ElMessage.warning('机型字典中暂时没有可选机型');
    return;
  }
  quickWarrantyForm.modelCode = quickWarrantyForm.modelCode || model.code;
  quickWarrantyForm.modelName = modelDictionary.value.find((item) => item.code === quickWarrantyForm.modelCode)?.name || model.name;
  quickWarrantyResult.value = null;
  navigateClient('warranty');
}

function syncQuickWarrantyModel(modelCode) {
  quickWarrantyForm.modelName = modelDictionary.value.find((item) => item.code === modelCode)?.name || '';
  quickWarrantyResult.value = null;
}

async function checkQuickWarranty() {
  if (!quickWarrantyForm.machineNo) {
    ElMessage.warning('请输入机床编号');
    return;
  }
  if (!currentUser.value) {
    openAuth('warranty', `已保留 ${quickWarrantyForm.modelName || quickWarrantyForm.modelCode} 的核验信息，登录后继续。`);
    return;
  }
  warrantyCheckLoading.value = true;
  try {
    quickWarrantyResult.value = await api.warrantyCheck({ ...quickWarrantyForm });
  } catch (error) {
    ElMessage.error(error.message || '保修状态核验失败');
  } finally {
    warrantyCheckLoading.value = false;
  }
}

function showMyRequests() {
  if (!currentUser.value) {
    openAuth('orders', '登录后即可查看审核、维修与寄回进度。');
    return;
  }
  navigateClient('orders');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showClientHome() {
  navigateClient('home');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openModelDialog(group) {
  selectedFamily.value = group;
  const firstModel = group.items[0];
  guideForm.modelCode = firstModel?.code || '';
  guideForm.modelName = firstModel?.name || '';
  modelDialog.value = true;
}

function confirmModel() {
  const model = selectedFamilyModels.value.find((item) => item.code === guideForm.modelCode) || modelDictionary.value.find((item) => item.code === guideForm.modelCode);
  if (model) guideForm.modelName = model.name;
  if (!guideForm.modelName) {
    ElMessage.warning('请先选择机型');
    return;
  }
  guideForm.selectedMaterialCodes = [];
  guideForm.items = [];
  modelDialog.value = false;
  warrantyResult.value = null;
  guideStep.value = 2;
  navigateClient('request');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function verifyMachine() {
  if (!currentUser.value) {
    openAuth('request', '登录后继续核验机床与零件编号。');
    return false;
  }
  if (!guideForm.machineNo) {
    ElMessage.warning('保修期内申请必须填写机床编号');
    return false;
  }
  try {
    warrantyResult.value = await api.warrantyCheck({
      machineNo: guideForm.machineNo,
      modelCode: guideForm.modelCode,
      modelName: guideForm.modelName
    });
    await Promise.all(guideForm.items.map(verifyItem));
    return true;
  } catch (error) {
    ElMessage.error(error.message || '设备核验失败');
    return false;
  }
}

function toggleMaterial(material) {
  const index = guideForm.selectedMaterialCodes.indexOf(material.code);
  if (index >= 0) {
    guideForm.selectedMaterialCodes.splice(index, 1);
    guideForm.items = guideForm.items.filter((item) => item.materialCode !== material.code);
    return;
  }
  guideForm.selectedMaterialCodes.push(material.code);
  guideForm.items.push({
    materialCode: material.code,
    positionCode: material.code,
    materialType: material.type,
    materialName: material.name,
    spec: material.spec,
    photoRequirement: material.shootingRequirement || '',
    photoRequired: material.required,
    boardNo: scannedBoardMaterialCode.value === material.code ? scannedBoardNo.value : '',
    serviceType: guideForm.warrantyScope === 'in' ? '维修' : '直接替换',
    faultCategory: '',
    faultPhenomenon: '',
    verification: null
  });
}

function syncSelectedMaterials() {
  const existingCodes = new Set(guideForm.items.map((item) => item.materialCode));
  materialOptions.value.forEach((material) => {
    if (guideForm.selectedMaterialCodes.includes(material.code) && !existingCodes.has(material.code)) {
      guideForm.items.push({
        materialCode: material.code,
        positionCode: material.code,
        materialType: material.type,
        materialName: material.name,
        spec: material.spec,
        photoRequirement: material.shootingRequirement || '',
        photoRequired: material.required,
        boardNo: '',
        serviceType: guideForm.warrantyScope === 'in' ? '维修' : '直接替换',
        faultCategory: '',
        faultPhenomenon: '',
        verification: null
      });
    }
  });
  guideForm.items = guideForm.items.filter((item) => guideForm.selectedMaterialCodes.includes(item.materialCode));
}

function goItemDetail() {
  syncSelectedMaterials();
  if (!guideForm.items.length) {
    ElMessage.warning('请选择至少一个维修产品或物料');
    return;
  }
  guideStep.value = 3;
}

function validateItemDetail() {
  const missingBoardNo = guideForm.warrantyScope === 'in' && guideForm.items.some((item) => item.serviceType !== '借用' && !item.boardNo);
  if (missingBoardNo) {
    ElMessage.warning('保修期内选择维修或直接替换时必须填写板号/零件编号，借用可不填');
    return false;
  }
  return true;
}

function validateIssueDetail() {
  const missingIssue = guideForm.items.some((item) => !item.faultCategory && !String(item.faultPhenomenon || '').trim());
  if (missingIssue) {
    ElMessage.warning('请为每个维修物料选择故障类型或填写故障描述');
    return false;
  }
  return true;
}

function boardNoPlaceholder(item) {
  if (guideForm.warrantyScope !== 'in') return '可选：板号/零件编号';
  return item.serviceType === '借用' ? '可选：借用不需要填写原板号' : '必填：板号/零件编号';
}

async function verifyItem(item) {
  if (guideForm.warrantyScope !== 'in' || item.serviceType === '借用') return null;
  item.verification = await api.warrantyCheck({
    machineNo: guideForm.machineNo,
    serialNo: item.boardNo,
    modelCode: guideForm.modelCode,
    modelName: guideForm.modelName,
    materialCode: item.materialCode,
    materialName: item.materialName,
    photoPositionCode: item.positionCode || item.materialCode
  });
  return item.verification;
}

function goReview() {
  if (!validateIssueDetail()) return;
  guideStep.value = 4;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function continueFromReview() {
  if (!currentUser.value) {
    openAuth('request', '已保留机型、物料和故障选择，登录后继续核验设备并提交。');
    return;
  }
  applyAccountToGuide();
  guideStep.value = 5;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('读取照片失败'));
    reader.readAsDataURL(file);
  });
}

async function addSupplementPhoto(uploadFile, category) {
  const file = uploadFile.raw;
  if (!file?.type?.startsWith('image/')) {
    ElMessage.warning('请选择照片文件');
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    ElMessage.warning('单张照片不能超过 4MB');
    return;
  }
  const existingBytes = supplementPhotos.value
    .filter((item) => item.category !== category)
    .reduce((total, item) => total + Number(item.size || 0), 0);
  if (existingBytes + file.size > MAX_SUPPLEMENT_TOTAL_BYTES) {
    ElMessage.warning('两张照片总大小不能超过 6MB');
    return;
  }
  const dataUrl = await fileAsDataUrl(file);
  supplementPhotos.value = [
    ...supplementPhotos.value.filter((item) => item.category !== category),
    { name: file.name, category, dataUrl, size: file.size }
  ];
}

function photoByCategory(category) {
  return supplementPhotos.value.find((item) => item.category === category);
}

function openSupplement(row) {
  supplementRequest.value = row;
  supplementPhotos.value = [];
  supplementDialog.value = true;
}

async function submitSupplement() {
  const requirements = supplementRequest.value?.supplementRequirements || [];
  const categories = new Set(supplementPhotos.value.map((item) => item.category));
  if (requirements.some((item) => !categories.has(item))) {
    ElMessage.warning('请上传机床铭牌和零件编号照片');
    return;
  }
  supplementLoading.value = true;
  try {
    await api.supplementRequest(supplementRequest.value.requestNo, {
      attachments: supplementPhotos.value,
      operator: currentUser.value.name || currentUser.value.agent
    });
    ElMessage.success('照片已补充，申请已重新提交审核');
    supplementDialog.value = false;
    await loadClientData();
  } catch (error) {
    ElMessage.error(error.message || '补充资料失败');
  } finally {
    supplementLoading.value = false;
  }
}

async function submitGuideRequest() {
  if (!currentUser.value) {
    ElMessage.warning('请先登录账号后再提交维修申请');
    return;
  }
  if (!guideForm.customerName || !guideForm.contact || !guideForm.phone) {
    ElMessage.warning('请填写客户名称、联系人和电话');
    return;
  }
  if (guideForm.warrantyScope === 'in' && !guideForm.machineNo) {
    ElMessage.warning('保修期内申请必须填写机床编号');
    return;
  }
  if (!validateItemDetail()) return;
  if (guideForm.warrantyScope === 'in' && !(await verifyMachine())) return;

  const machineNo = guideForm.warrantyScope === 'in' ? guideForm.machineNo : `非保-${guideForm.modelCode || 'MANUAL'}`;
  const details = guideForm.items.map((item, index) => ({
    serialNo: item.boardNo || `${item.materialCode}-${index + 1}`,
    boardNo: item.boardNo || `${item.materialCode}-${index + 1}`,
    serviceType: item.serviceType,
    warrantyScope: guideForm.warrantyScope === 'in' ? '在保' : '不在保',
    materialCode: item.materialCode,
    materialType: item.materialType,
    materialName: item.materialName,
    spec: item.spec,
    faultPhenomenon: item.faultPhenomenon || item.faultCategory || guideForm.faultDescription || '未填写故障现象'
  }));

  submitLoading.value = true;
  try {
    const created = await api.createRequest({
      agent: guideForm.agent,
      customerName: guideForm.customerName,
      contact: guideForm.contact,
      phone: guideForm.phone,
      address: guideForm.address,
      machineNo,
      modelCode: guideForm.modelCode,
      modelName: guideForm.modelName,
      sourceChannel: sourceChannel.value,
      faqContext: guideForm.faqContext,
      faultDescription: `机型：${guideForm.modelName || guideForm.modelCode}；保修：${guideForm.warrantyScope === 'in' ? '保内' : '保外'}；${guideForm.faultDescription}`,
      sendMethod: guideForm.sendMethod,
      outboundExpressCompany: guideForm.outboundExpressCompany,
      outboundTrackingNo: guideForm.outboundTrackingNo,
      details
    });
    submittedRequest.value = created;
    successDialog.value = false;
    ElMessage.success(`维修申请已提交：${created.requestNo}`);
    resetGuide();
    await loadClientData();
    await navigateClient('orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    ElMessage.error(error.message || '提交失败，请检查信息后重试');
  } finally {
    submitLoading.value = false;
  }
}

watch(clientView, (view) => {
  if (!sessionReady.value || view !== 'orders' || currentUser.value) return;
  navigateClient('home', true);
  openAuth('orders', '登录后即可查看审核、维修与寄回进度。');
});

watch(clientView, () => {
  playPageEntry();
});

watch(guideStep, () => {
  if (clientView.value === 'request') playPageEntry();
});

onMounted(async () => {
  loadCurrentUser();
  applyAccountToGuide();
  await loadPublicModelData();
  applyWarrantyDeepLink();
  await resolveBoardQr();
  let restored = restoreDraft();
  if (restored && !modelDictionary.value.some((item) => item.code === guideForm.modelCode)) {
    resetGuide();
    restored = false;
  }
  restored = await applyFaqHandoff(restored);
  applyDeepLinkModel(restored);
  if (clientView.value === 'request' && !guideForm.modelCode) guideStep.value = 1;
  try {
    const user = await api.meOptional('client');
    if (user) {
      saveCurrentUser(user);
      await loadClientData();
    }
  } catch {
    currentUser.value = null;
  } finally {
    sessionReady.value = true;
  }
  playPageEntry();
  if (clientView.value === 'orders' && !currentUser.value) {
    await navigateClient('home', true);
    openAuth('orders', '登录后即可查看审核、维修与寄回进度。');
  }
});

onUnmounted(() => {
  faqAbortController?.abort();
});
</script>

<template>
  <div class="app-shell client-shell" :class="[`client-view-${clientView}`, { 'is-authenticated': currentUser }]" v-loading="loading">
    <header class="repair-site-header">
      <a class="repair-site-brand" :href="officialSiteUrl" aria-label="返回瑞钧智科官网">
        <img :src="brandLogo" alt="瑞钧智科" />
        <span></span>
        <b>售后服务</b>
      </a>
      <button class="repair-site-menu-toggle" type="button" :aria-expanded="portalMenuOpen" aria-controls="repair-site-navigation" aria-label="打开维修服务导航" @click="portalMenuOpen = !portalMenuOpen">
        <span aria-hidden="true"></span>
      </button>
      <nav id="repair-site-navigation" class="repair-site-navigation" :class="{ open: portalMenuOpen }" aria-label="维修服务导航">
        <button type="button" :class="{ active: clientView === 'home' }" @click="portalMenuOpen = false; showClientHome()">服务首页</button>
        <button type="button" :class="{ active: clientView === 'request' }" @click="portalMenuOpen = false; startNewRequest()">发起维修</button>
        <button type="button" :class="{ active: clientView === 'orders' }" @click="portalMenuOpen = false; showMyRequests()">维修进度</button>
        <a :href="officialServiceUrl">技术支持</a>
      </nav>
      <div class="repair-site-actions">
        <a class="repair-site-return" :href="officialSiteUrl">返回官网 <span aria-hidden="true">→</span></a>
        <button v-if="!currentUser" class="repair-site-login" type="button" @click="openAuth('home')">登录</button>
        <button v-else class="repair-site-account" type="button" @click="showMyRequests">{{ currentUser.agent || currentUser.name }}</button>
      </div>
    </header>
    <header class="topbar client-topbar">
      <a class="client-brand" href="/support" aria-label="维修服务中心首页" @click.prevent="showClientHome">
        <img :src="brandLogo" alt="瑞钧智科" />
        <span class="client-brand-divider"></span>
        <span class="client-brand-title">售后服务中心</span>
      </a>
      <nav v-if="currentUser" class="client-nav" aria-label="客户服务导航">
        <button type="button" :class="{ active: clientView === 'home' || clientView === 'request' }" @click="showClientHome">
          <el-icon><House /></el-icon><span>服务支持</span>
        </button>
        <button type="button" :class="{ active: clientView === 'orders' }" @click="showMyRequests">
          <el-icon><Document /></el-icon><span>我的申请</span><em v-if="currentUser && myRequests.length">{{ myRequests.length }}</em>
        </button>
      </nav>
      <div class="top-actions">
        <a class="official-site-link" :href="officialSiteUrl" aria-label="返回瑞钧智科官网" title="返回瑞钧智科官网">
          <el-icon><House /></el-icon><span>返回官网</span>
        </a>
        <template v-if="currentUser">
          <span class="account-chip">{{ currentUser.agent || currentUser.name }}</span>
          <el-button circle :icon="Refresh" title="刷新数据" aria-label="刷新数据" @click="loadClientData" />
          <el-button text title="退出所有设备" @click="logoutAll">退出所有设备</el-button>
          <el-button circle :icon="SwitchButton" title="退出账号" aria-label="退出账号" @click="logout" />
        </template>
        <el-button v-else class="client-login-button" :icon="User" @click="openAuth('home')">登录</el-button>
      </div>
    </header>

    <main class="client-content">
      <div class="support-page">
        <section v-if="clientView === 'request' || clientView === 'orders' || clientView === 'scan'" class="repair-route-ledger" :class="`is-${clientView}`">
          <div class="repair-route-ledger-index">{{ clientView === 'request' ? '02' : clientView === 'orders' ? '03' : '04' }}</div>
          <div class="repair-route-ledger-copy">
            <p>{{ clientView === 'request' ? 'SERVICE REQUEST' : clientView === 'orders' ? 'SERVICE CASE FILE' : 'DEVICE IDENTITY' }}</p>
            <strong>{{ clientView === 'request' ? '建立维修档案' : clientView === 'orders' ? '追踪服务进度' : '确认板卡与设备' }}</strong>
          </div>
          <div class="repair-route-ledger-track" aria-hidden="true">
            <span class="is-done"></span><span :class="{ 'is-active': clientView === 'request' }"></span><span :class="{ 'is-active': clientView === 'orders' }"></span><span :class="{ 'is-active': clientView === 'scan' }"></span>
          </div>
        </section>
        <template v-if="clientView === 'home' && !currentUser">
          <section class="repair-site-hero">
            <div class="repair-site-hero-copy">
              <p>RUIJUN / AFTER-SALES SERVICE</p>
              <h1>设备维修服务</h1>
              <strong>让每一次停机，都有清晰的处理路径。</strong>
              <span>在线提交维修申请，核验保修状态，持续查看工厂处理与寄回进度。</span>
              <div class="repair-site-hero-status" aria-label="维修服务节点">
                <div><em>01</em><span>设备身份<br><b>机型与板卡</b></span></div>
                <div><em>02</em><span>工厂处理<br><b>审核与检测</b></span></div>
                <div><em>03</em><span>服务交付<br><b>寄回与归档</b></span></div>
              </div>
              <div class="repair-site-hero-actions">
                <button type="button" class="repair-hero-qr-cta" aria-label="扫描二维码识别板卡" @click="navigateClient('scan')"><el-icon><FullScreen /></el-icon><span>扫码识别板卡</span><small>自动带入设备信息</small></button>
                <span class="repair-hero-cta-kicker" aria-hidden="true">START HERE <i></i> 从这里开始</span>
                <button type="button" class="is-primary repair-hero-cta" aria-label="从这里开始，发起维修申请" aria-describedby="repair-hero-cta-note" @click="startNewRequest"><span>发起维修申请</span> <span aria-hidden="true">→</span></button>
                <button type="button" @click="serviceGuideDialog = true">了解服务流程</button>
              </div>
              <span id="repair-hero-cta-note" class="repair-hero-cta-note"><b>01</b> 选择设备后，按步骤完成物料与故障信息</span>
            </div>
            <aside class="repair-site-hero-panel" aria-label="维修服务入口">
              <span>01</span>
              <h2>从设备开始</h2>
              <p>选择机型和物料，填写故障信息后即可提交工厂审核。</p>
              <button type="button" @click="startNewRequest">开始申请 <el-icon><ArrowRight /></el-icon></button>
              <small>已有关联申请？登录后查看维修进度</small>
            </aside>
          </section>
          <section class="repair-site-device-section" aria-labelledby="repair-device-heading">
            <div class="repair-site-section-heading">
              <p>DEVICE SERVICE</p>
              <h2 id="repair-device-heading">选择您的设备</h2>
              <span>从机型开始，系统将引导完成物料、故障描述和保修核验。</span>
            </div>
            <div class="client-catalog-search repair-site-search">
              <el-icon><Search /></el-icon>
              <input v-model="catalogSearch" type="search" placeholder="搜索机型系列或具体型号" aria-label="搜索机型系列或具体型号" />
            </div>
            <div v-if="filteredProductGroups.length" class="client-product-selector repair-site-device-grid" aria-label="选择机床系列">
              <button v-for="(group, index) in filteredProductGroups" :key="group.name" type="button" @click="openModelDialog(group)">
                <span class="client-product-media">
                  <img v-if="familyImage(group)" :src="familyImage(group)" :alt="`${group.name}机型`" />
                  <el-icon v-else><component :is="modelIcon(index)" /></el-icon>
                </span>
                <strong>{{ group.name }}</strong>
                <small>{{ group.items.length }} 个机型</small>
              </button>
            </div>
            <el-empty v-else description="没有找到匹配的机型" :image-size="72" />
          </section>
          <section class="repair-site-service-band" aria-label="其他维修服务">
            <button type="button" class="repair-site-qr-entry" @click="navigateClient('scan')"><span>04</span><strong>QR 识别</strong><small>使用扫码枪或摄像头识别板卡</small><el-icon><ArrowRight /></el-icon></button>
            <div><p>SERVICE TOOLS</p><h2>服务支持</h2></div>
            <button type="button" @click="showMyRequests"><span>01</span><strong>维修进度</strong><small>查看审核、维修与寄回状态</small><el-icon><ArrowRight /></el-icon></button>
            <button type="button" @click="openWarrantyEntry"><span>02</span><strong>保修核验</strong><small>核对设备保修信息</small><el-icon><ArrowRight /></el-icon></button>
            <button type="button" @click="openFaqAssistant"><span>03</span><strong>智能问答</strong><small>获取维修与售后指引</small><el-icon><ArrowRight /></el-icon></button>
          </section>
          <section class="client-support-landing">
            <div class="client-support-brandmark"><img :src="brandLogo" alt="" /></div>
            <h1>瑞钧支持</h1>
            <p>需要协助？从这里开始。</p>
            <div class="client-catalog-search">
              <el-icon><Search /></el-icon>
              <input v-model="catalogSearch" type="search" placeholder="搜索机型系列或具体型号" aria-label="搜索机型系列或具体型号" />
            </div>
            <div v-if="filteredProductGroups.length" class="client-product-selector" aria-label="选择机床系列">
              <button v-for="(group, index) in filteredProductGroups" :key="group.name" type="button" @click="openModelDialog(group)">
                <span class="client-product-media">
                  <img v-if="familyImage(group)" :src="familyImage(group)" :alt="`${group.name}机型`" />
                  <el-icon v-else><component :is="modelIcon(index)" /></el-icon>
                </span>
                <strong>{{ group.name }}</strong>
                <small>{{ group.items.length }} 个机型</small>
              </button>
            </div>
            <el-empty v-else description="没有找到匹配的机型" :image-size="72" />
          </section>

          <section class="client-quick-actions" aria-label="快捷服务">
            <button type="button" @click="showMyRequests">
              <span class="is-blue"><el-icon><Document /></el-icon></span>
              <strong>我的维修申请</strong>
              <small>查看审核、维修与寄回进度</small>
            </button>
            <button type="button" @click="openWarrantyEntry">
              <span class="is-yellow"><el-icon><CircleCheck /></el-icon></span>
              <strong>保修状态核验</strong>
              <small>选择机型并核对设备保修信息</small>
            </button>
            <button type="button" @click="serviceGuideDialog = true">
              <span class="is-graphite"><el-icon><Service /></el-icon></span>
              <strong>服务流程与寄修</strong>
              <small>了解审核、寄出、维修和寄回流程</small>
            </button>
            <button type="button" @click="openFaqAssistant">
              <span class="is-yellow"><el-icon><Service /></el-icon></span>
              <strong>AI 服务问答</strong>
              <small>先说明问题，再选择办理路径</small>
            </button>
          </section>
        </template>

        <ServiceWorkspace
          v-if="clientView === 'home' && currentUser"
          :user="currentUser"
          :requests="myRequests"
          :active-count="activeRequestCount"
          :attention-count="attentionRequestCount"
          :completed-count="completedRequestCount"
          @create-request="startNewRequest"
          @view-requests="showMyRequests"
          @verify-warranty="openWarrantyEntry"
        />

        <section v-if="clientView === 'home' && currentUser" class="client-member-hero legacy-client-member-hero">
          <div class="client-member-intro">
            <div class="client-member-watermark" aria-hidden="true">
              <img :src="brandLogo" alt="" />
              <span class="is-vertical"></span>
              <span class="is-horizontal"></span>
              <em>RJ / SERVICE</em>
            </div>
            <div class="client-service-signal"><span></span> RUIJUN SUPPORT / ONLINE</div>
            <p class="client-kicker">个人服务中心</p>
            <h1>设备支持</h1>
            <p>欢迎回来，<strong>{{ currentUser.agent || currentUser.name }}</strong>。从设备选择到故障核验与寄回进度，服务流程在这里连续完成。</p>
            <el-button type="primary" size="large" :icon="Plus" @click="startNewRequest">发起维修申请</el-button>
          </div>
          <div class="client-member-summary" aria-label="服务概览">
            <div class="client-member-summary-head">
              <div><span>YOUR SERVICE</span><strong>服务概览</strong></div>
              <em>{{ myRequests.length }}<small>全部</small></em>
            </div>
            <div class="client-member-metrics">
              <div><span class="status-icon is-active"><el-icon><Clock /></el-icon></span><strong>{{ activeRequestCount }}</strong><small>处理中</small></div>
              <div><span class="status-icon is-warning"><el-icon><Warning /></el-icon></span><strong>{{ attentionRequestCount }}</strong><small>待补充</small></div>
              <div><span class="status-icon is-done"><el-icon><CircleCheck /></el-icon></span><strong>{{ completedRequestCount }}</strong><small>已完成</small></div>
            </div>
          </div>
        </section>

        <button v-if="clientView === 'home' && attentionRequestCount" type="button" class="client-attention-strip legacy-client-member-content" @click="showMyRequests">
          <span><el-icon><Warning /></el-icon></span>
          <div><strong>{{ attentionRequestCount }} 个申请需要您处理</strong><small>工厂正在等待补充资料或确认，请及时查看。</small></div>
          <el-icon><ArrowRight /></el-icon>
        </button>

        <section v-if="clientView === 'scan'" class="client-board-scan-result" aria-live="polite">
          <p class="client-kicker">BOARD QR / SERVICE ENTRY</p>
          <h1>确认设备身份</h1>
          <div v-if="!route.params.token && !boardQrLoading && !boardQrResult" class="board-qr-entry-callout">
            <div class="board-qr-scan-mark" aria-hidden="true"><i></i><i></i><i></i><i></i><span></span></div>
            <div><strong>请将板卡二维码放入扫描框</strong><span>识别后会自动匹配所属设备、机型和物料，并进入维修申请。</span></div>
          </div>
          <div v-if="!route.params.token && !boardQrLoading && !boardQrResult" class="board-qr-entry-panel">
            <p class="board-qr-entry-lead">请拍摄一张清晰的二维码照片后识别，也可以使用扫码枪或粘贴二维码地址。</p>
            <div class="board-qr-entry-actions">
              <label class="board-qr-upload-button">
                <span>拍摄二维码照片</span>
                <input type="file" accept="image/*" capture="environment" @change="handleQrImageChange" />
              </label>
            </div>
            <form class="board-qr-token-form" @submit.prevent="submitQrScan()">
              <input v-model="scanTokenInput" type="text" autocomplete="off" placeholder="扫描枪输入或粘贴 /scan/二维码地址" aria-label="二维码地址或Token" />
              <button type="submit">解析并进入维修</button>
            </form>
            <p v-if="scanInputError" class="client-board-scan-error">{{ scanInputError }}</p>
          </div>
          <p v-if="boardQrLoading">正在核验板卡信息...</p>
          <p v-else-if="boardQrError" class="client-board-scan-error">{{ boardQrError }}</p>
          <div v-if="boardQrError" class="board-scan-manual-action"><span>标签无法自动识别时，请由售后人员核验板卡编号与设备归属。</span><a href="tel:15050166844">联系人工核验</a></div>
          <template v-else-if="boardQrResult">
            <div class="board-identity-steps">
              <article><span>01</span><div><small>板卡标签</small><strong>{{ boardQrResult.boardId }}</strong><p>二维码标签已验证。</p></div></article>
              <article><span>02</span><div><small>物料信息</small><strong>{{ boardQrResult.material.name }}</strong><p>{{ boardQrResult.material.spec || boardQrResult.material.code }}</p></div></article>
              <article :class="{ pending: !boardQrResult.machine }"><span>03</span><div><small>设备关系</small><strong>{{ boardQrResult.machine ? boardQrResult.machine.modelCode : '等待设备核验' }}</strong><p>{{ boardQrResult.machine ? boardQrResult.machine.machineNo : '该板卡尚未绑定设备，需要人工确认归属。' }}</p></div></article>
              <article :class="{ pending: !boardWarrantyResult }"><span>04</span><div><small>保修结论</small><strong>{{ boardWarrantyLoading ? '正在核验保修' : boardWarrantyResult?.result || '等待人工核验' }}</strong><p>{{ boardWarrantyError || boardWarrantyResult?.suggestion || (boardQrResult.machine ? '等待保修系统返回核验结论。' : '设备未绑定，无法自动判断保修资格。') }}</p></div></article>
            </div>
            <div class="board-identity-actions"><div><span>下一步</span><strong>{{ boardQrResult.machine && boardWarrantyResult ? '以已识别的设备和板卡继续创建维修申请。' : '请先完成人工核验，再继续后续服务。' }}</strong></div><el-button v-if="boardQrResult.allowedActions?.includes('repair_new') && boardWarrantyResult" type="primary" @click="startRepairFromBoard">发起维修申请</el-button><el-button v-else @click="openWarrantyFromBoard">人工核验</el-button></div>
          </template>
          <el-button v-else @click="showClientHome">返回服务中心</el-button>
        </section>

        <section v-if="clientView === 'warranty'" class="warranty-identity-page" aria-labelledby="warranty-heading">
          <header class="warranty-identity-heading">
            <div><p>DEVICE IDENTITY</p><h1 id="warranty-heading">保修核验</h1><span>以设备型号和机床编号确认服务资格，并给出下一步处理路径。</span></div>
            <button type="button" @click="showClientHome">返回服务中心</button>
          </header>
          <div class="warranty-identity-grid">
            <section class="warranty-identity-form">
              <p>核验设备</p>
              <h2>确认设备身份</h2>
              <el-form label-position="top">
                <el-form-item label="设备型号"><el-select v-model="quickWarrantyForm.modelCode" filterable placeholder="选择型号" @change="syncQuickWarrantyModel"><el-option v-for="model in modelDictionary" :key="model.code" :label="`${model.name} (${model.code})`" :value="model.code" /></el-select></el-form-item>
                <el-form-item label="机床编号"><el-input v-model="quickWarrantyForm.machineNo" placeholder="例如 RJ-MC-2025-001" @input="quickWarrantyResult = null" /></el-form-item>
              </el-form>
              <button type="button" :disabled="warrantyCheckLoading" @click="checkQuickWarranty">{{ warrantyCheckLoading ? '正在核验' : currentUser ? '核验保修状态' : '登录后核验' }}</button>
            </section>
            <section class="warranty-identity-result" aria-live="polite">
              <template v-if="quickWarrantyResult">
                <p>核验结果</p><h2>{{ quickWarrantyResult.result }}</h2><strong>{{ quickWarrantyResult.suggestion }}</strong>
                <dl><div><dt>设备型号</dt><dd>{{ quickWarrantyForm.modelName || quickWarrantyForm.modelCode }}</dd></div><div><dt>机床编号</dt><dd>{{ quickWarrantyForm.machineNo }}</dd></div><div><dt>核验依据</dt><dd>{{ quickWarrantyResult.reasonCode || '系统档案核验' }}</dd></div><div v-if="quickWarrantyResult.deliveryDate"><dt>出库日期</dt><dd>{{ quickWarrantyResult.deliveryDate }}</dd></div><div v-if="quickWarrantyResult.warrantyEnd"><dt>保修截止</dt><dd>{{ quickWarrantyResult.warrantyEnd }}</dd></div><div v-if="quickWarrantyResult.binding"><dt>绑定关系</dt><dd>{{ [quickWarrantyResult.binding.modelName, quickWarrantyResult.binding.materialName, quickWarrantyResult.binding.positionName].filter(Boolean).join(' · ') }}</dd></div></dl>
                <div class="warranty-result-actions"><button type="button" @click="startNewRequest">发起维修申请</button><a v-if="quickWarrantyResult.requiresManualReview" href="tel:15050166844">联系人工核验</a></div>
              </template>
              <template v-else>
                <p>等待核验</p><h2>设备服务资格</h2><strong>填写设备编号后，系统会显示保修结论和建议的服务方式。</strong>
                <div class="warranty-identity-placeholder"><span>01</span><span>设备身份</span><span>02</span><span>保修结论</span><span>03</span><span>服务路径</span></div>
              </template>
            </section>
          </div>
        </section>

        <section v-if="clientView === 'request'" class="client-view-heading">
          <button type="button" title="返回服务中心" aria-label="返回服务中心" @click="showClientHome"><el-icon><House /></el-icon></button>
          <div><p class="client-kicker">NEW SERVICE REQUEST</p><h1>发起维修申请</h1><span>按照步骤逐项填写，系统会保存当前页面中的选择。</span></div>
        </section>

        <div v-if="clientView === 'request'" class="client-service-layout is-request-view">
          <section class="client-request-workspace">
          <div class="support-hero">
            <div>
              <p class="client-kicker">SERVICE REQUEST / {{ String(guideDisplayStep).padStart(2, '0') }}</p>
              <h2>{{ guideTitle }}</h2>
              <p>第 {{ guideDisplayStep }} 步，共 5 步 · 请根据设备实际情况完成当前信息。</p>
            </div>
            <el-button :icon="Refresh" @click="resetGuide">重新开始</el-button>
          </div>

        <div class="guide-steps">
          <div v-for="(step, index) in guideSteps" :key="step" :class="['guide-step', { active: guideDisplayStep === index + 1, done: guideDisplayStep > index + 1 }]">
            <span><el-icon v-if="guideDisplayStep > index + 1"><CircleCheck /></el-icon><template v-else>{{ index + 1 }}</template></span>
            <strong>{{ step }}</strong>
          </div>
        </div>

        <section v-if="guideStep === 1" class="support-section product-family-section">
          <div v-for="(group, index) in productGroups" :key="group.name" class="product-group">
            <div class="product-grid">
              <button class="product-card family-card" @click="openModelDialog(group)">
                <span class="client-request-family-media">
                  <img v-if="familyImage(group)" :src="familyImage(group)" :alt="`${group.name}机型`" />
                  <el-icon v-else><component :is="modelIcon(index)" /></el-icon>
                </span>
                <span>{{ group.name }}</span>
                <small>{{ group.items.length }} 个详细机型</small>
                <em class="family-model-preview">{{ group.items.slice(0, 4).map((item) => item.name).join(' · ') }}</em>
              </button>
            </div>
          </div>
        </section>

        <section v-if="guideStep === 2" class="support-section">
          <div class="section-title">
            <div>
              <h2>选择维修物料</h2>
              <p v-if="materialUsesFallback">该机型尚未维护专属物料清单。以下是售后通用物料，提交后由工厂审核确认实际维修对象。</p>
              <p v-else>以下为该机型配置的可维修部件，可多选；图片与说明由机型字典统一维护。</p>
            </div>
          </div>
          <div v-if="materialOptions.length" class="material-grid">
            <button v-for="material in materialOptions" :key="material.code" :class="['material-card', { selected: guideForm.selectedMaterialCodes.includes(material.code) }]" @click="toggleMaterial(material)">
              <strong>{{ material.name }}</strong>
              <span>{{ material.type }} · {{ material.spec || material.code }}</span>
            </button>
          </div>
          <div v-else class="material-empty-state"><strong>暂时没有可选物料</strong><span>请联系售后确认设备物料，或返回上一步更换机型。</span><a href="tel:15050166844">联系售后</a></div>
          <div class="inline-actions" style="margin-top: 18px">
            <el-button @click="guideStep = 1">上一步</el-button>
            <el-button type="primary" :icon="ArrowRight" :disabled="!materialOptions.length" @click="goItemDetail">下一步</el-button>
          </div>
        </section>

        <section v-if="guideStep === 3" class="support-section">
          <div class="section-title">
            <div>
              <h2>选择故障和服务方式</h2>
              <p>每个物料可单独选择故障类型、服务方式和补充描述。</p>
            </div>
          </div>
          <div class="wizard-items">
            <div v-for="item in guideForm.items" :key="item.materialCode" class="wizard-item">
              <div>
                <strong>{{ item.materialName }}</strong>
                <span>{{ item.materialType }} · {{ item.spec || item.materialCode }}</span>
                <small v-if="item.photoRequirement">V8拍照要求：{{ item.photoRequirement }}</small>
              </div>
              <div class="client-service-choice">
                <label>服务方式</label>
                <el-radio-group v-model="item.serviceType">
                  <el-radio-button value="维修">维修</el-radio-button>
                  <el-radio-button value="直接替换">直接替换</el-radio-button>
                  <el-radio-button value="借用">借用</el-radio-button>
                </el-radio-group>
              </div>
              <div class="client-fault-choice">
                <label>故障类型</label>
                <div>
                  <button v-for="preset in faultPresets" :key="preset" type="button" :class="{ selected: item.faultCategory === preset }" @click="item.faultCategory = preset">
                    {{ preset }}
                  </button>
                </div>
              </div>
              <el-input v-model="item.faultPhenomenon" type="textarea" :rows="2" placeholder="可选：用自己的话补充故障现象" />
              <el-alert
                v-if="item.verification"
                :title="`${item.verification.result}：${item.verification.suggestion}`"
                :type="statusAlert(item.verification.result)"
                show-icon
                :closable="false"
              />
            </div>
          </div>
          <div class="inline-actions" style="margin-top: 18px">
            <el-button @click="guideStep = 2">上一步</el-button>
            <el-button type="primary" :icon="ArrowRight" @click="goReview">下一步，查看摘要</el-button>
          </div>
        </section>

        <section v-if="guideStep === 4" class="support-section client-review-step">
          <RepairSelectionSummary
            :model-name="guideForm.modelName"
            :model-code="guideForm.modelCode"
            :warranty-scope="guideForm.warrantyScope"
            :items="guideForm.items"
            editable
            @edit-model="guideStep = 1"
            @edit-materials="guideStep = 2"
            @edit-issues="guideStep = 3"
          />
          <el-alert v-if="!currentUser" type="info" :closable="false" show-icon title="登录后继续核验机床、零件编号和联系信息，当前选择不会丢失。" />
          <div class="inline-actions">
            <el-button @click="guideStep = 3">上一步</el-button>
            <el-button type="primary" :icon="ArrowRight" @click="continueFromReview">{{ currentUser ? '继续核验设备' : '登录并继续' }}</el-button>
          </div>
        </section>

        <section v-if="guideStep === 5" class="support-section narrow client-verification-step">
          <div v-if="guideForm.warrantyScope === 'in'" class="client-machine-verification">
            <h3>核验机床与零件编号</h3>
            <p class="muted">保修期内申请需要根据机床编号、零件编号和绑定关系进行核验。</p>
            <div class="machine-check">
              <el-input v-model="guideForm.machineNo" placeholder="请输入机床编号，例如 RJ-MC-2025-001" clearable @input="warrantyResult = null" />
              <el-button type="primary" :icon="Search" @click="verifyMachine">核验设备</el-button>
            </div>
            <div class="client-part-verification-list">
              <div v-for="item in guideForm.items" :key="item.materialCode">
                <div><strong>{{ item.materialName }}</strong><span>{{ item.serviceType }} · {{ item.spec || item.materialCode }}</span></div>
                <el-input v-model="item.boardNo" :placeholder="boardNoPlaceholder(item)" @input="item.verification = null" />
                <el-alert
                  v-if="item.verification"
                  :title="`${item.verification.result}：${item.verification.suggestion}`"
                  :type="statusAlert(item.verification.result)"
                  show-icon
                  :closable="false"
                />
              </div>
            </div>
            <el-alert v-if="warrantyResult" :title="`${warrantyResult.result}：${warrantyResult.suggestion}`" :type="statusAlert(warrantyResult.result)" show-icon :closable="false" />
          </div>
          <div class="client-contact-heading">
            <h3>联系和寄修信息</h3>
            <p class="muted">账号资料自动带入，只需补充本次客户与物流信息。</p>
          </div>
          <el-alert
            v-if="currentVerificationIssues.length"
            type="warning"
            show-icon
            :closable="false"
            title="存在编号或基础资料异常，申请仍可提交，工厂审核人员会决定是否要求补充照片。"
          />
          <el-form label-position="top">
            <div class="form-row">
              <el-form-item label="代理商"><el-input v-model="guideForm.agent" disabled /></el-form-item>
              <el-form-item label="客户名称"><el-input v-model="guideForm.customerName" /></el-form-item>
              <el-form-item label="联系人"><el-input v-model="guideForm.contact" disabled /></el-form-item>
              <el-form-item label="联系电话"><el-input v-model="guideForm.phone" disabled /></el-form-item>
              <el-form-item label="寄出物流公司"><el-input v-model="guideForm.outboundExpressCompany" /></el-form-item>
              <el-form-item label="寄出物流单号"><el-input v-model="guideForm.outboundTrackingNo" /></el-form-item>
            </div>
            <el-form-item label="地址"><el-input v-model="guideForm.address" disabled /></el-form-item>
            <el-form-item label="整体故障描述"><el-input v-model="guideForm.faultDescription" type="textarea" :rows="4" /></el-form-item>
          </el-form>
          <div class="inline-actions">
            <el-button @click="guideStep = 4">上一步</el-button>
            <el-button type="primary" :icon="CircleCheck" :loading="submitLoading" @click="submitGuideRequest">提交维修申请</el-button>
          </div>
        </section>
        <RepairSelectionSummary
          v-if="guideStep > 1 && guideStep !== 4"
          :model-name="guideForm.modelName"
          :model-code="guideForm.modelCode"
          :warranty-scope="guideForm.warrantyScope"
          :items="guideForm.items"
          compact
        />
        </section>
        </div>

        <template v-if="clientView === 'home' && currentUser">
          <div class="client-member-content legacy-client-member-content">
            <section class="client-active-services">
              <div class="client-member-section-head">
                <div><p class="client-kicker">RECENT SERVICE</p><h2>最近服务</h2><span>聚焦当前设备的审核、维修和寄回状态。</span></div>
                <button type="button" title="刷新服务状态" aria-label="刷新服务状态" @click="loadClientData"><el-icon><Refresh /></el-icon></button>
              </div>
              <div v-if="recentRequests.length" class="client-member-request-list">
                <button
                  v-for="(request, index) in recentRequests"
                  :key="request.requestNo"
                  type="button"
                  :class="['client-service-ticket', `is-${statusTag(request.status)}`, { 'is-featured': index === 0 }]"
                  @click="showMyRequests"
                >
                  <div class="client-service-ticket-head">
                    <small>{{ request.requestNo }}</small>
                    <el-tag size="small" :type="statusTag(request.status)">{{ request.status }}</el-tag>
                  </div>
                  <div class="client-service-ticket-body">
                    <strong>{{ request.customerName || '未填写客户' }}</strong>
                    <span>{{ request.machineNo || '未填写机床编号' }}</span>
                  </div>
                  <div class="client-service-ticket-foot">
                    <div class="client-ticket-progress" aria-hidden="true">
                      <span v-for="index in 6" :key="index" :class="{ active: progressActive(request.status) >= index }"></span>
                    </div>
                    <time>{{ request.updatedAt || request.createdAt || '' }}</time>
                    <el-icon><ArrowRight /></el-icon>
                  </div>
                </button>
              </div>
              <div v-else class="client-member-empty">
                <span><el-icon><Document /></el-icon></span>
                <div><strong>还没有维修记录</strong><p>首个申请提交后，服务进度会显示在这里。</p></div>
              </div>
            </section>

            <aside class="client-support-tools">
              <div class="client-member-section-head">
                <div><p class="client-kicker">SUPPORT TOOLS</p><h2>服务工具</h2></div>
              </div>
              <div class="client-tool-list">
                <button type="button" @click="openWarrantyEntry">
                  <span class="is-yellow"><el-icon><CircleCheck /></el-icon></span>
                  <div><strong>保修状态核验</strong><small>按机型和机床编号核对保修信息</small></div>
                  <el-icon><ArrowRight /></el-icon>
                </button>
                <button type="button" @click="serviceGuideDialog = true">
                  <span class="is-graphite"><el-icon><Service /></el-icon></span>
                  <div><strong>寄修与服务流程</strong><small>了解审核、寄出、维修和寄回节点</small></div>
                  <el-icon><ArrowRight /></el-icon>
                </button>
                <button type="button" @click="openFaqAssistant">
                  <span class="is-yellow"><el-icon><Service /></el-icon></span>
                  <div><strong>AI 服务问答</strong><small>确认资料与下一步办理路径</small></div>
                  <el-icon><ArrowRight /></el-icon>
                </button>
              </div>
              <div class="client-support-contact">
                <span><el-icon><Service /></el-icon></span>
                <div><small>AFTER-SALES SUPPORT</small><strong>需要人工协助？</strong><p>联系工厂售后管理员处理账号、资料与进度问题。</p></div>
              </div>
            </aside>
          </div>

          <section class="client-process-band legacy-client-member-content">
            <div class="client-process-band-heading"><p class="client-kicker">SERVICE JOURNEY</p><h2>从申请到寄回</h2></div>
            <div class="client-process-band-list">
              <div><em>01</em><span><strong>选择设备</strong><small>确认机型与物料</small></span></div>
              <div><em>02</em><span><strong>核验提交</strong><small>核对编号与保修</small></span></div>
              <div><em>03</em><span><strong>工厂维修</strong><small>审核、检测与处理</small></span></div>
              <div><em>04</em><span><strong>寄回完成</strong><small>查看物流与结果</small></span></div>
            </div>
          </section>
        </template>

        <ServiceTimeline
          v-if="clientView === 'orders'"
          :requests="myRequests"
          :status-tag="statusTag"
          @refresh="loadClientData"
          @supplement="openSupplement"
        />
      </div>
    </main>

    <footer class="repair-site-footer">
      <div class="repair-site-footer-brand">
        <img :src="brandLogo" alt="瑞钧智科" />
        <p>瑞钧智科售后服务中心</p>
        <span>为设备维修、保修核验与服务进度提供在线入口。</span>
      </div>
      <div class="repair-site-footer-links">
        <strong>维修服务</strong>
        <button type="button" @click="startNewRequest">发起维修申请</button>
        <button type="button" @click="showMyRequests">查询维修进度</button>
        <button type="button" @click="openWarrantyEntry">保修状态核验</button>
      </div>
      <div class="repair-site-footer-links">
        <strong>技术支持</strong>
        <a :href="officialServiceUrl">服务支持</a>
        <a :href="officialSiteUrl">返回瑞钧官网</a>
        <button type="button" @click="openFaqAssistant">智能服务问答</button>
      </div>
      <div class="repair-site-footer-contact">
        <span>售后服务热线</span>
        <a href="tel:15050166844">150 5016 6844</a>
        <small>工作日 08:30 - 17:30</small>
      </div>
    </footer>

    <el-dialog v-model="faqDialog" width="560px" title="AI 服务问答" append-to-body>
      <p class="client-dialog-intro">描述设备、保修或维修进度问题。未解决时仍可直接提交维修申请。</p>
      <el-input v-model="faqQuestion" type="textarea" :rows="3" maxlength="300" show-word-limit placeholder="例如：如何核验设备保修状态？" @keyup.ctrl.enter="submitFaqQuestion" />
      <div style="display: flex; justify-content: flex-end; margin-top: 14px;"><el-button type="primary" :loading="faqLoading" @click="submitFaqQuestion">发送问题</el-button></div>
      <div v-if="faqAnswer" class="client-service-guide-content" style="margin-top: 18px; grid-template-columns: 1fr;">
        <div><strong>{{ faqAnswer.title }}</strong><p>{{ faqAnswer.answer }}</p><p v-if="faqAnswer.note">{{ faqAnswer.note }}</p><ol v-if="faqAnswer.steps?.length"><li v-for="step in faqAnswer.steps" :key="step">{{ step }}</li></ol><p v-for="citation in faqCitations" :key="`${citation.title}-${citation.version}`" class="muted">参考：{{ citation.title }}<template v-if="citation.version">（{{ citation.version }}）</template></p><div v-if="faqRequestId && useFaqBff" class="inline-actions"><el-button size="small" @click="sendFaqFeedback(true)">有帮助</el-button><el-button size="small" @click="sendFaqFeedback(false)">需要人工协助</el-button></div></div>
      </div>
      <template #footer><el-button @click="faqDialog = false">稍后处理</el-button><el-button type="primary" @click="faqDialog = false; startNewRequest()">提交维修申请</el-button></template>
    </el-dialog>

    <el-dialog v-model="serviceGuideDialog" width="720px" class="client-service-guide-dialog" title="服务流程与寄修" append-to-body>
      <div class="client-service-guide-content">
        <div><em>01</em><strong>选择机型与故障</strong><p>先浏览机型、维修物料和故障类型，无需登录。</p></div>
        <div><em>02</em><strong>登录并核验设备</strong><p>登录后核验机床编号、零件编号、绑定关系和保修状态。</p></div>
        <div><em>03</em><strong>工厂审核维修</strong><p>工厂审核资料，生成工单并完成检测和维修。</p></div>
        <div><em>04</em><strong>寄回与归档</strong><p>在“我的申请”中查看寄回物流和最终维修结果。</p></div>
      </div>
      <el-alert type="info" :closable="false" show-icon title="寄出物流公司和单号可在提交申请前补充。" />
    </el-dialog>

    <el-dialog v-model="warrantyDialog" width="520px" class="client-warranty-dialog" title="保修状态核验" append-to-body>
      <p class="client-dialog-intro">选择具体机型并填写机床编号，系统将根据设备档案返回保修状态。</p>
      <el-form label-position="top">
        <el-form-item label="机型">
          <el-select v-model="quickWarrantyForm.modelCode" filterable style="width: 100%" @change="syncQuickWarrantyModel">
            <el-option v-for="model in modelDictionary" :key="model.id" :label="`${model.series} · ${model.name}`" :value="model.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="机床编号">
          <el-input v-model="quickWarrantyForm.machineNo" placeholder="例如 RJ-MC-2025-001" clearable @input="quickWarrantyResult = null" />
        </el-form-item>
        <el-alert
          v-if="quickWarrantyResult"
          :title="`${quickWarrantyResult.result}：${quickWarrantyResult.suggestion}`"
          :type="statusAlert(quickWarrantyResult.result)"
          show-icon
          :closable="false"
        />
        <el-button type="primary" size="large" :loading="warrantyCheckLoading" @click="checkQuickWarranty">
          {{ currentUser ? '核验保修状态' : '登录后核验' }}
        </el-button>
      </el-form>
    </el-dialog>

    <el-dialog v-model="authDialog" width="480px" class="client-auth-dialog" :show-close="true" append-to-body @closed="handleAuthClosed">
      <div class="auth-card auth-dialog-body">
        <div class="auth-card-heading">
          <span class="client-auth-mark"><el-icon><User /></el-icon></span>
          <div>
            <h3>{{ authMode === 'register' ? '创建客户账号' : '登录后继续' }}</h3>
            <p>{{ authMode === 'register' ? '提交后等待工厂审核' : (authPrompt || '登录客户服务门户') }}</p>
          </div>
        </div>
        <el-radio-group v-model="authMode" class="auth-mode">
          <el-radio-button value="login">登录</el-radio-button>
          <el-radio-button value="register">注册</el-radio-button>
        </el-radio-group>
        <el-form label-position="top">
          <el-form-item label="账号"><el-input v-model="authForm.username" autocomplete="username" /></el-form-item>
          <el-form-item label="密码"><el-input v-model="authForm.password" type="password" show-password :autocomplete="authMode === 'register' ? 'new-password' : 'current-password'" /></el-form-item>
          <template v-if="authMode === 'register'">
            <el-form-item label="账号名称"><el-input v-model="authForm.name" placeholder="例如：上海瑞景售后" /></el-form-item>
            <el-form-item label="代理商"><el-input v-model="authForm.agent" placeholder="注册后会自动带入维修申请" /></el-form-item>
            <div class="form-row compact">
              <el-form-item label="联系人"><el-input v-model="authForm.contact" /></el-form-item>
              <el-form-item label="联系电话"><el-input v-model="authForm.phone" /></el-form-item>
            </div>
            <el-form-item label="地址"><el-input v-model="authForm.address" /></el-form-item>
          </template>
          <el-button type="primary" size="large" :loading="authLoading" @click="submitAuth">{{ authMode === 'register' ? '提交注册申请' : '登录并继续' }}</el-button>
        </el-form>
        <p class="auth-help"><el-icon><Phone /></el-icon> 登录状态将安全保存在浏览器 Cookie 中</p>
      </div>
    </el-dialog>

    <el-dialog v-model="modelDialog" width="880px" class="model-dialog" :show-close="false">
      <button class="dialog-close" @click="modelDialog = false"><el-icon><Close /></el-icon></button>
      <div class="model-picker">
        <div class="model-visual">
          <el-icon><Monitor /></el-icon>
          <strong>{{ selectedFamily?.name }}</strong>
        </div>
        <div class="model-options">
          <h2>{{ selectedFamily?.name }}</h2>
          <label>选择详细机型</label>
          <el-select v-model="guideForm.modelCode" size="large" filterable style="width: 100%">
            <el-option v-for="model in selectedFamilyModels" :key="`${model.source}-${model.id}`" :label="model.name" :value="model.code" @click="guideForm.modelName = model.name" />
          </el-select>
          <label>选择保修状态</label>
          <el-radio-group v-model="guideForm.warrantyScope" class="warranty-radio">
            <el-radio-button value="in">保修期内</el-radio-button>
            <el-radio-button value="out">不在保修期内</el-radio-button>
          </el-radio-group>
          <div class="dialog-divider"></div>
          <el-button type="primary" size="large" @click="confirmModel">下一步，选择需要的服务</el-button>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="successDialog" width="520px" title="提交成功">
      <div v-if="submittedRequest" class="success-body">
        <el-icon><CircleCheck /></el-icon>
        <h3>维修申请已提交</h3>
        <p>申请单号：<strong>{{ submittedRequest.requestNo }}</strong></p>
        <p class="muted">后续工厂审核、维修、寄回和归档状态会显示在首页“我的申请”。</p>
      </div>
      <template #footer>
        <el-button @click="successDialog = false">关闭</el-button>
        <el-button type="primary" @click="successDialog = false; showMyRequests()">查看我的申请</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="supplementDialog" width="640px" title="补充编号核对照片">
      <el-alert type="warning" :closable="false" show-icon title="请分别拍清楚机床铭牌和送修零件编号，照片中的完整编号需要可辨认。" />
      <div class="verification-upload-grid">
        <div class="verification-upload-item">
          <strong>机床铭牌照片</strong>
          <el-image v-if="photoByCategory('machine_nameplate')" :src="photoByCategory('machine_nameplate').dataUrl" fit="cover" />
          <el-upload :auto-upload="false" :show-file-list="false" accept="image/jpeg,image/png,image/webp" :on-change="(file) => addSupplementPhoto(file, 'machine_nameplate')">
            <el-button :icon="UploadFilled">选择照片</el-button>
          </el-upload>
        </div>
        <div class="verification-upload-item">
          <strong>零件编号照片</strong>
          <el-image v-if="photoByCategory('component_serial')" :src="photoByCategory('component_serial').dataUrl" fit="cover" />
          <el-upload :auto-upload="false" :show-file-list="false" accept="image/jpeg,image/png,image/webp" :on-change="(file) => addSupplementPhoto(file, 'component_serial')">
            <el-button :icon="UploadFilled">选择照片</el-button>
          </el-upload>
        </div>
      </div>
      <template #footer>
        <el-button @click="supplementDialog = false">取消</el-button>
        <el-button type="primary" :loading="supplementLoading" @click="submitSupplement">提交补充资料</el-button>
      </template>
    </el-dialog>
  </div>
</template>
