function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function record(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function list(value) { return Array.isArray(value) ? value : []; }
function hasRecordValues(value) { return Object.values(record(value)).some((item) => item != null && (typeof item !== 'string' || item.trim())); }
export function assessPage(page) {
  const issues = [];
  if (!text(page?.slug)) issues.push('页面标识');
  if (!text(page?.title)) issues.push('页面标题');
  if (!text(page?.language)) issues.push('语言');
  if (!text(page?.source_document) && !text(page?.source_url)) issues.push('来源文件或地址');
  const sections = list(page?.sections);
  if (!sections.length) issues.push('页面段落');
  if (!hasRecordValues(page?.seo)) issues.push('SEO 信息');
  if (sections.some((section) => record(section).requires_claim_review === true)) issues.push('宣传声明待审核');
  return issues;
}
export function assessSiteSettings(settings) {
  const issues = [];
  if (!text(settings?.setting_key)) issues.push('设置标识');
  const navigation = list(settings?.navigation);
  if (!navigation.length || navigation.some((item) => !text(record(item).label) || !/^\/[a-z0-9/-]*$/i.test(text(record(item).href)))) issues.push('全站导航');
  if (!hasRecordValues(settings?.footer)) issues.push('页脚信息');
  if (!text(record(settings?.brand).display_name) || !text(record(settings?.brand).logo_asset)) issues.push('品牌信息');
  if (!hasRecordValues(settings?.contacts)) issues.push('联系方式');
  if (!text(settings?.source_document) && !text(settings?.source_url)) issues.push('来源文件或地址');
  if (record(settings?.footer).requires_business_review === true) issues.push('页脚业务信息待审核');
  return issues;
}
function readiness(type, record, label, extra = [], editTarget = null) {
  const blockers = [];
  if (record?.status !== 'published' || record?.publication_state !== 'published') blockers.push('未完成发布');
  for (const issue of extra) if (text(issue) && !blockers.includes(text(issue))) blockers.push(text(issue));
  const item = { type, label: text(label) || '未命名内容', blockers };
  if (editTarget?.collection && record?.id != null) {
    item.edit_path = `/admin/content/${encodeURIComponent(editTarget.collection)}/${encodeURIComponent(String(record.id))}`;
  }
  return item;
}
export function buildPublicationReadiness({ series = [], products = [], parameters = [], cases = [], manufacturing = [], qualifications = [], milestones = [], services = [], knowledge = [], articles = [], pages = [], settings = [], media = [] } = {}) {
  const items = [
    ...series.map((item) => readiness('series', item, item.name || item.series_code, item.issues || [], { collection: 'product_series' })),
    ...products.map((item) => readiness('product', item, item.name, item.issues || [], { collection: 'product_models' })),
    ...parameters.map((item) => readiness('parameter', item, item.label, item.issues || [], { collection: 'product_parameters' })),
    ...cases.map((item) => readiness('case', item, item.label, item.issues || [], { collection: 'case_studies' })),
    ...manufacturing.map((item) => readiness('manufacturing', item, item.label, item.issues || [], { collection: 'manufacturing_evidence' })),
    ...qualifications.map((item) => readiness('qualification', item, item.label, item.issues || [], { collection: 'qualifications' })),
    ...milestones.map((item) => readiness('milestone', item, item.label, item.issues || [], { collection: 'milestones' })),
    ...services.map((item) => readiness('service', item, item.label, item.issues || [], { collection: item.collection })),
    ...knowledge.map((item) => readiness('knowledge', item, item.label, item.issues || [], { collection: 'knowledge_items' })),
    ...articles.map((item) => readiness('article', item, item.title, Array.isArray(item.issues) ? item.issues : (text(item.body) || text(item.video_url) ? [] : ['正文']), { collection: 'articles' })),
    ...pages.map((item) => readiness('page', item, item.title || item.slug, assessPage(item), { collection: 'pages' })),
    ...settings.map((item) => readiness('setting', item, item.setting_key, assessSiteSettings(item), { collection: 'site_settings' })),
    ...media.map((item) => readiness('media', item, item.label, item.issues || [], { collection: 'media_assets' }))
  ];
  return { summary: { ready: items.filter((item) => !item.blockers.length).length, blocked: items.filter((item) => item.blockers.length).length }, items };
}
