const DRAFT = Object.freeze({ status: 'draft', publication_state: 'unpublished' });
const ABOUT_SOURCE = 'demo/about/index.html';
const MANUFACTURING_SOURCE = 'demo/manufacturing/index.html';
const DATA_SOURCE = 'docs/reference/原网站业务数据台账.md';

function draft(sourceKey, sourceDocument, record, reviewNote) {
  return {
    ...DRAFT,
    source_key: sourceKey,
    ...record,
    source_url: null,
    source_document: sourceDocument,
    review_note: reviewNote
  };
}

const qualificationAssets = Object.freeze([
  ['certificate', '质量管理体系认证证书'],
  ['certificate', '职业健康安全管理体系认证证书'],
  ['certificate', '质量管理体系英文认证证书'],
  ['certificate', '环境管理体系认证证书'],
  ['certificate', '环境管理体系英文认证证书'],
  ['certificate', '职业健康安全英文认证证书'],
  ['certificate', 'TUV认证证书'],
  ['honor', '高新技术企业证书'],
  ['honor', '企业技术中心证书'],
  ['honor', '企业荣誉证书'],
  ['honor', '专精特新企业证书'],
  ['honor', '行业荣誉证书'],
  ['patent', '导丝机构专利证书'],
  ['patent', '回卷检测机构专利证书'],
  ['patent', '精密中走丝专利证书'],
  ['patent', '线切割导丝机专利证书'],
  ['patent', '喷液机构专利证书'],
  ['patent', '钼丝筒专利证书'],
  ['patent', '穿丝线切割机专利证书'],
  ['patent', '辅助夹具专利证书']
]);

function qualificationRecords() {
  const counters = { certificate: 0, honor: 0, patent: 0 };
  return qualificationAssets.map(([type, name], index) => {
    counters[type] += 1;
    const suffix = String(counters[type]).padStart(2, '0');
    return draft(`${type}-${suffix}`, ABOUT_SOURCE, {
      type,
      name,
      certificate_number: null,
      issuer: null,
      valid_until: null,
      assets: [{ path: `/assets/about-psd/${type}-${suffix}.jpg`, alt: name }],
      sort_order: index + 1,
      authorization_status: 'review_required'
    }, '素材名称和展示图来自当前关于我们 Demo；证书编号、发证机构、有效期、知识产权主体及重新发布授权均未核验，禁止发布。');
  });
}

export function buildWebsiteEvidenceDrafts() {
  return structuredClone({
    manufacturing_evidence: [
      draft('precision-machining', MANUFACTURING_SOURCE, {
        process: 'precision-machining',
        description: '控制基础部件的加工与装配基准，为设备精度建立稳定基础。',
        media: [{ path: '/assets/psd/reason-factory-full.jpg', alt: '瑞钧智科制造工厂' }],
        inspection_evidence: null,
        sort_order: 1
      }, '内容来自当前制造页面，未提供工艺参数、检测报告或可公开的验收证据，禁止作为已验证性能声明发布。'),
      draft('standardized-assembly', MANUFACTURING_SOURCE, {
        process: 'standardized-assembly',
        description: '统一装配工艺与检验节点，降低不同批次之间的状态差异。',
        media: [{ path: '/assets/psd/reason-factory-full.jpg', alt: '瑞钧智科制造工厂' }],
        inspection_evidence: null,
        sort_order: 2
      }, '内容来自当前制造页面，装配标准、检验节点和适用范围需由制造负责人审核后才可发布。'),
      draft('whole-machine-validation', MANUFACTURING_SOURCE, {
        process: 'whole-machine-validation',
        description: '通过运行、加工与精度检测确认设备交付状态。',
        media: [{ path: '/assets/psd/reason-factory-full.jpg', alt: '瑞钧智科制造工厂' }],
        inspection_evidence: null,
        sort_order: 3
      }, '内容来自当前制造页面，检测项目、条件、结果和适用机型均未核验，禁止作为交付承诺发布。')
    ],
    milestones: [
      [1997, '成立丰华数控（公司始创）'], [2003, '创新中走丝（初代研发）'], [2006, '成立瑞钧机械（迁址昆山）'],
      [2014, '启用新建厂房（规模化生产）'], [2016, '扩建流水线车间（标准化生产）'], [2025, '启用瑞钧智科（智能制造）']
    ].map(([year, event], index) => draft(`timeline-${year}`, ABOUT_SOURCE, {
      year, event, evidence: '来源为当前关于我们页面时间轴文案，需补充工商、项目或新闻证据。', sort_order: index + 1
    }, '历史节点尚未完成工商资料、项目资料或新闻来源核验，禁止作为正式品牌年表发布。')),
    qualifications: qualificationRecords(),
    service_locations: [
      ['factory-changshu', '常熟市'], ['factory-kunshan', '昆山市']
    ].map(([sourceKey, city]) => draft(sourceKey, ABOUT_SOURCE, {
      region: '江苏省', city, service_scope: '当前页面提及的工厂信息；地址、开放安排和服务范围待业务审核。',
      contact: {}, business_status: 'review_required', valid_until: null
    }, '仅根据当前关于我们页面建立位置草稿；不迁移个人联系人、电话、邮箱或详细地址，须经业务和隐私审核后补齐。')),
    service_resources: [
      ['legacy-new-user-manual', 'manual'], ['legacy-auto-threading-manual', 'manual'], ['legacy-fr-xs-auto-technical-package', 'technical_package'], ['legacy-ft-pro-technical-package', 'technical_package']
    ].map(([sourceKey, type]) => draft(sourceKey, DATA_SOURCE, {
      type, applicable_models: [], version: null, language: 'zh-CN', asset: null, updated_at: null
    }, '旧站资料仅建立待审元数据；原始下载文件须完成版权、病毒、敏感信息和版本审核后上传至受控存储，不得保留旧站外链或公开下载。'))
  });
}

function collectionUrl(baseUrl, collection) {
  return new URL(`items/${collection}`, `${baseUrl.replace(/\/$/, '')}/`);
}

export function createDirectusWebsiteEvidenceSeeder({ baseUrl, accessToken, fetchImpl = fetch }) {
  if (!baseUrl || !accessToken) throw new TypeError('baseUrl and accessToken are required');
  const headers = { Accept: 'application/json', Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  async function upsert(collection, record) {
    const url = collectionUrl(baseUrl, collection);
    const lookupUrl = new URL(url);
    lookupUrl.searchParams.set('filter[source_key][_eq]', record.source_key);
    lookupUrl.searchParams.set('limit', '1');
    lookupUrl.searchParams.set('fields', 'id');
    const lookupResponse = await fetchImpl(lookupUrl, { method: 'GET', headers });
    if (!lookupResponse.ok) throw new Error(`Unable to query ${collection}: ${lookupResponse.status}`);
    const lookup = await lookupResponse.json();
    const existingId = Array.isArray(lookup?.data) ? lookup.data[0]?.id : null;
    const writeUrl = existingId ? new URL(`${url.pathname}/${existingId}`, `${baseUrl.replace(/\/$/, '')}/`) : url;
    const writeResponse = await fetchImpl(writeUrl, { method: existingId ? 'PATCH' : 'POST', headers, body: JSON.stringify(record) });
    if (!writeResponse.ok) throw new Error(`Unable to write ${collection}: ${writeResponse.status}`);
    return existingId ? 'updated' : 'created';
  }

  return {
    async seed() {
      const result = {};
      for (const [collection, records] of Object.entries(buildWebsiteEvidenceDrafts())) {
        result[collection] = { created: 0, updated: 0 };
        for (const record of records) result[collection][await upsert(collection, record)] += 1;
      }
      return result;
    }
  };
}
