import { buildKnowledgeTechnicalReviewReport } from '../reports/knowledge-review-report.mjs';

async function fetchKnowledgeItems({ baseUrl, accessToken, fetchImpl = fetch }) {
  const root = String(baseUrl || '').replace(/\/$/, '');
  if (!root || !accessToken) throw new TypeError('CMS_BASE_URL and CMS_WRITE_TOKEN are required');
  const fields = [
    'id', 'source_key', 'source_document', 'category', 'question_title', 'troubleshooting_steps', 'risk_level', 'safety_preconditions',
    'escalation_guidance', 'version', 'technical_reviewer', 'visibility', 'channel', 'status', 'publication_state'
  ];
  const response = await fetchImpl(`${root}/items/knowledge_items?limit=-1&fields=${encodeURIComponent(fields.join(','))}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error(`Unable to read knowledge review records: ${response.status}`);
  return (await response.json()).data || [];
}

if (import.meta.main) {
  const items = await fetchKnowledgeItems({ baseUrl: process.env.CMS_BASE_URL, accessToken: process.env.CMS_WRITE_TOKEN });
  process.stdout.write(buildKnowledgeTechnicalReviewReport(items));
}

export { fetchKnowledgeItems };
