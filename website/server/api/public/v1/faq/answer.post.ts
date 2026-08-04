import { readBody, setResponseStatus } from 'h3';
import { answerStaticFaq } from '../../../../services/static-faq.mjs';

const validEntries = new Set(['support', 'request', 'warranty', 'requests', 'sales', 'visit']);

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const question = String(body?.question || '').trim();
    const entry = String(body?.entry || 'support').trim();
    if (!question || question.length > 300 || !validEntries.has(entry)) {
      setResponseStatus(event, 400);
      return { code: 'INVALID_FAQ_REQUEST', message: '请输入 1 至 300 个字符的问题' };
    }
    return answerStaticFaq(question);
  } catch {
    setResponseStatus(event, 400);
    return { code: 'INVALID_FAQ_REQUEST', message: '问题格式无效' };
  }
});
