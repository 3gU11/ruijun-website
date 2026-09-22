const pageRoutes = Object.freeze({
  home: '/', product: '/product', products: '/product', manufacturing: '/manufacturing',
  news: '/news', about: '/about', service: '/service', contact: '/contact'
});

function cleanSegment(value) {
  const text = String(value || '').trim();
  return text && !/[/?#]/.test(text) ? encodeURIComponent(text) : '';
}

function selectorValue(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function itemSelector(value) {
  return value == null || value === '' ? '' : `[data-cms-preview-key="${selectorValue(value)}"]`;
}

function result(path, hash = '', label = '草稿内容', selector = '') {
  return selector ? { path, hash, label, selector } : { path, hash, label };
}

export function resolveCmsPreviewTarget(collection, preview = {}) {
  const name = String(collection || '');
  if (name === 'homepage_sections') {
    return result('/', '', preview.title || preview.section_key || '首页区块', itemSelector(preview.section_key));
  }
  if (name === 'pages') {
    const slug = String(preview.slug || '').trim().toLowerCase();
    const sectionKey = String(preview.section_key || '').trim();
    const target = result(
      pageRoutes[slug] || '/preview',
      sectionKey || (slug === 'home' ? 'home' : ''),
      preview.title || '页面内容',
      itemSelector(sectionKey)
    );
    if (sectionKey) target.omitHash = true;
    return target;
  }
  if (name === 'articles') {
    // The detail page receives the authorized draft through the client-side
    // preview overlay. Its public BFF remains unchanged and still rejects an
    // unpublished article outside a preview session.
    const slug = cleanSegment(preview.slug);
    const sectionKey = String(preview.section_key || '').trim();
    if (slug && ['dynamic-news', 'video-sharing'].includes(sectionKey)) {
      return result('/news', '', preview.title || '新闻文章', itemSelector(slug));
    }
    return slug
      ? result(`/news/${slug}`, '', preview.title || '新闻文章', itemSelector('cms-preview-article'))
      : result('/news', 'dynamic-news-title', preview.title || '新闻文章');
  }
  if (name === 'product_series') return result('/product', 'catalog-title', preview.name || '产品系列', itemSelector(preview.series_code || preview.slug));
  if (name === 'product_models') {
    const slug = cleanSegment(preview.slug || preview.model_code);
    return result(slug ? `/product/${slug}` : '/product', 'product-details', preview.name || preview.model_code || '产品型号');
  }
  if (name === 'product_parameters' || name === 'case_studies') {
    const model = cleanSegment(preview.model_code);
    return result(model ? `/product/${model}` : '/product', name === 'product_parameters' ? 'specifications' : 'case-studies', name === 'product_parameters' ? '产品参数' : '客户案例');
  }
  if (name === 'manufacturing_evidence') {
    const key = String(preview.source_key || preview.process || '').toLowerCase();
    const hash = key.includes('assembly') ? 'assembly' : key.includes('validation') || key.includes('inspection') ? 'inspection' : 'cnc';
    return result('/manufacturing', hash, preview.process || '制造工序');
  }
  if (name === 'milestones') return result('/about', 'history', `${preview.year || ''} ${preview.event || ''}`.trim() || '发展历程', itemSelector(preview.source_key || preview.year));
  if (name === 'qualifications') {
    const type = String(preview.type || '').toLowerCase();
    return result('/about', type === 'patent' ? 'patent-title' : type === 'honor' ? 'honor-title' : 'certificate-title', preview.name || '资质证书');
  }
  if (name === 'service_resources') {
    const type = String(preview.type || '').toLowerCase();
    return result(type === 'video' ? '/service/video' : '/service/download', type === 'video' ? 'service-video-list' : 'service-download-list', preview.title || '服务资料', itemSelector(preview.source_key));
  }
  if (name === 'knowledge_items') {
    const faults = String(preview.category || '').toLowerCase() === 'fault_analysis';
    return result(faults ? '/service/faults' : '/service/knowledge', 'service-knowledge-list', preview.question_title || '知识内容', itemSelector(preview.source_key));
  }
  if (name === 'service_locations') return result('/service', 'office-directory-title', `${preview.region || ''}${preview.city || ''}` || '服务网点', itemSelector(preview.source_key));
  if (name === 'repair_page_configs') return result('/service', 'ruijun-support', preview.title || '售后服务');
  if (name === 'external_service_entries') return result('/service', 'ruijun-support', '售后入口');
  if (name === 'site_settings') return result('/', 'home', '全站设置');
  return result('/preview', '', '草稿内容');
}

export function previewTargetLocation(target) {
  const path = target?.path || '/preview';
  const separator = path.includes('?') ? '&' : '?';
  const hash = target?.omitHash ? '' : String(target?.hash || '');
  return `${path}${separator}cmsPreview=1${hash ? `#${encodeURIComponent(hash)}` : ''}`;
}
