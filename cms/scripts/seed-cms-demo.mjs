import { readFile } from 'node:fs/promises';

const cmsRoot = new URL('../', import.meta.url);

function parseEnvironment(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1].trim(), match[2]]] : [];
  }));
}

function required(value, name) {
  if (!value || value === '<REPLACE_ME>') throw new Error(`${name} is required`);
  return value;
}

function isLocalOrPrivateHost(hostname) {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname)) return true;
  const private172 = /^172\.(\d{1,3})\./.exec(hostname);
  return Boolean(private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31);
}

function client(baseUrl, token) {
  return async (path, options = {}) => {
    const response = await fetch(new URL(path.replace(/^\//, ''), `${baseUrl.replace(/\/$/, '')}/`), {
      ...options,
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}` }
    });
    let payload = null;
    try { payload = await response.json(); } catch { /* Empty Directus response. */ }
    if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} failed: ${payload?.errors?.[0]?.message || response.status}`);
    return payload?.data;
  };
}

const source = await readFile(new URL('.env.local', cmsRoot), 'utf8');
const settings = parseEnvironment(source);
const baseUrl = required(settings.CMS_BASE_URL || settings.PUBLIC_URL, 'CMS_BASE_URL');
const parsedBase = new URL(baseUrl);
if (!isLocalOrPrivateHost(parsedBase.hostname)) throw new Error('Demo seed is limited to localhost or RFC1918 private addresses');

const loginResponse = await fetch(new URL('/auth/login', baseUrl), {
  method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: required(settings.ADMIN_EMAIL, 'ADMIN_EMAIL'), password: required(settings.ADMIN_PASSWORD, 'ADMIN_PASSWORD') })
});
const loginPayload = await loginResponse.json();
if (!loginResponse.ok || !loginPayload?.data?.access_token) throw new Error(`Unable to obtain local Directus session: ${loginResponse.status}`);
const request = client(baseUrl, loginPayload.data.access_token);

await request('/settings', {
  method: 'PATCH',
  body: JSON.stringify({
    project_name: '瑞钧官网内容后台',
    project_descriptor: '官网内容、产品与常见问题发布后台',
    project_color: '#e47b12',
    default_language: 'zh-CN'
  })
});

const notificationMarker = 'DEMO-NOTIFICATION-MANUAL-REVIEW';
const contentMarker = 'DEMO-CMS-CONTENT';
const cleanup = process.argv.includes('--cleanup');

const demoRecords = [
  {
    collection: 'repair_page_configs', field: 'page_key', value: 'repair_home',
    data: {
      page_key: 'repair_home', title: '售后服务（CMS 演示草稿）', intro: '用于演示官网售后入口配置的未发布草稿。',
      hero_asset: null,
      model_cards: [{ model: 'DEMO-CMS-MODEL', label: '演示机型' }],
      action_cards: [
        { action: '01', label: '提交维修申请' }, { action: '02', label: '保修核验' },
        { action: '09', label: '维修进度' }, { action: '10', label: '我的申请' }
      ],
      process_steps: [{ step: 1, title: '填写设备信息' }, { step: 2, title: '确认并提交' }],
      notices: ['这是 CMS 演示草稿，不会发布到官网。'], faq_refs: [], seo: { title: '售后服务演示草稿' }, language: 'zh-CN',
      source_document: `${contentMarker}/repair`, status: 'draft', publication_state: 'unpublished',
      review_note: '演示数据：不允许发布到官网。'
    }
  },
  {
    collection: 'pages', field: 'source_document', value: `${contentMarker}/home`,
    data: {
      slug: 'demo-cms-home', title: 'CMS 演示页面（不会公开）', language: 'zh-CN',
      sections: [{ id: 'demo-intro', kicker: 'CMS DEMO', title: '可编辑的官网段落', body: '这是一条仅供后台演示的页面草稿。' }],
      seo: { title: 'CMS 演示页面', description: '仅供本地 CMS 编辑与审核流程演示。' },
      source_document: `${contentMarker}/home`, status: 'draft', publication_state: 'unpublished',
      review_note: '演示数据：不允许发布到官网。'
    }
  },
  {
    collection: 'articles', field: 'source_document', value: `${contentMarker}/article`,
    data: {
      slug: 'demo-cms-news', category: 'news', title: 'CMS 演示资讯（不会公开）',
      summary: '用于演示文章编辑、SEO 和送审队列。', body: '这是一篇仅供本地演示的文章正文。',
      seo: { title: 'CMS 演示资讯', description: '仅供本地 CMS 演示。' },
      source_document: `${contentMarker}/article`, status: 'draft', publication_state: 'unpublished',
      review_note: '演示数据：不允许发布到官网。'
    }
  },
  {
    collection: 'product_series', field: 'series_code', value: 'DEMO-CMS-SERIES',
    data: {
      series_code: 'DEMO-CMS-SERIES', slug: 'demo-cms-series', name: 'CMS 演示系列（不会公开）',
      positioning: '用于演示产品系列、型号与独立参数的关联编辑。',
      scenarios: ['演示场景'], capabilities: ['演示能力'], sort_order: 999, language: 'zh-CN',
      import_evidence: { source: contentMarker }, status: 'draft', publication_state: 'unpublished',
      source_document: `${contentMarker}/product`, review_note: '演示数据：不允许发布到官网。'
    }
  },
  {
    collection: 'product_models', field: 'model_code', value: 'DEMO-CMS-MODEL',
    data: {
      series_code: 'DEMO-CMS-SERIES', model_code: 'DEMO-CMS-MODEL', slug: 'demo-cms-model',
      name: 'CMS 演示型号（不会公开）', parameters: {}, configuration: {}, media: [], resources: [], case_studies: [],
      import_evidence: { source: contentMarker }, status: 'draft', publication_state: 'unpublished',
      source_document: `${contentMarker}/product`, review_note: '演示数据：不允许发布到官网。'
    }
  },
  {
    collection: 'product_parameters', field: 'source_document', value: `${contentMarker}/product`,
    data: {
      model_code: 'DEMO-CMS-MODEL', group_name: '演示参数', field_name: '演示参数', value: '仅供后台演示', unit: '', sort_order: 1,
      import_evidence: { source: contentMarker }, status: 'draft', publication_state: 'unpublished',
      source_document: `${contentMarker}/product`, review_note: '演示数据：不允许发布到官网。'
    }
  }
];

async function findDemoRecord(definition) {
  const filter = encodeURIComponent(definition.value);
  return request(`/items/${definition.collection}?filter[${definition.field}][_eq]=${filter}&limit=20&fields=id,status,${definition.field}`);
}

async function removeRecords(collection, records) {
  for (const record of records || []) await request(`/items/${collection}/${encodeURIComponent(record.id)}`, { method: 'DELETE' });
}

const existingNotification = await request(`/items/lead_notification_jobs?filter[lead_reference][_eq]=${encodeURIComponent(notificationMarker)}&limit=20&fields=id,status,lead_reference`);
const existingContent = new Map();
for (const definition of demoRecords) existingContent.set(definition.collection + ':' + definition.value, await findDemoRecord(definition));

if (cleanup) {
  await removeRecords('lead_notification_jobs', existingNotification);
  // Delete children first so the demo product relationship can never leave orphans.
  for (const definition of [...demoRecords].reverse()) await removeRecords(definition.collection, existingContent.get(definition.collection + ':' + definition.value));
  console.log(JSON.stringify({ demo: true, removedNotifications: existingNotification?.length || 0, removedContent: [...existingContent.values()].flat().length }));
  process.exit(0);
}

let notification = existingNotification?.find((job) => job.status === 'manual_review');
if (!notification) {
  await removeRecords('lead_notification_jobs', existingNotification);
  notification = await request('/items/lead_notification_jobs', {
    method: 'POST',
    body: JSON.stringify({
      lead_reference: notificationMarker, delivery_channel: 'sales', attempts: 2, status: 'manual_review',
      last_error: '演示任务：销售通知渠道暂时不可用',
      activity_log: [{ action: 'delivery_needs_manual_review', actor: 'demo-worker', at: new Date().toISOString() }]
    })
  });
}

const seededContent = [];
for (const definition of demoRecords) {
  const records = existingContent.get(definition.collection + ':' + definition.value) || [];
  if (records.length) {
    seededContent.push({ collection: definition.collection, id: records[0].id, reused: true });
    continue;
  }
  const created = await request(`/items/${definition.collection}`, { method: 'POST', body: JSON.stringify(definition.data) });
  seededContent.push({ collection: definition.collection, id: created.id, reused: false });
}

console.log(JSON.stringify({ demo: true, notification: { jobId: notification.id, status: notification.status }, content: seededContent }));
