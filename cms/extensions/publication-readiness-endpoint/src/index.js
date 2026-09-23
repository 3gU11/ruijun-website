import { MediaAssetGovernanceError, assertMediaAssetRecord } from '../../../content-workflow/media-asset-governance.mjs';
import { assessProductModel, assessProductSeries } from '../../../reports/product-review-rules.mjs';
import { buildPublicationReadiness } from '../../../reports/publication-readiness-report.mjs';
import { assessArticle, assessCaseStudy, assessProductParameter, assessPublicKnowledge } from '../../../reports/public-content-review-rules.mjs';
import { assessServiceEntry, assessServiceLocation, assessServiceResource } from '../../../reports/service-content-review-report.mjs';
import { assessManufacturingEvidence, assessMilestone, assessQualification } from '../../../reports/website-evidence-review-rules.mjs';

async function publisherActor(database, accountability) {
  if (!accountability?.user) return null;
  if (accountability.admin) return { id: accountability.user };
  const role = accountability.role ? await database('directus_roles').where({ id: accountability.role }).first() : null;
  return role?.name === '发布人员' ? { id: accountability.user } : null;
}

async function records(database, collection, fields) {
  const value = await database(collection).select(fields);
  return Array.isArray(value) ? value : [];
}

function json(value, fallback) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

const mediaGovernanceBlockers = Object.freeze({
  MEDIA_FILE_NOT_FOUND: '上传文件不可用',
  MEDIA_TYPE_INVALID: '媒体格式不允许',
  MEDIA_EXTENSION_INVALID: '文件扩展名与媒体类型不一致',
  MEDIA_METADATA_INVALID: '文件元数据不完整',
  MEDIA_FILE_TOO_LARGE: '文件超过大小限制',
  MEDIA_USAGE_SCOPE_INVALID: '使用范围无效',
  MEDIA_FILE_METADATA_MISMATCH: '媒体元数据与上传文件不一致',
  MEDIA_COPYRIGHT_STATUS_INVALID: '版权状态无效'
});

function assessMediaAsset(asset, filesById) {
  const issues = [];
  try {
    assertMediaAssetRecord(asset, filesById.get(String(asset.file_id || '')));
  } catch (error) {
    if (!(error instanceof MediaAssetGovernanceError)) throw error;
    issues.push(mediaGovernanceBlockers[error.code] || '媒体治理校验未通过');
  }
  if (asset.copyright_status === 'pending_review') issues.push('版权状态待审核');
  return issues;
}

export function registerPublicationReadinessEndpoint(router, { database }) {
  router.get('/', async (req, res, next) => {
    try {
      const actor = await publisherActor(database, req.accountability);
      if (!actor) return res.status(403).json({ errors: [{ message: 'Only publishers may view publication readiness' }] });
      const [series, models, parameters, cases, manufacturing, qualifications, milestones, resources, locations, entries, knowledge, articles, pages, settings, media, files] = await Promise.all([
        records(database, 'product_series', ['id', 'name', 'series_code', 'source_document', 'source_url', 'import_evidence', 'status', 'publication_state']),
        records(database, 'product_models', ['id', 'name', 'model_code', 'series_code', 'source_document', 'source_url', 'parameters', 'import_evidence', 'status', 'publication_state']),
        records(database, 'product_parameters', ['id', 'model_code', 'field_name', 'value', 'source_document', 'source_url', 'status', 'publication_state']),
        records(database, 'case_studies', ['id', 'slug', 'industry', 'material', 'thickness', 'model_code', 'process', 'result', 'authorization_status', 'source_document', 'source_url', 'status', 'publication_state']),
        records(database, 'manufacturing_evidence', ['id', 'source_key', 'process', 'description', 'media', 'inspection_evidence', 'source_document', 'source_url', 'status', 'publication_state']),
        records(database, 'qualifications', ['id', 'source_key', 'type', 'name', 'certificate_number', 'issuer', 'valid_until', 'assets', 'authorization_status', 'source_document', 'source_url', 'status', 'publication_state']),
        records(database, 'milestones', ['id', 'source_key', 'year', 'event', 'evidence', 'source_document', 'source_url', 'status', 'publication_state']),
        records(database, 'service_resources', ['id', 'source_key', 'type', 'source_document', 'source_url', 'asset', 'version', 'updated_at', 'status', 'publication_state']),
        records(database, 'service_locations', ['id', 'source_key', 'region', 'city', 'service_scope', 'contact', 'business_status', 'valid_until', 'status', 'publication_state']),
        records(database, 'external_service_entries', ['id', 'entry_type', 'url', 'enabled', 'open_mode', 'fallback_phone', 'health_status', 'status', 'publication_state']),
        records(database, 'knowledge_items', ['id', 'source_key', 'source_document', 'source_url', 'visibility', 'channel', 'category', 'question_title', 'troubleshooting_steps', 'risk_level', 'safety_preconditions', 'escalation_guidance', 'version', 'technical_reviewer', 'status', 'publication_state']),
        records(database, 'articles', ['id', 'slug', 'category', 'title', 'summary', 'body', 'video_url', 'cover_asset', 'seo', 'source_document', 'source_url', 'status', 'publication_state']),
        records(database, 'pages', ['id', 'slug', 'title', 'language', 'sections', 'seo', 'source_document', 'source_url', 'status', 'publication_state']),
        records(database, 'site_settings', ['id', 'setting_key', 'navigation', 'footer', 'brand', 'contacts', 'source_document', 'source_url', 'status', 'publication_state']),
        records(database, 'media_assets', ['id', 'file_id', 'original_file_name', 'mime_type', 'byte_size', 'usage_scope', 'copyright_status', 'status', 'publication_state']),
        records(database, 'directus_files', ['id', 'filename_download', 'type', 'filesize'])
      ]);
      const filesById = new Map(files.map((file) => [String(file.id), file]));
      const report = buildPublicationReadiness({
        series: series.map((item) => { const normalized = { ...item, import_evidence: json(item.import_evidence, {}) }; return { ...normalized, issues: assessProductSeries(normalized) }; }),
        products: models.map((item) => { const normalized = { ...item, parameters: json(item.parameters, {}), import_evidence: json(item.import_evidence, {}) }; return { ...normalized, issues: assessProductModel(normalized) }; }),
        parameters: parameters.map((item) => ({ id: item.id, label: [item.model_code, item.field_name].filter(Boolean).join(' / '), status: item.status, publication_state: item.publication_state, issues: assessProductParameter(item) })),
        cases: cases.map((item) => ({ id: item.id, label: item.slug, status: item.status, publication_state: item.publication_state, issues: assessCaseStudy(item) })),
        manufacturing: manufacturing.map((item) => {
          const normalized = { ...item, media: json(item.media, []) };
          return { id: item.id, label: item.process, status: item.status, publication_state: item.publication_state, issues: assessManufacturingEvidence(normalized) };
        }),
        qualifications: qualifications.map((item) => {
          const normalized = { ...item, assets: json(item.assets, []) };
          return { id: item.id, label: item.name, status: item.status, publication_state: item.publication_state, issues: assessQualification(normalized) };
        }),
        milestones: milestones.map((item) => ({ id: item.id, label: String(item.year ?? ''), status: item.status, publication_state: item.publication_state, issues: assessMilestone(item) })),
        services: [
          ...resources.map((item) => ({ ...item, collection: 'service_resources', label: item.source_key, issues: assessServiceResource(item) })),
          ...locations.map((item) => {
            const normalized = { ...item, contact: json(item.contact, {}) };
            return {
              id: item.id,
              collection: 'service_locations',
              label: [item.region, item.city].filter((part) => typeof part === 'string' && part.trim()).join(' '),
              status: item.status,
              publication_state: item.publication_state,
              issues: assessServiceLocation(normalized)
            };
          }),
          ...entries.map((item) => ({ ...item, collection: 'external_service_entries', label: item.entry_type, issues: assessServiceEntry(item).issues }))
        ],
        knowledge: knowledge
          .filter((item) => typeof item.visibility === 'string' && item.visibility.trim() === 'public')
          .map((item) => {
            const normalized = { ...item, troubleshooting_steps: json(item.troubleshooting_steps, []), safety_preconditions: json(item.safety_preconditions, []) };
            return { id: item.id, label: item.question_title, status: item.status, publication_state: item.publication_state, issues: assessPublicKnowledge(normalized) };
          }),
        articles: articles.map((item) => { const normalized = { ...item, seo: json(item.seo, {}) }; return { ...normalized, issues: assessArticle(normalized) }; }),
        pages: pages.map((item) => ({ ...item, sections: json(item.sections, []), seo: json(item.seo, {}) })),
        settings: settings.map((item) => ({ ...item, navigation: json(item.navigation, []), footer: json(item.footer, {}), brand: json(item.brand, {}), contacts: json(item.contacts, {}) })),
        media: media.map((item) => ({ id: item.id, label: item.original_file_name, status: item.status, publication_state: item.publication_state, issues: assessMediaAsset(item, filesById) }))
      });
      return res.status(200).json({ data: report });
    } catch (error) {
      return next(error);
    }
  });
}

export default {
  id: 'publication-readiness',
  handler(router, context) {
    registerPublicationReadinessEndpoint(router, context);
  }
};
