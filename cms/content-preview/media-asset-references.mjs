// 删除媒体资产前的全库引用扫描。删除一个仍被页面/文章引用的素材会在官网上
// 留下空图或空视频，所以这里把所有可能引用素材 id 的集合都扫一遍；命中后由
// 端点拒绝删除，并把引用位置返回给工作台。
const referenceCollections = [
  'articles',
  'pages',
  'homepage_sections',
  'product_series',
  'product_models',
  'service_resources',
  'knowledge_items',
  'manufacturing_evidence',
  'qualifications',
  'milestones',
  'repair_page_configs',
  'site_settings',
  'media_assets'
];

// 以 _asset / _asset_id 结尾的键，以及 media_asset_id / poster_asset_id。
const assetFieldPattern = /(^|_)(media_asset_id|poster_asset_id|cover_asset|asset|assets|icon_asset|hero_asset|hero_video_asset_id|machine_asset_id|machineImage|logo_asset|footer_logo_asset|address_icon_asset|phone_icon_asset|email_icon_asset|intro_asset|background_asset|video_asset|image_asset)$/;

export function isMediaAssetField(key) {
  return assetFieldPattern.test(String(key || '').trim());
}

function collectReferences(value, path, targetId, hits, depth = 0) {
  if (depth > 6 || value == null) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectReferences(entry, `${path}[${index}]`, targetId, hits, depth + 1));
    return;
  }
  if (typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    const scalar = typeof entry === 'string' || typeof entry === 'number';
    if (scalar && isMediaAssetField(key) && String(entry) === targetId) {
      hits.push(nextPath);
      continue;
    }
    collectReferences(entry, nextPath, targetId, hits, depth + 1);
  }
}

export async function collectMediaAssetReferences(database, assetId) {
  const targetId = String(assetId || '').trim();
  if (!targetId) return [];
  const references = [];
  for (const collection of referenceCollections) {
    let rows;
    try {
      rows = await database(collection).select('*');
    } catch {
      continue;
    }
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row || typeof row !== 'object') continue;
      // 素材自己的记录不算“被引用”；它的 poster_asset_id 若指向目标则算。
      if (collection === 'media_assets' && String(row.id) === targetId) continue;
      const hits = [];
      collectReferences(row, '', targetId, hits);
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
  return references
    .slice(0, 5)
    .map((reference) => `${reference.collection}#${reference.id}${reference.title ? `（${reference.title}）` : ''} → ${reference.fields.join(', ')}`)
    .join('；');
}
