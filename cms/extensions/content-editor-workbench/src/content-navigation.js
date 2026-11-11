// Left-rail navigation catalog: which sections each site area exposes and how the
// workbench labels them. Extracted from module.vue so the SFC stays readable.

export const siteAreaLabels = Object.freeze({
  home: '网站主页',
  product: '产品展示',
  manufacturing: '先进制造',
  news: '视频新闻',
  about: '关于瑞钧',
  service: '服务支持'
});
export const siteAreaContentMap = Object.freeze({
  home: [
    { key: 'homepage-video', label: '首页视频', sectionKey: 'hero' },
    { key: 'homepage-reasons', label: '三大特点', sectionKey: 'why-ruijun' },
    { key: 'homepage-products', label: '产品系列展示图', sectionKey: 'products' },
    { key: 'homepage-history', label: '时间轴', sectionKey: 'history' },
    { key: 'homepage-product-task', label: '选型咨询', sectionKey: 'product-task' }
  ],
  product: [
    { key: 'product-hero', label: '产品首屏', sectionKey: 'hero' },
    { key: 'product-proofs', label: '三大指标', sectionKey: 'categories' },
    { key: 'product-series', label: '产品系列与型号', action: 'series' },
    { key: 'product-dimensions', label: '尺寸与资料说明', sectionKey: 'dimensions' },
    { key: 'product-parameters', label: '产品型号、参数与尺寸图', action: 'models' },
    { key: 'product-resources', label: '产品资料区标题', sectionKey: 'resources' },
    { key: 'product-cases', label: '应用案例区标题', sectionKey: 'cases' }
  ],
  manufacturing: [
    { key: 'manufacturing-hero', label: '制造首屏', sectionKey: 'hero' },
    { key: 'manufacturing-process', label: '工艺流程画布', sectionKey: 'process' },
    { key: 'manufacturing-precision-machining', label: 'CNC车间', sectionKey: 'precision-machining' },
    { key: 'manufacturing-sheet-metal', label: '钣金车间', sectionKey: 'sheet-metal' },
    { key: 'manufacturing-standardized-assembly', label: '装配车间', sectionKey: 'standardized-assembly' },
    { key: 'manufacturing-whole-machine-validation', label: '精密检测', sectionKey: 'whole-machine-validation' },
    { key: 'manufacturing-electrical-assembly', label: '电气装配', sectionKey: 'electrical-assembly' },
    { key: 'manufacturing-smart-warehouse', label: '智能物料仓储', sectionKey: 'smart-warehouse' },
    { key: 'manufacturing-equipment', label: '生产核心设备', sectionKey: 'core-equipment' }
  ],
  news: [
    { key: 'news-hero', label: '视频新闻首屏', sectionKey: 'hero' },
    { key: 'news-dynamic-section', label: '动态新闻标题', sectionKey: 'dynamic-news' },
    { key: 'news-articles', label: '动态新闻内容', action: 'articles' },
    { key: 'news-video-section', label: '视频分享标题', sectionKey: 'video-sharing' },
    { key: 'news-videos', label: '视频分享内容', action: 'videos' }
  ],
  about: [
    { key: 'about-hero', label: '关于瑞钧首屏', sectionKey: 'hero' },
    { key: 'about-story', label: '品牌故事', sectionKey: 'brand-story' },
    { key: 'about-overview', label: '公司简介', sectionKey: 'overview' },
    { key: 'about-history-title', label: '发展历程标题', sectionKey: 'history' },
    { key: 'about-history', label: '发展历程里程碑', action: 'milestones' },
    { key: 'about-factory', label: '厂区风貌', sectionKey: 'factory' },
    { key: 'about-certificates', label: '认证证书', sectionKey: 'certificates' },
    { key: 'about-honors', label: '荣誉证书', sectionKey: 'honors' },
    { key: 'about-patents', label: '专利证书', sectionKey: 'patents' },
    { key: 'about-galleries', label: '资质与图库素材', action: 'qualifications' },
    { key: 'about-partners', label: '合作品牌', sectionKey: 'partners' },
    { key: 'about-clients', label: '国内客户', sectionKey: 'clients-domestic' },
    { key: 'about-clients-global', label: '国外客户', sectionKey: 'clients-global' }
  ],
  service: [
    { key: 'service-hero', label: '服务支持首屏', sectionKey: 'hero' },
    { key: 'service-support', label: '瑞钧支持', sectionKey: 'support' },
    { key: 'service-models', label: '适用型号', sectionKey: 'support-models' },
    { key: 'service-actions', label: '服务入口', sectionKey: 'support-actions' },
    { key: 'service-offices', label: '国内直属办事处', sectionKey: 'office-directory' },
    { key: 'service-resource-records', label: '服务资料与视频教学', action: 'resources' },
    { key: 'service-location-records', label: '服务网点记录', action: 'locations' },
    { key: 'service-repair', label: '售后页面配置', action: 'repair' }
  ]
});
