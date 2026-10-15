// Single source of truth for "which sections can be added to which page, and
// what fields may they contain". Every consumer — the editor workbench save
// validator, the draft-preview sanitizer, the public page reader and the Nuxt
// renderers — imports from here, so a field can never be silently allowed by one
// layer and rejected by another.
//
// Fail-closed by design: an unregistered type, an unsupported field kind, an
// out-of-range list, or an unapproved media role is rejected rather than
// rendered.

import { dataListSourceKeys, dataListSourceLabels } from './page-section-sources.mjs';

const sectionIdPattern = /^[a-z0-9][a-z0-9-]{0,79}$/;
const mediaRolePattern = /^[a-z0-9][a-z0-9-]{0,59}$/;
const mediaAssetIdPattern = /^[1-9]\d*$/;

// A block that declares `variants` gets its layout field injected rather than
// hand-written, so the selectable options can never drift from the variants the
// renderer actually knows how to draw.
function withVariantField(definition) {
  const variants = Array.isArray(definition.variants) ? definition.variants : [];
  if (!variants.length) return Object.freeze(definition);
  const variantField = Object.freeze({
    key: 'variant',
    label: '版式',
    type: 'select',
    options: Object.freeze(variants.map((variant) => variant.key)),
    optionLabels: Object.freeze(Object.fromEntries(variants.map((variant) => [variant.key, variant.label])))
  });
  return Object.freeze({ ...definition, fields: Object.freeze([...definition.fields, variantField]) });
}

// Field kinds the registry knows how to validate and render.
//   text / textarea — bounded strings
//   media           — governed media references (media_asset_id + optional role)
//   list            — repeating items, each validated against `itemFields`
//   select          — one value from a declared closed set
//   number          — bounded integer
// Anything else is rejected by validateFieldValue rather than rendered.

// Pages that have adopted the registry-driven block system. A page only needs
// to be listed here plus render <CmsCustomSections>; nothing else per page.
const editablePageSlugs = Object.freeze(['service', 'about', 'home', 'news', 'product', 'manufacturing', 'contact']);

const sectionDefinitions = Object.freeze({
  'rich-text': Object.freeze({
    type: 'rich-text',
    version: 1,
    label: '图文内容',
    description: '添加眉题、标题与正文，用于补充页面说明。',
    category: '基础内容',
    pageSlugs: editablePageSlugs,
    fields: Object.freeze([
      Object.freeze({ key: 'kicker', label: '眉题', type: 'text', maxLength: 120 }),
      Object.freeze({ key: 'title', label: '标题', type: 'text', maxLength: 240 }),
      Object.freeze({ key: 'body', label: '正文', type: 'textarea', maxLength: 4000 })
    ])
  }),

  image: Object.freeze({
    type: 'image',
    version: 1,
    label: '图片区块',
    description: '添加一张受控素材图片，可配标题与说明。',
    category: '媒体',
    pageSlugs: editablePageSlugs,
    fields: Object.freeze([
      Object.freeze({ key: 'title', label: '标题', type: 'text', maxLength: 240 }),
      Object.freeze({ key: 'body', label: '说明', type: 'textarea', maxLength: 2000 }),
      Object.freeze({
        key: 'media',
        label: '图片',
        type: 'media',
        maxItems: 1,
        roles: Object.freeze(['image', 'photo'])
      })
    ])
  }),

  'card-grid': withVariantField({
    type: 'card-grid',
    version: 1,
    label: '卡片列表',
    description: '添加一组卡片，每张可维护标题、说明与配图。',
    category: '内容编排',
    pageSlugs: editablePageSlugs,
    variants: Object.freeze([
      Object.freeze({ key: 'grid', label: '网格' }),
      Object.freeze({ key: 'list', label: '列表' })
    ]),
    presets: Object.freeze([
      Object.freeze({
        key: 'standard-3',
        label: '标准三卡',
        description: '三列网格，预置三张卡片',
        values: Object.freeze({
          variant: 'grid',
          columns: 3,
          items: Object.freeze([
            Object.freeze({ title: '卡片一', body: '', media_role: 'card-1' }),
            Object.freeze({ title: '卡片二', body: '', media_role: 'card-2' }),
            Object.freeze({ title: '卡片三', body: '', media_role: 'card-3' })
          ])
        })
      }),
      Object.freeze({
        key: 'split-2',
        label: '双列对照',
        description: '两列网格，预置两张卡片',
        values: Object.freeze({
          variant: 'grid',
          columns: 2,
          items: Object.freeze([
            Object.freeze({ title: '卡片一', body: '', media_role: 'card-1' }),
            Object.freeze({ title: '卡片二', body: '', media_role: 'card-2' })
          ])
        })
      }),
      Object.freeze({
        key: 'stacked-list',
        label: '纵向列表',
        description: '单列纵向排列，预置三条',
        values: Object.freeze({
          variant: 'list',
          columns: 1,
          items: Object.freeze([
            Object.freeze({ title: '条目一', body: '', media_role: 'card-1' }),
            Object.freeze({ title: '条目二', body: '', media_role: 'card-2' }),
            Object.freeze({ title: '条目三', body: '', media_role: 'card-3' })
          ])
        })
      })
    ]),
    fields: Object.freeze([
      Object.freeze({ key: 'title', label: '标题', type: 'text', maxLength: 240 }),
      // No `roles` whitelist here: each card names its own slot via media_role
      // (for example card-1), so the role set is open but still pattern-checked.
      Object.freeze({ key: 'media', label: '配图', type: 'media', maxItems: 12 }),
      Object.freeze({
        key: 'items',
        label: '卡片',
        type: 'list',
        maxItems: 12,
        itemFields: Object.freeze([
          Object.freeze({ key: 'title', label: '卡片标题', type: 'text', maxLength: 240 }),
          Object.freeze({ key: 'body', label: '卡片说明', type: 'textarea', maxLength: 2000 }),
          Object.freeze({ key: 'media_role', label: '配图位置', type: 'text', maxLength: 60 })
        ])
      })
    ])
  }),

  // The first block whose content is not stored in the block itself: it points
  // at a registered source and renders whatever that source currently returns,
  // so the page stays in sync without anyone re-editing it.
  'data-list': withVariantField({
    type: 'data-list',
    version: 1,
    label: '数据列表',
    description: '引用站内数据自动生成列表，内容随数据源更新。',
    category: '动态内容',
    pageSlugs: editablePageSlugs,
    variants: Object.freeze([
      Object.freeze({ key: 'grid', label: '网格' }),
      Object.freeze({ key: 'list', label: '列表' }),
      Object.freeze({ key: 'compact', label: '紧凑' })
    ]),
    presets: Object.freeze([
      Object.freeze({
        key: 'latest-news',
        label: '最新动态',
        description: '引用新闻文章，两列展示四条',
        values: Object.freeze({ variant: 'grid', source: 'articles', limit: 4, columns: 2 })
      }),
      Object.freeze({
        key: 'product-showcase',
        label: '产品展示',
        description: '引用产品系列，三列展示六条',
        values: Object.freeze({ variant: 'grid', source: 'product_series', limit: 6, columns: 3 })
      }),
      Object.freeze({
        key: 'certificate-strip',
        label: '资质证书条',
        description: '引用资质证书，紧凑排列',
        values: Object.freeze({ variant: 'compact', source: 'qualifications', limit: 6, columns: 4 })
      })
    ]),
    fields: Object.freeze([
      Object.freeze({ key: 'title', label: '标题', type: 'text', maxLength: 240 }),
      Object.freeze({
        key: 'source',
        label: '数据来源',
        type: 'select',
        options: dataListSourceKeys,
        optionLabels: dataListSourceLabels
      }),
      Object.freeze({ key: 'limit', label: '显示条数', type: 'number', min: 1, max: 12 }),
      Object.freeze({ key: 'columns', label: '每行卡片数', type: 'number', min: 1, max: 4 })
    ])
  }),

  faq: Object.freeze({
    type: 'faq',
    version: 1,
    label: '常见问题',
    description: '添加问答列表，适合选型咨询与售后说明。',
    category: '内容编排',
    pageSlugs: editablePageSlugs,
    fields: Object.freeze([
      Object.freeze({ key: 'title', label: '标题', type: 'text', maxLength: 240 }),
      Object.freeze({
        key: 'items',
        label: '问答',
        type: 'list',
        maxItems: 20,
        itemFields: Object.freeze([
          Object.freeze({ key: 'title', label: '问题', type: 'text', maxLength: 240 }),
          Object.freeze({ key: 'body', label: '回答', type: 'textarea', maxLength: 4000 })
        ])
      })
    ])
  }),

  timeline: Object.freeze({
    type: 'timeline',
    version: 1,
    label: '时间轴',
    description: '添加按时间排列的里程碑，适合发展历程与工艺节点。',
    category: '内容编排',
    pageSlugs: editablePageSlugs,
    fields: Object.freeze([
      Object.freeze({ key: 'title', label: '标题', type: 'text', maxLength: 240 }),
      Object.freeze({
        key: 'items',
        label: '节点',
        type: 'list',
        maxItems: 20,
        itemFields: Object.freeze([
          Object.freeze({ key: 'label', label: '年份', type: 'text', maxLength: 40 }),
          Object.freeze({ key: 'title', label: '节点标题', type: 'text', maxLength: 240 }),
          Object.freeze({ key: 'body', label: '说明', type: 'textarea', maxLength: 2000 })
        ])
      })
    ])
  }),

  stats: Object.freeze({
    type: 'stats',
    version: 1,
    label: '数据指标',
    description: '添加一组数字指标，突出关键数据。',
    category: '内容编排',
    pageSlugs: editablePageSlugs,
    fields: Object.freeze([
      Object.freeze({ key: 'title', label: '标题', type: 'text', maxLength: 240 }),
      Object.freeze({
        key: 'items',
        label: '指标',
        type: 'list',
        maxItems: 8,
        itemFields: Object.freeze([
          Object.freeze({ key: 'value', label: '数值', type: 'text', maxLength: 24 }),
          Object.freeze({ key: 'label', label: '说明', type: 'text', maxLength: 60 })
        ])
      })
    ])
  })
});

function sectionIdSeed() {
  return globalThis.crypto?.randomUUID?.()
    || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getPageSectionDefinition(type, pageSlug = '') {
  const definition = sectionDefinitions[String(type || '').trim()];
  if (!definition || !definition.pageSlugs.includes(String(pageSlug || '').trim())) return null;
  return definition;
}

export function listPageSectionDefinitions(pageSlug = '') {
  const slug = String(pageSlug || '').trim();
  return Object.values(sectionDefinitions).filter((definition) => definition.pageSlugs.includes(slug));
}

// Every field key any block can declare, including nested list item fields and
// the variant field injected by withVariantField.
//
// Consumers that keep their own field allow-list (the live-preview sanitizer and
// the draft-preview sanitizer both do) should union with this instead of
// hand-copying keys: a hand-copied list silently drops any newly declared field,
// which is exactly how custom blocks once vanished from the live canvas.
export const registeredPageSectionFieldKeys = Object.freeze([...new Set(
  Object.values(sectionDefinitions).flatMap((definition) => definition.fields.flatMap((field) => [
    field.key,
    ...(Array.isArray(field.itemFields) ? field.itemFields.map((itemField) => itemField.key) : [])
  ]))
)]);

export function listPageSectionPresets(type, pageSlug = '') {
  const definition = getPageSectionDefinition(type, pageSlug);
  return definition && Array.isArray(definition.presets) ? definition.presets : [];
}

// Applies a preset's declared values onto a section, keeping identity fields
// intact. An unknown preset leaves the section untouched rather than applying a
// partial change — a half-applied preset is worse than none.
export function applyPageSectionPreset(section, presetKey, pageSlug = '') {
  if (!section || typeof section !== 'object' || Array.isArray(section)) return section;
  const definition = getPageSectionDefinition(section.type, pageSlug);
  if (!definition) return section;
  const preset = (definition.presets || []).find((entry) => entry.key === String(presetKey || ''));
  if (!preset) return section;
  return {
    ...section,
    ...JSON.parse(JSON.stringify(preset.values)),
    id: section.id,
    type: definition.type,
    version: definition.version
  };
}

function emptyFieldValue(field) {
  if (field.type === 'media' || field.type === 'list') return [];
  if (field.type === 'number') return Number.isInteger(field.min) ? field.min : 0;
  if (field.type === 'select') return Array.isArray(field.options) && field.options.length ? field.options[0] : '';
  return '';
}

export function createPageSectionInstance(type, pageSlug, existingSections = [], { createId = sectionIdSeed } = {}) {
  const definition = getPageSectionDefinition(type, pageSlug);
  if (!definition) return null;
  const usedIds = new Set((Array.isArray(existingSections) ? existingSections : []).map((section) => String(section?.id || '')));
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const id = `custom-${definition.type}-${String(createId() || '').toLowerCase()}`;
    if (!sectionIdPattern.test(id) || usedIds.has(id)) continue;
    return {
      id,
      type: definition.type,
      version: definition.version,
      enabled: true,
      ...Object.fromEntries(definition.fields.map((field) => [field.key, emptyFieldValue(field)]))
    };
  }
  throw new Error(`Unable to create a unique id for page section type: ${definition.type}`);
}

function validateTextField(label, value, maxLength) {
  if (typeof value !== 'string') return `${label}必须是文本。`;
  const limit = Number.isInteger(maxLength) ? maxLength : 4000;
  if (value.length > limit) return `${label}不得超过 ${limit} 个字符。`;
  return '';
}

// Media values carry only the governed reference (asset id + display role).
// Whether that asset is actually authorized for this page is decided by the
// server-side media resolver, never here — the registry owns shape, not grants.
function validateMediaField(label, value, field) {
  if (!Array.isArray(value)) return `${label}必须是素材列表。`;
  const max = Number.isInteger(field.maxItems) ? field.maxItems : 1;
  if (value.length > max) return `${label}最多只能有 ${max} 个素材。`;
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return `${label}中存在格式无效的素材。`;
    if (!mediaAssetIdPattern.test(String(entry.media_asset_id ?? '').trim())) return `${label}中存在未登记的素材。`;
    const role = String(entry.role ?? '').trim();
    if (!role) continue;
    if (!mediaRolePattern.test(role)) return `${label}的展示位置只能使用小写字母、数字和短横线。`;
    const allowedRoles = Array.isArray(field.roles) ? field.roles : [];
    if (allowedRoles.length && !allowedRoles.includes(role)) {
      return `${label}的展示位置“${role}”不被支持，可用：${allowedRoles.join('、')}。`;
    }
  }
  return '';
}

function validateListField(label, value, field) {
  if (!Array.isArray(value)) return `${label}必须是列表。`;
  const max = Number.isInteger(field.maxItems) ? field.maxItems : 20;
  if (value.length > max) return `${label}最多只能有 ${max} 项。`;
  const itemFields = Array.isArray(field.itemFields) ? field.itemFields : [];
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return `${label}第 ${index + 1} 项格式无效。`;
    for (const itemField of itemFields) {
      const error = validateFieldValue(`${label}第 ${index + 1} 项的${itemField.label}`, item[itemField.key], itemField);
      if (error) return error;
    }
  }
  return '';
}

// A select is a closed set: the value must be one the definition declares, so a
// block can never point at an unregistered data source or template.
function validateSelectField(label, value, field) {
  const options = Array.isArray(field.options) ? field.options : [];
  if (!options.length) return `${label}没有可选项定义。`;
  if (typeof value !== 'string') return `${label}必须是文本。`;
  if (!options.includes(value)) return `${label}“${value}”不在允许范围内。`;
  return '';
}

function validateNumberField(label, value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return `${label}必须是数字。`;
  if (!Number.isInteger(value)) return `${label}必须是整数。`;
  if (Number.isInteger(field.min) && value < field.min) return `${label}不得小于 ${field.min}。`;
  if (Number.isInteger(field.max) && value > field.max) return `${label}不得大于 ${field.max}。`;
  return '';
}

function validateFieldValue(label, value, field) {
  if (value === undefined) return '';
  if (field.type === 'text' || field.type === 'textarea') return validateTextField(label, value, field.maxLength);
  if (field.type === 'media') return validateMediaField(label, value, field);
  if (field.type === 'list') return validateListField(label, value, field);
  if (field.type === 'select') return validateSelectField(label, value, field);
  if (field.type === 'number') return validateNumberField(label, value, field);
  return `${label}使用了不受支持的字段类型。`;
}

export function validatePageSectionInstance(section, pageSlug = '') {
  if (!section || typeof section !== 'object' || Array.isArray(section)) return '页面区块无效。';
  if (!Object.hasOwn(section, 'type') || section.type == null || section.type === '') return '';
  const definition = getPageSectionDefinition(section.type, pageSlug);
  if (!definition) return '该页面区块类型未注册或不适用于当前页面。';
  if (section.version !== definition.version) return `区块“${definition.label}”版本不受支持。`;
  if (section.enabled !== undefined && typeof section.enabled !== 'boolean') return `区块“${definition.label}”的显示状态无效。`;
  for (const field of definition.fields) {
    const error = validateFieldValue(`区块“${definition.label}”的${field.label}`, section[field.key], field);
    if (error) return error;
  }
  return '';
}

export function registeredPageSectionInstances(page, pageSlug = '', { includeDisabled = false } = {}) {
  if (!Array.isArray(page?.sections)) return [];
  const slug = String(pageSlug || page?.slug || '').trim();
  const seenIds = new Set();
  return page.sections.filter((section) => {
    if (!section || typeof section !== 'object' || (!includeDisabled && section.enabled === false)) return false;
    if (!getPageSectionDefinition(section.type, slug)) return false;
    const id = String(section.id || '').trim();
    if (!sectionIdPattern.test(id) || seenIds.has(id)) return false;
    seenIds.add(id);
    return validatePageSectionInstance(section, slug) === '';
  });
}
