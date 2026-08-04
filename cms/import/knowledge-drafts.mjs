import { createHash } from 'node:crypto';

function stableSourceKey(sourcePath, rowIndex) {
  return `faq-${createHash('sha256').update(`${sourcePath}:${rowIndex}`).digest('hex').slice(0, 24)}`;
}

function sourceCategory(sourcePath) {
  if (sourcePath.includes('伺服')) return 'servo_error';
  if (sourcePath.includes('步进')) return 'stepper_fault';
  if (sourcePath.includes('机械')) return 'mechanical_fault';
  if (sourcePath.includes('自动穿丝')) return 'auto_threading';
  if (sourcePath.includes('面板')) return 'control_panel';
  return 'general_support';
}

function sourceRiskLevel(category) {
  return category === 'control_panel' ? 'medium' : 'high';
}

function draftUpdatePayload(draft) {
  const { status, publication_state, published_at, published_by, publication_log, reviewed_by, reviewed_at, ...content } = draft;
  return content;
}

function titleFromContent(content) {
  const line = String(content || '').split(/\r?\n/).find((candidate) => candidate.trim()) || '待审核 FAQ 知识';
  return line
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/^\s*\d+[.、]\s*/, '')
    .replace(/[：:。]+$/, '')
    .trim()
    .slice(0, 180) || '待审核 FAQ 知识';
}

export function parseSingleColumnCsv(csv) {
  const rows = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < String(csv || '').length; index += 1) {
    const character = String(csv)[index];
    const next = String(csv)[index + 1];
    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && next === '\n') index += 1;
      rows.push(value);
      value = '';
    } else {
      value += character;
    }
  }
  if (value || String(csv || '').endsWith(',')) rows.push(value);
  const [header, ...records] = rows.map((row) => row.replace(/^\uFEFF/, '').trim()).filter(Boolean);
  if (!header) return [];
  return records;
}

export function buildKnowledgeDrafts(sources) {
  return sources.flatMap(({ sourcePath, content }) => {
    const category = sourceCategory(sourcePath);
    return parseSingleColumnCsv(content).map((record, index) => ({
      source_key: stableSourceKey(sourcePath, index + 1),
      visibility: 'support_internal',
      channel: 'both',
      category,
      question_title: titleFromContent(record),
      applicable_models: [],
      error_codes: [],
      symptoms: '',
      troubleshooting_steps: [{ type: 'source_markdown', content: record }],
      risk_level: sourceRiskLevel(category),
      media: [],
      version: 'source-1',
      technical_reviewer: '',
      dify_sync_status: 'not_eligible',
      source_document: `FAQ/Dify知识库.zip::${sourcePath}`,
      review_note: 'Imported from FAQ archive. Technical review, risk boundary, visibility, and Dify eligibility are required before publication.',
      status: 'draft',
      publication_state: 'unpublished'
    }));
  });
}

async function requestError(response) {
  const body = await response.json().catch(() => null);
  const detail = body?.errors?.[0]?.message || body?.errors?.[0]?.extensions?.reason || body?.message || '';
  return new Error(`Directus knowledge import failed with status ${response.status}${detail ? `: ${detail}` : ''}`);
}

export function createDirectusKnowledgeSeeder({ baseUrl, accessToken, fetchImpl = fetch }) {
  const root = String(baseUrl || '').replace(/\/$/, '');
  if (!root || !accessToken) throw new TypeError('baseUrl and accessToken are required');
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  async function find(sourceKey) {
    const response = await fetchImpl(`${root}/items/knowledge_items?filter[source_key][_eq]=${encodeURIComponent(sourceKey)}&fields=id,status,publication_state`, { headers });
    if (!response.ok) throw await requestError(response);
    return (await response.json()).data?.[0] || null;
  }

  async function write(method, path, body) {
    const response = await fetchImpl(`${root}${path}`, { method, headers, body: JSON.stringify(body) });
    if (!response.ok) throw await requestError(response);
  }

  return {
    async seed(drafts) {
      const result = { created: 0, updated: 0, skippedReviewed: 0 };
      for (const draft of drafts) {
        const existing = await find(draft.source_key);
        if (!existing) {
          await write('POST', '/items/knowledge_items', draft);
          result.created += 1;
        } else if (existing.status === 'draft' && existing.publication_state === 'unpublished') {
          await write('PATCH', `/items/knowledge_items/${encodeURIComponent(existing.id)}`, draftUpdatePayload(draft));
          result.updated += 1;
        } else {
          result.skippedReviewed += 1;
        }
      }
      return result;
    }
  };
}
