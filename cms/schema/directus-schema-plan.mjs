import { contentCollections, contentRoles } from './content-model.mjs';

const directusTypeByContractType = Object.freeze({
  string: 'string', text: 'text', integer: 'integer', boolean: 'boolean', json: 'json',
  datetime: 'timestamp', date: 'date'
});

const interfaceByContractType = Object.freeze({
  string: 'input', text: 'input-multiline', integer: 'input', boolean: 'boolean', json: 'input-code',
  datetime: 'datetime', date: 'datetime'
});

// Keep native Directus collection navigation understandable for business users.
// The database/API keys stay stable in English; only the admin display label is translated.
const collectionLabels = Object.freeze({
  pages: '页面',
  repair_page_configs: '售后页面配置',
  product_series: '产品系列',
  product_models: '产品型号',
  product_parameters: '技术参数',
  case_studies: '客户案例',
  articles: '新闻文章',
  manufacturing_evidence: '制造证据',
  qualifications: '资质证书',
  milestones: '发展历程',
  service_resources: '服务资料',
  service_locations: '服务网点',
  knowledge_items: '常见问题知识',
  external_service_entries: '售后入口',
  service_entry_clicks: '服务入口点击',
  media_assets: '媒体资产',
  leads: '销售线索',
  lead_dedupe_keys: '线索去重记录',
  lead_notification_jobs: '线索通知任务',
  lead_upload_sessions: '线索附件上传',
  content_versions: '内容版本',
  product_release_snapshots: '产品发布快照',
  site_settings: '全站设置',
  content_preview_tokens: '草稿预览令牌'
});

const fieldLabels = Object.freeze({
  id: '编号', status: '内容状态', publication_state: '公开状态', published_at: '发布时间', source_url: '来源地址',
  source_document: '来源文档', review_note: '审核说明', reviewed_by: '审核人', reviewed_at: '审核时间',
  published_by: '发布人', publication_log: '发布记录', slug: '路由标识', title: '标题', language: '语言',
  sections: '页面段落', seo: '搜索优化', series_code: '系列编码', model_code: '型号编码', name: '名称',
  positioning: '系列定位', scenarios: '应用场景', capabilities: '核心能力', cover_asset: '封面素材', sort_order: '排序',
  import_evidence: '导入证据', parameters: '技术参数', configuration: '配置', media: '媒体素材', resources: '资料',
  case_studies: '客户案例', group_name: '分组', field_name: '字段名称', value: '数值', unit: '单位',
  test_conditions: '测试条件', category: '分类', summary: '摘要', body: '正文', video_url: '视频地址',
  source_key: '来源标识', process: '制造工序', description: '说明', inspection_evidence: '检测证据',
  type: '类型', certificate_number: '证书编号', issuer: '颁发机构', valid_until: '有效期', assets: '关联素材',
  event: '事件', evidence: '证据说明', applicable_models: '适用型号', version: '版本', asset: '资料文件',
  updated_at: '更新时间', region: '区域', city: '城市', service_scope: '服务范围', contact: '联系方式',
  business_status: '营业状态', visibility: '可见范围', channel: '使用渠道', question_title: '问题标题',
  error_codes: '错误代码', symptoms: '故障现象', troubleshooting_steps: '排障步骤', risk_level: '风险等级',
  safety_preconditions: '安全前置条件', escalation_guidance: '人工升级说明', technical_reviewer: '技术审核责任人',
  dify_sync_status: '知识库同步状态', entry_type: '入口类型', url: '目标地址', enabled: '是否启用',
  open_mode: '打开方式', fallback_phone: '备用电话', health_status: '健康状态', file_id: '文件编号',
  original_file_name: '原始文件名', mime_type: '文件类型', byte_size: '文件大小', usage_scope: '使用范围',
  alt_text: '替代文本', copyright_status: '版权状态', authorization_note: '授权与来源说明', lead_reference: '线索编号',
  lead_type: '线索类型', source_page: '来源页面', source_campaign: '来源活动', phone: '电话', company: '公司',
  email: '邮箱', requirement: '需求说明', product_series: '产品系列', product_model: '产品型号', attachment_ids: '附件编号',
  owner: '负责人', activity_log: '跟进记录', follow_up_note: '跟进备注', consent_at: '同意时间', key_hash: '去重键哈希',
  expires_at: '过期时间', delivery_channel: '通知渠道', attempts: '尝试次数', next_attempt_at: '下次尝试时间',
  sent_at: '发送时间', last_error: '最近错误', lock_token: '锁定令牌', locked_by: '锁定人', locked_at: '锁定时间',
  handled_by: '处理人', handled_at: '处理时间', manual_note: '人工处理说明', upload_reference: '上传编号', file_name: '文件名',
  content_collection: '内容集合', content_item_id: '内容编号', source_status: '原状态', source_publication_state: '原公开状态',
  snapshot: '快照', changed_fields: '变更字段', action: '操作', actor: '操作人', created_at: '创建时间', restore_note: '恢复说明',
  restored_by: '恢复人', restored_at: '恢复时间', release_key: '发布标识', source_hash: '来源哈希', release_note: '发布说明',
  cache_invalidation_status: '缓存刷新状态', cache_invalidation_attempts: '缓存刷新次数', cache_invalidation_last_attempt_at: '最近刷新时间',
  cache_invalidated_at: '缓存刷新完成时间', cache_invalidation_error: '缓存刷新错误', restored_from_release_id: '来源发布编号',
  restored_from_version: '来源版本', setting_key: '设置标识', navigation: '主导航', footer: '页脚', brand: '品牌信息',
  contacts: '联系方式', languages: '可用语言', analytics: '分析配置', token_hash: '令牌哈希',
  content_collection: '内容集合', content_item_id: '内容编号', issued_by: '签发人', used_at: '使用时间',
  revoked_at: '撤销时间', revoked_by: '撤销人', use_count: '使用次数'
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
  const special = [
    ...(field.type === 'json' ? ['cast-json'] : []),
    ...(field.special ? [field.special] : [])
  ];
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
      ...(fieldLabels[field.name] ? { translations: [{ language: 'zh-CN', translation: fieldLabels[field.name] }] } : {}),
      ...(special.length ? { special } : {}),
      ...(field.readonly ? { readonly: true } : {}),
      ...(statusChoices ? { options: { choices: statusChoices.map(([value, text]) => ({ value, text })) } } : {})
    }
  };
}

function rolePlan(key, contentCollectionNames) {
  const privateCollections = ['leads', 'lead_dedupe_keys', 'lead_notification_jobs', 'lead_upload_sessions', 'content_versions', 'product_release_snapshots', 'service_entry_clicks', 'content_preview_tokens'];
  const publishedContentCollections = contentCollectionNames.filter((collection) => !privateCollections.includes(collection));
  if (key === 'system_admin') return { key, name: '系统管理员', admin: true, manage_collections: contentCollectionNames, publish_collections: publishedContentCollections };
  if (key === 'review_manager') return { key, name: '审核管理', admin: false, manage_collections: ['pages', 'repair_page_configs', 'product_series', 'case_studies', 'articles', 'manufacturing_evidence', 'qualifications', 'milestones', 'service_locations'], publish_collections: ['pages', 'repair_page_configs', 'product_series', 'case_studies', 'articles', 'manufacturing_evidence', 'qualifications', 'milestones', 'service_locations'] };
  if (key === 'sales_user') return { key, name: '销售人员', admin: false, manage_collections: ['leads'], publish_collections: [] };
  if (key === 'read_only_manager') return { key, name: '只读管理人员', admin: false, manage_collections: ['service_entry_clicks'], publish_collections: [] };
  if (key === 'content_audit_reader') return { key, name: '内容审核只读账号', admin: false, manage_collections: [], publish_collections: [] };
  if (key === 'notification_worker') return { key, name: '通知任务服务账号', admin: false, manage_collections: [], publish_collections: [] };
  if (key === 'notification_manager') return { key, name: '通知管理员', admin: false, manage_collections: ['lead_notification_jobs'], publish_collections: [] };
  if (key === 'website_bff') return { key, name: '官网 BFF 服务账户', admin: false, manage_collections: [], publish_collections: [] };
  return { key, name: '内容编辑', admin: false, manage_collections: ['pages', 'repair_page_configs', 'product_series', 'case_studies', 'articles', 'manufacturing_evidence', 'qualifications', 'milestones', 'service_locations'], publish_collections: [] };
}

export function buildDirectusSchemaPlan() {
  const collections = contentCollections.map((collection) => ({
    collection: collection.name,
    meta: {
      icon: 'article',
      note: '瑞钧官网内容后台数据集合',
      hidden: false,
      translations: collectionLabels[collection.name]
        ? [{ language: 'zh-CN', translation: collectionLabels[collection.name] }]
        : []
    },
    schema: {}
  }));
  const fields = contentCollections.flatMap((collection) => collection.fields.map((field) => fieldPlan(collection, field, collection.defaultValues)));
  const collectionNames = collections.map((collection) => collection.collection);
  const roles = contentRoles.map((role) => rolePlan(role, collectionNames));
  return { collections, fields, roles };
}
