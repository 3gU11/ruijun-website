import { readFile, stat } from 'node:fs/promises';
import { basename, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertMediaAssetPlacement } from '../content-workflow/media-asset-governance.mjs';

const cmsRoot = fileURLToPath(new URL('../', import.meta.url));
const workspaceRoot = resolve(cmsRoot, '..');
const materialRoot = resolve(workspaceRoot, '素材');

const technicalDrawingSources = Object.freeze([
  'FL/1180.png', 'FL/1390.png', 'FL/1610.png', 'FL/8560.png',
  'FRAUTO/400.png', 'FRAUTO/500.png', 'FRAUTO/600.png', 'FRAUTO/7055.png', 'FRAUTO/8055.png', 'FRAUTO/8060.png',
  'FT/400.png', 'FT/500.png', 'FT/600.png', 'FT/7055.png',
  'PRO/1080.png', 'PRO/400.png', 'PRO/500.png', 'PRO/600.png', 'PRO/7055.png', 'PRO/8055.png', 'PRO/8060.png',
  'Y/1080.png', 'Y/8060.png'
]);

const manufacturingEquipmentSources = Object.freeze([
  ['equipment-1.png', '生产核心设备 - 平面磨床'],
  ['equipment-2.png', '生产核心设备 - 立式加工中心'],
  ['equipment-3.png', '生产核心设备 - 双排设备'],
  ['equipment-4.png', '生产核心设备 - 数控设备']
]);

const manufacturingHeroSources = Object.freeze([
  ['hero-building.png', '先进制造首屏生产基地背景', 'hero-building']
]);

const manufacturingLayerSources = Object.freeze([
  ['cnc-main.png', 'CNC车间主设备图', 'precision-machining', 'cnc-main'],
  ['cnc-horizontal.png', 'CNC车间卧式加工设备图', 'precision-machining', 'cnc-horizontal'],
  ['cnc-rail-grinder.png', 'CNC车间导轨磨设备图', 'precision-machining', 'cnc-rail-grinder'],
  ['cnc-surface-grinder.png', 'CNC车间平面磨床图', 'precision-machining', 'cnc-surface-grinder'],
  ['cnc-vertical.png', 'CNC车间立式加工设备图', 'precision-machining', 'cnc-vertical'],
  ['cnc-gantry.png', 'CNC车间龙门设备图', 'precision-machining', 'cnc-gantry'],
  ['metal-bending-center.png', '钣金车间折弯中心图', 'sheet-metal', 'metal-bending-center'],
  ['metal-laser.png', '钣金车间激光设备图', 'sheet-metal', 'metal-laser'],
  ['metal-bending.png', '钣金车间折弯设备图', 'sheet-metal', 'metal-bending'],
  ['metal-coating.png', '钣金车间喷涂设备图', 'sheet-metal', 'metal-coating'],
  ['assembly-main.png', '装配车间主画面', 'standardized-assembly', 'assembly-main'],
  ['assembly-detail.png', '装配车间细节图', 'standardized-assembly', 'assembly-detail'],
  ['inspection-main.png', '精密检测主画面', 'whole-machine-validation', 'inspection-main'],
  ['inspection-laser.png', '精密检测激光干涉仪图', 'whole-machine-validation', 'inspection-laser'],
  ['inspection-vision.png', '精密检测影像仪图', 'whole-machine-validation', 'inspection-vision'],
  ['inspection-coordinate.png', '精密检测三坐标图', 'whole-machine-validation', 'inspection-coordinate'],
  ['inspection-ballbar.png', '精密检测球杆仪图', 'whole-machine-validation', 'inspection-ballbar'],
  ['electrical-bench.png', '电气装配工作台图', 'electrical-assembly', 'electrical-bench'],
  ['electrical-cabinet.png', '电气装配电柜图', 'electrical-assembly', 'electrical-cabinet'],
  ['warehouse-image.png', '智能物料仓储立库图', 'smart-warehouse', 'warehouse-image']
]);

const serviceActionIconSources = Object.freeze([
  ['service-action-1.png', '服务入口图标 - 我的维修申请', 'action-1'],
  ['service-action-2.png', '服务入口图标 - 保修状态验核', 'action-2'],
  ['service-action-3.png', '服务入口图标 - 服务流程与寄修', 'action-3'],
  ['service-action-4.png', '服务入口图标 - 视频教学', 'action-4'],
  ['service-action-5.png', '服务入口图标 - 技术文件下载', 'action-5'],
  ['service-action-6.png', '服务入口图标 - 常见故障分析', 'action-6'],
  ['service-action-7.png', '服务入口图标 - 保养与易损件', 'action-7'],
  ['service-action-8.png', '服务入口图标 - 知识分享', 'action-8']
]);

function drawingLabel(source) {
  const [series, model] = source.replace(/\.png$/i, '').split('/');
  return `${series}${model}`;
}

// These user-provided technical drawings are candidate assets only. They stay
// private until copyright and their exact model binding are reviewed.
const technicalDrawingDrafts = technicalDrawingSources.map((source) => {
  const label = drawingLabel(source);
  return Object.freeze({
    sourcePath: `素材\\技术参数\\${source.replaceAll('/', '\\')}`,
    title: `${label} 尺寸参数图`,
    description: `${label} 技术参数与尺寸图，待业务确认版权、用途与型号关联。`,
    altText: `${label} 线切割机床技术参数与尺寸图`,
    usageScope: 'product',
    placementKey: 'product.gallery.image',
    pageKey: 'product',
    sectionKey: 'product-dimensions',
    copyright_status: 'pending_review',
    status: 'draft',
    publication_state: 'unpublished',
    reviewNote: '待审核候选；通过后需在产品型号的尺寸图字段中由编辑者选择并关联。'
  });
});

const manufacturingEquipmentDrafts = manufacturingEquipmentSources.map(([fileName, title]) => Object.freeze({
  sourcePath: `素材\\先进制造\\设备照片\\${fileName}`,
  title,
  description: `${title}，从用户提供的“先进制造(1).psd”源文件提取，待业务确认页面用途与版权状态。`,
  altText: title,
  usageScope: 'manufacturing',
  placementKey: 'manufacturing.equipment.image',
  pageKey: 'manufacturing',
  sectionKey: 'core-equipment',
  copyright_status: 'pending_review',
  status: 'draft',
  publication_state: 'unpublished',
  reviewNote: '来自原始 PSD 的内部候选；仅用于登录后台预览。通过版权与页面用途审核后才可关联并发布。'
}));

const manufacturingHeroDrafts = manufacturingHeroSources.map(([fileName, title, role]) => Object.freeze({
  sourcePath: `素材\\先进制造\\首屏图片\\${fileName}`,
  title,
  description: `${title}，从用户提供的“先进制造(1).psd”源文件提取，待业务确认页面用途与版权状态。`,
  altText: '瑞钧智科先进制造生产基地',
  usageScope: 'manufacturing',
  placementKey: 'manufacturing.hero.image',
  pageKey: 'manufacturing',
  sectionKey: 'hero',
  role,
  copyright_status: 'pending_review',
  status: 'draft',
  publication_state: 'unpublished',
  reviewNote: '来自原始 PSD 的内部候选；仅用于登录后台预览。通过版权与页面用途审核后才可关联并发布。'
}));

const manufacturingLayerDrafts = manufacturingLayerSources.map(([fileName, title, sectionKey, role]) => Object.freeze({
  sourcePath: `素材\\先进制造\\页面图层\\${fileName}`,
  title,
  description: `${title}，从用户提供的“先进制造(1).psd”源文件提取，保留官网当前图层用途，待业务确认版权状态。`,
  altText: title,
  usageScope: 'manufacturing',
  placementKey: 'manufacturing.layer.image',
  pageKey: 'manufacturing',
  sectionKey,
  role,
  copyright_status: 'pending_review',
  status: 'draft',
  publication_state: 'unpublished',
  reviewNote: '来自原始 PSD 的页面图层候选；仅用于登录后台预览。通过版权与页面用途审核后才可关联并发布。'
}));

// This is intentionally an exact allowlist, not a general import path for
// website/public. The icons remain review-only candidates until approved.
const serviceActionIconDrafts = serviceActionIconSources.map(([fileName, title, role]) => Object.freeze({
  sourcePath: `website\\public\\assets\\${fileName}`,
  title,
  description: `${title}，来自当前官网服务支持页，保留原始入口与画布位置。`,
  altText: title,
  usageScope: 'service',
  placementKey: 'service.action.icon',
  pageKey: 'service',
  sectionKey: 'support-actions',
  role,
  copyright_status: 'pending_review',
  status: 'draft',
  publication_state: 'unpublished',
  reviewNote: '当前官网既有服务入口图标，仅供登录后台实时预览与替换验证；审核发布前不会替换公开官网。'
}));

const serviceHeroDrafts = [Object.freeze({
  sourcePath: 'website\\public\\assets\\service-library-hero-v3.jpg',
  title: '服务支持首屏背景候选',
  description: '来自当前服务支持页的首屏背景候选，仅供登录后台实时预览与替换验证。',
  altText: '瑞钧智科服务支持首屏背景',
  usageScope: 'service',
  placementKey: 'service.hero.image',
  pageKey: 'service',
  sectionKey: 'hero',
  copyright_status: 'pending_review',
  status: 'draft',
  publication_state: 'unpublished',
  reviewNote: '当前官网既有服务首屏背景，仅供登录后台实时预览；审核发布前不会替换公开官网。'
})];

const serviceOfficeSources = [
  ['service-office-map.jpg', '服务支持办事处地图', 'map'],
  ...Array.from({ length: 10 }, (_, index) => [
    `service-office-region-${index + 1}.jpg`,
    `服务支持办事处地区图片 ${index + 1}`,
    `region-${index + 1}`
  ])
];

const serviceOfficeDrafts = serviceOfficeSources.map(([fileName, title, role]) => Object.freeze({
  sourcePath: `website\\public\\assets\\${fileName}`,
  title,
  description: `${title}，来自当前官网服务支持页，仅供登录后台实时预览与替换验证。`,
  altText: title,
  usageScope: 'service',
  placementKey: role === 'map' ? 'service.office.map' : 'service.office.image',
  pageKey: 'service',
  sectionKey: 'office-directory',
  role,
  copyright_status: 'pending_review',
  status: 'draft',
  publication_state: 'unpublished',
  reviewNote: '当前官网既有办事处素材，仅供登录后台实时预览与替换验证；审核发布前不会替换公开官网。'
}));

const aboutHeroDrafts = [Object.freeze({
  sourcePath: 'website\\public\\assets\\about-psd\\hero-machine.jpg',
  title: '关于瑞钧首屏背景候选',
  description: '来自当前关于瑞钧页面的首屏背景候选，仅供登录后台实时预览与替换验证。',
  altText: '瑞钧智科中走丝线切割机床',
  usageScope: 'brand',
  placementKey: 'about.hero.background',
  pageKey: 'about',
  sectionKey: 'hero',
  role: 'background',
  copyright_status: 'pending_review',
  status: 'draft',
  publication_state: 'unpublished',
  reviewNote: '当前官网既有关于瑞钧首屏背景，仅供登录后台实时预览与替换验证；审核发布前不会替换公开官网。'
}), Object.freeze({
  sourcePath: 'website\\public\\assets\\psd\\reason-intro-machine.png',
  title: '关于瑞钧首屏机器前景候选',
  description: '来自当前关于瑞钧页面的透明机器前景图，仅供登录后台实时预览与替换验证。',
  altText: '瑞钧智科中走丝线切割机床前景图',
  usageScope: 'brand',
  placementKey: 'about.hero.foreground',
  pageKey: 'about',
  sectionKey: 'hero',
  role: 'foreground',
  copyright_status: 'pending_review',
  status: 'draft',
  publication_state: 'unpublished',
  reviewNote: '当前官网既有关于瑞钧首屏机器前景图，仅供登录后台实时预览与替换验证；审核发布前不会替换公开官网。'
})];

const aboutTimelineDrafts = [Object.freeze({
  sourcePath: 'website\\public\\assets\\timeline-paper-texture.jpg',
  title: '关于瑞钧时间轴背景候选',
  description: '来自当前官网时间轴的背景纹理候选，仅供登录后台实时预览。',
  altText: '关于瑞钧历史时间轴背景',
  usageScope: 'brand',
  placementKey: 'about.timeline.background',
  pageKey: 'about',
  sectionKey: 'history',
  copyright_status: 'pending_review',
  status: 'draft',
  publication_state: 'unpublished',
  reviewNote: '当前官网既有时间轴背景，仅供登录后台实时预览；审核发布前不会替换公开官网。'
})];

const aboutTimelineIconDrafts = [Object.freeze({
  sourcePath: 'website\\public\\assets\\about-psd\\history-guide-wheel.png',
  title: '关于瑞钧时间轴导航图标候选',
  description: '来自当前官网时间轴的导航图标候选，仅供登录后台实时预览。',
  altText: '关于瑞钧历史时间轴导航图标',
  usageScope: 'brand',
  placementKey: 'about.timeline.icon',
  pageKey: 'about',
  sectionKey: 'history',
  role: 'icon',
  copyright_status: 'pending_review',
  status: 'draft',
  publication_state: 'unpublished',
  reviewNote: '当前官网既有时间轴导航图标，仅供登录后台实时预览；审核发布前不会替换公开官网。'
})];

// These are the exact raster assets currently used by the about-page template.
// Import them as private candidates so the visual editor can replace them
// through Directus without treating a static fallback path as editable data.
const aboutFactoryDrafts = [
  ['factory-01.jpg', '瑞钧厂区风貌 - 厂区外景一'],
  ['factory-02.jpg', '瑞钧厂区风貌 - 厂区外景二'],
  ['factory-03.jpg', '瑞钧厂区风貌 - 厂区外景三'],
  ['factory-04.jpg', '瑞钧厂区风貌 - 厂区广场']
].map(([fileName, title], index) => Object.freeze({
  sourcePath: `website\\public\\assets\\about-psd\\${fileName}`,
  title,
  description: `${title}，来自当前官网关于瑞钧页面，仅供登录后台实时预览与替换验证。`,
  altText: title,
  usageScope: 'brand',
  placementKey: 'about.gallery.image',
  pageKey: 'about',
  sectionKey: 'factory',
  role: `factory-${index + 1}`,
  copyright_status: 'pending_review',
  status: 'draft',
  publication_state: 'unpublished',
  reviewNote: '当前官网既有厂区图片，仅供登录后台实时预览与替换验证；审核发布前不会替换公开官网。'
}));

const aboutPartnerDrafts = [Object.freeze({
  sourcePath: 'website\\public\\assets\\about-psd\\suppliers.jpg',
  title: '合作品牌与供应商展示图',
  description: '来自当前官网关于瑞钧页面，仅供登录后台实时预览与替换验证。',
  altText: '瑞钧智科合作品牌与供应商',
  usageScope: 'brand',
  placementKey: 'about.partner.image',
  pageKey: 'about',
  sectionKey: 'partners',
  role: 'partners',
  copyright_status: 'pending_review',
  status: 'draft',
  publication_state: 'unpublished',
  reviewNote: '当前官网既有合作品牌与供应商展示图，仅供登录后台实时预览与替换验证；审核发布前不会替换公开官网。'
})];

const aboutClientDrafts = ['domestic', 'global'].flatMap((region) => Array.from({ length: 5 }, (_, index) => {
  const position = String(index + 1).padStart(2, '0');
  const domestic = region === 'domestic';
  const label = domestic ? `国内客户现场${'一二三四五'[index]}` : `海外客户现场${'一二三四五'[index]}`;
  return Object.freeze({
    sourcePath: `website\\public\\assets\\about-psd\\client-${region}-${position}.jpg`,
    title: label,
    description: `${label}，来自当前官网关于瑞钧页面，仅供登录后台实时预览与替换验证。`,
    altText: label,
    usageScope: 'brand',
    placementKey: 'about.client.image',
    pageKey: 'about',
    sectionKey: domestic ? 'clients-domestic' : 'clients-global',
    role: `${region}-${index + 1}`,
    copyright_status: 'pending_review',
    status: 'draft',
    publication_state: 'unpublished',
    reviewNote: '当前官网既有客户现场图片，仅供登录后台实时预览与替换验证；审核发布前不会替换公开官网。'
  });
}));

const aboutQualificationDrafts = [
  ...Array.from({ length: 7 }, (_, index) => ['certificate', index + 1]),
  ...Array.from({ length: 5 }, (_, index) => ['honor', index + 1]),
  ...Array.from({ length: 8 }, (_, index) => ['patent', index + 1])
].map(([type, ordinal]) => {
  const position = String(ordinal).padStart(2, '0');
  const typeLabel = ({ certificate: '认证证书', honor: '荣誉证书', patent: '专利证书' })[type];
  return Object.freeze({
    sourcePath: `website\\public\\assets\\about-psd\\${type}-${position}.jpg`,
    title: `${typeLabel}素材 ${position}`,
    description: `当前官网关于瑞钧页面的${typeLabel}图片，仅供登录后台实时预览与替换验证。`,
    altText: `${typeLabel} ${position}`,
    usageScope: 'qualification',
    placementKey: 'qualification.image',
    pageKey: 'about',
    sectionKey: type === 'certificate' ? 'certificates' : type === 'honor' ? 'honors' : 'patents',
    role: `${type}-${ordinal}`,
    copyright_status: 'pending_review',
    status: 'draft',
    publication_state: 'unpublished',
    reviewNote: `当前官网既有${typeLabel}图片，仅供登录后台实时预览与替换验证；审核发布前不会替换公开官网。`
  });
});

const homepageReasonDrafts = [
  ['reason-efficiency-machine.png', '首页三大理由 - 增效降损设备图', 'performance', 'home.reason.machine', 'foreground'],
  ['reason-factory-full.jpg', '首页三大理由 - 先进智造背景图', 'advanced-manufacturing', 'home.reason.background', 'background'],
  ['reason-market-full.jpg', '首页三大理由 - 行业领军背景图', 'industry-leadership', 'home.reason.background', 'background']
].map(([fileName, title, sectionKey, placementKey, role]) => Object.freeze({
  sourcePath: `website\\public\\assets\\psd\\${fileName}`,
  title,
  description: `${title}，来自当前官网首页三大理由画面，仅供登录后台实时预览。`,
  altText: title,
  usageScope: 'homepage',
  placementKey,
  pageKey: 'home',
  sectionKey,
  role,
  copyright_status: 'pending_review',
  status: 'draft',
  publication_state: 'unpublished',
  reviewNote: '当前官网既有首页三大理由图片，仅供登录后台实时预览；审核发布前不会替换公开官网。'
}));

const homepageReasonIconDrafts = [
  ['reason-tab-efficiency.png', '首页横移图标 - 增效降损', 'performance'],
  ['reason-tab-manufacturing.png', '首页横移图标 - 先进智造', 'advanced-manufacturing'],
  ['reason-tab-leadership.png', '首页横移图标 - 领军品牌', 'industry-leadership']
].map(([fileName, title, sectionKey]) => Object.freeze({
  sourcePath: `website\\public\\assets\\psd\\${fileName}`,
  title,
  description: `${title}，来自当前官网首页横移图文，仅供登录后台实时预览。`,
  altText: title,
  usageScope: 'homepage',
  placementKey: 'home.reason.icon',
  pageKey: 'home',
  sectionKey,
  role: `icon-${sectionKey}`,
  copyright_status: 'pending_review',
  status: 'draft',
  publication_state: 'unpublished',
  reviewNote: '当前官网既有首页横移图标，仅供登录后台实时预览；审核发布前不会替换公开官网。'
}));

export const localMediaDraftManifest = Object.freeze([
  ...technicalDrawingDrafts,
  ...manufacturingEquipmentDrafts,
  ...manufacturingHeroDrafts,
  ...manufacturingLayerDrafts,
  ...serviceActionIconDrafts,
  ...serviceHeroDrafts,
  ...serviceOfficeDrafts,
  ...aboutHeroDrafts,
  ...aboutTimelineDrafts,
  ...aboutTimelineIconDrafts,
  ...aboutFactoryDrafts,
  ...aboutPartnerDrafts,
  ...aboutClientDrafts,
  ...aboutQualificationDrafts,
  ...homepageReasonDrafts,
  ...homepageReasonIconDrafts
]);

function sourceText(sourcePath) {
  return String(sourcePath || '').replaceAll('\\', '/');
}

export function resolveLocalMediaSource(sourcePath) {
  const relativeSource = sourceText(sourcePath);
  const isMaterialSource = relativeSource.startsWith('素材/');
  const isAllowedWebsiteAsset = /^website\/public\/assets\/(?:service-action-[1-8]\.png|service-library-hero-v3\.jpg|service-office-(?:map|region-(?:[1-9]|10))\.jpg|timeline-paper-texture\.jpg|about-psd\/(?:(?:hero-machine|history-guide-wheel|factory-0[1-4]|suppliers|client-(?:domestic|global)-0[1-5]|certificate-0[1-7]|honor-0[1-5]|patent-0[1-8])\.jpg|history-guide-wheel\.png)|psd\/reason-(?:intro-machine|efficiency-machine|factory-full|market-full)\.(?:png|jpg)|psd\/reason-tab-(?:efficiency|manufacturing|leadership)\.png)$/.test(relativeSource);
  if (!isMaterialSource && !isAllowedWebsiteAsset) throw new Error('Media source must be inside 素材 or the exact website asset allowlist');
  const target = resolve(workspaceRoot, relativeSource);
  if (isMaterialSource && target !== materialRoot && !target.startsWith(`${materialRoot}${sep}`)) {
    throw new Error('Media source escapes 素材');
  }
  return target;
}

export function readPngDimensions(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const signature = '89504e470d0a1a0a';
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== signature || buffer.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw new Error('Only valid PNG files are supported by this importer');
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (!width || !height) throw new Error('PNG dimensions must be positive');
  return { width, height };
}

export function readJpegDimensions(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error('Only valid JPEG files are supported');
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) };
    }
    offset += length;
  }
  throw new Error('JPEG dimensions not found');
}

export function readImageDimensions(bytes, mimeType = '') {
  return String(mimeType).toLowerCase() === 'image/jpeg' ? readJpegDimensions(bytes) : readPngDimensions(bytes);
}

function aspectRatio(width, height) {
  const divisor = (left, right) => right ? divisor(right, left % right) : left;
  const common = divisor(width, height);
  return `${width / common}:${height / common}`;
}

export function buildDraftAssetPayload(input, { fileId, fileName, byteSize, width, height }) {
  return {
    file_id: String(fileId),
    original_file_name: String(fileName),
    mime_type: input.mimeType || (String(input.sourcePath).toLowerCase().endsWith('.jpg') ? 'image/jpeg' : 'image/png'),
    byte_size: Number(byteSize),
    usage_scope: input.usageScope,
    alt_text: input.altText,
    copyright_status: input.copyright_status,
    authorization_note: `来自用户提供的本地素材：${sourceText(input.sourcePath)}。版权和页面用途尚待审核确认。`,
    status: input.status,
    publication_state: input.publication_state,
    media_type: 'image',
    width: Number(width),
    height: Number(height),
    aspect_ratio: aspectRatio(Number(width), Number(height)),
    title: input.title,
    description: input.description,
    placement_key: input.placementKey,
    page_key: input.pageKey,
    section_key: input.sectionKey,
    sort_order: 0,
    enabled: true,
    source_document: sourceText(input.sourcePath),
    review_note: input.reviewNote
  };
}

export function assessLocalMediaCandidate(input, { byteSize, width, height }) {
  const payload = buildDraftAssetPayload(input, {
    fileId: 'candidate-file', fileName: 'candidate.png', byteSize, width, height
  });
  try {
    assertMediaAssetPlacement(payload, input.placementKey);
    return { importable: true, reason: '' };
  } catch (error) {
    return { importable: false, reason: error.message || '素材不符合展示位规格' };
  }
}

function parseEnvironment(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1].trim(), match[2]]] : [];
  }));
}

function baseUrlFrom(settings) {
  const configured = settings.CMS_BASE_URL || (settings.HOST && settings.PORT ? `http://${settings.HOST}:${settings.PORT}` : '');
  const url = new URL(configured || 'http://127.0.0.1:8055');
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
    throw new Error('Local media import may only target a local CMS HTTP endpoint');
  }
  return url.toString().replace(/\/$/, '');
}

function apiClient(baseUrl, token = '') {
  async function request(path, { method = 'GET', body, form, expected = [200] } = {}) {
    const response = await fetch(new URL(path.replace(/^\//, ''), `${baseUrl}/`), {
      method,
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      ...(form ? { body: form } : {})
    });
    const payload = await response.json().catch(() => null);
    if (!expected.includes(response.status)) throw new Error(`${method} ${path} failed: ${payload?.errors?.[0]?.message || `HTTP ${response.status}`}`);
    return { status: response.status, data: payload?.data };
  }
  return { request };
}

async function candidateMetadata(input) {
  const path = resolveLocalMediaSource(input.sourcePath);
  const [bytes, info] = await Promise.all([readFile(path), stat(path)]);
  const mimeType = /\.jpe?g$/i.test(path) ? 'image/jpeg' : 'image/png';
  const { width, height } = readImageDimensions(bytes, mimeType);
  const metadata = { path, bytes, byteSize: info.size, width, height, mimeType, fileName: basename(path) };
  return { ...metadata, assessment: assessLocalMediaCandidate(input, metadata) };
}

async function loginLocalCms() {
  const settings = parseEnvironment(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  if (!settings.ADMIN_EMAIL || !settings.ADMIN_PASSWORD) throw new Error('CMS admin credentials are required in cms/.env.local');
  const baseUrl = baseUrlFrom(settings);
  const session = await apiClient(baseUrl).request('/auth/login', {
    method: 'POST', body: { email: settings.ADMIN_EMAIL, password: settings.ADMIN_PASSWORD }
  });
  return apiClient(baseUrl, session.data.access_token);
}

async function existingCandidate(api, sourceDocument) {
  const url = `/items/media_assets?filter[source_document][_eq]=${encodeURIComponent(sourceDocument)}&fields=id,file_id,status,publication_state,placement_key&limit=1`;
  const response = await api.request(url);
  return Array.isArray(response.data) ? response.data[0] || null : null;
}

export function needsPlacementMigration(existing, input) {
  return existing?.placement_key === 'about.hero.image'
    && input?.placementKey === 'about.hero.background'
    && existing?.status === 'draft'
    && existing?.publication_state === 'unpublished';
}

export async function importLocalMediaDrafts({ apply = false } = {}) {
  const candidates = await Promise.all(localMediaDraftManifest.map(async (input) => ({ input, metadata: await candidateMetadata(input) })));
  if (!apply) {
    return candidates.map(({ input, metadata }) => ({
      source_document: sourceText(input.sourcePath), title: input.title, byte_size: metadata.byteSize, width: metadata.width, height: metadata.height,
      status: metadata.assessment.importable ? 'dry_run' : 'skipped_specification', reason: metadata.assessment.reason || undefined
    }));
  }

  const api = await loginLocalCms();
  const results = [];
  for (const { input, metadata } of candidates) {
    const sourceDocument = sourceText(input.sourcePath);
    if (!metadata.assessment.importable) {
      results.push({ source_document: sourceDocument, action: 'skipped_specification', reason: metadata.assessment.reason });
      continue;
    }
    const existing = await existingCandidate(api, sourceDocument);
    if (existing && needsPlacementMigration(existing, input)) {
      await api.request(`/items/media_assets/${encodeURIComponent(existing.id)}`, {
        method: 'PATCH', body: { placement_key: input.placementKey }, expected: [200]
      });
      results.push({ source_document: sourceDocument, action: 'migrated_placement', asset_id: existing.id, placement_key: input.placementKey });
      continue;
    }
    if (existing) {
      results.push({ source_document: sourceDocument, action: 'skipped_existing', asset_id: existing.id, status: existing.status, publication_state: existing.publication_state });
      continue;
    }

    const form = new FormData();
    form.set('title', input.title);
    form.set('file', new Blob([metadata.bytes], { type: metadata.mimeType }), metadata.fileName);
    const uploaded = await api.request('/files', { method: 'POST', form });
    const payload = buildDraftAssetPayload(input, {
      fileId: uploaded.data.id, fileName: uploaded.data.filename_download, byteSize: uploaded.data.filesize,
      width: metadata.width, height: metadata.height
    });
    try {
      const created = await api.request('/items/media_assets', { method: 'POST', body: payload });
      results.push({ source_document: sourceDocument, action: 'created_draft', asset_id: created.data.id, status: created.data.status, publication_state: created.data.publication_state });
    } catch (error) {
      try { await api.request(`/files/${encodeURIComponent(uploaded.data.id)}`, { method: 'DELETE', expected: [204] }); } catch { /* Preserve the original create error. */ }
      throw error;
    }
  }
  return results;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const apply = process.argv.includes('--apply');
  const results = await importLocalMediaDrafts({ apply });
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry_run', results }, null, 2));
}
