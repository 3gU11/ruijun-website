import { appendFile, mkdir, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { CmsUnavailableError, createCmsPublicContentClient } from './cms-public-content.mjs';
import { WebsiteBffUnavailable, createWebsiteBffLeadClient } from './website-bff-lead-client.mjs';

const root = resolve(import.meta.dirname);
const host = process.env.SITE_HOST || '0.0.0.0';
const port = Number(process.env.SITE_PORT || 4173);
const repairsysHealthUrl = process.env.REPAIRSYS_HEALTH_URL || 'http://127.0.0.1:3101/api/health';
const repairsysPublicBaseUrl = String(process.env.REPAIRSYS_PUBLIC_BASE_URL || '').replace(/\/$/, '');
const cmsProductSeriesUrl = process.env.CMS_PRODUCT_SERIES_URL || 'http://127.0.0.1:8055/items/product_series';
const cmsProductModelsUrl = process.env.CMS_PRODUCT_MODELS_URL || 'http://127.0.0.1:8055/items/product_models';
const cmsPagesUrl = process.env.CMS_PAGES_URL || 'http://127.0.0.1:8055/items/pages';
const cmsServiceEntriesUrl = process.env.CMS_SERVICE_ENTRIES_URL || '';
const cmsPublicContentCacheTtlMs = Number(process.env.CMS_PUBLIC_CONTENT_CACHE_TTL_MS || 30_000);
const websiteBffBaseUrl = String(process.env.WEBSITE_BFF_BASE_URL || '').replace(/\/$/, '');
const analyticsPath = resolve(root, 'data', 'analytics-events.jsonl');
const serviceRoutes = Object.freeze({
  support: '/support',
  request: '/repair/new',
  warranty: '/warranty',
  requests: '/requests'
});
const allowedEntries = new Set(Object.keys(serviceRoutes));
const rateBuckets = new Map();
let healthCache = { checkedAt: 0, available: false };
const cmsPublicContent = createCmsPublicContentClient({
  productSeriesEndpoint: cmsProductSeriesUrl,
  productModelsEndpoint: cmsProductModelsUrl,
  pagesEndpoint: cmsPagesUrl,
  serviceEntriesEndpoint: cmsServiceEntriesUrl || undefined,
  cacheTtlMs: Number.isFinite(cmsPublicContentCacheTtlMs) && cmsPublicContentCacheTtlMs >= 0 ? cmsPublicContentCacheTtlMs : 30_000
});
const websiteBffLeadClient = websiteBffBaseUrl
  ? createWebsiteBffLeadClient({ baseUrl: websiteBffBaseUrl })
  : null;

const faqArticles = Object.freeze([
  {
    id: 'new_repair',
    keywords: ['维修申请', '发起维修', '申请维修', '报修', '故障申请', '怎么维修'],
    title: '发起维修申请，需要先准备这些',
    steps: ['确认设备型号和机床编号', '记录故障现象、发生时间并准备现场照片或视频', '进入售后系统填写联系人并提交申请'],
    note: '提交后可在维修进度查询中查看后续状态。',
    answer: '发起维修前，请准备设备型号、机床编号、故障现象、发生时间、现场照片或视频，以及联系人和电话。AI 会先说明资料准备；随后在售后系统中打开“发起维修申请”并按页面提示提交。该系统用于工单提交，不提供实时人工对话。',
    suggestedAction: 'request'
  },
  {
    id: 'repair_progress',
    keywords: ['维修进度', '进度查询', '维修状态', '申请进度', '到哪了', '处理进度', '维修申请包含哪些处理状态'],
    title: '维修进度在售后系统中统一查询',
    steps: ['进入“维修进度查询”', '按页面提示完成身份验证', '查看审核、补资料、维修、寄回物流和归档状态'],
    note: '具体处理时间和物流状态以售后系统显示为准。',
    answer: '进入“维修进度查询”即可查看申请审核、资料补充、维修处理、寄回物流和归档状态。请按售后系统页面提示完成身份验证；该系统用于进度查询，不提供实时人工对话。',
    suggestedAction: 'requests'
  },
  {
    id: 'warranty_status',
    keywords: ['保修', '质保', '保修状态', '保修期', '是否在保', '核验保修需要哪些资料'],
    title: '核验保修状态需要两项设备信息',
    steps: ['准备设备型号', '准备机床编号', '进入“保修状态核验”并按页面提示填写'],
    note: '最终保修结果以售后系统返回的确定性数据为准。',
    answer: '核验保修状态需要设备型号和机床编号。打开“保修状态核验”，填写设备信息后以售后系统返回的结果为准；该系统用于保修核验，不提供实时人工对话。',
    suggestedAction: 'warranty'
  },
  {
    id: 'repair_materials',
    keywords: ['准备资料', '需要什么', '哪些资料', '报修资料', '维修资料', '提前准备'],
    title: '报修前建议准备 4 类资料',
    steps: ['设备型号、机床编号和铭牌照片', '故障发生时间、故障现象和报警信息', '能够说明问题的现场照片或视频', '联系人和联系电话'],
    note: '请勿在未确认安全的情况下拆机或带电检查。',
    answer: '建议提前准备：设备型号与铭牌照片、机床编号、故障发生时间、可复现的故障现象、报警信息、现场照片或视频、联系人和联系电话。请勿在未确认安全的情况下拆机或带电检查。',
    suggestedAction: 'request'
  },
  {
    id: 'support_phone',
    keywords: ['电话', '人工客服', '人工售后', '联系售后', '售后联系', '客服电话'],
    title: 'AI 可以继续引导维修申请',
    steps: ['告诉 AI 设备型号、机床编号和当前故障现象', '由 AI 确认需准备的资料', '在维修系统提交申请并查询后续进度'],
    note: '涉及停机、安全风险或无法在线提交时，请优先拨打 150 5016 6844。',
    answer: '官网由 AI 服务助手负责流程问答和资料准备引导；维修系统用于提交申请和查询进度，不提供实时人工对话。涉及停机、安全风险或无法在线提交时，请拨打大陆售后电话 150 5016 6844。',
    suggestedAction: 'support'
  },
  {
    id: 'sales_consultation',
    keywords: ['设备选型', '选型', '设备方案', '销售咨询', '加工任务', '自动化需求', '报价'],
    title: '选型咨询前，先整理这 5 项信息',
    steps: ['工件尺寸与材料', '目标精度、表面要求和锥度要求', '预计加工批量与节拍', '是否需要自动化上下料', '现有工艺或设备遇到的具体问题'],
    note: '销售顾问将根据实际加工任务提供设备与方案建议，公开页面不提供自动报价。',
    answer: '咨询设备选型时，建议准备工件尺寸与材料、目标精度、锥度、批量、节拍及自动化需求。销售顾问会据此提供设备与方案建议。',
    suggestedAction: 'sales'
  },
  {
    id: 'factory_visit',
    keywords: ['常熟工厂', '昆山工厂', '工厂地址', '工厂来访', '怎么去工厂', '参观工厂', '来访'],
    title: '瑞钧工厂来访信息',
    steps: ['常熟工厂：常熟市东南开发区银环路 78 号', '昆山工厂：江苏省苏州市昆山市巴城镇石牌长江路 8 号', '来访前请先联系销售顾问确认接待时间与参观安排'],
    note: '建议携带加工样件、图纸或当前工艺需求，便于现场沟通。',
    answer: '瑞钧常熟工厂位于常熟市东南开发区银环路78号，昆山工厂位于江苏省苏州市昆山市巴城镇石牌长江路8号。来访前请联系销售顾问确认接待安排。',
    suggestedAction: 'visit'
  }
]);

// Public FAQ matching is kept in UTF-8 so approved answers remain reliable.
const approvedFaqArticles = Object.freeze([
  {
    patterns: ['办理售后', '售后服务', '售后支持', '售后问题'],
    title: 'AI 服务助手可以先帮你确认办理路径',
    steps: ['说明你需要报修、查询进度或核验保修', 'AI 告知所需资料和下一步', '仅在需要提交或查询时打开维修系统'],
    note: '维修系统用于工单办理，不提供实时人工对话。',
    answer: '请告诉 AI 你的设备情况或服务需求，它会先带你进入正确的办理路径。',
    suggestedAction: 'support'
  },
  {
    patterns: ['报修资料', '维修资料', '准备资料', '哪些资料', '需要什么资料'],
    title: '报修前建议准备 4 类资料',
    steps: ['设备型号、机床编号和铭牌照片', '故障发生时间、现象与报警信息', '说明问题的现场照片或视频', '联系人和联系电话'],
    note: '请勿在未确认安全的情况下拆机或带电检查。',
    answer: 'AI 建议先准备设备信息、故障现象、现场影像和联系方式，再进入维修系统提交申请。',
    suggestedAction: 'request'
  },
  {
    patterns: ['维修进度', '进度查询', '申请进度', '处理进度', '维修状态'],
    title: '维修进度在售后系统中统一查询',
    steps: ['打开“维修进度查询”', '按页面提示完成身份验证', '查看审核、补充资料、维修、寄回物流和归档状态'],
    note: '具体处理时间和物流状态以售后系统显示为准。',
    answer: '维修系统用于查询申请进度，不提供实时人工对话。',
    suggestedAction: 'requests'
  },
  {
    patterns: ['保修', '质保', '在保', '核验保修'],
    title: '核验保修状态需要两项设备信息',
    steps: ['准备设备型号', '准备机床编号', '打开“保修状态核验”并按提示填写'],
    note: '最终保修结果以后端返回的确定性数据为准。',
    answer: 'AI 可协助你确认资料；保修核验需在售后系统中完成，不提供实时人工对话。',
    suggestedAction: 'warranty'
  },
  {
    patterns: ['维修申请', '发起维修', '申请维修', '报修', '故障申请', '怎么维修'],
    title: '发起维修申请，需要先准备这些',
    steps: ['确认设备型号和机床编号', '记录故障现象、发生时间并准备现场照片或视频', '在维修系统填写联系人并提交申请'],
    note: '提交后可在“维修进度查询”中查看后续状态。',
    answer: 'AI 会先协助你确认资料准备。随后进入售后系统提交工单；该系统不提供实时人工对话。',
    suggestedAction: 'request'
  },
  {
    patterns: ['设备选型', '选型', '设备方案', '销售咨询', '加工任务', '自动化需求', '报价'],
    title: '选型咨询前，先整理这 5 项信息',
    steps: ['工件尺寸与材料', '目标精度、表面要求和锥度要求', '预计加工批量与节拍', '是否需要自动化上下料', '现有工艺或设备遇到的具体问题'],
    note: '销售顾问将根据实际加工任务提供设备与方案建议，官网不提供自动报价。',
    answer: '提供加工需求后，AI 会协助整理选型要点，再由销售顾问继续方案沟通。',
    suggestedAction: 'sales'
  },
  {
    patterns: ['常熟工厂', '昆山工厂', '工厂地址', '工厂来访', '怎么去工厂', '参观工厂', '来访'],
    title: '瑞钧工厂来访信息',
    steps: ['常熟工厂：常熟市东南开发区银环路 78 号', '昆山工厂：江苏省苏州市昆山市巴城镇石牌长江路 8 号', '来访前请先确认接待时间、工厂和参观安排'],
    note: '建议携带加工样件、图纸或当前工艺需求，便于现场沟通。',
    answer: 'AI 可先提供地址和来访准备信息；具体接待安排由销售顾问确认。',
    suggestedAction: 'visit'
  },
  {
    patterns: ['人工客服', '人工售后', '联系售后', '售后联系', '客服电话', '售后电话'],
    title: 'AI 可以继续引导维修申请',
    steps: ['告诉 AI 设备型号、机床编号和当前故障现象', '由 AI 确认需要准备的资料', '在维修系统提交申请并查询后续进度'],
    note: '涉及停机、安全风险或无法在线提交时，请优先拨打 150 5016 6844。',
    answer: '官网由 AI 服务助手负责流程问答和资料准备引导；维修系统用于提交申请和查询进度，不提供实时人工对话。',
    suggestedAction: 'support'
  }
]);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

function json(res, status, body) {
  securityHeaders(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function text(res, status, contentType, body) {
  securityHeaders(res);
  res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
  res.end(body);
}

function requestOrigin(req) {
  const hostHeader = String(req.headers.host || 'localhost').replace(/[^a-zA-Z0-9.:-]/g, '') || 'localhost';
  const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  const protocol = forwardedProtocol === 'https' ? 'https' : 'http';
  return `${protocol}://${hostHeader}`;
}

function robotsTxt(req, res) {
  text(res, 200, 'text/plain; charset=utf-8', `User-agent: *\nAllow: /\nSitemap: ${requestOrigin(req)}/sitemap.xml\n`);
}

function sitemapXml(req, res) {
  const origin = requestOrigin(req);
  const routes = ['/', '/product/', '/manufacturing/', '/about/', '/service/'];
  const urls = routes.map((path) => `  <url><loc>${origin}${path}</loc></url>`).join('\n');
  text(res, 200, 'application/xml; charset=utf-8', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}

function clientIp(req) {
  return req.socket.remoteAddress || 'unknown';
}

function allowRequest(req, scope, limit = 120) {
  const now = Date.now();
  const key = `${clientIp(req)}:${scope}`;
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt > 60_000) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

async function readJson(req, maxBytes = 16_384) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > maxBytes) throw new Error('PAYLOAD_TOO_LARGE');
  }
  return raw ? JSON.parse(raw) : {};
}

async function repairsysAvailable() {
  if (Date.now() - healthCache.checkedAt < 10_000) return healthCache.available;
  try {
    const response = await fetch(repairsysHealthUrl, { signal: AbortSignal.timeout(2_000), headers: { Accept: 'application/json' } });
    const body = response.ok ? await response.json() : null;
    healthCache = { checkedAt: Date.now(), available: Boolean(body?.ok) };
  } catch {
    healthCache = { checkedAt: Date.now(), available: false };
  }
  return healthCache.available;
}

function publicRepairsysBase(req) {
  if (repairsysPublicBaseUrl) return repairsysPublicBaseUrl;
  const hostname = String(req.headers.host || '127.0.0.1').split(':')[0].replace(/[^a-zA-Z0-9.:-]/g, '') || '127.0.0.1';
  return `http://${hostname}:2888`;
}

async function serviceEntries(req, res) {
  const available = await repairsysAvailable();
  if (cmsServiceEntriesUrl) {
    try {
      const result = await cmsPublicContent.listServiceEntries();
      const entries = Object.fromEntries(result.data.map((entry) => [entry.entry_type, entry.url]));
      const supportPhone = result.data.find((entry) => entry.fallback_phone)?.fallback_phone || '150 5016 6844';
      return json(res, 200, {
        available,
        checkedAt: new Date(healthCache.checkedAt).toISOString(),
        source: 'cms',
        cache: result.cache,
        supportPhone,
        entries
      });
    } catch (error) {
      if (error instanceof CmsUnavailableError) {
        return json(res, 503, {
          available: false,
          source: 'cms',
          supportPhone: '150 5016 6844',
          entries: {},
          message: '售后入口暂时不可用，请拨打售后电话联系瑞钧'
        });
      }
      throw error;
    }
  }
  const baseUrl = publicRepairsysBase(req);
  const entries = Object.fromEntries(Object.entries(serviceRoutes).map(([key, path]) => [key, `${baseUrl}${path}`]));
  json(res, 200, {
    available,
    checkedAt: new Date(healthCache.checkedAt).toISOString(),
    source: 'official_site',
    supportPhone: '150 5016 6844',
    entries
  });
}

async function publicProductSeries(_req, res) {
  try {
    return json(res, 200, await cmsPublicContent.listProductSeries());
  } catch (error) {
    if (error instanceof CmsUnavailableError) {
      return json(res, 503, { code: 'CMS_UNAVAILABLE', message: '产品内容暂时不可用，请稍后重试' });
    }
    throw error;
  }
}

async function publicProductModels(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  try {
    return json(res, 200, await cmsPublicContent.listProductModels(url.searchParams.get('series')));
  } catch (error) {
    if (error instanceof TypeError) {
      return json(res, 400, { code: 'INVALID_SERIES_CODE', message: '产品系列参数无效' });
    }
    if (error instanceof CmsUnavailableError) {
      return json(res, 503, { code: 'CMS_UNAVAILABLE', message: '产品内容暂时不可用，请稍后重试' });
    }
    throw error;
  }
}

async function publicPage(res, slug) {
  try {
    return json(res, 200, await cmsPublicContent.getPage(slug));
  } catch (error) {
    if (error instanceof TypeError) {
      return json(res, 400, { code: 'INVALID_PAGE_SLUG', message: '页面参数无效' });
    }
    if (error instanceof CmsUnavailableError) {
      return json(res, 200, { data: null, cache: 'unavailable', source: 'static' });
    }
    throw error;
  }
}

function matchFaq(question) {
  const approved = approvedFaqArticles.find((article) => article.patterns.some((pattern) => String(question).toLowerCase().includes(pattern)));
  if (approved) return approved;
  const normalized = question.toLowerCase().replace(/[\s，。！？、,.!?：:；;“”"']/g, '');
  let best = null;
  let bestScore = 0;
  for (const article of faqArticles) {
    const score = article.keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? keyword.length : 0), 0);
    if (score > bestScore) {
      best = article;
      bestScore = score;
    }
  }
  return bestScore >= 2 ? best : null;
}

async function answerFaq(req, res) {
  if (!allowRequest(req, 'faq', 30)) return json(res, 429, { message: '请求过于频繁，请稍后再试' });
  try {
    const body = await readJson(req, 2_048);
    const question = String(body.question || '').trim();
    const entry = String(body.entry || 'support').trim();
    if (!question || question.length > 300 || !allowedEntries.has(entry)) {
      return json(res, 400, { message: '请输入 1 至 300 个字符的问题' });
    }

    const article = matchFaq(question);
    if (!article) {
      return json(res, 200, {
        matched: false,
        mode: 'static',
        title: 'AI 暂无法确认这个设备问题',
        steps: ['整理设备型号、机床编号和故障现象', '通过维修系统提交详细信息', '安全风险或紧急停机时拨打 150 5016 6844'],
        note: '官网不会对未审核的设备操作问题生成推测性答案。',
        answer: '这个问题暂时不在已审核的官网知识范围内。为避免给出不准确的设备操作建议，请在维修系统提交详细信息；涉及安全风险或紧急停机时，请拨打大陆售后电话 150 5016 6844。',
        suggestedAction: entry
      });
    }
    return json(res, 200, {
      matched: true,
      mode: 'static',
      title: article.title,
      steps: article.steps,
      note: article.note,
      answer: article.answer,
      suggestedAction: article.suggestedAction
    });
  } catch (error) {
    if (error.message === 'PAYLOAD_TOO_LARGE') return json(res, 413, { message: '问题内容过长' });
    return json(res, 400, { message: '问题格式无效' });
  }
}

async function recordEvent(req, res) {
  if (!allowRequest(req, 'events', 60)) return json(res, 429, { message: '请求过于频繁' });
  try {
    const body = await readJson(req);
    const entry = String(body.entry || '').trim();
    const pagePath = String(body.pagePath || '').trim();
    if (!allowedEntries.has(entry) || !pagePath.startsWith('/') || pagePath.length > 240) {
      return json(res, 400, { message: '事件参数无效' });
    }
    const event = {
      event: 'repairsys_entry_click',
      entry,
      pagePath,
      source: 'official_site',
      occurredAt: new Date().toISOString()
    };
    await mkdir(resolve(root, 'data'), { recursive: true });
    await appendFile(analyticsPath, `${JSON.stringify(event)}\n`, 'utf8');
    return json(res, 202, { accepted: true });
  } catch (error) {
    if (error.message === 'PAYLOAD_TOO_LARGE') return json(res, 413, { message: '请求内容过大' });
    return json(res, 400, { message: '请求格式无效' });
  }
}

async function createLead(req, res) {
  if (!allowRequest(req, 'leads', 12)) return json(res, 429, { code: 'RATE_LIMITED', message: '提交过于频繁，请稍后再试' });
  try {
    const body = await readJson(req, 8_192);
    if (!websiteBffLeadClient) return json(res, 503, { code: 'LEAD_STORE_UNAVAILABLE', message: '咨询服务暂时不可用，请稍后再试或通过服务支持页面联系瑞钧' });
    const result = await websiteBffLeadClient.submit(body);
    return json(res, result.status, result.body);
  } catch (error) {
    if (error instanceof WebsiteBffUnavailable) return json(res, 503, { code: 'LEAD_STORE_UNAVAILABLE', message: '咨询服务暂时不可用，请稍后再试或通过服务支持页面联系瑞钧' });
    if (error.message === 'PAYLOAD_TOO_LARGE') return json(res, 413, { code: 'PAYLOAD_TOO_LARGE', message: '提交内容过大' });
    return json(res, 400, { code: 'INVALID_REQUEST', message: '提交格式无效' });
  }
}

async function serveStatic(req, res, pathname) {
  let relative = decodeURIComponent(pathname).replace(/^\/+/, '');
  if (!relative || relative.endsWith('/')) relative += 'index.html';
  const target = resolve(root, relative);
  if (target !== root && !target.startsWith(`${root}${sep}`)) return json(res, 403, { message: '禁止访问' });
  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error('NOT_FILE');
    const data = await readFile(target);
    securityHeaders(res);
    res.writeHead(200, {
      'Content-Type': mimeTypes[extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': ['.html', '.css', '.js'].includes(extname(target).toLowerCase()) ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(data);
  } catch {
    json(res, 404, { message: '页面不存在' });
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/public/v1/service-entries' && req.method === 'GET') return serviceEntries(req, res);
  if (url.pathname === '/api/public/v1/product-series' && req.method === 'GET') return publicProductSeries(req, res);
  if (url.pathname === '/api/public/v1/product-models' && req.method === 'GET') return publicProductModels(req, res);
  const pageMatch = url.pathname.match(/^\/api\/public\/v1\/pages\/([^/]+)$/);
  if (pageMatch && req.method === 'GET') return publicPage(res, decodeURIComponent(pageMatch[1]));
  if (url.pathname === '/api/public/v1/faq/answer' && req.method === 'POST') return answerFaq(req, res);
  if (url.pathname === '/api/public/v1/events' && req.method === 'POST') return recordEvent(req, res);
  if (url.pathname === '/api/public/v1/leads' && req.method === 'POST') return createLead(req, res);
  if (url.pathname === '/robots.txt' && req.method === 'GET') return robotsTxt(req, res);
  if (url.pathname === '/sitemap.xml' && req.method === 'GET') return sitemapXml(req, res);
  if (!['GET', 'HEAD'].includes(req.method || '')) return json(res, 405, { message: '不支持的请求方法' });
  return serveStatic(req, res, url.pathname);
});

server.listen(port, host, () => {
  console.log(`Ruijun website running at http://${host}:${port}`);
});
