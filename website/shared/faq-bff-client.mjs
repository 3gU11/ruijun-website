const SAFE_SESSION_ID = /^[A-Za-z0-9_-]{20,80}$/;
const SAFE_HANDOFF_TOKEN = /^[A-Za-z0-9_-]{32,128}$/;
const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{8,80}$/;

function normalizedBaseUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (!/^https?:$/.test(url.protocol)) return '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function requestError(code, status = 0) {
  const error = new Error(code);
  error.code = code;
  error.status = status;
  return error;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function requireBaseUrl(value) {
  const baseUrl = normalizedBaseUrl(value);
  if (!baseUrl) throw requestError('FAQ_BFF_DISABLED');
  return baseUrl;
}

function requireSessionId(value) {
  const sessionId = String(value || '').trim();
  if (!SAFE_SESSION_ID.test(sessionId)) throw requestError('INVALID_FAQ_SESSION');
  return sessionId;
}

function requireConsent({ handoffType, consentConfirmed, consentUiVersion, repairDraft }) {
  if (handoffType !== 'repair_draft') return;
  if (!consentConfirmed || !String(consentUiVersion || '').trim() || !String(repairDraft?.symptomSummary || '').trim()) {
    throw requestError('FAQ_CONSENT_REQUIRED');
  }
}

export function faqAssistantMode(baseUrl) {
  return normalizedBaseUrl(baseUrl) ? 'bff' : 'static';
}

export async function createFaqConversation({ baseUrl, fetchImpl = fetch, context = {}, faqSessionId = '' }) {
  const endpoint = `${requireBaseUrl(baseUrl)}/api/faq/v1/conversations`;
  const body = { sourceChannel: 'website', context };
  if (SAFE_SESSION_ID.test(String(faqSessionId || '').trim())) body.faqSessionId = String(faqSessionId).trim();
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body)
    });
  } catch {
    throw requestError('FAQ_BFF_UNAVAILABLE');
  }
  const payload = await readJson(response);
  if (!response.ok || !SAFE_SESSION_ID.test(String(payload?.faqSessionId || ''))) throw requestError('FAQ_BFF_UNAVAILABLE', response.status);
  return payload;
}

export async function streamFaqMessage({ baseUrl, fetchImpl = fetch, faqSessionId, message, context = {}, idempotencyKey, signal, onEvent }) {
  const endpoint = `${requireBaseUrl(baseUrl)}/api/faq/v1/messages`;
  const sessionId = requireSessionId(faqSessionId);
  const question = String(message || '').trim();
  const key = String(idempotencyKey || '').trim();
  if (!question || question.length > 2_000 || key.length < 8 || key.length > 128) throw requestError('INVALID_FAQ_MESSAGE');
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST', credentials: 'include', signal,
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', 'Idempotency-Key': key },
      body: JSON.stringify({ faqSessionId: sessionId, message: question, context })
    });
  } catch {
    if (signal?.aborted) throw requestError('FAQ_REQUEST_CANCELLED');
    throw requestError('FAQ_BFF_UNAVAILABLE');
  }
  if (!response.ok || !response.body) throw requestError('FAQ_BFF_UNAVAILABLE', response.status);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  const emit = (frame) => {
    const lines = frame.split(/\r?\n/);
    const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() || 'message';
    const json = lines.filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
    if (!json) return;
    try { onEvent?.({ event, data: JSON.parse(json) }); } catch { /* Ignore malformed upstream frames. */ }
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value || new Uint8Array(), { stream: !done });
      const frames = pending.split(/\r?\n\r?\n/);
      pending = frames.pop() || '';
      for (const frame of frames) emit(frame);
      if (done) break;
    }
    if (pending.trim()) emit(pending);
  } finally {
    reader.releaseLock();
  }
}

export async function requestFaqHandoff({ baseUrl, fetchImpl = fetch, handoffType, faqSessionId, consentConfirmed = false, consentUiVersion = '', repairDraft = null }) {
  const type = handoffType === 'repair_draft' ? 'repair_draft' : handoffType === 'continue_conversation' ? 'continue_conversation' : '';
  if (!type) throw requestError('INVALID_FAQ_HANDOFF');
  requireConsent({ handoffType: type, consentConfirmed, consentUiVersion, repairDraft });
  const body = { handoffType: type, faqSessionId: requireSessionId(faqSessionId) };
  if (type === 'repair_draft') Object.assign(body, { consentConfirmed: true, consentUiVersion: String(consentUiVersion).trim(), repairDraft });
  let response;
  try {
    response = await fetchImpl(`${requireBaseUrl(baseUrl)}/api/faq/v1/handoffs`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body)
    });
  } catch {
    throw requestError('FAQ_BFF_UNAVAILABLE');
  }
  const payload = await readJson(response);
  if (!response.ok || !SAFE_HANDOFF_TOKEN.test(String(payload?.token || ''))) throw requestError('FAQ_BFF_UNAVAILABLE', response.status);
  return payload;
}

export async function submitFaqFeedback({ baseUrl, fetchImpl = fetch, faqSessionId, requestId, helpful, reason = '', escalateToHuman = false }) {
  const normalizedRequestId = String(requestId || '').trim();
  const normalizedReason = String(reason || '').trim();
  if (!SAFE_REQUEST_ID.test(normalizedRequestId) || typeof helpful !== 'boolean' || normalizedReason.length > 120) throw requestError('INVALID_FAQ_FEEDBACK');
  let response;
  try {
    response = await fetchImpl(`${requireBaseUrl(baseUrl)}/api/faq/v1/feedback`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ faqSessionId: requireSessionId(faqSessionId), requestId: normalizedRequestId, helpful, reason: normalizedReason, escalateToHuman: Boolean(escalateToHuman) })
    });
  } catch {
    throw requestError('FAQ_BFF_UNAVAILABLE');
  }
  const payload = await readJson(response);
  if (!response.ok || payload?.accepted !== true) throw requestError('FAQ_BFF_UNAVAILABLE', response.status);
  return payload;
}

export function buildFaqHandoffUrl(repairUrl, token) {
  if (!SAFE_HANDOFF_TOKEN.test(String(token || '').trim())) return null;
  try {
    const url = new URL(String(repairUrl || '').trim());
    if (!/^https?:$/.test(url.protocol)) return null;
    url.searchParams.set('faqHandoff', String(token).trim());
    return url.toString();
  } catch {
    return null;
  }
}
