const allowedActions = new Set(['support', 'request', 'warranty', 'requests']);

function serviceError(code, status, message) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function safeText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

export async function requestFaqFallback({
  question,
  upstreamUrl = process.env.OFFICIAL_FAQ_FALLBACK_URL || 'http://127.0.0.1:4173/api/public/v1/faq/answer',
  fetchImpl = fetch
} = {}) {
  const normalizedQuestion = safeText(question, 301);
  if (!normalizedQuestion || normalizedQuestion.length > 300) {
    throw serviceError('INVALID_FAQ_QUESTION', 400, 'Please enter a question between 1 and 300 characters.');
  }

  let response;
  try {
    response = await fetchImpl(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ question: normalizedQuestion, entry: 'support' }),
      signal: AbortSignal.timeout(3_500)
    });
  } catch {
    throw serviceError('FAQ_UNAVAILABLE', 503, 'FAQ service is temporarily unavailable. Please submit a repair request or contact support.');
  }
  if (!response.ok) {
    throw serviceError('FAQ_UNAVAILABLE', 503, 'FAQ service is temporarily unavailable. Please submit a repair request or contact support.');
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw serviceError('FAQ_UNAVAILABLE', 503, 'FAQ service returned an invalid response. Please submit a repair request or contact support.');
  }

  return {
    matched: body?.matched === true,
    mode: body?.mode === 'static' ? 'static' : 'fallback',
    title: safeText(body?.title, 240),
    steps: Array.isArray(body?.steps) ? body.steps.slice(0, 8).map((step) => safeText(step, 300)).filter(Boolean) : [],
    note: safeText(body?.note, 600),
    answer: safeText(body?.answer, 1_500),
    suggestedAction: allowedActions.has(body?.suggestedAction) ? body.suggestedAction : 'support'
  };
}
