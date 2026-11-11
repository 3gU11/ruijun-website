// Static product-detail defaults that the original PSD build rendered directly
// in the page. They are the source for "从官网原版初始化": once an editor
// materializes them into CMS data, the canvas can edit (and later add/remove)
// the same content instead of editing a hardcoded fallback.
//
// Keep this module free of Nuxt/Vue imports: the CMS workbench reuses it to seed
// `product_models.configuration` and `product_series.presentation.detail`.

export const productSeriesDetails = Object.freeze({
  workstation: {
    models: [],
    machine: '/assets/psd/product-detail/workstation-machine.png',
    intro: {
      title: '灵动切割工作站',
      subtitle: '无人化加工解决方案',
      scene: '批量化精密零部件自动切割',
      body: '灵动切割工作站搭载自动穿丝系统，与机器人高效协作，精密夹具快速定位，自动化上下料无缝衔接；实现切割流程全自动化，全程精准把控，开启智能制造新时代！'
    },
    features: [
      { label: '自动穿丝系统' },
      { label: '六轴协作机器人', note: '多种方式可供选择' },
      { label: '多工位零点夹具', note: '多种夹具可供选择' },
      { label: '精密中走丝机床', note: '多种机型可供选择' }
    ]
  },
  auto: {
    models: ['FR400XS(auto)', 'FR500XS(auto)', 'FR600XS(auto)', 'FR7055XS(auto)', 'FR8055XS(auto)', 'FR8060XS(auto)'],
    machine: '/assets/psd/product-detail/auto-machine.png',
    features: [
      { label: '自动穿丝', detail: '全自动穿丝模式\n半自动穿丝模式\n带动态感知穿丝功能', image: '/assets/psd/product-detail/auto-threading.png' },
      { label: '伺服张力控制', detail: '多组传感器和伺服驱动技术，实时感知并动态调整钼丝张力', image: '/assets/psd/product-detail/auto-tension.png' },
      { label: '自适应切割功能', detail: '针对不同高度材料，自动调节放电参数，无需人工干涉', image: '/assets/psd/product-detail/auto-adaptive.png' }
    ]
  },
  pro: {
    models: ['FR400XS(pro)', 'FR500XS(pro)', 'FR600XS(pro)', 'FR7055XS(pro)', 'FR8055XS(pro)', 'FR8060XS(pro)'],
    machine: '/assets/psd/product-detail/pro-machine.png',
    features: [
      { label: '自适应切割功能', image: '/assets/psd/product-detail/pro-adaptive.png' },
      { label: '效率提升50%', image: '/assets/psd/product-detail/pro-efficiency.png' },
      { label: '屏显手持单元', image: '/assets/psd/product-detail/pro-handheld.png' }
    ]
  },
  ft: {
    models: ['FT400XS(pro)', 'FT500XS(pro)', 'FT600XS(pro)', 'FT7055XS(pro)', 'FT8055XS(pro)', 'FT8060XS(pro)'],
    machine: '/assets/psd/product-detail/ft-machine.png',
    features: [
      { label: '五轴数控' },
      { label: '四轴螺距补偿' },
      { label: '机电一体化设计' },
      { label: '全新3.0控制系统' }
    ]
  },
  'fr-y': {
    models: ['FR-Y8060', 'FR-Y1080'],
    machine: '/assets/psd/product-detail/fr-y-machine.png',
    features: [
      { label: '高精度摇摆装置', note: '获国家发明专利', image: '/assets/psd/product-detail/fr-y-swing.png' },
      { label: '单边35度大锥度', image: '/assets/psd/product-detail/fr-y-taper.png' },
      { label: '全新屏显手持单元', image: '/assets/psd/product-detail/fr-y-handheld.png' }
    ]
  },
  fl: {
    // Source: 原网站业务数据台账 §4 (FL 技术包) — FL8560 / FL1180 / FL1390 /
    // FL1610. The old template used FL8060XS and a non-existent FL2160XS with a
    // "(pro)" suffix, so no chip matched a CMS record.
    models: ['FL8560', 'FL1180', 'FL1390', 'FL1610'],
    machine: '/assets/psd/product-detail/fl-machine.png',
    // FL-XS positioning (原网站资源清单 §FL-XS): 五轴数控、四轴螺距补偿、
    // 辅助上丝、高强度承载设计. The previous copy duplicated the FT features.
    features: [
      { label: '五轴数控' },
      { label: '四轴螺距补偿' },
      { label: '辅助上丝功能' },
      { label: '高强度承载设计' }
    ]
  }
});

// The series card id (`workstation`, `fr-xs-auto`, ...) and the detail key
// (`workstation`, `auto`, ...) do not match, so the mapping stays explicit.
const seriesDetailKeys = Object.freeze({
  'fr-xs-auto': 'auto',
  'fr-auto': 'auto',
  'fr-pro': 'pro',
  'fr-xs-pro': 'pro',
  'ft-xs': 'ft',
  // FT (Pro) and FR-G have their own CMS models; borrowing the FT-XS template
  // gave the panel FT400XS... chips whose records belong to ft-xs.
  'ft-pro': 'ft-pro',
  'fr-g': 'fr-g',
  'fl-xs': 'fl',
  'fr-y': 'fr-y',
  workstation: 'workstation'
});

// Exact table lookup only. Callers that must not invent content for an unknown
// series (model chips, per-series copy) use this instead of the heuristic below.
export function seriesDetailKeyExact(card) {
  const source = card && typeof card === 'object' ? card : {};
  const direct = [source.id, source.slug, source.series_code].map((value) => String(value || '').trim().toLowerCase()).find(Boolean);
  return (direct && seriesDetailKeys[direct]) || '';
}

export function seriesDetailKey(card) {
  const source = card && typeof card === 'object' ? card : {};
  const direct = [source.id, source.slug, source.series_code].map((value) => String(value || '').trim().toLowerCase()).find(Boolean);
  if (direct && seriesDetailKeys[direct]) return seriesDetailKeys[direct];
  const haystack = [source.id, source.name, source.category, source.series_code].filter(Boolean).join(' ').toLowerCase();
  if (haystack.includes('workstation') || haystack.includes('工作站') || haystack.includes('无人化')) return 'workstation';
  if (haystack.includes('fr-y') || haystack.includes('摇摆')) return 'fr-y';
  if (haystack.includes('ft-pro') || haystack.includes('ft (pro)') || haystack.includes('ft（pro）')) return 'ft-pro';
  if (haystack.includes('ft')) return 'ft';
  if (haystack.includes('fr-g') || haystack.includes('fr g')) return 'fr-g';
  if (haystack.includes('fl') || haystack.includes('重大型') || haystack.includes('超大型')) return 'fl';
  if (haystack.includes('auto') || haystack.includes('自动穿丝')) return 'auto';
  return 'pro';
}

function featureDefaults(features, keepEmpty = false) {
  return (Array.isArray(features) ? features : []).flatMap((feature) => {
    const label = String(feature?.label || '').trim();
    // The public page drops blank rows; the canvas keeps them so a newly added
    // item is visible while the editor fills it in.
    if (!label && !keepEmpty) return [];
    return [{
      label,
      ...(String(feature.detail || '').trim() ? { detail: String(feature.detail).trim() } : {}),
      ...(String(feature.note || '').trim() ? { note: String(feature.note).trim() } : {}),
      // Static PSD thumbnails keep the original look until a managed product
      // asset replaces them; the public reader prefers a bound asset over this
      // legacy path, so a later media replacement still wins.
      ...(String(feature.image || '').trim() ? { image: String(feature.image).trim() } : {}),
      // A canvas media replacement stores the asset id; keep it so saving the
      // series never drops the operator's selection.
      ...(String(feature.media_asset_id || '').trim() ? { media_asset_id: String(feature.media_asset_id).trim() } : {})
    }];
  });
}

// Seed shape for `product_models.configuration` (five machine families).
export function defaultModelConfiguration(card) {
  const detail = productSeriesDetails[seriesDetailKey(card)];
  if (!detail) return null;
  return {
    ...(detail.intro ? { intro: { ...detail.intro } } : {}),
    features: featureDefaults(detail.features)
  };
}

// Seed shape for `product_series.presentation.detail` (solution-type series such
// as the workstation, which has no product model record of its own).
export function defaultSeriesDetail(card) {
  const detail = productSeriesDetails[seriesDetailKey(card)];
  if (!detail) return null;
  return {
    ...(detail.intro ? { intro: { ...detail.intro } } : {}),
    features: featureDefaults(detail.features)
  };
}

function text(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

/**
 * Normalize a series-level detail read from `presentation.detail`. The page must
 * stay renderable when the stored value is partial or malformed, so every branch
 * is optional and unknown keys are dropped.
 */
export function normalizeSeriesDetail(value, { keepEmpty = false } = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  if (!source) return null;
  const introSource = source.intro && typeof source.intro === 'object' && !Array.isArray(source.intro) ? source.intro : null;
  const introFields = introSource
    ? {
      ...(text(introSource.title) ? { title: text(introSource.title) } : {}),
      ...(text(introSource.subtitle) ? { subtitle: text(introSource.subtitle) } : {}),
      ...(text(introSource.scene) ? { scene: text(introSource.scene) } : {}),
      ...(text(introSource.body) ? { body: text(introSource.body) } : {})
    }
    : {};
  const intro = Object.keys(introFields).length ? introFields : null;
  const features = featureDefaults((Array.isArray(source.features) ? source.features : []).map((feature) => ({
    label: text(feature?.label),
    detail: text(feature?.detail),
    note: text(feature?.note),
    // The preview reader decorates a managed asset as `path`; the public reader
    // resolves it as `image`. Accept either so the panel never flashes blank.
    image: text(feature?.image) || text(feature?.path),
    media_asset_id: text(feature?.media_asset_id)
  })), keepEmpty);
  // The series machine photo keeps only the governed asset id; the public reader
  // and the preview resolve it to a path for the <img src>.
  const machineAssetId = text(source.machine_asset_id);
  if (!intro && !features.length && !machineAssetId) return null;
  return {
    ...(intro ? { intro } : {}),
    features,
    ...(machineAssetId ? { machine_asset_id: machineAssetId } : {})
  };
}
