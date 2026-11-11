const mib = 1024 * 1024;

const uploadRules = Object.freeze({
  'image/jpeg': { extensions: ['jpg', 'jpeg'], maxBytes: 25 * mib },
  'image/png': { extensions: ['png'], maxBytes: 25 * mib },
  'image/webp': { extensions: ['webp'], maxBytes: 25 * mib },
  'image/avif': { extensions: ['avif'], maxBytes: 25 * mib },
  'video/mp4': { extensions: ['mp4'], maxBytes: 500 * mib },
  'video/webm': { extensions: ['webm'], maxBytes: 500 * mib },
  'application/pdf': { extensions: ['pdf'], maxBytes: 50 * mib }
});

const reviewRolesByUsageScope = Object.freeze({
  homepage: 'brand_reviewer',
  product: 'technical_reviewer',
  manufacturing: 'technical_reviewer',
  service: 'technical_reviewer',
  knowledge: 'technical_reviewer',
  brand: 'brand_reviewer',
  article: 'brand_reviewer',
  qualification: 'brand_reviewer',
  case_study: 'brand_reviewer'
});

const directAssetFields = Object.freeze(['cover_asset', 'asset', 'icon_asset']);
const listAssetFields = Object.freeze(['media', 'assets']);
const protectedStatuses = new Set(['review', 'scheduled', 'published']);
const copyrightStatuses = new Set(['owned', 'licensed', 'authorized', 'pending_review']);

// Page sections keep media references several levels below the page record.
// Walk only the structured content branches that the public preview contract
// exposes; arbitrary editorial metadata must not become a media dependency.
function collectNestedSectionReferences(value, references, depth = 0) {
  if (depth > 8 || value == null) return;
  if (typeof value === 'string') {
    try { collectNestedSectionReferences(JSON.parse(value), references, depth + 1); } catch { /* legacy scalar content */ }
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value.slice(0, 100)) collectNestedSectionReferences(entry, references, depth + 1);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    if (['media_asset_id', 'image_asset_id', 'icon_asset_id'].includes(key)) {
      const id = assetIdText(entry);
      if (id) references.push(id);
      continue;
    }
    if (['sections', 'content', 'items', 'links', 'media', 'assets', 'layout', 'text_style', 'responsive', 'media_presentation'].includes(key)) {
      collectNestedSectionReferences(entry, references, depth + 1);
    }
  }
}

export const mediaPlacementSpecs = Object.freeze({
  'home.hero.video': { mediaType: 'video', minWidth: 1920, minHeight: 1080, aspectRatio: '16:9', maxBytes: 500 * mib, maxDurationSeconds: 180, posterRecommended: true, autoplay: true, muted: true },
  'home.hero.poster': { mediaType: 'image', minWidth: 1920, minHeight: 1080, aspectRatio: '16:9', maxBytes: 25 * mib },
  'home.reason.background': { mediaType: 'image', minWidth: 1600, minHeight: 900, aspectRatio: '16:9', maxBytes: 25 * mib },
  'home.reason.machine': { mediaType: 'image', minWidth: 160, minHeight: 240, aspectRatio: '按原图比例', maxBytes: 25 * mib },
  'home.reason.icon': { mediaType: 'image', minWidth: 80, minHeight: 96, aspectRatio: '按原图比例', maxBytes: 5 * mib },
  'news.hero.video': { mediaType: 'video', minWidth: 1920, minHeight: 1080, aspectRatio: '16:9', maxBytes: 500 * mib, posterRecommended: true, autoplay: true, muted: true },
  'news.dynamic_news.cover': { mediaType: 'image', minWidth: 1600, minHeight: 900, aspectRatio: '16:9', maxBytes: 25 * mib },
  'news.article.body': { mediaType: 'image', minWidth: 800, minHeight: 450, aspectRatio: '按原图比例', maxBytes: 25 * mib },
  // A video article's cover is edited separately from the video file, so it
  // needs its own governed image placement.
  'news.article.poster': { mediaType: 'image', minWidth: 1280, minHeight: 720, aspectRatio: '16:9', maxBytes: 25 * mib },
  // Video shares use the video's first decoded frame when no custom poster is
  // supplied.  A transcript is useful, but is not a publishing prerequisite.
  'news.video_share.list': { mediaType: 'video', minWidth: 1280, minHeight: 720, aspectRatio: '16:9', maxBytes: 500 * mib, maxDurationSeconds: 600, posterRecommended: false, transcriptRequired: false },
  'service.tutorial.video': { mediaType: 'video', minWidth: 1280, minHeight: 720, aspectRatio: '16:9', maxBytes: 500 * mib, posterRecommended: true, transcriptRequired: true },
  'service.tutorial.poster': { mediaType: 'image', minWidth: 1280, minHeight: 720, aspectRatio: '16:9', maxBytes: 25 * mib },
  'brand.logo.image': { mediaType: 'image', minWidth: 400, minHeight: 120, maxBytes: 25 * mib },
  'footer.icon.image': { mediaType: 'image', minWidth: 64, minHeight: 64, aspectRatio: '1:1', maxBytes: 25 * mib },
  'product.gallery.image': { mediaType: 'image', minWidth: 1200, minHeight: 900, maxBytes: 25 * mib },
  'product.series.cover': { mediaType: 'image', minWidth: 800, minHeight: 500, maxBytes: 25 * mib },
  'manufacturing.gallery.image': { mediaType: 'image', minWidth: 1600, minHeight: 900, aspectRatio: '16:9', maxBytes: 25 * mib },
  // PSD source layers are positioned inside the fixed manufacturing artboard.
  // Their smallest existing slot is 452x254, so they must not be validated as
  // full-width gallery media.
  'manufacturing.layer.image': { mediaType: 'image', minWidth: 452, minHeight: 254, aspectRatio: '按原图层比例', maxBytes: 25 * mib },
  // The existing desktop artboard has a 740x416px slot, while three extracted
  // source PSD layers are 740x415px because of raster rounding.  Accept the
  // actual source height so those current business images can be reviewed.
  // Keep its quality gate separate from full-width manufacturing gallery media.
  'manufacturing.equipment.image': { mediaType: 'image', minWidth: 740, minHeight: 415, aspectRatio: '16:9', maxBytes: 25 * mib },
  // Existing certificate and honor scans in the supplied about-page source
  // are 365x410 at their smallest. They remain private draft candidates until
  // a higher resolution business original is supplied and reviewed.
  'qualification.image': { mediaType: 'image', minWidth: 365, minHeight: 410, maxBytes: 25 * mib },
  'product.document': { mediaType: 'document', maxBytes: 50 * mib },
  'service.document': { mediaType: 'document', maxBytes: 50 * mib },
  'about.timeline.background': { mediaType: 'image', minWidth: 1600, minHeight: 900, aspectRatio: '16:9', maxBytes: 25 * mib },
  'about.timeline.icon': { mediaType: 'image', minWidth: 96, minHeight: 96, aspectRatio: '1:1', maxBytes: 25 * mib },
  // The about-page opening composition uses one governed source family for
  'about.hero.background': { mediaType: 'image', minWidth: 1920, minHeight: 900, aspectRatio: '16:9', maxBytes: 25 * mib },
  'about.hero.foreground': { mediaType: 'image', minWidth: 800, minHeight: 600, aspectRatio: '按原图比例', maxBytes: 25 * mib },
  // The existing about-page gallery slots are rendered at 792x446 (factory)
  // and 542x406 (client) in the supplied PSD export. These values gate the
  // private preview candidates; publication still requires normal review.
  'about.gallery.image': { mediaType: 'image', minWidth: 792, minHeight: 446, maxBytes: 25 * mib },
  'about.client.image': { mediaType: 'image', minWidth: 542, minHeight: 406, maxBytes: 25 * mib },
  'about.partner.image': { mediaType: 'image', minWidth: 800, minHeight: 500, maxBytes: 25 * mib },
  'service.hero.image': { mediaType: 'image', minWidth: 1920, minHeight: 960, aspectRatio: '2:1', maxBytes: 25 * mib },
  // Preserve the existing service-page canvas proportions: region art is
  // 850x470 and the map is a 1400x310 strip.
  'service.office.image': { mediaType: 'image', minWidth: 800, minHeight: 400, maxBytes: 25 * mib },
  'service.office.map': { mediaType: 'image', minWidth: 1200, minHeight: 250, maxBytes: 25 * mib },
  // The eight existing service entry icons are compact, non-uniform PNGs.
  // Preserve their smallest source dimensions rather than forcing a gallery rule.
  'service.action.icon': { mediaType: 'image', minWidth: 34, minHeight: 42, aspectRatio: '按原图标比例', maxBytes: 5 * mib },
  'manufacturing.hero.image': { mediaType: 'image', minWidth: 1920, minHeight: 900, aspectRatio: '21:10 或 16:9', maxBytes: 25 * mib },
  'manufacturing.process.image': { mediaType: 'image', minWidth: 1200, minHeight: 700, maxBytes: 25 * mib },
  'manufacturing.hero.video': { mediaType: 'video', minWidth: 1920, minHeight: 900, aspectRatio: '16:9', maxBytes: 500 * mib, maxDurationSeconds: 600, posterRecommended: true, transcriptRequired: true },
  'manufacturing.process.video': { mediaType: 'video', minWidth: 1280, minHeight: 720, aspectRatio: '16:9', maxBytes: 500 * mib, maxDurationSeconds: 600, posterRecommended: true, transcriptRequired: true },
  'manufacturing.gallery.video': { mediaType: 'video', minWidth: 1280, minHeight: 720, aspectRatio: '16:9', maxBytes: 500 * mib, maxDurationSeconds: 600, posterRecommended: true, transcriptRequired: true },
  'default.image': { mediaType: 'image', minWidth: 1600, minHeight: 900, aspectRatio: '16:9', maxBytes: 25 * mib }
});

export class MediaAssetGovernanceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'MediaAssetGovernanceError';
    this.code = code;
  }
}

function requiredText(value, fieldName) {
  const text = typeof value === 'string' ? value.normalize('NFKC').trim() : '';
  if (!text) throw new MediaAssetGovernanceError('MEDIA_METADATA_INVALID', `缺少必填字段：${fieldName}`);
  return text;
}

function assetIdText(value) {
  if (typeof value === 'string') return value.normalize('NFKC').trim();
  if (Number.isSafeInteger(value) && value > 0) return String(value);
  return '';
}

function extensionOf(fileName) {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.at(-1) : '';
}

function asList(value, fieldName) {
  if (value == null) return [];
  if (typeof value === 'string') {
    try {
      return asList(JSON.parse(value), fieldName);
    } catch {
      throw new MediaAssetGovernanceError('MEDIA_REFERENCE_INVALID', `字段 ${fieldName} 必须是 JSON 数组`);
    }
  }
  if (!Array.isArray(value)) throw new MediaAssetGovernanceError('MEDIA_REFERENCE_INVALID', `字段 ${fieldName} 必须是数组`);
  return value;
}

function asObject(value, fieldName) {
  if (value == null) return {};
  if (typeof value === 'string') {
    try {
      return asObject(JSON.parse(value), fieldName);
    } catch {
      throw new MediaAssetGovernanceError('MEDIA_REFERENCE_INVALID', `字段 ${fieldName} 必须是 JSON 对象`);
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new MediaAssetGovernanceError('MEDIA_REFERENCE_INVALID', `字段 ${fieldName} 必须是对象`);
  }
  return value;
}

export function assertMediaAssetUpload(payload) {
  const fileName = requiredText(payload?.filename_download, 'filename_download');
  const mimeType = requiredText(payload?.type, 'type').toLowerCase();
  const byteSize = Number(payload?.filesize);
  const rule = uploadRules[mimeType];
  if (!rule) throw new MediaAssetGovernanceError('MEDIA_TYPE_INVALID', '该 MIME 类型不允许用于公开内容');
  if (!rule.extensions.includes(extensionOf(fileName))) throw new MediaAssetGovernanceError('MEDIA_EXTENSION_INVALID', '文件扩展名与声明的 MIME 类型不一致');
  if (!Number.isInteger(byteSize) || byteSize < 1) throw new MediaAssetGovernanceError('MEDIA_METADATA_INVALID', '文件大小必须是正整数');
  if (byteSize > rule.maxBytes) throw new MediaAssetGovernanceError('MEDIA_FILE_TOO_LARGE', '公开媒体文件超出大小限制');
  return payload;
}

export function reviewerRoleForMediaUsageScope(usageScope) {
  const normalized = typeof usageScope === 'string' ? usageScope.normalize('NFKC').trim().toLowerCase() : '';
  const role = reviewRolesByUsageScope[normalized];
  if (!role) throw new MediaAssetGovernanceError('MEDIA_USAGE_SCOPE_INVALID', '请选择有效的素材用途范围');
  return role;
}

export function assertMediaAssetRecord(input, file) {
  const fileId = requiredText(input?.file_id, 'file_id');
  if (!file || String(file.id || '') !== fileId) {
    throw new MediaAssetGovernanceError('MEDIA_FILE_NOT_FOUND', '上传的媒体文件不可用');
  }
  assertMediaAssetUpload(file);
  const originalFileName = requiredText(input?.original_file_name, 'original_file_name');
  // `requiredText` runs NFKC over the recorded name, which folds full-width
  // punctuation to its ASCII twin (，→ , and so on). Comparing that against the
  // file's raw name made any CJK filename containing full-width punctuation
  // impossible to satisfy: the asset could be uploaded but never transitioned,
  // so it stayed permanently stuck in draft. Normalise both sides the same way
  // and compare case-insensitively, the same treatment `mime_type` already gets.
  const fileFileName = typeof file.filename_download === 'string' ? file.filename_download.normalize('NFKC').trim().toLowerCase() : '';
  const fileMimeType = typeof file.type === 'string' ? file.type.normalize('NFKC').trim().toLowerCase() : '';
  const mimeType = requiredText(input?.mime_type, 'mime_type').toLowerCase();
  const byteSize = Number(input?.byte_size);
  if (originalFileName.toLowerCase() !== fileFileName || mimeType !== fileMimeType || byteSize !== Number(file.filesize)) {
    throw new MediaAssetGovernanceError('MEDIA_FILE_METADATA_MISMATCH', '素材信息与上传的文件不一致');
  }
  reviewerRoleForMediaUsageScope(input?.usage_scope);
  const copyrightStatus = requiredText(input?.copyright_status, 'copyright_status').toLowerCase();
  if (!copyrightStatuses.has(copyrightStatus)) {
    throw new MediaAssetGovernanceError('MEDIA_COPYRIGHT_STATUS_INVALID', '请选择有效的版权状态');
  }
  {
    const mediaType = requiredText(input?.media_type, 'media_type').toLowerCase();
    if (!['image', 'video', 'document'].includes(mediaType)) throw new MediaAssetGovernanceError('MEDIA_TYPE_INVALID', '素材类型只能是 image、video 或 document');
    const expectedType = mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('video/') ? 'video' : mimeType === 'application/pdf' ? 'document' : '';
    if (mediaType !== expectedType) throw new MediaAssetGovernanceError('MEDIA_TYPE_INVALID', '素材类型与 MIME 类型不匹配');
    const width = Number(input?.width); const height = Number(input?.height);
    if (mediaType !== 'document' && (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1)) {
      throw new MediaAssetGovernanceError('MEDIA_DIMENSIONS_INVALID', '宽高必须是正整数');
    }
  }
  return input;
}

export function assertMediaAssetPlacement(input, placementKey) {
  const spec = mediaPlacementSpecs[placementKey];
  if (!spec) throw new MediaAssetGovernanceError('MEDIA_PLACEMENT_INVALID', '请选择有效的展示位置');
  const mediaType = String(input?.media_type || '').trim().toLowerCase();
  if (mediaType !== spec.mediaType) throw new MediaAssetGovernanceError('MEDIA_PLACEMENT_TYPE_INVALID', `${placementKey} 只接受 ${spec.mediaType} 类型的素材`);
  // 尺寸 / 体积 / 时长不再硬拦截。这三项原本是画质兜底，但会挡住运营手里唯一可用的
  // 素材（例如常见的 1080×1920 竖屏视频，宽 1080 < 1280）。画质提示改由
  // mediaPlacementQualityNotice() 以「提示」形式给出，不再阻断流程。
  // 仍然保留的硬约束是「缺了页面就坏」的那些：位置合法、类型匹配、
  // 需要文稿的位置要有文稿、播放行为（autoplay/muted）。
  // 封面（poster）只是展示用的首帧图，缺失时官网回退到视频首帧，因此不再拦截。
  if (spec.transcriptRequired && !String(input?.transcript || '').trim()) throw new MediaAssetGovernanceError('MEDIA_TRANSCRIPT_REQUIRED', `${placementKey}：该位置要求提供字幕或文字稿`);
  if (spec.autoplay && input?.autoplay !== true) throw new MediaAssetGovernanceError('MEDIA_PLAYBACK_INVALID', `${placementKey}：该位置要求自动播放`);
  if (spec.muted && input?.muted !== true) throw new MediaAssetGovernanceError('MEDIA_PLAYBACK_INVALID', `${placementKey}：自动播放时必须静音`);
  return spec;
}

// 实际尺寸低于推荐尺寸时返回提示文案，供工作台以「提示」而非「错误」展示。
// 返回 null 表示达标或该位置无尺寸要求。
export function mediaPlacementQualityNotice(input, placementKey) {
  const spec = mediaPlacementSpecs[placementKey];
  if (!spec?.minWidth) return null;
  const width = Number(input?.width);
  const height = Number(input?.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) return null;
  if (width >= spec.minWidth && height >= spec.minHeight) return null;
  return `建议 ${spec.minWidth}×${spec.minHeight} 以上，当前 ${width}×${height}，显示时可能偏模糊。`;
}

// 封面（poster）是可选展示项：官网在封面缺失或尚未发布时回退到视频首帧，
// 因此这里只给「提示」，不阻断送审或发布。返回 null 表示无需提示。
export function mediaPlacementPosterNotice(input, placementKey) {
  const spec = mediaPlacementSpecs[placementKey];
  if (!spec?.posterRecommended) return null;
  if (String(input?.poster_asset_id || '').trim()) return null;
  return '暂未设置封面：官网会先显示视频首帧，之后可随时在「媒体资产」里补充或替换封面。';
}

// 只收集「缺了页面就坏」的素材引用。封面（poster_asset_id）不在其中：
// 它是可选的展示图，官网解析时只接受已发布的封面，取不到就回退到视频首帧，
// 所以封面未送审/未发布不应挡住视频或页面的送审与发布。
export function collectMediaAssetReferenceIds(record) {
  const references = [];
  for (const field of directAssetFields) {
    if (record?.[field] == null || record[field] === '') continue;
    references.push(requiredText(record[field], field));
  }
  for (const field of listAssetFields) {
    for (const entry of asList(record?.[field], field)) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new MediaAssetGovernanceError('MEDIA_REFERENCE_INVALID', `${field} 的每一项必须是包含 media_asset_id 的对象`);
      }
      const mediaAssetId = assetIdText(entry.media_asset_id);
      if (!mediaAssetId) throw new MediaAssetGovernanceError('MEDIA_REFERENCE_INVALID', `${field} 的每一项都必须包含 media_asset_id`);
      references.push(mediaAssetId);
    }
  }
  if (record?.sections != null) collectNestedSectionReferences(record.sections, references);
  if (record?.content != null) collectNestedSectionReferences(record.content, references);
  const brand = asObject(record?.brand, 'brand');
  for (const field of ['logo_asset', 'footer_logo_asset']) {
    if (brand[field] == null || brand[field] === '') continue;
    const logoAssetId = assetIdText(brand[field]);
    if (!logoAssetId) throw new MediaAssetGovernanceError('MEDIA_REFERENCE_INVALID', `brand.${field} 必须是媒体素材 ID`);
    references.push(logoAssetId);
  }
  const footer = asObject(record?.footer, 'footer');
  for (const field of ['address_icon_asset', 'phone_icon_asset', 'email_icon_asset']) {
    if (footer[field] == null || footer[field] === '') continue;
    const iconAssetId = assetIdText(footer[field]);
    if (!iconAssetId) throw new MediaAssetGovernanceError('MEDIA_REFERENCE_INVALID', `footer.${field} 必须是媒体素材 ID`);
    references.push(iconAssetId);
  }
  return [...new Set(references)];
}

export function assertPublishedMediaReferences(record, assetsById) {
  if (!protectedStatuses.has(record?.status)) return [];
  const references = collectMediaAssetReferenceIds(record);
  const getAsset = assetsById instanceof Map
    ? (id) => assetsById.get(id) || assetsById.get(Number(id))
    : (id) => assetsById?.[id];
  for (const id of references) {
    const asset = getAsset(id);
    if (asset?.status !== 'published' || asset?.publication_state !== 'published') {
      // Name the asset and its registered placement: an operator cannot act on a
      // bare id like "143", which is all this used to report.
      const title = String(asset?.title || '').trim();
      const placement = String(asset?.placement_key || '').trim();
      const described = title ? `「${title}」` : `ID ${id}`;
      const where = placement ? `（用途：${placement}）` : '';
      const state = asset ? `当前状态 ${asset.status}/${asset.publication_state}` : '素材记录不存在';
      throw new MediaAssetGovernanceError(
        'MEDIA_NOT_PUBLISHED',
        `引用的素材 ${described}${where} 尚未发布（${state}）。请先在「媒体资产」中完成版权确认与发布，再发布本内容。`
      );
    }
  }
  return references;
}

export const publicMediaUploadRules = uploadRules;

// --- Deletion guard -------------------------------------------------------
// Deleting a media asset that a page/article still points at would leave a
// broken image on the public site. The canvas delete action already scanned for
// references; this mirrors it for Directus' own delete API so both entry points
// behave the same.

const referenceFieldPattern = /(^|_)(media_asset_id|poster_asset_id|cover_asset|asset|assets|icon_asset|hero_asset|hero_video_asset_id|machine_asset_id|machineImage|logo_asset|footer_logo_asset|address_icon_asset|phone_icon_asset|email_icon_asset|intro_asset|background_asset|video_asset|image_asset)$/;

const referenceScanCollections = Object.freeze([
  'articles', 'pages', 'homepage_sections', 'product_series', 'product_models', 'service_resources',
  'knowledge_items', 'manufacturing_evidence', 'qualifications', 'milestones',
  'repair_page_configs', 'site_settings', 'media_assets',
  // Product release snapshots are what the public product page actually renders,
  // so deleting an asset they reference would break the live page even though the
  // current product records no longer point at it.
  'product_release_snapshots'
]);

function collectFieldReferences(value, assetId, path, out, depth = 0) {
  if (depth > 6 || value == null) return;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { collectFieldReferences(JSON.parse(trimmed), assetId, path, out, depth + 1); } catch { /* plain text */ }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectFieldReferences(entry, assetId, `${path}[${index}]`, out, depth + 1));
    return;
  }
  if (typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if ((typeof entry === 'string' || typeof entry === 'number') && referenceFieldPattern.test(key) && String(entry) === assetId) {
      out.push(childPath);
      continue;
    }
    collectFieldReferences(entry, assetId, childPath, out, depth + 1);
  }
}

export async function findMediaAssetReferences(database, assetId) {
  const id = String(assetId ?? '').trim();
  if (!id) return [];
  const references = [];
  for (const collection of referenceScanCollections) {
    let rows;
    try { rows = await database(collection).select('*'); } catch { continue; }
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row || typeof row !== 'object') continue;
      if (collection === 'media_assets' && String(row.id) === id) continue;
      const hits = [];
      collectFieldReferences(row, id, '', hits);
      if (!hits.length) continue;
      references.push({
        collection,
        id: row.id,
        title: String(row.title || row.name || row.slug || row.source_key || '').slice(0, 160),
        fields: [...new Set(hits)].slice(0, 20)
      });
    }
  }
  return references;
}

export function describeMediaAssetReferences(references = []) {
  return references.slice(0, 5).map((reference) => {
    const title = reference.title ? `（${reference.title}）` : '';
    return `${reference.collection}#${reference.id}${title} → ${reference.fields.join(', ')}`;
  }).join('；');
}
