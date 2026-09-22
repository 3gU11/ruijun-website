import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const productVisibleCopyBySeries = Object.freeze({
  'fr-xs-auto': Object.freeze({
    machineImage: '/assets/psd/product-detail/auto-machine.png',
    features: Object.freeze([
      Object.freeze({ label: '自动穿丝', detail: '全自动穿丝模式\n半自动穿丝模式\n带动态感知穿丝功能', image: '/assets/psd/product-detail/auto-threading.png' }),
      Object.freeze({ label: '伺服张力控制', detail: '多组传感器和伺服驱动技术，实时感知并动态调整钼丝张力', image: '/assets/psd/product-detail/auto-tension.png' }),
      Object.freeze({ label: '自适应切割功能', detail: '针对不同高度材料，自动调节放电参数，无需人工干涉', image: '/assets/psd/product-detail/auto-adaptive.png' })
    ])
  }),
  'fr-pro': Object.freeze({
    machineImage: '/assets/psd/product-detail/pro-machine.png',
    features: Object.freeze([
      Object.freeze({ label: '自适应切割功能', image: '/assets/psd/product-detail/pro-adaptive.png' }),
      Object.freeze({ label: '效率提升50%', image: '/assets/psd/product-detail/pro-efficiency.png' }),
      Object.freeze({ label: '屏显手持单元', image: '/assets/psd/product-detail/pro-handheld.png' })
    ])
  }),
  'fr-g': Object.freeze({
    machineImage: '/assets/psd/product-detail/pro-machine.png',
    features: Object.freeze([
      Object.freeze({ label: '自适应切割功能', image: '/assets/psd/product-detail/pro-adaptive.png' }),
      Object.freeze({ label: '效率提升50%', image: '/assets/psd/product-detail/pro-efficiency.png' }),
      Object.freeze({ label: '屏显手持单元', image: '/assets/psd/product-detail/pro-handheld.png' })
    ])
  }),
  'ft-xs': Object.freeze({
    machineImage: '/assets/psd/product-detail/ft-machine.png',
    features: Object.freeze([
      Object.freeze({ label: '五轴数控' }),
      Object.freeze({ label: '四轴螺距补偿' }),
      Object.freeze({ label: '机电一体化设计' }),
      Object.freeze({ label: '全新3.0控制系统' })
    ])
  }),
  'unmapped-ft-pro': Object.freeze({
    machineImage: '/assets/psd/product-detail/ft-machine.png',
    features: Object.freeze([
      Object.freeze({ label: '五轴数控' }),
      Object.freeze({ label: '四轴螺距补偿' }),
      Object.freeze({ label: '机电一体化设计' }),
      Object.freeze({ label: '全新3.0控制系统' })
    ])
  }),
  'fr-y': Object.freeze({
    machineImage: '/assets/psd/product-detail/fr-y-machine.png',
    features: Object.freeze([
      Object.freeze({ label: '高精度摇摆装置', note: '获国家发明专利', image: '/assets/psd/product-detail/fr-y-swing.png' }),
      Object.freeze({ label: '单边35度大锥度', image: '/assets/psd/product-detail/fr-y-taper.png' }),
      Object.freeze({ label: '全新屏显手持单元', image: '/assets/psd/product-detail/fr-y-handheld.png' })
    ])
  }),
  'fl-xs': Object.freeze({
    machineImage: '/assets/psd/product-detail/fl-machine.png',
    features: Object.freeze([
      Object.freeze({ label: '五轴数控' }),
      Object.freeze({ label: '四轴螺距补偿' }),
      Object.freeze({ label: '辅助上丝功能' }),
      Object.freeze({ label: '全新3.0控制系统' })
    ])
  })
});

const productPageProofDefaults = Object.freeze({
  'proof-efficiency': Object.freeze({ value: 50, unit: '%' }),
  'proof-years': Object.freeze({ value: 30, unit: 'YEARS' })
});

function object(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function featureCopy(feature) {
  return {
    label: String(feature.label || ''),
    detail: String(feature.detail || ''),
    note: String(feature.note || ''),
    image: String(feature.image || ''),
    media_asset_id: null
  };
}

export function materializeProductVisibleCopy(record) {
  if (!record || typeof record !== 'object') return { changed: false, record };
  const defaults = productVisibleCopyBySeries[String(record.series_code || '').trim()];
  if (!defaults) return { changed: false, record };

  const source = object(record.configuration);
  if (source.visible_copy_materialized === true) return { changed: false, record };
  const configuration = copy(source);
  let changed = false;

  if (!String(configuration.machineImage || '').trim()) {
    configuration.machineImage = defaults.machineImage;
    changed = true;
  }
  if (!Array.isArray(configuration.features) || configuration.features.length === 0) {
    configuration.features = defaults.features.map(featureCopy);
    changed = true;
  }
  if (!changed) return { changed: false, record };

  configuration.visible_copy_materialized = true;
  return { changed: true, record: { ...record, configuration } };
}

export function materializeProductPageProofCopy(page) {
  if (!page || typeof page !== 'object' || page.slug !== 'product' || !Array.isArray(page.sections)) return { changed: false, record: page };
  let changed = false;
  const sections = page.sections.map((section) => {
    const defaults = productPageProofDefaults[String(section?.id || '')];
    if (!defaults) return section;
    const next = { ...section };
    for (const [field, value] of Object.entries(defaults)) {
      if (!Object.hasOwn(next, field) || next[field] === undefined || next[field] === null || next[field] === '') {
        next[field] = value;
        changed = true;
      }
    }
    return next;
  });
  return changed ? { changed: true, record: { ...page, sections } } : { changed: false, record: page };
}

function localEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1], match[2]]] : [];
  }));
}

async function main() {
  const apply = process.argv.includes('--apply');
  const env = localEnv(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const baseUrl = env.CMS_BASE_URL || 'http://127.0.0.1:8055';
  const login = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
  });
  if (!login.ok) throw new Error(`Directus login failed: ${login.status}`);
  const token = (await login.json())?.data?.access_token;
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const response = await fetch(`${baseUrl}/items/product_models?fields=id,series_code,model_code,configuration,status,publication_state&limit=-1`, { headers });
  if (!response.ok) throw new Error(`Could not read product models: ${response.status}`);
  const candidates = (await response.json())?.data || [];
  const updates = candidates
    .filter((record) => record.status === 'draft' && record.publication_state === 'unpublished')
    .map(materializeProductVisibleCopy)
    .filter((result) => result.changed);
  const pageResponse = await fetch(`${baseUrl}/items/pages?filter[slug][_eq]=product&fields=id,slug,sections,status,publication_state&limit=1`, { headers });
  if (!pageResponse.ok) throw new Error(`Could not read product page: ${pageResponse.status}`);
  const productPage = (await pageResponse.json())?.data?.[0] || null;
  const pageUpdate = materializeProductPageProofCopy(productPage);

  if (!apply) {
    console.log(JSON.stringify({ apply: false, candidates: updates.map(({ record }) => ({ id: record.id, model_code: record.model_code })), productPage: pageUpdate.changed ? { id: pageUpdate.record.id, slug: pageUpdate.record.slug } : null }, null, 2));
    return;
  }
  for (const { record } of updates) {
    const update = await fetch(`${baseUrl}/items/product_models/${encodeURIComponent(record.id)}`, {
      method: 'PATCH', headers, body: JSON.stringify({ configuration: record.configuration })
    });
    if (!update.ok) throw new Error(`Could not update product model ${record.id}: ${update.status}`);
  }
  if (pageUpdate.changed) {
    const update = await fetch(`${baseUrl}/items/pages/${encodeURIComponent(pageUpdate.record.id)}`, {
      method: 'PATCH', headers, body: JSON.stringify({ sections: pageUpdate.record.sections })
    });
    if (!update.ok) throw new Error(`Could not update product page ${pageUpdate.record.id}: ${update.status}`);
  }
  console.log(JSON.stringify({ apply: true, updated: updates.map(({ record }) => ({ id: record.id, model_code: record.model_code })), productPage: pageUpdate.changed ? { id: pageUpdate.record.id, slug: pageUpdate.record.slug } : null }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
