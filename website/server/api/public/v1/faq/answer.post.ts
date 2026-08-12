import { readBody, setResponseStatus } from 'h3';
import { answerStaticFaq } from '../../../../services/static-faq.mjs';

const validEntries = new Set(['support', 'request', 'warranty', 'requests', 'sales', 'visit']);

function difyUserId(event: any) {
  const forwarded = String(event.node.req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const remote = String(event.node.req.socket?.remoteAddress || 'anonymous');
  const source = (forwarded || remote).replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 80) || 'anonymous';
  return `${useRuntimeConfig().difyUserPrefix}-${source}`;
}

async function answerWithDify(event: any, question: string) {
  const config = useRuntimeConfig();
  const baseUrl = String(config.difyBaseUrl || '').replace(/\/$/, '');
  const apiKey = String(config.difyApiKey || '').trim();
  if (!baseUrl || !apiKey) return null;

  const response = await fetch(`${baseUrl}/chat-messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      inputs: { source_channel: 'website', page_type: 'page', page_slug: String(event.path || '').slice(0, 120) },
      query: question,
      response_mode: 'blocking',
      conversation_id: '',
      user: difyUserId(event)
    }),
    signal: AbortSignal.timeout(90_000)
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.answer) {
    throw new Error(`Dify returned HTTP ${response.status}`);
  }

  const resources = Array.isArray(payload?.metadata?.retriever_resources)
    ? payload.metadata.retriever_resources
    : [];
  const citations = resources
    .map((item: any) => ({
      id: String(item?.document_id || item?.segment_id || ''),
      title: String(item?.document_name || '知识条目'),
      version: String(item?.document_version || item?.version || '')
    }))
    .filter((item: any) => item.id);

  return {
    matched: true,
    mode: 'dify',
    title: '瑞钧客服',
    answer: String(payload.answer),
    citations
  };
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const question = String(body?.question || '').trim();
    const entry = String(body?.entry || 'support').trim();
    if (!question || question.length > 300 || !validEntries.has(entry)) {
      setResponseStatus(event, 400);
      return { code: 'INVALID_FAQ_REQUEST', message: '请输入 1 至 300 个字符的问题' };
    }
    try {
      const difyAnswer = await answerWithDify(event, question);
      if (difyAnswer) return difyAnswer;
    } catch {
      setResponseStatus(event, 502);
      return { code: 'DIFY_UNAVAILABLE', message: '客服问答服务暂时不可用' };
    }
    return answerStaticFaq(question);
  } catch {
    setResponseStatus(event, 400);
    return { code: 'INVALID_FAQ_REQUEST', message: '问题格式无效' };
  }
});
