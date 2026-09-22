function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function record(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function list(value) { return Array.isArray(value) ? value : []; }
function hasRecordValues(value) { return Object.values(record(value)).some((item) => item != null && (typeof item !== 'string' || item.trim())); }

function parsed(value, fallback) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function boundedNumber(value, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum;
}

function sectionPresentationIssues(section) {
  const value = record(section);
  const issues = [];
  const layout = record(value.layout);
  const textStyle = record(value.text_style);
  const responsive = record(value.responsive);
  const media = record(value.media_presentation);
  const desktop = record(layout.desktop);
  const mobile = record(layout.mobile);
  const offsets = [desktop.offset_x, desktop.offset_y, mobile.offset_x, mobile.offset_y];
  if (offsets.some((item) => item !== undefined && !boundedNumber(item, -30, 30))) issues.push('页面段落位置');
  if (layout.z_index !== undefined && (!Number.isInteger(Number(layout.z_index)) || Number(layout.z_index) < 0 || Number(layout.z_index) > 9)) issues.push('页面段落层级');
  for (const key of ['size_desktop', 'size_mobile']) {
    const maximum = key === 'size_desktop' ? 120 : 72;
    if (textStyle[key] !== undefined && !boundedNumber(textStyle[key], 0, maximum)) issues.push('页面段落文字样式');
  }
  if (textStyle.weight !== undefined && (!Number.isInteger(Number(textStyle.weight)) || Number(textStyle.weight) < 300 || Number(textStyle.weight) > 800)) issues.push('页面段落文字样式');
  if (textStyle.line_height !== undefined && !boundedNumber(textStyle.line_height, 1, 2.2)) issues.push('页面段落文字样式');
  if (textStyle.color !== undefined && textStyle.color !== '' && !/^#[0-9a-f]{6}$/i.test(String(textStyle.color).trim())) issues.push('页面段落文字颜色');
  if (responsive.enabled === true && responsive.desktop_visible === false && responsive.tablet_visible === false && responsive.mobile_visible === false) issues.push('页面段落响应式显示');
  if (media.focal_x !== undefined && !boundedNumber(media.focal_x, 0, 100)) issues.push('页面段落媒体焦点');
  if (media.focal_y !== undefined && !boundedNumber(media.focal_y, 0, 100)) issues.push('页面段落媒体焦点');
  if (media.poster_asset_id !== undefined && media.poster_asset_id !== '' && !String(media.poster_asset_id).trim()) issues.push('页面段落媒体海报');
  return issues;
}

export function assessPageSection(section, index = 0) {
  const value = record(section);
  const issues = [];
  const id = text(value.id || value.key);
  if (!id) issues.push(`页面段落${index + 1}标识`);
  if (id && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(id)) issues.push('页面段落标识格式');
  for (const field of ['title', 'kicker', 'label', 'shortTitle', 'introTitle']) {
    if (value[field] != null && text(value[field]).length > 240) issues.push('页面段落文字长度');
  }
  for (const field of ['body', 'description', 'introDetail']) {
    if (value[field] != null && text(value[field], 25000).length > 20000) issues.push('页面段落正文长度');
  }
  if (Array.isArray(value.media) && value.media.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) issues.push('页面段落媒体引用');
  const pagination = record(value.pagination);
  if (pagination.page_size !== undefined && (!Number.isInteger(Number(pagination.page_size)) || Number(pagination.page_size) < 1 || Number(pagination.page_size) > 6)) issues.push('分页数量');
  if (pagination.sort !== undefined && !['manual', 'published_at_desc', 'sort_order_asc'].includes(String(pagination.sort))) issues.push('分页排序');
  issues.push(...sectionPresentationIssues(value));
  return [...new Set(issues)];
}

export function assessPage(page) {
  const issues = [];
  if (!text(page?.slug)) issues.push('页面标识');
  if (!text(page?.title)) issues.push('页面标题');
  if (!text(page?.language)) issues.push('语言');
  if (!text(page?.source_document) && !text(page?.source_url)) issues.push('来源文件或地址');
  const sections = list(parsed(page?.sections, []));
  if (!sections.length) issues.push('页面段落');
  const sectionIds = new Set();
  sections.forEach((section, index) => {
    for (const issue of assessPageSection(section, index)) {
      if (issue === '页面段落标识格式' || issue.startsWith('页面段落')) issues.push(issue);
      else if (issue === '分页数量' || issue === '分页排序') issues.push(issue);
    }
    const id = text(record(section).id || record(section).key);
    if (id && sectionIds.has(id)) issues.push('页面段落标识重复');
    if (id) sectionIds.add(id);
  });
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
