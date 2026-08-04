const siteSettingsDraft = Object.freeze({
  setting_key: 'global',
  navigation: [
    { label: '产品中心', href: '/product' },
    { label: '先进智造', href: '/manufacturing' },
    { label: '关于我们', href: '/about' },
    { label: '服务支持', href: '/service' }
  ],
  footer: {
    primary_links: [
      { label: '产品中心', href: '/product' },
      { label: '先进智造', href: '/manufacturing' },
      { label: '关于我们', href: '/about' },
      { label: '服务支持', href: '/service' }
    ],
    requires_business_review: true,
    review_scope: ['企业法定名称', '营业地址', '备案信息', '隐私主体', '新闻媒体路由']
  },
  brand: {
    display_name: '瑞钧智科',
    logo_asset: '/assets/ruijun-logo.png'
  },
  contacts: {
    service_phone: '150 5016 6844',
    header_cta: { label: '获取方案', href: '/service' }
  },
  languages: ['zh-CN'],
  analytics: {},
  status: 'draft',
  publication_state: 'unpublished',
  source_url: null,
  source_document: 'website/components/SiteHeader.vue',
  review_note: '全局导航、品牌信息和售后电话已按当前官网 Demo 建立草稿。企业主体、地址、备案、隐私主体、新闻路由及任何新增联系方式均须业务审核后发布。'
});

export function buildSiteSettingsDraft() {
  return structuredClone(siteSettingsDraft);
}
