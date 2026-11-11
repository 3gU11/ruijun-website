type CmsPreviewPayload = {
  collection: string;
  itemId: string;
  preview: Record<string, any>;
  target?: { path: string; hash?: string; label?: string; selector?: string };
};

import { acceptCmsLivePreviewCommand, acceptCmsLivePreviewMediaReplaceMessage, acceptCmsLivePreviewMessage, applyCmsLivePreviewMediaElement, CMS_LIVE_PREVIEW_COMMAND, CMS_LIVE_PREVIEW_EXPIRED, CMS_LIVE_PREVIEW_MEDIA_REPLACE as CMS_LIVE_PREVIEW_MEDIA_REPLACE_MESSAGE, CMS_LIVE_PREVIEW_PAGE_ACTION, CMS_LIVE_PREVIEW_REQUEST_UPDATE, CMS_LIVE_PREVIEW_SESSION_MISSING, CMS_LIVE_PREVIEW_READY, CMS_LIVE_PREVIEW_EDIT_REQUEST, CMS_LIVE_PREVIEW_EDIT_COMMIT, CMS_LIVE_PREVIEW_READONLY, cmsPageActionFor, cmsPreviewScrollOptions, cmsPreviewSectionSelector, cmsPreviewStatusLabel, createCmsVisualEditRequest, isCmsLivePreviewSessionExpired, makeCmsPreviewRecordRenderable, normalizeCmsLivePreviewOrigins, resolveCmsLivePreviewParentOrigin, resolveCmsVisualElementBinding, resolveCmsVisualRootBinding } from '~/utils/cms-live-preview.mjs';

const CMS_LIVE_PREVIEW_MEDIA_REPLACE = 'ruijun:cms-preview:media-replace';
const visualBindingAttributes = ['data-cms-preview-collection', 'data-cms-preview-item-id'];

const naturalKeys: Record<string, string[]> = {
  pages: ['slug'], articles: ['slug'], product_series: ['series_code', 'slug'], product_models: ['model_code', 'slug'],
  homepage_sections: ['page_key', 'section_key', 'language'],
  product_parameters: ['model_code', 'field_name'], case_studies: ['slug'], manufacturing_evidence: ['source_key'],
  qualifications: ['source_key'], milestones: ['source_key'], service_resources: ['source_key'], service_locations: ['source_key'],
  knowledge_items: ['source_key'], external_service_entries: ['entry_type'], repair_page_configs: ['page_key'], site_settings: ['setting_key']
};

type CmsVisualRuntimeOwner = {
  receiveLivePreview: (event: MessageEvent) => void;
  handleVisualClick: (event: MouseEvent) => void;
  handleVisualDoubleClick: (event: MouseEvent) => void;
  handleVisualPointerDown: (event: PointerEvent) => void;
  handleVisualPointerUp: (event: PointerEvent) => void;
  start: () => void;
  stop: () => void;
  clearDomState: () => void;
};

const visualRuntimeOwners = new Set<CmsVisualRuntimeOwner>();
let activeVisualRuntimeOwner: CmsVisualRuntimeOwner | null = null;
let visualRuntimeBridgeInstalled = false;

function dispatchVisualMessage(event: MessageEvent) { activeVisualRuntimeOwner?.receiveLivePreview(event); }
function dispatchVisualClick(event: MouseEvent) { activeVisualRuntimeOwner?.handleVisualClick(event); }
function dispatchVisualDoubleClick(event: MouseEvent) { activeVisualRuntimeOwner?.handleVisualDoubleClick(event); }
function dispatchVisualPointerDown(event: PointerEvent) { activeVisualRuntimeOwner?.handleVisualPointerDown(event); }
function dispatchVisualPointerUp(event: PointerEvent) { activeVisualRuntimeOwner?.handleVisualPointerUp(event); }

function installVisualRuntimeBridge() {
  if (visualRuntimeBridgeInstalled) return;
  visualRuntimeBridgeInstalled = true;
  window.addEventListener('message', dispatchVisualMessage);
  document.addEventListener('click', dispatchVisualClick, true);
  document.addEventListener('dblclick', dispatchVisualDoubleClick, true);
  document.addEventListener('pointerdown', dispatchVisualPointerDown, true);
  document.addEventListener('pointerup', dispatchVisualPointerUp, true);
}

function uninstallVisualRuntimeBridge() {
  if (!visualRuntimeBridgeInstalled) return;
  visualRuntimeBridgeInstalled = false;
  window.removeEventListener('message', dispatchVisualMessage);
  document.removeEventListener('click', dispatchVisualClick, true);
  document.removeEventListener('dblclick', dispatchVisualDoubleClick, true);
  document.removeEventListener('pointerdown', dispatchVisualPointerDown, true);
  document.removeEventListener('pointerup', dispatchVisualPointerUp, true);
}

function activateVisualRuntimeOwner(owner: CmsVisualRuntimeOwner | null) {
  if (activeVisualRuntimeOwner === owner) return;
  activeVisualRuntimeOwner?.stop();
  activeVisualRuntimeOwner = owner;
  activeVisualRuntimeOwner?.start();
}

function registerVisualRuntimeOwner(owner: CmsVisualRuntimeOwner) {
  visualRuntimeOwners.add(owner);
  installVisualRuntimeBridge();
  activateVisualRuntimeOwner(owner);
}

function unregisterVisualRuntimeOwner(owner: CmsVisualRuntimeOwner) {
  visualRuntimeOwners.delete(owner);
  if (activeVisualRuntimeOwner !== owner) return;
  const nextOwner = [...visualRuntimeOwners].at(-1) || null;
  activateVisualRuntimeOwner(nextOwner);
  if (nextOwner) return;
  owner.clearDomState();
  uninstallVisualRuntimeBridge();
}

function sameRecord(collection: string, left: Record<string, any>, right: Record<string, any>) {
  if (left?.id != null && right?.id != null) return String(left.id) === String(right.id);
  const keys = naturalKeys[collection] || [];
  const comparable = keys.filter((key) => left?.[key] != null && right?.[key] != null);
  return comparable.length > 0 && comparable.every((key) => String(left[key]) === String(right[key]));
}

export function useCmsDraftPreview() {
  const route = useRoute();
  const config = useRuntimeConfig();
  const enabled = computed(() => String(route.query.cmsPreview || '') === '1');
  const { data, error } = useFetch<{ data: CmsPreviewPayload; expires_at: string }>('/api/preview/session', {
    key: 'cms-draft-preview-session',
    immediate: enabled.value,
    default: () => ({ data: null as unknown as CmsPreviewPayload, expires_at: '' })
  });
  const session = computed(() => enabled.value ? data.value?.data || null : null);
  const liveRecord = useState<Record<string, any> | null>('cms-live-preview-record', () => null);
  const liveRelatedRecords = useState<Record<string, Record<string, any>>>('cms-live-preview-related-records', () => ({}));
  const livePreviewIdentity = useState<{ collection: string; itemId: string } | null>('cms-live-preview-identity', () => null);
  const liveConnected = useState<boolean>('cms-live-preview-connected', () => false);
  const visualEditMode = useState<boolean>('cms-visual-edit-mode', () => false);
  const visualTool = useState<string>('cms-visual-edit-tool', () => 'select');
  const visualDevice = useState<string>('cms-visual-device', () => 'desktop');
  const visualMediaReplacement = useState<Record<string, string> | null>('cms-visual-media-replacement', () => null);
  function currentPreviewRecord(collection?: string) {
    if (!session.value?.preview) return null;
    if (collection && session.value.collection !== collection) {
      const related = session.value.preview.related?.[collection];
      if (!Array.isArray(related) || !related.length) return null;
      const first = related[0] || null;
      const live = first?.id != null ? liveRelatedRecords.value[`${collection}:${String(first.id)}`] : null;
      return first ? { ...first, ...(live || {}) } : null;
    }
    return makeCmsPreviewRecordRenderable({ ...session.value.preview, ...(liveRecord.value || {}) });
  }
  function currentPreviewRecords(collection: string) {
    if (!session.value?.preview) return [];
    const related = session.value.preview.related?.[collection];
    const relatedRecords = Array.isArray(related) ? related.filter((item) => item && typeof item === 'object').map((item) => ({
      ...item,
      ...(item.id != null ? liveRelatedRecords.value[`${collection}:${String(item.id)}`] || {} : {})
    })) : [];
    // 列表里编辑的可能是已发布记录：它不在 session.related（那里只有草稿），
    // 但工作台会把它作为 live related record 推过来。不合并的话，画布上
    // 已发布卡片的修改（例如换视频）永远不显示。
    const records = [...relatedRecords];
    for (const [key, live] of Object.entries(liveRelatedRecords.value)) {
      if (!key.startsWith(`${collection}:`) || !live || typeof live !== 'object') continue;
      // 防御错配：liveRelatedRecords 的键必须与记录 id 一致，否则宁可丢弃，
      // 也不能把某张卡片的快照合并到另一条记录上。
      if (live.id != null && key !== `${collection}:${String(live.id)}`) continue;
      const index = records.findIndex((item) => sameRecord(collection, item, live));
      if (index >= 0) records[index] = { ...records[index], ...live };
      else records.push(live);
    }
    if (session.value.collection !== collection) return records;
    const primary = makeCmsPreviewRecordRenderable({ ...session.value.preview, ...(liveRecord.value || {}) });
    const primaryIndex = records.findIndex((item) => sameRecord(collection, item, primary));
    if (primaryIndex < 0) return [primary, ...records];
    return records.map((item, index) => index === primaryIndex ? { ...item, ...primary } : item);
  }
  const record = computed(() => currentPreviewRecord());
  const livePreviewRecord = computed(() => {
    const identity = livePreviewIdentity.value;
    if (!identity?.collection || !identity.itemId) return record.value;
    if (identity.collection === String(session.value?.collection || '') && identity.itemId === String(session.value?.itemId || '')) return record.value;
    return liveRelatedRecords.value[`${identity.collection}:${identity.itemId}`] || record.value;
  });
  const livePreviewLabel = computed(() => cmsPreviewStatusLabel({
    collection: livePreviewIdentity.value?.collection || session.value?.collection || '',
    record: livePreviewRecord.value,
    fallbackLabel: session.value?.target?.label || '当前草稿'
  }));

  const allowedOrigins = String(config.public.cmsPreviewOrigins || config.public.cmsPreviewOrigin || '');
  let targetRetryTimer: number | undefined;
  let targetRetryCount = 0;
  let livePreviewSelector = '';
  let locallySelectedSectionKey = '';
  const desktopVisualEditingAvailable = () => visualDevice.value === 'desktop';
  function scrollToPreviewTarget() {
    const selector = livePreviewSelector || String(session.value?.target?.selector || '').trim();
    if (!selector) return true;
    let target: HTMLElement | null = null;
    try {
      target = document.querySelector<HTMLElement>(selector);
    } catch {
      return true;
    }
    if (!target) {
      if (targetRetryCount >= 60) return true;
      targetRetryCount += 1;
      targetRetryTimer = window.setTimeout(scrollToPreviewTarget, 150);
      return false;
    }
    document.documentElement.dataset.cmsPreviewTarget = selector;
    document.querySelectorAll<HTMLElement>('[data-cms-preview-focus="true"]').forEach((element) => element.removeAttribute('data-cms-preview-focus'));
    target.setAttribute('data-cms-preview-focus', 'true');
    window.dispatchEvent(new CustomEvent('ruijun:cms-preview-target', { detail: { selector } }));
    const aboutPanel = target.closest<HTMLElement>('[data-about-panel]');
    if (aboutPanel) {
      document.documentElement.dataset.aboutPanelJump = 'true';
      window.dispatchEvent(new CustomEvent('about-panel-jump', { detail: { panel: aboutPanel } }));
      target.scrollIntoView(cmsPreviewScrollOptions({ visualEditMode: visualEditMode.value }));
      window.setTimeout(() => delete document.documentElement.dataset.aboutPanelJump, 950);
      return true;
    }
    if (target.closest('.lifecycle-panel') && window.matchMedia('(min-width: 901px) and (prefers-reduced-motion: no-preference)').matches) {
      return true;
    }
    target.scrollIntoView(cmsPreviewScrollOptions({ visualEditMode: visualEditMode.value }));
    return true;
  }

  function requestPreviewTarget(selector: string) {
    if (!selector) return;
    livePreviewSelector = selector;
    const targetKey = selector.match(/^\[data-cms-preview-key="([A-Za-z0-9_-]+)"\]$/)?.[1] || '';
    if (targetKey) document.documentElement.dataset.cmsPreviewTargetKey = targetKey;
    else delete document.documentElement.dataset.cmsPreviewTargetKey;
    targetRetryCount = 0;
    if (targetRetryTimer) window.clearTimeout(targetRetryTimer);
    nextTick(scrollToPreviewTarget);
  }

  function applyPreviewCommand(command: { command: string; sectionKey: string; fieldPath: string; mode: string }) {
    if (command.command !== 'align') return;
    let section: HTMLElement | null = null;
    try { section = document.querySelector<HTMLElement>(cmsPreviewSectionSelector(command.sectionKey)); } catch { return; }
    if (!section) return;
    let element: HTMLElement | null = null;
    try {
      element = section.querySelector<HTMLElement>(`[data-cms-preview-field-path="${CSS.escape(command.fieldPath)}"]`);
    } catch { return; }
    if (!element) return;
    element.dataset.cmsPreviewAlign = command.mode;
    element.style.textAlign = command.mode;
    if (element.matches('img,video')) element.style.alignSelf = command.mode === 'left' ? 'flex-start' : command.mode === 'right' ? 'flex-end' : 'center';
  }

  function applyPreviewMediaReplacement(replacement: { sectionKey: string; fieldPath: string; mediaUrl?: string; mediaAssetId: string; mediaRole: string }) {
    if (!replacement?.mediaUrl) return false;
    let section: HTMLElement | null = null;
    try { section = document.querySelector<HTMLElement>(cmsPreviewSectionSelector(replacement.sectionKey)); } catch { return false; }
    if (!section) return false;
    let element: HTMLElement | null = null;
    try {
      element = section.querySelector<HTMLElement>(`[data-cms-preview-field-path="${CSS.escape(replacement.fieldPath)}"], [data-cms-preview-field="${CSS.escape(replacement.fieldPath)}"]`);
    } catch { return false; }
    if (!element) return false;
    return applyCmsLivePreviewMediaElement(element, replacement);
  }

  function reportExpiredLivePreviewSession(event: MessageEvent, previewSession: Record<string, any> | null) {
    if (event.data?.type !== CMS_LIVE_PREVIEW_UPDATE || !previewSession || !isCmsLivePreviewSessionExpired(previewSession)) return false;
    if (!normalizeCmsLivePreviewOrigins(allowedOrigins).includes(event.origin) || event.source !== window.parent) return false;
    window.parent?.postMessage({ type: CMS_LIVE_PREVIEW_EXPIRED }, event.origin);
    return true;
  }

  let liveCoverReceiveSequence = 0;
  // The workbench re-opens the canvas after switching to the block that owns a
  // clicked element. It asks for that exact field once the frame is ready, so
  // the operator does not have to find the same word twice.
  const FOCUS_FIELD_MESSAGE = 'ruijun:cms-preview:focus-field';
  function focusPreviewField(event: MessageEvent) {
    const data = event?.data;
    if (data?.type !== FOCUS_FIELD_MESSAGE) return false;
    if (event.source !== window.parent) return false;
    const allowed = normalizeCmsLivePreviewOrigins(allowedOrigins);
    if (!allowed.includes(event.origin)) return false;
    const sectionKey = String(data.sectionKey || '').trim();
    const fieldPath = String(data.fieldPath || '').trim();
    if (!/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(sectionKey) || !fieldPath) return false;
    const root = document.querySelector<HTMLElement>(cmsPreviewSectionSelector(sectionKey));
    const target = root
      ? [...root.querySelectorAll<HTMLElement>('[data-cms-preview-field-path]')]
        .find((element) => element.dataset.cmsPreviewFieldPath === fieldPath
          && element.dataset.cmsPreviewEditable === 'true')
      : null;
    if (!target) return false;
    target.scrollIntoView(cmsPreviewScrollOptions({ visualEditMode: true }));
    requestVisualSelection({ element: target, sectionKey }, new MouseEvent('click'));
    return true;
  }

  const receiveLivePreview = async (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      if (focusPreviewField(event)) { liveConnected.value = true; return; }
      const previewSession = session.value ? { ...session.value, expiresAt: data.value?.expires_at } : null;
      if (reportExpiredLivePreviewSession(event, previewSession)) return;
      const command = acceptCmsLivePreviewCommand({
        event,
        allowedOrigin: allowedOrigins,
        session: previewSession,
        parentWindow: window.parent
      });
      if (command) {
        applyPreviewCommand(command);
        liveConnected.value = true;
        return;
      }
      const mediaReplacement = acceptCmsLivePreviewMediaReplaceMessage({
        event,
        allowedOrigin: allowedOrigins,
        session: previewSession,
        parentWindow: window.parent
      });
      if (mediaReplacement) {
        visualMediaReplacement.value = mediaReplacement;
        applyPreviewMediaReplacement(mediaReplacement);
        liveConnected.value = true;
        window.dispatchEvent(new CustomEvent(CMS_LIVE_PREVIEW_MEDIA_REPLACE, { detail: { ...mediaReplacement, type: CMS_LIVE_PREVIEW_MEDIA_REPLACE_MESSAGE } }));
        return;
      }
      const preview = acceptCmsLivePreviewMessage({
        event,
        allowedOrigin: allowedOrigins,
        session: previewSession
      });
      if (!preview) return;
      const sequence = ++liveCoverReceiveSequence;
      const grants = Array.isArray(event.data?.mediaGrants) ? event.data.mediaGrants : event.data?.mediaGrant ? [event.data.mediaGrant] : [];
      if (grants.length) {
        try {
          for (const token of grants) {
            await $fetch('/api/preview/media-grant', { method: 'POST', body: { token, collection: event.data.collection, itemId: String(event.data.itemId) } });
          }
        } catch { liveConnected.value = false; return; }
        if (sequence !== liveCoverReceiveSequence) return;
      }
      if (String(event.data?.collection || '') === String(session.value?.collection || '')) {
        liveRecord.value = preview;
      } else {
        const key = `${String(event.data?.collection || '')}:${String(event.data?.itemId || '')}`;
        liveRelatedRecords.value = { ...liveRelatedRecords.value, [key]: preview };
      }
      livePreviewIdentity.value = { collection: String(event.data?.collection || ''), itemId: String(event.data?.itemId || '') };
      liveConnected.value = true;
      visualEditMode.value = event.data?.editMode === true;
      visualTool.value = ['select', 'text', 'media'].includes(String(event.data?.tool || 'select')) ? String(event.data.tool || 'select') : 'select';
      visualDevice.value = ['desktop', 'tablet', 'mobile'].includes(String(event.data?.device || 'desktop')) ? String(event.data.device || 'desktop') : 'desktop';
      document.documentElement.dataset.cmsPreviewEditMode = visualEditMode.value ? 'true' : 'false';
      document.documentElement.dataset.cmsPreviewEditTool = visualTool.value;
      nextTick(decorateVisualEditing);
      // 选中元素会以快照形式回传，每次都给 sectionKey 做 scrollIntoView 会把
      // 画布拉回区块顶部（新闻页的视频分享区块就在顶部，看起来像“回到顶部”）。
      // 滚动只由显式的 focus-field / 对齐命令负责。
      locallySelectedSectionKey = String(event.data?.sectionKey || '');
  };

  function postEditMessage(payload: Record<string, any>) {
    const origin = resolveCmsLivePreviewParentOrigin({
      ancestorOrigin: window.location.ancestorOrigins?.[0],
      referrer: document.referrer,
      allowedOrigin: allowedOrigins
    });
    if (!origin) return;
    window.parent?.postMessage({ ...payload, collection: payload.collection || session.value?.collection || '', itemId: payload.itemId || session.value?.itemId || '' }, origin);
  }

  // A canvas frame that loses its session silently turns into the public page:
  // edit markers and canvas controls disappear and a card click navigates away,
  // which also drops ?cmsPreview=1. The session store uses a 15-minute sliding
  // expiry but the page only reads it once, so an idle canvas lapses. Report the
  // state to the workbench (it re-issues a token) and ping the session while the
  // canvas stays open so it does not lapse mid-edit.
  function insidePreviewFrame() {
    return typeof window !== 'undefined' && window.parent !== window;
  }
  function reportMissingSession() {
    if (!insidePreviewFrame()) return;
    postEditMessage({ type: CMS_LIVE_PREVIEW_SESSION_MISSING });
  }
  // A framed preview is an editing surface by design. The workbench still sends
  // its mode with every update, but waiting for that first message left the page
  // inert (no markers, no action handling, clicks fell through to the public
  // page) whenever the activation message was dropped or delayed. Enable locally
  // and let an explicit workbench message override it.
  watch(session, (value) => {
    if (!value || !insidePreviewFrame()) return;
    if (document.documentElement.dataset.cmsPreviewEditMode) return;
    visualEditMode.value = true;
    document.documentElement.dataset.cmsPreviewEditMode = 'true';
    nextTick(decorateVisualEditing);
  }, { immediate: true });
  // The workbench pushes its first update when it believes the frame is ready.
  // That handshake message can be lost (origin mismatch, reload, throttling), and
  // then the canvas never activates and every edit looks ignored. Ask again until
  // an update actually arrives.
  let updateRequestTimer: number | undefined;
  let updateRequestAttempts = 0;
  function requestPreviewUpdate() {
    if (!insidePreviewFrame() || !enabled.value) return;
    if (document.documentElement.dataset.cmsPreviewEditTool) return;
    if (updateRequestAttempts >= 5) return;
    updateRequestAttempts += 1;
    postEditMessage({ type: CMS_LIVE_PREVIEW_REQUEST_UPDATE });
    updateRequestTimer = window.setTimeout(requestPreviewUpdate, 2000);
  }
  let sessionKeepAliveTimer: number | undefined;
  onMounted(() => {
    if (!insidePreviewFrame()) return;
    // The route can be a plain page even inside the canvas: the probe below still
    // tells the workbench to reopen it with a fresh token.
    if (!enabled.value || error.value) {
      reportMissingSession();
      // The workbench may not receive the probe (frame reload race). Reload once
      // ourselves: a page served with ?cmsPreview=1 re-establishes the session,
      // and a plain page is replaced by the workbench's fresh token. Without this
      // the canvas silently degrades to the public page ("老版本") with no
      // edit markers and a stale selection in the property panel.
      try {
        if (!sessionStorage.getItem('cms-preview-self-heal')) {
          sessionStorage.setItem('cms-preview-self-heal', '1');
          window.setTimeout(() => { window.location.reload(); }, 2500);
        }
      } catch { /* private mode: the probe alone has to do */ }
      return;
    }
    updateRequestTimer = window.setTimeout(requestPreviewUpdate, 1500);
    sessionKeepAliveTimer = window.setInterval(() => {
      $fetch('/api/preview/session').catch(() => {
        if (sessionKeepAliveTimer) window.clearInterval(sessionKeepAliveTimer);
        sessionKeepAliveTimer = undefined;
        reportMissingSession();
      });
    }, 5 * 60 * 1000);
  });
  watch(error, (value) => { if (value) reportMissingSession(); });
  onBeforeUnmount(() => {
    if (sessionKeepAliveTimer) window.clearInterval(sessionKeepAliveTimer);
    sessionKeepAliveTimer = undefined;
    if (updateRequestTimer) window.clearTimeout(updateRequestTimer);
    updateRequestTimer = undefined;
  });

  function visualElementMeta(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    const fontSize = Number.parseFloat(computedStyle.fontSize) || 16;
    const computedLineHeight = Number.parseFloat(computedStyle.lineHeight);
    const rgb = String(computedStyle.color || '').match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    const toHex = (value: string) => Number(value).toString(16).padStart(2, '0');
    const textColor = rgb ? `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`.toUpperCase() : '#000000';
    return {
      label: String(element.dataset.cmsPreviewLabel || element.dataset.cmsPreviewFieldPath || element.dataset.cmsPreviewField || element.getAttribute('aria-label') || element.textContent || '画布元素').trim().slice(0, 80),
      elementType: element.matches('video') ? 'video' : element.dataset.cmsPreviewMediaRole ? 'image' : element.matches('button,a') ? 'button' : 'text',
      mediaRole: String(element.dataset.cmsPreviewMediaRole || ''),
      mediaSlot: String(element.dataset.cmsPreviewMediaSlot || ''),
      mediaAssetId: String(element.dataset.cmsPreviewMediaAssetId || ''),
      allowDefaultMedia: element.dataset.cmsPreviewAllowDefault === 'true',
      placementKey: String(element.dataset.cmsPreviewPlacementKey || ''),
      fieldPath: String(element.dataset.cmsPreviewFieldPath || element.dataset.cmsPreviewField || ''),
      linkFieldPath: String(element.dataset.cmsPreviewLinkFieldPath || ''),
      positionFieldPath: String(element.dataset.cmsPreviewPositionFieldPath || element.dataset.cmsPreviewFieldPath || element.dataset.cmsPreviewField || ''),
      collection: String(element.dataset.cmsPreviewCollection || session.value?.collection || ''),
      itemId: String(element.dataset.cmsPreviewItemId || session.value?.itemId || ''),
      textStyle: {
        fontSize,
        fontWeight: String(computedStyle.fontWeight || '400'),
        lineHeight: Number.isFinite(computedLineHeight) ? Math.min(2.2, Math.max(1, computedLineHeight / fontSize)) : 1.4,
        textColor
      },
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    };
  }

  function promoteUniqueVisualTextBinding(element: HTMLElement) {
    if (!element.matches('button,a,[role="button"]')) return;
    if (element.dataset.cmsPreviewFieldPath || element.dataset.cmsPreviewField || element.dataset.cmsPreviewMediaRole) return;
    const nestedBindings = [...element.querySelectorAll<HTMLElement>('[data-cms-preview-field-path], [data-cms-preview-field]')]
      .filter((child) => !child.matches('img,video'));
    if (nestedBindings.length !== 1) return;
    const fieldPath = String(nestedBindings[0].dataset.cmsPreviewFieldPath || nestedBindings[0].dataset.cmsPreviewField || '').trim();
    if (!fieldPath) return;
    element.dataset.cmsPreviewFieldPath = fieldPath;
    element.dataset.cmsPreviewField = fieldPath;
  }

  function hasBoundVisualDescendant(element: HTMLElement) {
    return [...element.querySelectorAll<HTMLElement>('[data-cms-preview-field-path], [data-cms-preview-field]')]
      .some((candidate) => Boolean(String(candidate.dataset.cmsPreviewFieldPath || candidate.dataset.cmsPreviewField || '').trim()));
  }

  function decorateVisualEditing() {
    if (!visualEditMode.value) return;
    for (const root of [...document.querySelectorAll<HTMLElement>('[data-cms-preview-key]')]) {
      const key = String(root.dataset.cmsPreviewKey || '').trim();
      if (!key) continue;
      // One canvas decorates every section at once, so a single unresolvable
      // binding must not abort the whole pass. Before this guard the failure
      // threw out of the loop and left every section after it without edit
      // markers: the canvas rendered those blocks but ignored every click,
      // which read as "the canvas is read-only, edit it in the left form".
      try {
        decorateVisualRoot(root);
      } catch (error) {
        console.warn(`[cms-preview] section "${key}" could not be decorated`, error);
      }
    }
  }

  // Page-driven canvas state changes (opening a detail panel, switching the
  // displayed model) replace DOM nodes without any update message from the
  // workbench. Re-run decoration once the DOM settles so the new elements can be
  // selected immediately instead of staying inert until the next sync.
  function refreshVisualDecorations() {
    return nextTick(decorateVisualEditing);
  }

  function decorateVisualRoot(root: HTMLElement) {
    // A page preview can contain independently editable business records
    // (for example a milestones node inside the About page). The root
    // resolver intentionally rejects a cross-record root; use the element
    // resolver for an explicit nested collection/id while keeping the same
    // strict validation for missing or malformed bindings.
    const binding = resolveCmsVisualRootBinding({ rootCollection: root.dataset.cmsPreviewCollection, rootItemId: root.dataset.cmsPreviewItemId, sessionCollection: session.value?.collection, sessionItemId: session.value?.itemId }) || resolveCmsVisualElementBinding({
      elementCollection: root.dataset.cmsPreviewCollection,
      elementItemId: root.dataset.cmsPreviewItemId,
      sessionCollection: session.value?.collection,
      sessionItemId: session.value?.itemId
    });
    if (!binding) return;
    root.setAttribute(visualBindingAttributes[0], binding.collection);
    root.setAttribute(visualBindingAttributes[1], binding.itemId);
    const candidates = [root, ...root.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6,p,b,strong,em,small,span,time,button,a,input,textarea,li,div[data-cms-preview-field-path],img,video,dt,dd,summary,[data-cms-preview-field-path],[data-cms-preview-field]')];
    for (const element of candidates) {
      const ownerRoot = element.closest<HTMLElement>('[data-cms-preview-key]') || root;
      const elementBinding = resolveCmsVisualElementBinding({
        elementCollection: element.dataset.cmsPreviewCollection,
        elementItemId: element.dataset.cmsPreviewItemId,
        rootCollection: ownerRoot.dataset.cmsPreviewCollection,
        rootItemId: ownerRoot.dataset.cmsPreviewItemId,
        sessionCollection: session.value?.collection,
        sessionItemId: session.value?.itemId
      }) || binding;
      // The element resolver and the root fallback can both come back empty
      // for a nested section root that carries no collection of its own.
      // Skipping the element keeps the rest of the section editable instead
      // of throwing on the first one.
      if (!elementBinding) continue;
      element.dataset.cmsPreviewCollection = elementBinding.collection;
      element.dataset.cmsPreviewItemId = elementBinding.itemId;
      element.setAttribute(visualBindingAttributes[0], element.dataset.cmsPreviewCollection);
      element.setAttribute(visualBindingAttributes[1], element.dataset.cmsPreviewItemId);
      promoteUniqueVisualTextBinding(element);
      const fieldPath = String(element.dataset.cmsPreviewFieldPath || element.dataset.cmsPreviewField || '').trim();
      const mediaRole = String(element.dataset.cmsPreviewMediaRole || '').trim();
      if (!fieldPath && !mediaRole) continue;
      if (!fieldPath && mediaRole) {
        // 视频分享卡片这类元素没有页面字段路径，而是直接由 media_assets 记录
        // 驱动（mediaAssetId）；它可以用画布媒体工具替换/删除，不能按“无绑定
        // 的静态版式素材”标记为只读，否则鼠标会变成禁止图标且无法选中。
        if (element.dataset.cmsPreviewMediaAssetId) {
          element.removeAttribute('data-cms-preview-readonly');
          element.removeAttribute('aria-disabled');
          element.removeAttribute('data-cms-preview-text');
          element.dataset.cmsPreviewEditable = 'true';
          continue;
        }
        element.removeAttribute('data-cms-preview-editable');
        element.removeAttribute('data-cms-preview-text');
        element.dataset.cmsPreviewReadonly = 'media-pending';
        // aria-disabled is inherited by descendant controls. A static
        // background may still contain independently editable copy or a CTA.
        if (hasBoundVisualDescendant(element)) {
          element.removeAttribute('aria-disabled');
        } else {
          element.setAttribute('aria-disabled', 'true');
        }
        // Tell the two reasons apart, because only one of them is something an
        // operator can fix: a registered placement means the slot is meant to
        // be managed and merely has no asset bound yet, while no placement
        // means the element is part of the fixed layout.
        const placement = String(element.dataset.cmsPreviewPlacementKey || '').trim();
        const fallbackReason = placement
          ? `尚未绑定受管素材。请在所在段落的「图片与背景」中添加素材，并把展示位置填写为 ${placement.split('.').pop()}。`
          : '此素材是版式的组成部分，不能单独替换。如需更换，请在 Nuxt 模板中新增经确认的版式位置。';
        const reason = String(element.dataset.cmsPreviewReadonlyReason || '').trim() || fallbackReason;
        // Publish the resolved reason so the workbench panel shows the same
        // text instead of its own generic fallback.
        element.dataset.cmsPreviewReadonlyReason = reason;
        element.setAttribute('title', reason);
        continue;
      }
      // The page can declare a field read-only because nothing is stored behind
      // it yet (product detail still rendering the template fallback). Honour it
      // before the generic "has a field path → editable" rule.
      if (String(element.dataset.cmsPreviewReadonly || '').trim() === 'uninitialized') {
        element.removeAttribute('data-cms-preview-editable');
        element.removeAttribute('data-cms-preview-text');
        if (element.dataset.cmsPreviewReadonlyReason) element.setAttribute('title', element.dataset.cmsPreviewReadonlyReason);
        element.setAttribute('aria-disabled', 'true');
        continue;
      }
      element.removeAttribute('data-cms-preview-readonly');
      element.removeAttribute('aria-disabled');
      element.dataset.cmsPreviewEditable = 'true';
      if (element.matches('img,video') && !mediaRole) element.dataset.cmsPreviewMediaRole = element.matches('video') ? 'video' : 'image';
      if (fieldPath && !element.dataset.cmsPreviewMediaRole) element.dataset.cmsPreviewText = 'true';
      else element.removeAttribute('data-cms-preview-text');
    }
  }

  let dragState: { element: HTMLElement; sectionKey: string; startX: number; startY: number; width: number; height: number } | null = null;
  let visualEditingObserver: MutationObserver | null = null;
  function readonlyVisualTarget(node: EventTarget | null) {
    const source = node as HTMLElement | null;
    const editable = source?.closest<HTMLElement>('[data-cms-preview-editable="true"]');
    if (editable) return null;
    const element = source?.closest?.<HTMLElement>('[data-cms-preview-readonly]');
    const section = element?.closest<HTMLElement>('[data-cms-preview-key]');
    const sectionKey = String(section?.dataset.cmsPreviewKey || '').trim() || 'home';
    return element && sectionKey ? { element, sectionKey } : null;
  }
  function mediaBindingInInteractiveContainer(source: HTMLElement | null) {
    const directMedia = source?.closest<HTMLElement>('img[data-cms-preview-editable="true"][data-cms-preview-media-role],video[data-cms-preview-editable="true"][data-cms-preview-media-role]');
    if (directMedia) return directMedia;
    const interactiveContainer = source?.closest<HTMLElement>('button,a,[role="button"]');
    if (!interactiveContainer) return null;
    const mediaBindings = [...interactiveContainer.querySelectorAll<HTMLElement>('img[data-cms-preview-editable="true"][data-cms-preview-media-role],video[data-cms-preview-editable="true"][data-cms-preview-media-role]')];
    return mediaBindings.length === 1 ? mediaBindings[0] : null;
  }
  function controlledVisualElementAtPoint(clientX: number, clientY: number) {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
    return [...document.querySelectorAll<HTMLElement>('[data-cms-preview-editable="true"]')]
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ element, rect }) => {
        // Decorative images may be aria-hidden for screen readers while still
        // being editable. Exclude inactive slides, not all decorative media.
        if (element.closest('[data-reason-slide][aria-hidden="true"]')) return false;
        const supportsTool = visualTool.value !== 'media' || element.matches('img,video') || Boolean(element.dataset.cmsPreviewMediaRole);
        return supportsTool && rect.width > 0 && rect.height > 0 && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
      })
      .sort((left, right) => left.rect.width * left.rect.height - right.rect.width * right.rect.height)[0]?.element || null;
  }

  // 播放按钮、整卡链接这类覆盖层会把点击重定向到卡片根节点。仅靠 click target
  // 永远选不中下面的视频，所以再按坐标做一次命中：覆盖层下面只要有可编辑的
  // img/video，就优先选它。文字绑定（例如压在视频上的标题）仍然优先给文字。
  function mediaElementUnderPoint(clientX: number, clientY: number) {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY) || typeof document.elementsFromPoint !== 'function') return null;
    const stack = document.elementsFromPoint(clientX, clientY);
    return stack.find((node) => {
      const element = node as HTMLElement;
      return (element.matches?.('img,video') || Boolean(element.dataset?.cmsPreviewMediaRole))
        && Boolean(element.closest('[data-cms-preview-key]'));
    }) as HTMLElement | null || null;
  }

  function editableTarget(node: EventTarget | null, clientX = NaN, clientY = NaN) {
    const source = node as HTMLElement | null;
    let element = source?.closest?.<HTMLElement>('[data-cms-preview-editable="true"]');
    // 覆盖层（播放按钮、整卡链接）会把点击重定向到卡片根节点；若命中的不是媒体
    // 也不是文字绑定，再按坐标找下面的可编辑媒体，避免永远选中卡片的文字属性。
    if (!element || (!element.matches('img,video') && !element.dataset.cmsPreviewMediaRole && !element.dataset.cmsPreviewText && !element.dataset.cmsPreviewFieldPath)) {
      const pointMedia = mediaElementUnderPoint(clientX, clientY);
      const mediaCandidate = pointMedia?.closest<HTMLElement>('[data-cms-preview-editable="true"]') || pointMedia;
      if (mediaCandidate && (mediaCandidate.matches('img,video') || mediaCandidate.dataset.cmsPreviewMediaRole)) element = mediaCandidate;
    }
    if (!element) element = controlledVisualElementAtPoint(clientX, clientY);
    // Some native controls own their click target while only their label has
    // the explicit CMS field binding. Select that label only when it is unique
    // so a multi-field card cannot be mapped to an arbitrary child.
    if (!element && visualTool.value !== 'media') {
      const interactiveContainer = source?.closest<HTMLElement>('button,a,[role="button"]');
      if (interactiveContainer) {
        const textBindings = [...interactiveContainer.querySelectorAll<HTMLElement>('[data-cms-preview-editable="true"][data-cms-preview-text="true"]')];
        if (textBindings.length === 1) element = textBindings[0];
      }
    }
    // Browser hit testing can retarget a full-card image click to its button.
    // In media mode, resolve the card's sole governed media binding instead.
    if (visualTool.value === 'media') {
      const directMedia = mediaBindingInInteractiveContainer(source);
      const elementIsMedia = element?.matches('img,video') || Boolean(element?.dataset.cmsPreviewMediaRole);
      element = directMedia || (elementIsMedia ? element : controlledVisualElementAtPoint(clientX, clientY));
    }
    // Images commonly cover an entire interactive card. In selection and text
    // modes, choose the card's nearest text binding so the card title can be
    // edited; the media tool deliberately keeps the image as the target.
    // Explicitly governed media (mediaRole/mediaAssetId) must win over a parent
    // rich-text container: the article body has data-cms-preview-text=true, and
    // climbing to it made every inline image select the whole body instead.
    const elementIsGovernedMedia = Boolean(
      element?.matches('img,video')
      && (element.dataset.cmsPreviewMediaRole || element.dataset.cmsPreviewMediaAssetId)
    );
    const preferredElement = visualTool.value === 'media' || elementIsGovernedMedia
      ? element
      : element?.closest<HTMLElement>('[data-cms-preview-text="true"]') || element;
    // A milestone record owns its field binding, but visually belongs to the
    // surrounding history section. Keep those responsibilities separate.
    const timelineSection = preferredElement?.closest<HTMLElement>('#history[data-cms-preview-key]');
    const section = timelineSection || (preferredElement?.matches('[data-cms-preview-key]') ? preferredElement : preferredElement?.closest<HTMLElement>('[data-cms-preview-key]')) || source?.closest<HTMLElement>('[data-cms-preview-key]');
    const sectionKey = String(section?.dataset.cmsPreviewKey || '').trim();
    // Some legacy/fallback homepage blocks render dynamic copy without the
    // explicit binding attributes. Keep the canvas usable by treating the
    // clicked text or media inside a known CMS section as an editable target.
    if (!preferredElement && source && sectionKey && visualTool.value === 'text') {
      const fallback = source.closest<HTMLElement>('h1,h2,h3,h4,h5,h6,p,b,strong,span,small,li,div');
      if (fallback && String(fallback.textContent || '').trim()) {
        fallback.dataset.cmsPreviewEditable = 'true';
        fallback.dataset.cmsPreviewText = 'true';
        if (!fallback.dataset.cmsPreviewFieldPath) fallback.dataset.cmsPreviewFieldPath = 'body';
        return { element: fallback, sectionKey };
      }
    }
    if (!preferredElement && source && sectionKey && visualTool.value === 'media') {
      const fallback = source.closest<HTMLElement>('img,video');
      if (fallback) {
        fallback.dataset.cmsPreviewEditable = 'true';
        if (!fallback.dataset.cmsPreviewFieldPath) fallback.dataset.cmsPreviewFieldPath = 'image';
        return { element: fallback, sectionKey };
      }
    }
    return preferredElement && sectionKey ? { element: preferredElement, sectionKey } : null;
  }
  function requestVisualSelection(target: { element: HTMLElement; sectionKey: string }, event: MouseEvent | PointerEvent) {
    const targetIsMedia = target.element.matches('img,video') || Boolean(target.element.dataset.cmsPreviewMediaRole);
    const targetIsText = target.element.matches('[data-cms-preview-text="true"]') || Boolean(target.element.dataset.cmsPreviewFieldPath);
    const tool = visualTool.value === 'select'
      ? 'select'
      : targetIsMedia
        ? 'media'
        : targetIsText
          ? 'text'
          : visualTool.value;
    const request = createCmsVisualEditRequest({
      editMode: visualEditMode.value && desktopVisualEditingAvailable(),
      device: visualDevice.value,
      tool,
      sectionKey: target.sectionKey,
      meta: visualElementMeta(target.element)
    });
    if (!request) return false;
    // Spec rows carry the full official table so the workbench can seed the model
    // draft before applying the first per-row edit.
    const parameterRowsRaw = target.element.getAttribute('data-cms-parameter-rows');
    if (parameterRowsRaw) {
      try {
        const rows = JSON.parse(parameterRowsRaw);
        if (Array.isArray(rows) && rows.length) request.parameterRows = rows;
      } catch { /* ignore malformed payloads */ }
    }
    locallySelectedSectionKey = target.sectionKey;
    if (targetRetryTimer) window.clearTimeout(targetRetryTimer);
    document.documentElement.dataset.cmsPreviewTargetKey = target.sectionKey;
    event.preventDefault();
    event.stopPropagation();
    postEditMessage(request);
    return true;
  }
  // A section can be rendered with CMS field bindings but carry no resolved
  // record (the workbench is currently editing another record, or the page is
  // still showing its static fallback). Nothing in it gets an editable marker,
  // so clicks used to be swallowed without a word and the canvas looked broken.
  function blockedVisualSection(node: EventTarget | null) {
    const source = node as HTMLElement | null;
    const root = source?.closest?.<HTMLElement>('[data-cms-preview-key]');
    if (!root) return null;
    if (!root.querySelector('[data-cms-preview-field-path]')) return null;
    if (root.querySelector('[data-cms-preview-editable="true"]')) return null;
    return root;
  }

  function handleVisualClick(event: MouseEvent) {
    // The same bridge is installed on the public site so a preview session can be
    // started later. Without this guard every click inside a CMS-bound section
    // was swallowed on the live page — product cards and header links stopped
    // navigating entirely.
    if (!visualEditMode.value || !desktopVisualEditingAvailable()) return;
    // 画布内的“新增/删除”是动作按钮，不参与元素选中：直接转成工作台命令。
    const actionElement = (event.target as HTMLElement | null)?.closest?.<HTMLElement>('[data-cms-preview-action]');
    if (actionElement) {
      const action = String(actionElement.dataset.cmsPreviewAction || '');
      const sectionKey = String(actionElement.closest('[data-cms-preview-key]')?.dataset.cmsPreviewKey || '');
      const base = {
        sectionKey,
        collection: String(session.value?.collection || ''),
        itemId: String(session.value?.itemId ?? '')
      };
      if (action === 'select-model-target') {
        // A model chip owns two behaviours: the workbench opens that model's
        // form, and the page's own click handler switches the displayed model.
        // Swallowing the click here froze the panel on the previous model while
        // the workbench opened the clicked one.
        postEditMessage({
          type: 'ruijun:cms-preview:select-model-target',
          ...base,
          modelCode: String(actionElement.dataset.cmsModelCode || ''),
          modelName: String(actionElement.dataset.cmsModelName || ''),
          modelId: String(actionElement.dataset.cmsModelId || ''),
          seriesCode: String(actionElement.dataset.cmsListSeries || '')
        });
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (action === 'create-article') {
        postEditMessage({ type: 'ruijun:cms-preview:create-article', category: String(actionElement.dataset.cmsCategory || 'news'), ...base });
      } else if (action === 'delete-article') {
        postEditMessage({
          type: 'ruijun:cms-preview:delete-article',
          ...base,
          collection: String(actionElement.dataset.cmsCollection || 'articles'),
          targetItemId: String(actionElement.dataset.cmsItemId || ''),
          label: String(actionElement.getAttribute('aria-label') || '')
        });
      } else if (action === 'delete-media') {
        // The capture-phase canvas action handler runs before the button's own
        // click listener and stops propagation. Media delete therefore has to
        // be translated here too, or the red × silently does nothing.
        postEditMessage({
          type: 'ruijun:cms-preview:delete-media',
          ...base,
          mediaAssetId: String(actionElement.dataset.cmsMediaId || ''),
          label: String(actionElement.getAttribute('aria-label') || '')
        });
      } else if (action === 'list-add' || action === 'list-remove') {
        // List buttons name the array they belong to (for example
        // configuration.features) instead of a field, so the workbench can add
        // or remove an entry before any item has been selected. The owning record
        // travels with the button: a page session can render a product detail
        // panel whose list belongs to a different collection.
        postEditMessage({
          type: `ruijun:cms-preview:${action}`,
          ...base,
          collection: String(actionElement.dataset.cmsListCollection || base.collection),
          itemId: String(actionElement.dataset.cmsListItemId || base.itemId),
          seriesCode: String(actionElement.dataset.cmsListSeries || ''),
          listPath: String(actionElement.dataset.cmsListPath || ''),
          listIndex: String(actionElement.dataset.cmsListIndex || ''),
          listLabel: String(actionElement.dataset.cmsListLabel || ''),
          label: String(actionElement.getAttribute('aria-label') || '')
        });
      } else if (action === 'series-select') {
        // Open the draft series in the workbench form so its name/cover can be filled.
        postEditMessage({
          type: 'ruijun:cms-preview:series-select',
          ...base,
          seriesRecordId: String(actionElement.dataset.cmsSeriesRecordId || '')
        });
      } else if (action === 'series-add' || action === 'series-remove') {
        // A whole product-series card is its own record; the card button names it.
        postEditMessage({
          type: `ruijun:cms-preview:${action}`,
          ...base,
          seriesRecordId: String(actionElement.dataset.cmsSeriesRecordId || '')
        });
      } else if (action === 'model-add' || action === 'model-remove') {
        // Model records live in their own collection; the button carries the
        // series code (and the model id when deleting) because a page session
        // points at the page record, not at the model.
        postEditMessage({
          type: `ruijun:cms-preview:${action}`,
          ...base,
          seriesCode: String(actionElement.dataset.cmsListSeries || ''),
          modelId: String(actionElement.dataset.cmsModelId || ''),
          modelCode: String(actionElement.dataset.cmsModelCode || '')
        });
      } else if (action === 'parameter-add' || action === 'parameter-remove') {
        // Parameter rows are separate records, so the workbench creates or
        // deletes them through the API instead of rewriting a JSON array.
        postEditMessage({
          type: `ruijun:cms-preview:${action}`,
          ...base,
          modelCode: String(actionElement.dataset.cmsModelCode || ''),
          parameterId: String(actionElement.dataset.cmsParameterId || '')
        });
      }
      return;
    }
    // Page-owned affordances such as "open this series detail" or "switch the
    // displayed model" must not become field selections: hand the click back to
    // the page so it can update its own state without navigating the iframe. The
    // page's own handler runs as well (these are plain buttons): if the dispatched
    // payload is ever stale, the detail panel still switches instead of freezing
    // on whichever card was opened last.
    const pageAction = cmsPageActionFor(event.target);
    if (pageAction) {
      window.dispatchEvent(new CustomEvent(CMS_LIVE_PREVIEW_PAGE_ACTION, { detail: pageAction }));
      return;
    }
    const readonly = readonlyVisualTarget(event.target);
    if (readonly) {
      event.preventDefault();
      event.stopPropagation();
      const meta = visualElementMeta(readonly.element);
      postEditMessage({
        type: CMS_LIVE_PREVIEW_READONLY,
        sectionKey: readonly.sectionKey,
        ...meta,
        readonly: true,
        readonlyReason: String(readonly.element.dataset.cmsPreviewReadonlyReason || '此素材当前不能替换：可能是版式的组成部分（需在模板中新增版式位置），也可能是尚未绑定受管素材（可在所在段落的「图片与背景」中添加）。')
      });
      return;
    }
    const target = editableTarget(event.target, event.clientX, event.clientY);
    if (!target) {
      const blocked = blockedVisualSection(event.target);
      if (blocked) {
        event.preventDefault();
        event.stopPropagation();
        const sectionKey = String(blocked.dataset.cmsPreviewKey || '').trim();
        const clickedField = String((event.target as HTMLElement | null)?.closest?.<HTMLElement>('[data-cms-preview-field-path]')?.dataset.cmsPreviewFieldPath || '');
        // Keep the record ids explicit: the workbench resolves them before it
        // shows the reason, and an empty pair makes it drop the message.
        postEditMessage({
          type: CMS_LIVE_PREVIEW_READONLY,
          sectionKey,
          label: sectionKey,
          elementType: 'text',
          fieldPath: clickedField,
          collection: String(session.value?.collection || ''),
          itemId: String(session.value?.itemId ?? ''),
          blockedSection: true,
          readonly: true,
          readonlyReason: `这段内容属于「${sectionKey}」区块，当前画布没有它的编辑权。请在左侧先选中这个区块，再回到画布上修改。`
        });
      }
      // 编辑模式下点击画布内任何位置都不应该跳走。即使这一下没有解析到可编辑
      // 目标（例如覆盖层、未绑定元素），也拦住默认导航，避免误进详情页。
      if ((event.target as HTMLElement | null)?.closest?.('[data-cms-preview-key]')) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    requestVisualSelection(target, event);
  }
  function handleVisualDoubleClick(event: MouseEvent) {
    if (!visualEditMode.value || !desktopVisualEditingAvailable()) return;
    const target = editableTarget(event.target, event.clientX, event.clientY);
    if (!target) return;
    // A visible bound target is authoritative. Users may double-click a text
    // node after leaving the media tool active; do not silently drop the edit.
    event.preventDefault();
    event.stopPropagation();
      const field = String(target.element.dataset.cmsPreviewFieldPath || target.element.dataset.cmsPreviewField || '').trim();
    const meta = visualElementMeta(target.element);
    if (field && target.element.matches('[data-cms-preview-text="true"]') && target.element.dataset.cmsPreviewInlineEdit !== 'false') {
      target.element.contentEditable = 'true';
      target.element.classList.add('cms-preview-editing');
      target.element.focus();
      const range = document.createRange();
      range.selectNodeContents(target.element);
      range.collapse(false);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      const finish = () => {
        target.element.contentEditable = 'false';
        target.element.classList.remove('cms-preview-editing');
        postEditMessage({ type: CMS_LIVE_PREVIEW_EDIT_COMMIT, sectionKey: target.sectionKey, field, fieldPath: field, value: target.element.innerText.replace(/\r\n/g, '\n').trim(), ...visualElementMeta(target.element) });
        target.element.removeEventListener('blur', finish);
      };
      target.element.addEventListener('blur', finish, { once: true });
      postEditMessage({ type: CMS_LIVE_PREVIEW_EDIT_REQUEST, sectionKey: target.sectionKey, field, fieldPath: field, ...meta });
      return;
    }
    postEditMessage({ type: CMS_LIVE_PREVIEW_EDIT_REQUEST, sectionKey: target.sectionKey, field, fieldPath: field, ...meta });
  }
  // Canvas buttons ("＋/×", 详情, 删除…) live inside decorated containers. The
  // drag helper captures the pointer on the container, which retargets the
  // follow-up `click` and meant a real mouse press never reached the action
  // branch (synthetic .click() worked, which is why it passed tests). Leave
  // action elements entirely to the click handler.
  function isCanvasActionTarget(node: EventTarget | null) {
    return Boolean((node as HTMLElement | null)?.closest?.('[data-cms-preview-action], [data-cms-preview-page-action]'));
  }
  function handleVisualPointerDown(event: PointerEvent) {
    if (!visualEditMode.value || !desktopVisualEditingAvailable() || event.button !== 0) return;
    if (isCanvasActionTarget(event.target)) return;
    const target = editableTarget(event.target, event.clientX, event.clientY);
    if (!target || target.element.matches('[data-cms-preview-text="true"]')) return;
    if (visualTool.value === 'text') return;
    const rect = target.element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    dragState = { element: target.element, sectionKey: target.sectionKey, startX: event.clientX, startY: event.clientY, width: rect.width, height: rect.height };
    target.element.setPointerCapture?.(event.pointerId);
    target.element.classList.add('cms-preview-dragging');
    event.preventDefault();
  }
  function handleVisualPointerUp(event: PointerEvent) {
    if (!dragState) return;
    const state = dragState;
    dragState = null;
    state.element.classList.remove('cms-preview-dragging');
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    // Pointer capture intercepts the browser's ordinary click event. Treat a
    // press without movement as a canvas selection; otherwise media elements
    // could be dragged but never selected for replacement.
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
      requestVisualSelection({ element: state.element, sectionKey: state.sectionKey }, event);
      return;
    }
    postEditMessage({ type: CMS_LIVE_PREVIEW_EDIT_COMMIT, sectionKey: state.sectionKey, offsetDelta: { x: (dx / state.width) * 100, y: (dy / state.height) * 100 }, ...visualElementMeta(state.element) });
  }

  function notifyPreviewParent() {
    const origins = normalizeCmsLivePreviewOrigins(allowedOrigins);
    const ancestorOrigin = window.location.ancestorOrigins?.[0] || '';
    if (origins.includes(ancestorOrigin)) {
      window.parent?.postMessage({ type: CMS_LIVE_PREVIEW_READY }, ancestorOrigin);
      return;
    }
    for (const origin of origins) {
      window.parent?.postMessage({ type: CMS_LIVE_PREVIEW_READY }, origin);
    }
  }

  function startVisualRuntime() {
    // A layout component can receive the preview message before the page
    // component becomes the shared bridge owner. Decorate existing fields
    // immediately so that owner hand-off does not leave the canvas inert.
    decorateVisualEditing();
    visualEditingObserver = new MutationObserver(() => decorateVisualEditing());
    visualEditingObserver.observe(document.documentElement, { childList: true, subtree: true });
    if (enabled.value) notifyPreviewParent();
    nextTick(() => {
      targetRetryCount = 0;
      scrollToPreviewTarget();
    });
  }

  function stopVisualRuntime() {
    visualEditingObserver?.disconnect();
    visualEditingObserver = null;
    if (targetRetryTimer) window.clearTimeout(targetRetryTimer);
  }

  function clearVisualRuntimeDomState() {
    delete document.documentElement.dataset.cmsPreviewTarget;
    delete document.documentElement.dataset.cmsPreviewTargetKey;
    delete document.documentElement.dataset.cmsPreviewEditMode;
  }

  const visualRuntimeOwner: CmsVisualRuntimeOwner = {
    receiveLivePreview,
    handleVisualClick,
    handleVisualDoubleClick,
    handleVisualPointerDown,
    handleVisualPointerUp,
    start: startVisualRuntime,
    stop: stopVisualRuntime,
    clearDomState: clearVisualRuntimeDomState
  };

  onMounted(() => {
    registerVisualRuntimeOwner(visualRuntimeOwner);
  });
  watch(enabled, (isEnabled) => {
    if (!isEnabled || activeVisualRuntimeOwner !== visualRuntimeOwner) return;
    notifyPreviewParent();
    nextTick(() => {
      targetRetryCount = 0;
      scrollToPreviewTarget();
    });
  });
  watch(session, () => {
    if (!enabled.value || activeVisualRuntimeOwner !== visualRuntimeOwner) return;
    liveRecord.value = null;
    liveRelatedRecords.value = {};
    livePreviewIdentity.value = null;
    nextTick(() => {
      livePreviewSelector = '';
      targetRetryCount = 0;
      if (targetRetryTimer) window.clearTimeout(targetRetryTimer);
      scrollToPreviewTarget();
    });
  }, { flush: 'post' });
  onBeforeUnmount(() => {
    unregisterVisualRuntimeOwner(visualRuntimeOwner);
  });

  function recordFor(collection: string) {
    return currentPreviewRecord(collection);
  }

  function overlayRecord<T extends Record<string, any> | null>(collection: string, published: T, accepts?: (draft: Record<string, any>) => boolean): T | Record<string, any> {
    const draft = currentPreviewRecord(collection);
    if (!draft || (accepts && !accepts(draft))) return published;
    return { ...(published || {}), ...draft };
  }

  function overlayList<T extends Record<string, any>>(collection: string, published: T[]) {
    const drafts = currentPreviewRecords(collection);
    const publishedRecords = Array.isArray(published) ? published : [];
    if (!drafts.length) return publishedRecords;
    let result = [...publishedRecords];
    for (const draft of drafts) {
      const index = result.findIndex((item) => sameRecord(collection, item, draft));
      if (index < 0) result.unshift(draft as T);
      else result = result.map((item, itemIndex) => itemIndex === index ? { ...item, ...draft } : item);
    }
    return result;
  }

  // 删除按钮直接调用，避免依赖 document 级点击命中判断（元素被浮层覆盖时
  // 点击会落到卡片链接上，删除永远不触发）。
  function requestArticleDelete(itemId: string, label = '') {
    const id = String(itemId || '').trim();
    if (!id) return;
    postEditMessage({
      type: 'ruijun:cms-preview:delete-article',
      collection: 'articles',
      targetItemId: id,
      label: label ? `删除 ${label}` : '',
      sectionKey: ''
    });
  }

  function requestMediaDelete(mediaAssetId: string, label = '') {
    const id = String(mediaAssetId || '').trim();
    if (!id) return;
    postEditMessage({
      type: 'ruijun:cms-preview:delete-media',
      mediaAssetId: id,
      label: label ? `删除 ${label}` : '',
      sectionKey: ''
    });
  }

  return { enabled, session, record, error, liveConnected, livePreviewLabel, visualEditMode, visualMediaReplacement, recordFor, recordsFor: currentPreviewRecords, overlayRecord, overlayList, refreshVisualDecorations, insidePreviewFrame, requestArticleDelete, requestMediaDelete };
}
