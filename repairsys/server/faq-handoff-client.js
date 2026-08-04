function serviceError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizedBaseUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return /^https?:$/.test(url.protocol) ? url.toString().replace(/\/$/, '') : '';
  } catch {
    return '';
  }
}

export async function redeemFaqHandoff({ baseUrl, internalKey, token, timeoutMs = 3500, fetchImpl = fetch }) {
  const endpoint = normalizedBaseUrl(baseUrl);
  const handoffToken = String(token || '').trim();
  if (!endpoint || !String(internalKey || '').trim()) {
    throw serviceError('FAQ 交接服务尚未配置', 503);
  }
  if (handoffToken.length < 32 || handoffToken.length > 128) {
    throw serviceError('FAQ 交接令牌格式无效', 400);
  }

  let response;
  try {
    response = await fetchImpl(`${endpoint}/api/internal/v1/faq-handoffs/${encodeURIComponent(handoffToken)}/redeem`, {
      method: 'POST',
      headers: { 'X-FAQ-Internal-Key': String(internalKey).trim(), Accept: 'application/json' },
      signal: AbortSignal.timeout(Math.max(1000, Number(timeoutMs) || 3500))
    });
  } catch {
    throw serviceError('FAQ 交接服务暂时不可用，请直接填写维修申请', 503);
  }
  if (!response.ok) {
    throw serviceError(
      response.status === 410 || response.status === 404 ? 'FAQ 交接已过期或已使用，请重新生成' : 'FAQ 交接暂时无法读取，请直接填写维修申请',
      response.status === 410 || response.status === 404 ? 410 : 503
    );
  }
  try {
    return await response.json();
  } catch {
    throw serviceError('FAQ 交接暂时无法读取，请直接填写维修申请', 503);
  }
}
