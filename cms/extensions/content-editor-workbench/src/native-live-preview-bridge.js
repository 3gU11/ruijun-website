const UPDATE_MESSAGE = 'ruijun:cms-preview:update';
const READY_MESSAGE = 'ruijun:cms-preview:ready';

const previewFields = Object.freeze({
  pages: ['id', 'slug', 'title', 'language', 'sections', 'seo', 'status', 'publication_state', 'published_at'],
  homepage_sections: ['id', 'page_key', 'section_key', 'title', 'kicker', 'body', 'content', 'media', 'sort_order', 'enabled', 'language', 'status', 'publication_state', 'published_at'],
  repair_page_configs: ['id', 'page_key', 'title', 'intro', 'hero_asset', 'model_cards', 'action_cards', 'process_steps', 'notices', 'faq_refs', 'seo', 'language', 'status', 'publication_state', 'published_at'],
  product_series: ['id', 'series_code', 'slug', 'name', 'positioning', 'scenarios', 'capabilities', 'cover_asset', 'sort_order', 'language', 'status', 'publication_state', 'published_at'],
  product_models: ['id', 'series_code', 'model_code', 'slug', 'name', 'parameters', 'configuration', 'presentation', 'media', 'resources', 'case_studies', 'status', 'publication_state', 'published_at'],
  product_parameters: ['id', 'model_code', 'group_name', 'field_name', 'value', 'unit', 'sort_order', 'test_conditions', 'status', 'publication_state', 'published_at'],
  case_studies: ['id', 'slug', 'industry', 'material', 'thickness', 'model_code', 'process', 'result', 'authorization_status', 'status', 'publication_state', 'published_at'],
  articles: ['id', 'slug', 'category', 'title', 'summary', 'body', 'transcript', 'display_date', 'sort_order', 'field_presentation', 'media', 'video_url', 'cover_asset', 'seo', 'status', 'publication_state', 'published_at'],
  manufacturing_evidence: ['id', 'source_key', 'process', 'description', 'media', 'inspection_evidence', 'sort_order', 'status', 'publication_state', 'published_at'],
  qualifications: ['id', 'source_key', 'type', 'name', 'certificate_number', 'issuer', 'valid_until', 'assets', 'sort_order', 'authorization_status', 'status', 'publication_state', 'published_at'],
  milestones: ['id', 'source_key', 'year', 'event', 'evidence', 'sort_order', 'status', 'publication_state', 'published_at'],
  service_resources: ['id', 'source_key', 'type', 'title', 'summary', 'body', 'applicable_models', 'version', 'language', 'asset', 'cover_asset', 'display_date', 'sort_order', 'updated_at', 'status', 'publication_state', 'published_at'],
  service_locations: ['id', 'source_key', 'region', 'city', 'service_scope', 'business_status', 'valid_until', 'status', 'publication_state', 'published_at'],
  knowledge_items: ['id', 'source_key', 'visibility', 'channel', 'category', 'question_title', 'applicable_models', 'error_codes', 'symptoms', 'troubleshooting_steps', 'risk_level', 'safety_preconditions', 'escalation_guidance', 'media', 'version', 'technical_reviewer', 'dify_sync_status', 'status', 'publication_state', 'published_at'],
  external_service_entries: ['id', 'entry_type', 'url', 'enabled', 'open_mode', 'health_status', 'status', 'publication_state', 'published_at'],
  site_settings: ['id', 'setting_key', 'navigation', 'footer', 'brand', 'contacts', 'languages', 'analytics', 'status', 'publication_state', 'published_at']
});

const missing = Symbol('missing');

export function nativeContentTarget(pathname) {
  const match = String(pathname || '').match(/^\/admin\/content\/([^/]+)\/([^/?#]+)\/?$/);
  if (!match) return null;
  try { return { collection: decodeURIComponent(match[1]), itemId: decodeURIComponent(match[2]) }; } catch { return null; }
}

function structuredValue(text) {
  try { return JSON.parse(text); } catch { return missing; }
}

export function nativeFieldValue(fieldElement) {
  const structuredElement = fieldElement?.querySelector?.('[data-ruijun-structured-value]');
  const serializedValue = structuredElement?.getAttribute?.('data-ruijun-structured-value');
  if (serializedValue != null) return structuredValue(serializedValue);

  const codeMirror = fieldElement?.querySelector?.('.CodeMirror')?.CodeMirror;
  if (codeMirror?.getValue) return structuredValue(codeMirror.getValue());

  const controls = [...(fieldElement?.querySelectorAll?.('input, textarea, select') || [])]
    .filter((control) => control.type !== 'hidden' && !control.disabled);
  if (!controls.length) return missing;
  if (controls.length > 1) {
    const checked = controls.filter((control) => control.checked).map((control) => control.value);
    if (checked.length) return checked;
  }
  const control = controls[0];
  if (control.type === 'checkbox') return Boolean(control.checked);
  if (control.tagName === 'SELECT' && control.multiple) return [...control.selectedOptions].map((option) => option.value);
  if (control.type === 'number' && control.value !== '') {
    const number = Number(control.value);
    return Number.isFinite(number) ? number : control.value;
  }
  return control.value;
}

export function collectNativePreviewRecord(root, target) {
  const allowed = previewFields[target?.collection];
  if (!allowed || !root || target.itemId == null) return null;
  const record = { id: target.itemId };
  for (const field of allowed) {
    if (field === 'id') continue;
    const element = [...root.querySelectorAll('.field[data-collection][data-field]')]
      .find((candidate) => candidate.dataset.collection === target.collection && candidate.dataset.field === field);
    if (!element) continue;
    const value = nativeFieldValue(element);
    if (value !== missing) record[field] = value;
  }
  return record;
}

export function connectNativeCodeMirrorEditors(root, onChange, connected = new WeakSet()) {
  let connectionCount = 0;
  for (const element of root?.querySelectorAll?.('.field[data-collection][data-field] .CodeMirror') || []) {
    const editor = element.CodeMirror;
    if (!editor?.on || connected.has(editor)) continue;
    connected.add(editor);
    editor.on('change', onChange);
    connectionCount += 1;
  }
  return connectionCount;
}

function previewFrames(documentObject, locationObject) {
  return [...documentObject.querySelectorAll('iframe')].filter((frame) => {
    try {
      const url = new URL(frame.getAttribute('src') || '', locationObject.href);
      return url.origin === locationObject.origin && url.pathname.startsWith('/content-preview-tokens/open');
    } catch { return false; }
  });
}

export function installNativeLivePreviewBridge(windowObject = window, documentObject = document) {
  if (windowObject.__ruijunNativeLivePreviewInstalled) return;
  windowObject.__ruijunNativeLivePreviewInstalled = true;
  const connections = new WeakMap();
  let timer = 0;

  function send() {
    const target = nativeContentTarget(windowObject.location.pathname);
    const preview = collectNativePreviewRecord(documentObject, target);
    if (!target || !preview) return;
    for (const frame of previewFrames(documentObject, windowObject.location)) {
      const origin = connections.get(frame);
      if (!origin || !frame.contentWindow) continue;
      frame.contentWindow.postMessage({ type: UPDATE_MESSAGE, collection: target.collection, itemId: target.itemId, preview }, origin);
    }
  }

  function queue() {
    windowObject.clearTimeout(timer);
    timer = windowObject.setTimeout(send, 300);
  }

  const connectedEditors = new WeakSet();
  const connectEditors = () => connectNativeCodeMirrorEditors(documentObject, queue, connectedEditors);

  documentObject.addEventListener('input', queue, true);
  documentObject.addEventListener('change', queue, true);
  documentObject.addEventListener('focusin', connectEditors, true);
  documentObject.addEventListener('keydown', connectEditors, true);
  connectEditors();
  if (windowObject.MutationObserver && documentObject.documentElement) {
    new windowObject.MutationObserver(connectEditors).observe(documentObject.documentElement, { childList: true, subtree: true });
  }
  windowObject.addEventListener('message', (event) => {
    if (event.data?.type !== READY_MESSAGE) return;
    const frame = previewFrames(documentObject, windowObject.location).find((candidate) => candidate.contentWindow === event.source);
    let protocol = '';
    try { protocol = new URL(event.origin).protocol; } catch { return; }
    if (!frame || !/^https?:$/.test(protocol)) return;
    connections.set(frame, event.origin);
    send();
  });
}
