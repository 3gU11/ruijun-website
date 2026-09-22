type CmsPreviewPayload = {
  collection: string;
  itemId: string;
  preview: Record<string, any>;
  target?: { path: string; hash?: string; label?: string; selector?: string };
};

import { acceptCmsLivePreviewCommand, acceptCmsLivePreviewMediaReplaceMessage, acceptCmsLivePreviewMessage, applyCmsLivePreviewMediaElement, CMS_LIVE_PREVIEW_COMMAND, CMS_LIVE_PREVIEW_EXPIRED, CMS_LIVE_PREVIEW_MEDIA_REPLACE as CMS_LIVE_PREVIEW_MEDIA_REPLACE_MESSAGE, CMS_LIVE_PREVIEW_READY, CMS_LIVE_PREVIEW_EDIT_REQUEST, CMS_LIVE_PREVIEW_EDIT_COMMIT, CMS_LIVE_PREVIEW_READONLY, cmsPreviewScrollOptions, cmsPreviewSectionSelector, cmsPreviewStatusLabel, createCmsVisualEditRequest, isCmsLivePreviewSessionExpired, makeCmsPreviewRecordRenderable, normalizeCmsLivePreviewOrigins, resolveCmsLivePreviewParentOrigin, resolveCmsVisualElementBinding, resolveCmsVisualRootBinding } from '~/utils/cms-live-preview.mjs';

const CMS_LIVE_PREVIEW_MEDIA_REPLACE = 'ruijun:cms-preview:media-replace';
const visualBindingAttributes = ['data-cms-preview-collection', 'data-cms-preview-item-id'];

const naturalKeys: Record<string, string[]> = {
  pages: ['slug'], articles: ['slug'], product_series: ['series_code', 'slug'], product_models: ['model_code', 'slug'],
  homepage_sections: ['page_key', 'section_key', 'language'],
  product_parameters: ['model_code', 'group_name', 'field_name'], case_studies: ['slug'], manufacturing_evidence: ['source_key'],
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
    if (session.value.collection !== collection) return relatedRecords;
    const primary = makeCmsPreviewRecordRenderable({ ...session.value.preview, ...(liveRecord.value || {}) });
    const primaryIndex = relatedRecords.findIndex((item) => sameRecord(collection, item, primary));
    if (primaryIndex < 0) return [primary, ...relatedRecords];
    return relatedRecords.map((item, index) => index === primaryIndex ? { ...item, ...primary } : item);
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
  const receiveLivePreview = async (event: MessageEvent) => {
      if (event.source !== window.parent) return;
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
      // A canvas click is echoed by the workbench as a snapshot. Do not
      // navigate to the first occurrence of a shared section key on that echo.
      // Selecting an element is not a navigation request. Preserve the
      // editor's scroll position; explicit alignment/drag commands remain
      // responsible for bringing their target into view.
      if (event.data?.type !== 'ruijun:cms-preview:edit-request' && event.data?.type !== 'ruijun:cms-preview:edit-commit'
        && (!locallySelectedSectionKey || locallySelectedSectionKey !== String(event.data?.sectionKey || ''))) {
        locallySelectedSectionKey = '';
        requestPreviewTarget(cmsPreviewSectionSelector(event.data?.sectionKey));
      }
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

  function visualElementMeta(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    const fontSize = Number.parseFloat(computedStyle.fontSize) || 16;
    const computedLineHeight = Number.parseFloat(computedStyle.lineHeight);
    const rgb = String(computedStyle.color || '').match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    const toHex = (value: string) => Number(value).toString(16).padStart(2, '0');
    const textColor = rgb ? `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`.toUpperCase() : '#000000';
    return {
      label: String(element.dataset.cmsPreviewFieldPath || element.dataset.cmsPreviewField || element.getAttribute('aria-label') || element.textContent || '画布元素').trim().slice(0, 80),
      elementType: element.matches('video') ? 'video' : element.dataset.cmsPreviewMediaRole ? 'image' : element.matches('button,a') ? 'button' : 'text',
      mediaRole: String(element.dataset.cmsPreviewMediaRole || ''),
      mediaSlot: String(element.dataset.cmsPreviewMediaSlot || ''),
      allowDefaultMedia: element.dataset.cmsPreviewAllowDefault === 'true',
      placementKey: String(element.dataset.cmsPreviewPlacementKey || ''),
      groupRecordIds: String(element.dataset.cmsPreviewGroupRecordIds || '').split(',').map((value) => value.trim()).filter(Boolean),
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
      if (!binding) continue;
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
        element.dataset.cmsPreviewCollection = elementBinding.collection;
        element.dataset.cmsPreviewItemId = elementBinding.itemId;
        element.setAttribute(visualBindingAttributes[0], element.dataset.cmsPreviewCollection);
        element.setAttribute(visualBindingAttributes[1], element.dataset.cmsPreviewItemId);
        promoteUniqueVisualTextBinding(element);
        const fieldPath = String(element.dataset.cmsPreviewFieldPath || element.dataset.cmsPreviewField || '').trim();
        const mediaRole = String(element.dataset.cmsPreviewMediaRole || '').trim();
        if (!fieldPath && !mediaRole) continue;
        if (!fieldPath && mediaRole) {
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
          element.setAttribute('title', '此为静态素材；请先在媒体资产中导入、审核并发布后再替换。');
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
  }

  let dragState: { element: HTMLElement; sectionKey: string; startX: number; startY: number; width: number; height: number } | null = null;
  let visualEditingObserver: MutationObserver | null = null;
  function readonlyVisualTarget(node: EventTarget | null) {
    const source = node as HTMLElement | null;
    const editable = source?.closest<HTMLElement>('[data-cms-preview-editable="true"]');
    if (editable) return null;
    const element = source?.closest?.<HTMLElement>('[data-cms-preview-readonly]');
    const section = element?.closest<HTMLElement>('[data-cms-preview-key]');
    const sectionKey = String(section?.dataset.cmsPreviewKey || '').trim();
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
        const supportsTool = visualTool.value !== 'media' || element.matches('img,video') || Boolean(element.dataset.cmsPreviewMediaRole);
        return supportsTool && rect.width > 0 && rect.height > 0 && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
      })
      .sort((left, right) => left.rect.width * left.rect.height - right.rect.width * right.rect.height)[0]?.element || null;
  }

  function editableTarget(node: EventTarget | null, clientX = NaN, clientY = NaN) {
    const source = node as HTMLElement | null;
    let element = source?.closest?.<HTMLElement>('[data-cms-preview-editable="true"]');
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
    if (visualTool.value === 'media') element = mediaBindingInInteractiveContainer(source) || element;
    // Images commonly cover an entire interactive card. In selection and text
    // modes, choose the card's nearest text binding so the card title can be
    // edited; the media tool deliberately keeps the image as the target.
    const preferredElement = visualTool.value === 'media'
      ? element
      : element?.closest<HTMLElement>('[data-cms-preview-text="true"]') || element;
    // A milestone record owns its field binding, but visually belongs to the
    // surrounding history section. Keep those responsibilities separate.
    const timelineSection = preferredElement?.closest<HTMLElement>('#history[data-cms-preview-key]');
    const section = timelineSection || (preferredElement?.matches('[data-cms-preview-key]') ? preferredElement : preferredElement?.closest<HTMLElement>('[data-cms-preview-key]'));
    const sectionKey = String(section?.dataset.cmsPreviewKey || '').trim();
    return preferredElement && sectionKey ? { element: preferredElement, sectionKey } : null;
  }
  function requestVisualSelection(target: { element: HTMLElement; sectionKey: string }, event: MouseEvent | PointerEvent) {
    const request = createCmsVisualEditRequest({
      editMode: visualEditMode.value && desktopVisualEditingAvailable(),
      device: visualDevice.value,
      tool: visualTool.value,
      sectionKey: target.sectionKey,
      meta: visualElementMeta(target.element)
    });
    if (!request) return false;
    locallySelectedSectionKey = target.sectionKey;
    if (targetRetryTimer) window.clearTimeout(targetRetryTimer);
    document.documentElement.dataset.cmsPreviewTargetKey = target.sectionKey;
    event.preventDefault();
    event.stopPropagation();
    postEditMessage(request);
    return true;
  }
  function handleVisualClick(event: MouseEvent) {
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
        readonlyReason: String(readonly.element.dataset.cmsPreviewReadonlyReason || '此为静态素材；请先在媒体资产中导入、审核并发布后再替换。')
      });
      return;
    }
    const target = editableTarget(event.target, event.clientX, event.clientY);
    if (!target) return;
    requestVisualSelection(target, event);
  }
  function handleVisualDoubleClick(event: MouseEvent) {
    if (!visualEditMode.value || !desktopVisualEditingAvailable()) return;
    const target = editableTarget(event.target, event.clientX, event.clientY);
    if (!target) return;
    if (visualTool.value === 'media' && target.element.matches('[data-cms-preview-text="true"]')) return;
    if (visualTool.value === 'text' && !target.element.matches('[data-cms-preview-text="true"]')) return;
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
  function handleVisualPointerDown(event: PointerEvent) {
    if (!visualEditMode.value || !desktopVisualEditingAvailable() || event.button !== 0) return;
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

  return { enabled, session, record, error, liveConnected, livePreviewLabel, visualEditMode, visualMediaReplacement, recordFor, recordsFor: currentPreviewRecords, overlayRecord, overlayList };
}
