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
    { id: 'why-ruijun', kicker: 'WHY RUIJUN', title: '选择瑞钧的三大理由', body: '围绕中走丝线切割机床的稳定性、效率和现场使用体验持续迭代。' },
    { id: 'performance', kicker: 'PERFORMANCE', title: '产品效率性能提升 50%', requires_claim_review: true },
    { id: 'advanced-manufacturing', kicker: 'ADVANCED MANUFACTURING', title: '30年技术沉淀，先进制造工厂', requires_claim_review: true },
    { id: 'industry-leadership', kicker: 'INDUSTRY LEADERSHIP', title: '产品销量稳居全国第一', requires_claim_review: true },
    { id: 'product-task', kicker: 'RUIJUN MEDIUM SPEED WIRE CUT', title: '让下一台设备匹配你的加工任务', body: '通过工件、精度、节拍和自动化需求获得选型建议。' }
  ]),
  draft('about', '关于瑞钧', 'demo/about/index.html', [
    { id: 'hero', title: '专注微加工科学技术，为客户创造最大价值' },
    { id: 'history', title: '瑞钧智科的中走丝制造历史' },
    { id: 'factory', title: '厂区风貌', body: '厂区与制造能力素材需完成授权与媒体审核。' },
    { id: 'certificates', title: '认证证书', body: '证书编号、发证机构和有效期需由业务负责人核实。' },
    { id: 'patents', title: '专利证书 79件专利，其中发明专利9件', requires_claim_review: true }
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
