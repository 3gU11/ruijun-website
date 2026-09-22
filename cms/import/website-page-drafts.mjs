const draft = (slug, title, sourceDocument, sections) => ({
  slug,
  title,
  language: 'zh-CN',
  sections,
  seo: {},
  status: 'draft',
  publication_state: 'unpublished',
  source_url: null,
  source_document: sourceDocument,
  review_note: '已从当前官网 Demo 整理为 CMS 草稿。文案、数字、资质、图片授权和公开范围均须审核后发布。'
});

const pageDrafts = Object.freeze([
  draft('home', '瑞钧智科中走丝线切割机床', 'demo/index.html', [
    { id: 'hero', title: '瑞钧智科中走丝线切割机床', body: '', label: '', href: '#reasons' },
    { id: 'why-ruijun', kicker: 'WHY RUIJUN', title: '选择瑞钧的三大理由', body: '围绕中走丝线切割机床的稳定性、效率和现场使用体验持续迭代。' },
    { id: 'marquee', title: '首页横移图文', items: [] },
    { id: 'performance', kicker: '增效降损', title: '增效降损', body: '效能提升50%，丝损降低30%', requires_claim_review: true },
    { id: 'advanced-manufacturing', kicker: 'ADVANCED MANUFACTURING', title: '30年技术沉淀，先进制造工厂', requires_claim_review: true },
    { id: 'industry-leadership', kicker: 'INDUSTRY LEADERSHIP', title: '产品销量稳居全国第一', requires_claim_review: true },
    { id: 'products', title: '我们的产品' },
    { id: 'history', title: '瑞钧智科的中走丝制造历史' },
    { id: 'product-task', kicker: 'RUIJUN MEDIUM SPEED WIRE CUT', title: '让下一台设备匹配你的加工任务', body: '通过工件、精度、节拍和自动化需求获得选型建议。', label: '获取选型建议', href: '/contact' }
  ]),
  draft('product', '产品展示', 'demo/product/index.html', [
    { id: 'hero', kicker: '我们的产品', title: 'Our product' },
    { id: 'categories', title: '选择瑞钧理由' },
    { id: 'proof-efficiency', title: '增效降损', body: '效能提升50%，丝损降低30%', requires_claim_review: true },
    { id: 'proof-years', title: '30 YEARS', body: '30年技术沉淀，先进智造工厂', requires_claim_review: true },
    { id: 'proof-champion', title: 'Champion', body: '销量持续领先，品质始终如一', requires_claim_review: true },
    { id: 'model-list', title: '产品系列' },
    { id: 'parameters', title: '技术参数' },
    { id: 'dimensions', title: '尺寸与资料' },
    { id: 'pagination', title: '更多产品', description: '没有符合条件的产品。' }
  ]),
  draft('manufacturing', '先进制造', 'demo/manufacturing/index.html', [
    { id: 'hero', title: '先进制造', body: '全产业链制造与严格质量控制。' },
    { id: 'process', title: '世界一流的生产工艺' },
    { id: 'precision-machining', title: 'CNC车间' },
    { id: 'sheet-metal', title: '钣金车间' },
    { id: 'standardized-assembly', title: '装配车间' },
    { id: 'whole-machine-validation', title: '精密检测' },
    { id: 'electrical-assembly', title: '电气装配' },
    { id: 'smart-warehouse', title: '智能物料仓储' },
    { id: 'core-equipment', title: '生产核心设备' }
  ]),
  draft('news', '视频新闻', 'website/pages/news.vue', [
    { id: 'hero', title: '视频新闻', body: '展示官方热门视频、展会新闻', label: '动态新闻', href: '#dynamic-news-title' },
    { id: 'dynamic-news', title: '动态新闻', description: '暂无动态新闻。' },
    { id: 'video-sharing', title: '视频分享', description: '暂无视频分享。' }
  ]),
  draft('about', '关于瑞钧', 'demo/about/index.html', [
    { id: 'hero', title: '专注微加工科学技术，为客户创造最大价值' },
    {
      id: 'brand-story',
      title: '品牌故事',
      body: '上世纪 90 年代初，二十来岁的年轻兄弟俩立足温州，经营线切割加工业务，并随父亲经销国营线切割机床。随着市场经济蓬勃发展，市场机床需求高涨，国营厂产能难以满足订单。1997 年，兄弟二人创办丰华数控，转型自主生产机床。\n\n2003 年“非典”市场遇冷，团队潜心研发，成功推出中走丝线切割机床。2006 年企业迁至产业区位更优的昆山，因“丰华”商标已被注册，取自兄弟姓名各一字，定名瑞钧。\n\n2013 年整机销量突破 1000 台；2014 年迁入新制造基地，2016 年扩建标准化产线，跻身行业头部。2022 年研发自动穿丝中走丝，迈向设备自动化。2023 年斥资数亿元在常熟建设 4.0 智慧工厂，引进百台加工母机，新工厂于 2025 年正式投产。'
    },
    {
      id: 'overview', kicker: '累计数万用户', title: '愿景：成为一家为客户创造更大价值的企业', description: '精神：专注、专业、诚信、创新',
      body: '瑞钧智科是一家专业研发、制造与销售电火花周边系统及数控机床的高新技术企业。公司始创于1997年，在江苏昆山、常熟建有制造基地，持续为客户提供智能化中走丝线切割机床。',
      items: ['我们拥有完全自主的产品设计、研发！', '我们拥有全产业链制造能力！', '我们拥有技术一流的员工团队！', '我们拥有先进的精良设备！', '我们拥有保证产品质量的严谨章程！', '我们拥有完善的售前、售中、售后服务！'].map((label) => ({ label }))
    },
    { id: 'history', title: '瑞钧智科的中走丝制造历史' },
    { id: 'factory', title: '厂区风貌', body: '厂区与制造能力素材需完成授权与媒体审核。' },
    { id: 'certificates', title: '认证证书', body: '证书编号、发证机构和有效期需由业务负责人核实。' },
    { id: 'honors', title: '荣誉证书' },
    { id: 'patents', title: '专利证书', description: '79件专利，其中发明专利9件', requires_claim_review: true },
    { id: 'partners', title: '众多世界知名品牌厂家和供应商合作' },
    { id: 'clients-domestic', title: '国内客户' },
    { id: 'clients-global', title: '国外客户' }
  ]),
  draft('service', '服务支持', 'demo/service/index.html', [
    { id: 'hero', kicker: 'SERVICE & SUPPORT', title: '从设备选型到持续稳定生产', body: '围绕选型咨询、设备交付与售后响应，提供清晰、直接的服务入口。' },
    { id: 'online-service', title: '在线售后服务', body: '先让 AI 确认设备情况和服务目标，再在需要提交或查询时打开对应页面。' },
    { id: 'service-faq', title: '常见服务问题', body: '涉及具体设备状态时，以售后工程师确认结果为准。' },
    { id: 'contact', title: '联系瑞钧', body: '设备选型和工厂来访由 AI 协助整理信息，再安排后续沟通。' }
  ])
]);

export function buildWebsitePageDrafts() {
  return structuredClone(pageDrafts);
}
