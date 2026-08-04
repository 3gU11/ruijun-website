import { contentCollections, contentRoles } from './content-model.mjs';

const directusTypeByContractType = Object.freeze({
  string: 'string', text: 'text', integer: 'integer', boolean: 'boolean', json: 'json',
  datetime: 'timestamp', date: 'date'
});

const interfaceByContractType = Object.freeze({
  string: 'input', text: 'input-multiline', integer: 'input', boolean: 'boolean', json: 'input-code',
  datetime: 'datetime', date: 'datetime'
});

const statusChoicesByCollection = Object.freeze({
  leads: [
    ['new', '新建'], ['assigned', '已分配'], ['in_progress', '跟进中'], ['converted', '已转化'],
    ['invalid', '无效'], ['duplicate', '重复'], ['spam', '垃圾']
  ],
  lead_notification_jobs: [
    ['pending', 'Pending'], ['retrying', 'Retrying'], ['processing', 'Delivering'], ['sent', 'Sent'],
    ['manual_review', 'Manual review'], ['manual_sent', 'Manually sent'], ['resolved', 'Resolved']
  ]
});

function fieldPlan(collection, field, defaultValues) {
  const type = directusTypeByContractType[field.type];
  if (!type) throw new TypeError(`Unsupported CMS field type: ${field.type}`);
  const statusChoices = field.name === 'status' ? statusChoicesByCollection[collection.name] : null;
  return {
    collection: collection.name,
    field: field.name,
    type,
    schema: {
      is_nullable: !field.required,
      ...(field.unique ? { is_unique: true } : {}),
      default_value: Object.hasOwn(defaultValues, field.name) ? defaultValues[field.name] : null
    },
    meta: {
      interface: statusChoices ? 'select-dropdown' : interfaceByContractType[field.type],
      required: Boolean(field.required),
      ...(field.type === 'json' ? { special: ['cast-json'] } : {}),
      ...(statusChoices ? { options: { choices: statusChoices.map(([value, text]) => ({ value, text })) } } : {})
    }
  };
}

function rolePlan(key, contentCollectionNames) {
  const privateCollections = ['leads', 'lead_dedupe_keys', 'lead_notification_jobs', 'lead_upload_sessions', 'content_versions', 'service_entry_clicks'];
  const publishedContentCollections = contentCollectionNames.filter((collection) => !privateCollections.includes(collection));
  if (key === 'system_admin') return { key, name: '系统管理员', admin: true, manage_collections: contentCollectionNames, publish_collections: publishedContentCollections };
  if (key === 'publisher') return { key, name: '发布人员', admin: false, manage_collections: publishedContentCollections, publish_collections: publishedContentCollections };
  if (key === 'sales_user') return { key, name: '销售人员', admin: false, manage_collections: ['leads'], publish_collections: [] };
  if (key === 'read_only_manager') return { key, name: '只读管理人员', admin: false, manage_collections: ['service_entry_clicks'], publish_collections: [] };
  if (key === 'content_audit_reader') return { key, name: 'Content audit reader', admin: false, manage_collections: [], publish_collections: [] };
  if (key === 'notification_worker') return { key, name: 'Notification worker service account', admin: false, manage_collections: [], publish_collections: [] };
  if (key === 'notification_manager') return { key, name: 'Notification manager', admin: false, manage_collections: ['lead_notification_jobs'], publish_collections: [] };
  if (key === 'website_bff') return { key, name: '官网 BFF 服务账户', admin: false, manage_collections: [], publish_collections: [] };
  if (key === 'technical_reviewer') return { key, name: '技术审核人员', admin: false, manage_collections: ['product_series', 'product_models', 'product_parameters', 'service_resources', 'knowledge_items', 'media_assets'], publish_collections: [] };
  if (key === 'brand_reviewer') return { key, name: '品牌审核人员', admin: false, manage_collections: ['pages', 'articles', 'case_studies', 'manufacturing_evidence', 'qualifications', 'milestones', 'service_locations', 'external_service_entries', 'site_settings', 'media_assets'], publish_collections: [] };
  return { key, name: '内容编辑', admin: false, manage_collections: publishedContentCollections, publish_collections: [] };
}

export function buildDirectusSchemaPlan() {
  const collections = contentCollections.map((collection) => ({
    collection: collection.name,
    meta: { icon: 'article', note: 'Ruijun website CMS content collection', hidden: false },
    schema: {}
  }));
  const fields = contentCollections.flatMap((collection) => collection.fields.map((field) => fieldPlan(collection, field, collection.defaultValues)));
  const collectionNames = collections.map((collection) => collection.collection);
  const roles = contentRoles.map((role) => rolePlan(role, collectionNames));
  return { collections, fields, roles };
}
