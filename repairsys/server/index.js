import express from 'express';
import cors from 'cors';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { loadDb, loadMachineComponentBindings, loadModelDictionary, loadModelPhotoConfig, nextNo, permissionCatalog, saveDb, timestamp, todayDate } from './store.js';
import { clearSessionCookie, createSessionToken, hashPassword, nextSessionVersion, parseCookies, sessionCookie, sessionCookieName, sessionVersionMatches, verifyPassword, verifySessionToken } from './security.js';
import { requestFaqFallback } from './faq-fallback.js';
import { redeemFaqHandoff as requestFaqHandoffRedemption } from './faq-handoff-client.js';
import { requireTrustedOrigin } from './origin-guard.js';
import { createAttachmentDownloadAudit } from './attachment-download-audit.js';
import { validateRepairAttachments } from './repair-attachment-policy.js';
import { createBoardQrToken, hashBoardQrToken, isBoardQrToken } from './board-qr.js';

const app = express();
process.on('exit', (code) => {
  console.log('Process exiting with code', code);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception', err && err.stack || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection', reason && (reason.stack || reason));
});
const port = Number(process.env.PORT || 3101);
const host = process.env.HOST || '0.0.0.0';
if (String(process.env.NODE_ENV || '').toLowerCase() === 'production' && !String(process.env.AUTH_SECRET || '').trim()) {
  throw new Error('生产环境必须配置 AUTH_SECRET');
}
if (String(process.env.TRUST_PROXY || '').toLowerCase() === 'true') app.set('trust proxy', 1);

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Repair System</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
      a { color: #2563eb; }
    </style>
  </head>
  <body>
    <h1>Repair System API</h1>
    <p>当前 API 服务已启动。</p>
    <ul>
      <li><a href="http://127.0.0.1:2888">客户端页面</a></li>
      <li><a href="http://127.0.0.1:1888">管理后台</a></li>
    </ul>
    <p>接口请求请使用 /api 前缀。</p>
  </body>
</html>`);
});

const allowedOrigins = new Set(
  String(process.env.CORS_ORIGINS || 'http://127.0.0.1:2888,http://localhost:2888,http://127.0.0.1:1888,http://localhost:1888')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);
const rateBuckets = new Map();
const repairSourceChannels = new Set(['direct', 'official_site', 'website_faq', 'repair_portal_faq']);
const faqBffInternalUrl = String(process.env.FAQ_BFF_INTERNAL_URL || '').replace(/\/$/, '');
const faqBffInternalKey = String(process.env.FAQ_BFF_INTERNAL_KEY || '').trim();
const faqBffTimeoutMs = Math.max(1000, Number(process.env.FAQ_BFF_TIMEOUT_MS || 3500));
const faqBffEnabled = Boolean(faqBffInternalUrl && faqBffInternalKey);

if (String(process.env.NODE_ENV || '').toLowerCase() === 'production' && (faqBffInternalUrl || faqBffInternalKey) && (!faqBffInternalUrl || faqBffInternalKey.length < 32)) {
  throw new Error('生产环境启用 FAQ 交接时，FAQ_BFF_INTERNAL_KEY 必须至少包含 32 个字符');
}

function repairSourceChannel(value) {
  const source = String(value || '').trim().toLowerCase();
  return repairSourceChannels.has(source) ? source : 'direct';
}

function normalizedFaqContext(value, sourceChannel) {
  if (!value || !['website_faq', 'repair_portal_faq'].includes(sourceChannel)) return null;
  const references = Array.isArray(value.knowledgeReferences)
    ? value.knowledgeReferences.slice(0, 20).map((item) => ({
        id: String(item?.id || '').slice(0, 120),
        title: String(item?.title || '').slice(0, 240),
        version: String(item?.version || '').slice(0, 40)
      })).filter((item) => item.id && item.title)
    : [];
  return {
    conversationReference: String(value.conversationReference || '').slice(0, 80),
    errorCodes: Array.isArray(value.errorCodes) ? value.errorCodes.slice(0, 20).map((item) => String(item).slice(0, 40)) : [],
    attemptedSteps: Array.isArray(value.attemptedSteps) ? value.attemptedSteps.slice(0, 20).map((item) => String(item).slice(0, 240)) : [],
    knowledgeReferences: references,
    consentAt: String(value.consentAt || '').slice(0, 40),
    consentUiVersion: String(value.consentUiVersion || '').slice(0, 40)
  };
}

async function redeemFaqHandoff(token) {
  const payload = await requestFaqHandoffRedemption({
    baseUrl: faqBffEnabled ? faqBffInternalUrl : '',
    internalKey: faqBffInternalKey,
    token,
    timeoutMs: faqBffTimeoutMs
  });
  const handoffType = payload.handoffType === 'repair_draft' ? 'repair_draft' : 'continue_conversation';
  const sourceChannel = repairSourceChannel(payload.sourceChannel);
  const result = {
    handoffType,
    faqSessionId: String(payload.faqSessionId || '').slice(0, 100),
    faqConversationReference: String(payload.faqConversationReference || '').slice(0, 80),
    sourceChannel
  };
  if (handoffType === 'repair_draft') {
    Object.assign(result, {
      modelCode: String(payload.modelCode || '').slice(0, 100),
      errorCodes: Array.isArray(payload.errorCodes) ? payload.errorCodes.slice(0, 20).map((item) => String(item).slice(0, 40)) : [],
      symptomSummary: String(payload.symptomSummary || '').slice(0, 1000),
      attemptedSteps: Array.isArray(payload.attemptedSteps) ? payload.attemptedSteps.slice(0, 20).map((item) => String(item).slice(0, 240)) : [],
      knowledgeReferences: Array.isArray(payload.knowledgeReferences) ? payload.knowledgeReferences.slice(0, 20).map((item) => ({
        id: String(item?.id || '').slice(0, 120),
        title: String(item?.title || '').slice(0, 240),
        version: String(item?.version || '').slice(0, 40)
      })).filter((item) => item.id && item.title) : [],
      consentAt: String(payload.consentAt || '').slice(0, 40),
      consentUiVersion: String(payload.consentUiVersion || '').slice(0, 40)
    });
  }
  return result;
}

function rateLimit(windowMs, max, label) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${label}:${req.ip}`;
    const current = rateBuckets.get(key);
    if (!current || now - current.startedAt >= windowMs) {
      rateBuckets.set(key, { startedAt: now, count: 1 });
      return next();
    }
    current.count += 1;
    if (current.count > max) return res.status(429).json({ message: '请求过于频繁，请稍后再试' });
    return next();
  };
}

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use(requireTrustedOrigin(allowedOrigins));
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('CORS origin denied'));
  }
}));
app.use(express.json({ limit: '10mb' }));
const uploadsRoot = resolve(process.cwd(), 'uploads');
app.use('/api', rateLimit(5 * 60 * 1000, 300, 'api'));
app.use('/api', requireAuth);
app.get('/uploads/repair-requests/:requestNo/:fileName', requireAuth, async (req, res, next) => {
  try {
    const repairRequest = (req.db.repairRequests || []).find((item) => item.requestNo === req.params.requestNo);
    if (!repairRequest) return res.status(404).json({ message: '附件不存在' });
    const isOwner = req.auth.type === 'client' && repairRequest.accountId === req.auth.user.id;
    const permissions = req.auth.type === 'admin' ? effectivePermissions(req.db, req.auth.user) : [];
    if (!isOwner && !permissions.some((code) => ['REQUEST_REVIEW', 'WORK_ORDER'].includes(code))) {
      return res.status(403).json({ message: '无权访问该附件' });
    }
    const fileName = basename(req.params.fileName);
    if (fileName !== req.params.fileName) return res.status(400).json({ message: '附件路径无效' });
    const attachment = (repairRequest.attachments || []).find((item) => basename(String(item.url || '')) === fileName);
    if (!attachment) return res.status(404).json({ message: '附件不存在' });

    const filePath = resolve(uploadsRoot, 'repair-requests', req.params.requestNo, fileName);
    try {
      await access(filePath);
    } catch {
      return res.status(404).json({ message: '附件不存在' });
    }

    const audit = createAttachmentDownloadAudit({ requestNo: repairRequest.requestNo, attachmentId: attachment.id });
    log(req.db, audit.action, actor(req), audit.targetNo, audit.note);
    await saveDb(req.db);
    return res.sendFile(filePath);
  } catch (error) {
    return next(error);
  }
});

function withMaterial(db, instance) {
  if (!instance) return null;
  const material = db.materials.find((item) => item.materialCode === instance.materialCode);
  return { ...instance, material };
}

const sameNo = (left, right) => String(left || '').trim().toUpperCase() === String(right || '').trim().toUpperCase();

function normalizedLabel(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/编号|序列号|板号/g, '')
    .replace(/[^A-Z0-9\u4e00-\u9fa5]/g, '');
}

function labelsMatch(left, right) {
  const a = normalizedLabel(left);
  const b = normalizedLabel(right);
  return !a || !b || a === b || a.includes(b) || b.includes(a);
}

function warrantyEndFromDelivery(deliveryDate) {
  if (!deliveryDate) return '';
  const start = new Date(`${String(deliveryDate).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return '';
  start.setUTCMonth(start.getUTCMonth() + Number(process.env.MACHINE_WARRANTY_MONTHS || 12));
  return start.toISOString().slice(0, 10);
}

function warrantyCheckResult(result, suggestion, options = {}) {
  return {
    result,
    suggestion,
    inWarranty: result === '在保',
    matched: false,
    requiresManualReview: false,
    photoRequired: false,
    ...options
  };
}

async function checkWarranty(db, machineNo, serialNo, requested = {}) {
  if (String(machineNo || '').startsWith('非保-')) {
    return warrantyCheckResult('不在保', '申请人已选择不在保修期内', {
      machineNo,
      serialNo,
      reasonCode: 'DECLARED_OUT_OF_WARRANTY',
      source: '申请人申报'
    });
  }

  try {
    const external = await loadMachineComponentBindings(machineNo, serialNo);
    if (external.available) {
      const machineRows = external.rows.filter((row) => sameNo(row.machineNo, machineNo));
      const serialRows = serialNo ? external.rows.filter((row) => sameNo(row.componentSerialNo, serialNo)) : [];
      const exactRows = serialNo
        ? machineRows.filter((row) => sameNo(row.componentSerialNo, serialNo) && row.active)
        : [];
      const machine = machineRows[0] || null;
      const binding = exactRows[0] || null;
      const base = {
        machineNo,
        serialNo,
        source: external.source,
        sourceVersion: external.snapshotVersion || '',
        deliveryDateColumn: external.deliveryDateColumn,
        deliveryDate: binding?.deliveryDate || machine?.deliveryDate || '',
        machine,
        binding
      };

      if (!machineRows.length) {
        const bothMissing = Boolean(serialNo) && !serialRows.length;
        const actualMachineNos = Array.from(new Set(serialRows.filter((row) => row.active).map((row) => row.machineNo).filter(Boolean)));
        return warrantyCheckResult(bothMissing ? '机床和零件编号未找到' : '机床编号未找到', bothMissing
          ? '申报在保，但基础资料中没有这个机床编号和零件编号，请由审核人员核对'
          : `申报机床编号未找到；该零件当前绑定机床：${actualMachineNos.join('、') || '未知'}`, {
          ...base,
          actualMachineNos,
          reasonCode: bothMissing ? 'MACHINE_AND_COMPONENT_NOT_FOUND' : 'MACHINE_NOT_FOUND',
          requiresManualReview: true,
          photoRequired: true
        });
      }

      if (requested.modelName && !labelsMatch(requested.modelName, machine.modelName)) {
        return warrantyCheckResult('机型不一致', `申报机型“${requested.modelName}”与机床档案“${machine.modelName}”不一致`, {
          ...base,
          reasonCode: 'MODEL_MISMATCH',
          requiresManualReview: true,
          photoRequired: true
        });
      }

      if (!serialNo) {
        const warrantyEnd = warrantyEndFromDelivery(base.deliveryDate);
        if (!warrantyEnd) {
          return warrantyCheckResult('出库时间待补充', '已找到机床基础资料，但尚无机台出库时间，暂不能自动认定在保', {
            ...base,
            reasonCode: 'DELIVERY_DATE_MISSING',
            matched: true,
            requiresManualReview: true,
            warrantyEnd: ''
          });
        }
        const inWarranty = todayDate() <= warrantyEnd;
        return warrantyCheckResult(inWarranty ? '在保' : '过保', inWarranty
          ? `机床已建档，保修期至 ${warrantyEnd}`
          : `机床已建档，但已于 ${warrantyEnd} 超过保修期`, {
          ...base,
          reasonCode: inWarranty ? 'IN_WARRANTY' : 'OUT_OF_WARRANTY',
          matched: true,
          warrantyEnd
        });
      }

      if (!serialRows.length) {
        return warrantyCheckResult('零件编号未找到', '申报在保，但基础资料中没有这个零件编号；请由审核人员核对', {
          ...base,
          reasonCode: 'COMPONENT_NOT_FOUND',
          requiresManualReview: true,
          photoRequired: true
        });
      }

      if (!binding) {
        const activeSerialRows = serialRows.filter((row) => row.active);
        const actualMachineNos = Array.from(new Set(activeSerialRows.map((row) => row.machineNo).filter(Boolean)));
        const unbound = activeSerialRows.length === 0;
        return warrantyCheckResult(unbound ? '零件已解绑' : '编号绑定不一致', unbound
          ? '该零件当前没有有效机床绑定，请由审核人员核对编号流转'
          : `该零件当前绑定机床：${actualMachineNos.join('、')}，与申请机床不一致`, {
          ...base,
          actualMachineNos,
          reasonCode: unbound ? 'COMPONENT_UNBOUND' : 'BINDING_MISMATCH',
          requiresManualReview: true,
          photoRequired: true
        });
      }

      if (!requested.photoPositionCode && requested.materialName && !labelsMatch(requested.materialName, binding.materialName)) {
        return warrantyCheckResult('物料信息不一致', `申请物料“${requested.materialName}”与绑定档案“${binding.materialName}”不一致`, {
          ...base,
          reasonCode: 'MATERIAL_MISMATCH',
          requiresManualReview: true,
          photoRequired: true
        });
      }

      const warrantyEnd = warrantyEndFromDelivery(base.deliveryDate);
      if (!warrantyEnd) {
        return warrantyCheckResult('出库时间待补充', '机床与零件编号已匹配，但基础资料尚无机台出库时间，暂不能自动认定在保', {
          ...base,
          reasonCode: 'DELIVERY_DATE_MISSING',
          matched: true,
          requiresManualReview: true,
          warrantyEnd: ''
        });
      }

      const inWarranty = todayDate() <= warrantyEnd;
      return warrantyCheckResult(inWarranty ? '在保' : '过保', inWarranty
        ? `编号匹配，保修期至 ${warrantyEnd}`
        : `编号匹配，但已于 ${warrantyEnd} 超过一年保修期`, {
        ...base,
        reasonCode: inWarranty ? 'IN_WARRANTY' : 'OUT_OF_WARRANTY',
        matched: true,
        warrantyEnd
      });
    }
  } catch (error) {
    console.error('读取机台零件绑定资料失败：', error.message);
  }

  const machine = db.machines.find((item) => item.machineNo === machineNo);
  const instance = db.materialInstances.find((item) => item.serialNo === serialNo);
  const materialInfo = withMaterial(db, instance);

  if (!machine) {
    return warrantyCheckResult('未建档', '本系统与外部绑定资料均未找到编号，请由审核员人工核对', {
      machineNo,
      serialNo,
      reasonCode: 'NOT_FOUND',
      requiresManualReview: true,
      photoRequired: true,
      source: 'repair_system',
      machine,
      instance: materialInfo
    });
  }

  if (!serialNo) {
    if (!machine.warrantyEnd) {
      return warrantyCheckResult('出库时间待补充', '已找到机床基础资料，但尚无保修截止日期，暂不能自动认定在保', {
        machineNo,
        serialNo,
        reasonCode: 'DELIVERY_DATE_MISSING',
        matched: true,
        requiresManualReview: true,
        source: 'repair_system',
        deliveryDate: machine.warrantyStart || machine.factoryDate || '',
        warrantyEnd: '',
        machine
      });
    }
    const inWarranty = todayDate() <= machine.warrantyEnd;
    return warrantyCheckResult(inWarranty ? '在保' : '过保', inWarranty
      ? `机床已建档，保修期至 ${machine.warrantyEnd}`
      : `机床已建档，但已于 ${machine.warrantyEnd} 超过保修期`, {
      machineNo,
      serialNo,
      reasonCode: inWarranty ? 'IN_WARRANTY' : 'OUT_OF_WARRANTY',
      matched: true,
      source: 'repair_system',
      deliveryDate: machine.warrantyStart || machine.factoryDate || '',
      warrantyEnd: machine.warrantyEnd || '',
      machine
    });
  }

  if (!instance) {
    return warrantyCheckResult('未建档', '本系统与外部绑定资料均未找到编号，请由审核员人工核对', {
      machineNo,
      serialNo,
      reasonCode: 'NOT_FOUND',
      requiresManualReview: true,
      photoRequired: true,
      source: 'repair_system',
      machine,
      instance: materialInfo
    });
  }

  if (['已换下', '报废'].includes(instance.status)) {
    return warrantyCheckResult('已更换/已解绑', '原则上不直接按保修处理', {
      machineNo,
      serialNo,
      reasonCode: 'COMPONENT_UNBOUND',
      requiresManualReview: true,
      photoRequired: true,
      source: 'repair_system',
      machine,
      instance: materialInfo
    });
  }

  const activeBinding = db.bindings.find((item) => item.serialNo === serialNo && item.active);
  const matched = activeBinding?.machineNo === machineNo;
  if (!activeBinding || !matched) {
    return warrantyCheckResult(activeBinding ? '绑定不一致' : '未绑定', '审核员人工确认编号流转关系', {
      machineNo,
      serialNo,
      reasonCode: activeBinding ? 'BINDING_MISMATCH' : 'COMPONENT_UNBOUND',
      requiresManualReview: true,
      photoRequired: true,
      source: 'repair_system',
      machine,
      instance: materialInfo,
      activeBinding
    });
  }

  const inWarranty = !machine.warrantyEnd || todayDate() <= machine.warrantyEnd;
  return warrantyCheckResult(inWarranty ? '在保' : '过保', inWarranty ? '可按保修处理' : '已超过保修期，可按收费维修处理', {
    machineNo,
    serialNo,
    reasonCode: inWarranty ? 'IN_WARRANTY' : 'OUT_OF_WARRANTY',
    matched: true,
    source: 'repair_system',
    deliveryDate: machine.warrantyStart || machine.factoryDate || '',
    warrantyEnd: machine.warrantyEnd || '',
    machine,
    instance: materialInfo,
    activeBinding
  });
}

function log(db, action, operator, targetNo, note = '') {
  db.operationLogs.unshift({
    id: nextNo('LOG', db.operationLogs, 'id'),
    action,
    operator: operator || '系统',
    targetNo,
    note,
    createdAt: timestamp()
  });
}

function publicUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function rolePermissions(db, roleId) {
  if (roleId === 'Admin') return permissionCatalog.map((item) => item.code);
  return (db.rolePermissions || []).filter((item) => item.roleId === roleId).map((item) => item.permissionCode);
}

function effectivePermissions(db, user) {
  if (!user) return [];
  if (user.username === 'admin' || user.role === 'Admin') return permissionCatalog.map((item) => item.code);
  return user.permissions?.length ? user.permissions : rolePermissions(db, user.role);
}

function publicAdminUser(db, user) {
  return {
    ...publicUser(user),
    permissions: effectivePermissions(db, user)
  };
}

function findSessionUser(db, payload) {
  const list = payload.type === 'client' ? db.clientAccounts || [] : db.adminUsers || [];
  return list.find((item) => item.id === payload.sub && sessionVersionMatches(payload, item) && item.enabled !== false && (item.userStatus || '已通过') === '已通过') || null;
}

function sessionTypeForRequest(req) {
  const explicit = String(req.get('X-Auth-Scope') || req.query.authType || '').trim().toLowerCase();
  if (explicit === 'client' || explicit === 'admin') return explicit;
  if (req.path.startsWith('/admin') || req.path.startsWith('/v1/admin') || req.path.startsWith('/roles') || req.path.startsWith('/work-orders') || req.path.startsWith('/reports') || req.path.startsWith('/master-data') || req.path.startsWith('/v8') || req.path.startsWith('/materials') || req.path.startsWith('/material-instances') || req.path.startsWith('/machines') || req.path.startsWith('/users')) return 'admin';
  return 'client';
}

async function requireAuth(req, res, next) {
  try {
    const publicPaths = new Set(['/health', '/auth/register', '/auth/login', '/auth/me', '/auth/logout', '/admin/auth/register', '/admin/auth/login', '/admin/auth/options', '/model-dictionary', '/model-photo-config', '/faq-handoffs/redeem']);
    if (publicPaths.has(req.path) || req.path.startsWith('/v1/boards/resolve/')) return next();
    const cookies = parseCookies(req.headers.cookie || '');
    const preferredType = sessionTypeForRequest(req);
    const types = preferredType === 'admin' ? ['admin', 'client'] : ['client', 'admin'];
    let session;
    let user;
    let db;
    for (const type of types) {
      const payload = verifySessionToken(cookies[sessionCookieName(type)]);
      if (!payload || payload.type !== type) continue;
      db = await loadDb();
      user = findSessionUser(db, payload);
      if (user) {
        session = payload;
        break;
      }
    }
    if (!session || !user) return res.status(401).json({ message: '请先登录' });
    req.auth = { user, type: session.type, session };
    req.db = db;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireClient(req, res, next) {
  if (req.auth?.type !== 'client') return res.status(403).json({ message: '仅客户端账号可执行此操作' });
  return next();
}

function requireAdmin(req, res, next) {
  if (req.auth?.type !== 'admin' || (req.auth.user.username !== 'admin' && req.auth.user.role !== 'Admin')) return res.status(403).json({ message: '仅系统管理员可执行此操作' });
  return next();
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (req.auth?.type !== 'admin') return res.status(403).json({ message: '后台权限不足' });
    if (!effectivePermissions(req.db, req.auth.user).includes(permission)) return res.status(403).json({ message: '当前账号没有该操作权限' });
    return next();
  };
}

function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    if (req.auth?.type !== 'admin') return res.status(403).json({ message: '后台权限不足' });
    const granted = effectivePermissions(req.db, req.auth.user);
    if (!permissions.some((permission) => granted.includes(permission))) return res.status(403).json({ message: '当前账号没有该操作权限' });
    return next();
  };
}

function requestFromDb(req) {
  return (req.db?.repairRequests || []).find((item) => item.requestNo === req.params.requestNo) || null;
}

function requireRequestAccess(permission = '') {
  return (req, res, next) => {
    const request = requestFromDb(req);
    if (!request) return res.status(404).json({ message: '维修申请不存在' });
    const isOwner = req.auth?.type === 'client' && request.accountId === req.auth.user.id;
    const canAdmin = req.auth?.type === 'admin' && (!permission || effectivePermissions(req.db, req.auth.user).includes(permission));
    if (!isOwner && !canAdmin) return res.status(403).json({ message: '无权访问该维修申请' });
    req.repairRequest = request;
    return next();
  };
}

function requireRequestList(req, res, next) {
  if (req.auth?.type === 'client' || (req.auth?.type === 'admin' && effectivePermissions(req.db, req.auth.user).includes('REQUEST_REVIEW'))) return next();
  return res.status(403).json({ message: '无权查看维修申请' });
}

function customerVisibleRequest(request, db = null) {
  if (!request) return null;
  const order = db?.workOrders?.find((item) => item.workOrderNo === request.workOrderNo || item.requestNo === request.requestNo) || null;
  const safeLogs = (db?.operationLogs || []).filter((item) => item.targetNo === request.requestNo || item.targetNo === order?.workOrderNo).slice().reverse();
  const statusEvents = [{ status: '待审核', at: request.createdAt || '' }];
  const eventMap = [
    ['审核通过并生成工单', '已生成工单'], ['维修接单', '维修中'], ['登记寄回物流', '已寄回'], ['维修归档', '已完成']
  ];
  for (const logEntry of safeLogs) {
    const match = eventMap.find(([action]) => String(logEntry.action || '').includes(action));
    if (match && !statusEvents.some((item) => item.status === match[1])) statusEvents.push({ status: match[1], at: logEntry.createdAt || '' });
  }
  const statusOrder = ['待审核', '已生成工单', '维修中', '待寄回', '已寄回', '已完成'];
  const currentIndex = Math.max(0, statusOrder.indexOf(request.status || '待审核'));
  return {
    requestNo: request.requestNo,
    status: request.status || '待审核',
    nextAction: request.status === '待补充资料' ? '请补充机床铭牌和零件编号照片' : '',
    createdAt: request.createdAt || '',
    modelCode: request.modelCode || '',
    modelName: request.modelName || '',
    machineNo: request.machineNo || '',
    customerName: request.customerName || '',
    contact: request.contact || '',
    phone: request.phone || '',
    address: request.address || '',
    faultDescription: request.faultDescription || '',
    sendMethod: request.sendMethod || '',
    logistics: order?.logistics ? { returnMethod: order.logistics.returnMethod || '', company: order.logistics.company || '', trackingNo: order.logistics.trackingNo || '', sentAt: order.logistics.sentAt || '' } : null,
    supplementRequirements: Array.isArray(request.supplementRequirements) ? [...request.supplementRequirements] : [],
    attachments: (request.attachments || []).map((item) => ({ id: item.id || '', name: item.name || '', category: item.category || '', url: item.url || '' })),
    details: (request.details || []).map((item) => ({
      id: item.id || '', serialNo: item.serialNo || '', boardNo: item.boardNo || '', serviceType: item.serviceType || '',
      warrantyScope: item.warrantyScope || '', materialCode: item.materialCode || '', materialType: item.materialType || '',
      materialName: item.materialName || '', spec: item.spec || '', faultPhenomenon: item.faultPhenomenon || '',
      warrantyResult: item.warrantyResult || '', warrantySuggestion: item.warrantySuggestion || ''
    })),
    timeline: statusOrder.map((status, index) => ({ status, reached: index <= currentIndex, at: statusEvents.find((item) => item.status === status)?.at || '' }))
  };
}

function actor(req) {
  return req.auth?.user?.name || req.auth?.user?.username || '系统';
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function adminUsers(db) {
  return db.adminUsers || [];
}

function serviceTypeFromText(value) {
  const match = String(value || '').match(/服务[:：]([^;；]+)/);
  return match?.[1]?.trim() || '';
}

function warrantyScopeFromCheck(check, machineNo) {
  if (String(machineNo || '').startsWith('非保-')) return '不在保';
  if (check.result === '在保') return '在保';
  if (['出保', '过保'].includes(check.result)) return '过保';
  return '待核验';
}

function verificationFromCheck(check) {
  return {
    reasonCode: check.reasonCode || '',
    matched: Boolean(check.matched),
    requiresManualReview: Boolean(check.requiresManualReview),
    photoRequired: Boolean(check.photoRequired),
    source: check.source || '',
    sourceVersion: check.sourceVersion || '',
    actualMachineNos: check.actualMachineNos || [],
    deliveryDateColumn: check.deliveryDateColumn || '',
    deliveryDate: check.deliveryDate || '',
    warrantyEnd: check.warrantyEnd || '',
    binding: check.binding
      ? {
          machineNo: check.binding.machineNo,
          modelName: check.binding.modelName,
          materialName: check.binding.materialName,
          componentSerialNo: check.binding.componentSerialNo,
          positionName: check.binding.positionName,
          machineStatus: check.binding.machineStatus,
          checkStatus: check.binding.checkStatus
        }
      : null,
    checkedAt: timestamp()
  };
}

function publicWarrantyCheck(check) {
  return {
    result: check.result,
    suggestion: check.suggestion,
    inWarranty: Boolean(check.inWarranty),
    matched: Boolean(check.matched),
    requiresManualReview: Boolean(check.requiresManualReview),
    photoRequired: Boolean(check.photoRequired),
    reasonCode: check.reasonCode || '',
    source: check.source || '',
    sourceVersion: check.sourceVersion || '',
    warrantyEnd: check.warrantyEnd || '',
    deliveryDate: check.deliveryDate || '',
    binding: check.binding
      ? {
          modelName: check.binding.modelName,
          materialName: check.binding.materialName,
          positionName: check.binding.positionName
        }
      : null
  };
}

function applyWarrantyCheck(detail, check) {
  detail.bindingStatus = check.matched ? '编号已匹配' : check.result;
  detail.warrantyResult = check.result;
  detail.warrantySuggestion = check.suggestion;
  detail.verification = verificationFromCheck(check);
  return detail;
}

function boardQrExpiry(value) {
  const time = Date.parse(String(value || ''));
  return Number.isFinite(time) ? time : null;
}

function boardQrAudit(db, { codeId = '', tokenHash = '', outcome, source = 'repair_portal' }) {
  db.boardQrScanAudits ||= [];
  db.boardQrScanAudits.push({
    id: nextNo('BQRA', db.boardQrScanAudits, 'id'),
    codeId,
    tokenFingerprint: String(tokenHash).slice(0, 32),
    outcome,
    source: source === 'repair_portal' ? source : 'repair_portal',
    scannedAt: timestamp()
  });
  if (db.boardQrScanAudits.length > 20_000) db.boardQrScanAudits.splice(0, db.boardQrScanAudits.length - 20_000);
}

function publicBoardQrResult(db, code) {
  const instance = (db.materialInstances || []).find((item) => item.serialNo === code.serialNo);
  const material = (db.materials || []).find((item) => item.materialCode === instance?.materialCode);
  const binding = (db.bindings || []).find((item) => item.serialNo === code.serialNo && item.active);
  const machine = (db.machines || []).find((item) => item.machineNo === binding?.machineNo);
  if (!instance || !material) return null;
  return {
    boardId: instance.serialNo,
    material: { code: material.materialCode, name: material.name, type: material.type, spec: material.spec || '' },
    machine: binding && machine ? { machineNo: machine.machineNo, modelCode: machine.model, position: binding.position || '' } : null,
    allowedActions: binding && machine ? ['repair_new', 'repair_warranty'] : ['repair_warranty'],
    requiresLoginForRepair: true
  };
}

async function recheckRepairRequest(db, repairRequest) {
  await Promise.all(
    (repairRequest.details || []).map(async (detail) => {
      const check = await checkWarranty(db, repairRequest.machineNo, detail.serialNo, {
        modelName: repairRequest.modelName,
        materialName: detail.materialName,
        materialCode: detail.materialCode,
        photoPositionCode: detail.positionCode || detail.materialCode || ''
      });
      applyWarrantyCheck(detail, check);
    })
  );
  return repairRequest;
}

function hasVerificationPhotos(attachments = []) {
  const categories = new Set(attachments.map((item) => item.category));
  return categories.has('machine_nameplate') && categories.has('component_serial');
}

async function materializeAttachments(requestNo, attachments = []) {
  const validated = validateRepairAttachments(attachments);
  const saved = [];
  for (const [index, attachment] of validated.entries()) {
    const folder = resolve(uploadsRoot, 'repair-requests', requestNo);
    await mkdir(folder, { recursive: true });
    const fileName = `${attachment.category}-${randomUUID().slice(0, 8)}.${attachment.extension}`;
    await writeFile(resolve(folder, fileName), attachment.buffer);
    saved.push({
      id: `${requestNo}-ATT-${String(Date.now()).slice(-6)}${index}`.slice(0, 40),
      name: attachment.name || fileName,
      url: `/uploads/repair-requests/${requestNo}/${fileName}`,
      category: attachment.category
    });
  }
  return saved;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'repair-system-mvp', time: timestamp() });
});

app.get('/api/v1/boards/resolve/:token', rateLimit(5 * 60 * 1000, 60, 'board-qr-resolve'), async (req, res) => {
  const token = String(req.params.token || '');
  const tokenHash = hashBoardQrToken(token);
  const db = await loadDb();
  const code = tokenHash ? (db.boardQrCodes || []).find((item) => item.tokenHash === tokenHash) : null;
  let outcome = 'invalid';
  if (code?.status === 'revoked') outcome = 'revoked';
  else if (code && boardQrExpiry(code.expiresAt) && boardQrExpiry(code.expiresAt) <= Date.now()) outcome = 'expired';
  else if (code) outcome = publicBoardQrResult(db, code) ? 'resolved' : 'unavailable';
  boardQrAudit(db, { codeId: code?.id || '', tokenHash, outcome, source: req.query.source });
  await saveDb(db);
  if (outcome === 'expired') return res.status(410).json({ message: '二维码已过期' });
  if (outcome !== 'resolved') return res.status(404).json({ message: '二维码无效或已作废' });
  return res.json(publicBoardQrResult(db, code));
});

app.get('/api/v1/admin/board-codes', requirePermission('MASTER_DATA'), async (req, res) => {
  const serialNo = String(req.query.serialNo || '').trim();
  const db = req.db;
  const codes = (db.boardQrCodes || [])
    .filter((item) => !serialNo || item.serialNo === serialNo)
    .map(({ tokenHash, ...code }) => code);
  return res.json(codes);
});

app.post('/api/v1/admin/board-codes', requirePermission('MASTER_DATA'), async (req, res) => {
  const serialNo = String(req.body?.serialNo || '').trim();
  const expiresAt = String(req.body?.expiresAt || '').trim();
  const expiry = expiresAt ? boardQrExpiry(expiresAt) : null;
  const db = req.db;
  if (!serialNo || !db.materialInstances?.some((item) => item.serialNo === serialNo)) {
    return res.status(400).json({ message: '板卡实例不存在' });
  }
  if (expiresAt && (!expiry || expiry <= Date.now())) return res.status(400).json({ message: '二维码有效期必须是未来时间' });
  const token = createBoardQrToken();
  const code = {
    id: nextNo('BQR', db.boardQrCodes || [], 'id'),
    tokenHash: hashBoardQrToken(token),
    serialNo,
    status: 'active',
    issuedAt: timestamp(),
    expiresAt,
    revokedAt: '',
    createdBy: actor(req)
  };
  db.boardQrCodes ||= [];
  db.boardQrCodes.push(code);
  log(db, '签发板卡二维码', actor(req), code.id, serialNo);
  await saveDb(db);
  return res.status(201).json({ id: code.id, serialNo, expiresAt, token, scanPath: `/scan/${token}` });
});

app.post('/api/v1/admin/board-codes/:id/revoke', requirePermission('MASTER_DATA'), async (req, res) => {
  const db = await loadDb();
  const code = (db.boardQrCodes || []).find((item) => item.id === req.params.id);
  if (!code) return res.status(404).json({ message: '二维码不存在' });
  if (code.status !== 'revoked') {
    code.status = 'revoked';
    code.revokedAt = timestamp();
    log(db, '作废板卡二维码', actor(req), code.id, code.serialNo);
    await saveDb(db);
  }
  return res.json({ id: code.id, status: code.status, revokedAt: code.revokedAt });
});

app.post('/api/faq/answer', rateLimit(60 * 1000, 30, 'faq-answer'), async (req, res, next) => {
  try {
    return res.json(await requestFaqFallback({ question: req.body?.question }));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ code: error.code, message: error.message });
    return next(error);
  }
});

app.post('/api/faq-handoffs/redeem', rateLimit(5 * 60 * 1000, 30, 'faq-handoff'), async (req, res, next) => {
  const token = String(req.body?.token || '').trim();
  if (token.length < 32 || token.length > 128) return res.status(400).json({ message: 'FAQ 交接令牌格式无效' });
  try {
    return res.json(await redeemFaqHandoff(token));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
});

app.get('/api/master-data', requireAnyPermission('MASTER_DATA', 'CLIENT_ACCOUNT_AUDIT', 'REPORT_LOG'), async (req, res) => {
  const db = await loadDb();
  const bindingSnapshot = await loadMachineComponentBindings();
  const permissions = effectivePermissions(db, req.auth.user);
  const canManageAccounts = permissions.includes('CLIENT_ACCOUNT_AUDIT');
  const canManageMasterData = permissions.includes('MASTER_DATA');
  const canReadLogs = permissions.includes('REPORT_LOG');
  res.json({
    users: [],
    clientAccounts: canManageAccounts ? (db.clientAccounts || []).map(publicUser) : [],
    adminUsers: [],
    roles: [],
    rolePermissions: [],
    permissionCatalog: [],
    machines: canManageMasterData ? db.machines : [],
    materials: canManageMasterData ? db.materials : [],
    materialInstances: canManageMasterData ? db.materialInstances.map((item) => withMaterial(db, item)) : [],
    bindings: canManageMasterData ? bindingSnapshot.rows : [],
    logs: canReadLogs ? db.operationLogs.slice(0, 20) : []
  });
});

app.get('/api/admin/auth/options', async (_req, res) => {
  const db = await loadDb();
  res.json({
    roles: (db.roles || []).filter((item) => item.roleType !== 'client' && item.roleId !== 'Admin').map(({ roleId, roleName, roleType }) => ({ roleId, roleName, roleType }))
  });
});

app.post('/api/admin/auth/register', async (req, res) => {
  const db = await loadDb();
  const username = normalizeUsername(req.body.username);
  const password = String(req.body.password || '').trim();
  const name = String(req.body.name || username).trim();
  const role = ['Reviewer', 'Repair', 'Manager'].includes(String(req.body.role || '').trim()) ? String(req.body.role).trim() : 'Reviewer';
  if (!username || password.length < 8 || !name || !role) {
    return res.status(400).json({ message: '账号、姓名、身份必填，密码至少 8 位' });
  }
  if ((db.adminUsers || []).some((item) => normalizeUsername(item.username) === username)) {
    return res.status(409).json({ message: '账号已存在，请换一个账号名' });
  }
  const user = {
    id: nextNo('AU', db.adminUsers || [], 'id'),
    username,
    password: await hashPassword(password),
    name,
    role,
    userType: 'admin',
    agent: '',
    contact: req.body.contact || '',
    phone: req.body.phone || '',
    address: '',
    permissions: [],
    userStatus: '待审核',
    reviewComment: '',
    reviewedAt: '',
    enabled: false,
    createdAt: timestamp()
  };
  db.adminUsers = db.adminUsers || [];
  db.adminUsers.push(user);
  log(db, '提交后台注册申请', user.name, user.id, user.role);
  await saveDb(db);
  res.status(201).json(publicUser(user));
});

app.post('/api/admin/auth/login', rateLimit(15 * 60 * 1000, 15, 'admin-login'), async (req, res) => {
  const db = await loadDb();
  const username = normalizeUsername(req.body.username);
  const password = String(req.body.password || '').trim();
  const user = (db.adminUsers || []).find((item) => normalizeUsername(item.username) === username);
  const passwordCheck = user ? await verifyPassword(password, user.password) : { valid: false, needsRehash: false };
  if (!user || !passwordCheck.valid) {
    return res.status(401).json({ message: '账号或密码不正确' });
  }
  if ((user.userStatus || '已通过') !== '已通过' || user.enabled === false) {
    return res.status(403).json({ message: user.userStatus === '已驳回' ? `后台注册申请已驳回：${user.reviewComment || '请联系管理员'}` : '后台注册申请待 admin 审核，通过后才能登录' });
  }
  if (passwordCheck.needsRehash) user.password = await hashPassword(password);
  if (passwordCheck.needsRehash) await saveDb(db);
  res.setHeader('Set-Cookie', sessionCookie(createSessionToken({ ...user, userType: 'admin' }), 'admin'));
  res.json(publicAdminUser(db, user));
});

app.get('/api/admin/users', requirePermission('ADMIN_USER_MANAGE'), async (_req, res) => {
  const db = await loadDb();
  res.json(adminUsers(db).map((user) => publicAdminUser(db, user)));
});

app.post('/api/admin/users', requirePermission('ADMIN_USER_MANAGE'), async (req, res) => {
  const db = await loadDb();
  const username = normalizeUsername(req.body.username);
  const password = String(req.body.password || '').trim();
  const name = String(req.body.name || username).trim();
  const role = String(req.body.role || 'Reviewer').trim();
  if (!username || !password || !name || !role) {
    return res.status(400).json({ message: '账号、密码、姓名和身份必填' });
  }
  if ((db.adminUsers || []).some((item) => normalizeUsername(item.username) === username)) {
    return res.status(409).json({ message: '账号已存在' });
  }
  const user = {
    id: nextNo('AU', db.adminUsers || [], 'id'),
    username,
    password: await hashPassword(password),
    name,
    role,
    userType: 'admin',
    agent: '',
    contact: req.body.contact || '',
    phone: req.body.phone || '',
    address: '',
    permissions: Array.isArray(req.body.permissions) ? [...new Set(req.body.permissions.filter((code) => permissionCatalog.some((item) => item.code === code)))] : [],
    userStatus: '已通过',
    reviewComment: '',
    reviewedAt: timestamp(),
    enabled: req.body.enabled !== false,
    createdAt: timestamp()
  };
  db.adminUsers = db.adminUsers || [];
  db.adminUsers.push(user);
  log(db, '创建后台账号', actor(req), user.id, user.username);
  await saveDb(db);
  res.status(201).json(publicAdminUser(db, user));
});

app.patch('/api/admin/users/:id', requirePermission('ADMIN_USER_MANAGE'), async (req, res) => {
  const db = await loadDb();
  const user = (db.adminUsers || []).find((item) => item.id === req.params.id);
  if (!user) return res.status(404).json({ message: '账号不存在' });
  if (req.body.name !== undefined) user.name = String(req.body.name || user.name);
  if (req.body.role !== undefined && user.username !== 'admin') user.role = String(req.body.role || user.role);
  let invalidateSessions = false;
  if (req.body.password) {
    user.password = await hashPassword(String(req.body.password));
    invalidateSessions = true;
  }
  if (req.body.contact !== undefined) user.contact = String(req.body.contact || '');
  if (req.body.phone !== undefined) user.phone = String(req.body.phone || '');
  if (req.body.enabled !== undefined && user.username !== 'admin') {
    const enabled = Boolean(req.body.enabled);
    invalidateSessions = invalidateSessions || user.enabled !== enabled;
    user.enabled = enabled;
  }
  if (req.body.userStatus !== undefined && user.username !== 'admin') {
    const userStatus = String(req.body.userStatus || user.userStatus);
    invalidateSessions = invalidateSessions || user.userStatus !== userStatus;
    user.userStatus = userStatus;
  }
  if (Array.isArray(req.body.permissions)) user.permissions = req.body.permissions;
  if (invalidateSessions) user.sessionVersion = nextSessionVersion(user.sessionVersion);
  user.reviewedAt = timestamp();
  log(db, '修改后台账号', actor(req), user.id, user.username);
  await saveDb(db);
  res.json(publicAdminUser(db, user));
});

app.get('/api/roles', requireAdmin, async (_req, res) => {
  const db = await loadDb();
  res.json({ roles: db.roles || [], rolePermissions: db.rolePermissions || [], permissionCatalog });
});

app.post('/api/roles', requireAdmin, async (req, res) => {
  const db = await loadDb();
  const roleId = String(req.body.roleId || '').trim();
  if (!roleId) return res.status(400).json({ message: '角色编码必填' });
  if ((db.roles || []).some((item) => item.roleId === roleId)) return res.status(409).json({ message: '角色已存在' });
  const role = { roleId, roleName: req.body.roleName || roleId, roleType: 'admin', createdAt: timestamp() };
  db.roles.push(role);
  log(db, '创建后台角色', actor(req), roleId);
  await saveDb(db);
  res.status(201).json(role);
});

app.put('/api/roles/:roleId/permissions', requireAdmin, async (req, res) => {
  const db = await loadDb();
  const roleId = req.params.roleId;
  if (!(db.roles || []).some((item) => item.roleId === roleId)) return res.status(404).json({ message: '角色不存在' });
  const allowed = new Set(permissionCatalog.map((item) => item.code));
  const permissions = [...new Set((req.body.permissions || []).filter((item) => allowed.has(item)))];
  db.rolePermissions = (db.rolePermissions || []).filter((item) => item.roleId !== roleId);
  permissions.forEach((permissionCode) => db.rolePermissions.push({ roleId, permissionCode }));
  log(db, '保存角色权限', actor(req), roleId, permissions.join(','));
  await saveDb(db);
  res.json({ roleId, permissions });
});

app.post('/api/auth/register', async (req, res) => {
  const db = await loadDb();
  const username = normalizeUsername(req.body.username);
  const password = String(req.body.password || '').trim();
  const agent = String(req.body.agent || '').trim();
  const contact = String(req.body.contact || '').trim();
  const phone = String(req.body.phone || '').trim();
  const address = String(req.body.address || '').trim();
  const name = String(req.body.name || agent || username).trim();

  if (!username || password.length < 8 || !agent || !contact || !phone) {
    return res.status(400).json({ message: '账号、代理商、联系人和电话必填，密码至少 8 位' });
  }
  if ((db.clientAccounts || []).some((item) => normalizeUsername(item.username) === username)) {
    return res.status(409).json({ message: '账号已存在，请换一个账号名' });
  }

  const user = {
    id: nextNo('CA', db.clientAccounts || [], 'id'),
    username,
    password: await hashPassword(password),
    name,
    role: '代理商',
    userType: 'client',
    agent,
    contact,
    phone,
    address,
    permissions: [],
    userStatus: '待审核',
    reviewComment: '',
    reviewedAt: '',
    enabled: false,
    createdAt: timestamp()
  };
  db.clientAccounts = db.clientAccounts || [];
  db.clientAccounts.push(user);
  log(db, '提交客户端注册申请', user.name, user.id, user.agent);
  await saveDb(db);
  res.status(201).json(publicUser(user));
});

app.post('/api/auth/login', rateLimit(15 * 60 * 1000, 15, 'client-login'), async (req, res) => {
  const db = await loadDb();
  const username = normalizeUsername(req.body.username);
  const password = String(req.body.password || '').trim();
  const user = (db.clientAccounts || []).find((item) => normalizeUsername(item.username) === username);
  const passwordCheck = user ? await verifyPassword(password, user.password) : { valid: false, needsRehash: false };
  if (!user || !passwordCheck.valid) {
    return res.status(401).json({ message: '账号或密码不正确' });
  }
  if ((user.userStatus || '已通过') !== '已通过' || user.enabled === false) {
    return res.status(403).json({ message: user.userStatus === '已驳回' ? `注册申请已驳回：${user.reviewComment || '请联系后台'}` : '注册申请待后台审核，通过后才能登录' });
  }
  if (passwordCheck.needsRehash) user.password = await hashPassword(password);
  if (passwordCheck.needsRehash) await saveDb(db);
  res.setHeader('Set-Cookie', sessionCookie(createSessionToken({ ...user, userType: 'client' }), 'client'));
  res.json(publicUser(user));
});

app.get('/api/auth/me', async (req, res) => {
  const type = req.query.type === 'admin' ? 'admin' : 'client';
  const optional = req.query.optional === '1';
  const cookies = parseCookies(req.headers.cookie || '');
  const session = verifySessionToken(cookies[sessionCookieName(type)]);
  if (!session) return optional ? res.json(null) : res.status(401).json({ message: '未登录' });
  const db = await loadDb();
  const user = findSessionUser(db, session);
  if (!user) return optional ? res.json(null) : res.status(401).json({ message: '登录已失效，请重新登录' });
  res.json(type === 'admin' ? publicAdminUser(db, user) : publicUser(user));
});

app.post('/api/auth/logout', (req, res) => {
  const type = req.body?.type === 'admin' ? 'admin' : 'client';
  res.setHeader('Set-Cookie', clearSessionCookie(type));
  res.status(204).end();
});

app.post('/api/auth/logout-all', async (req, res) => {
  const user = req.auth.user;
  user.sessionVersion = nextSessionVersion(user.sessionVersion);
  log(req.db, '退出所有设备', actor(req), user.id);
  await saveDb(req.db);
  res.setHeader('Set-Cookie', clearSessionCookie(req.auth.type));
  res.status(204).end();
});

app.post('/api/users/:id/audit', requirePermission('CLIENT_ACCOUNT_AUDIT'), async (req, res) => {
  const db = await loadDb();
  const clientAccount = (db.clientAccounts || []).find((item) => item.id === req.params.id);
  const adminAccount = (db.adminUsers || []).find((item) => item.id === req.params.id);
  const user = clientAccount || adminAccount;
  if (!user) return res.status(404).json({ message: '账号不存在' });
  const result = req.body.result;
  if (!['通过', '驳回'].includes(result)) {
    return res.status(400).json({ message: '审核结果只能是通过或驳回' });
  }
  user.userStatus = result === '通过' ? '已通过' : '已驳回';
  user.enabled = result === '通过';
  if (adminAccount && req.body.role && user.username !== 'admin') user.role = String(req.body.role);
  if (adminAccount && Array.isArray(req.body.permissions)) user.permissions = req.body.permissions;
  user.reviewComment = req.body.comment || '';
  user.reviewedAt = timestamp();
  user.sessionVersion = nextSessionVersion(user.sessionVersion);
  log(db, `${clientAccount ? '客户端注册' : '后台注册'}${result}`, actor(req), user.id, user.reviewComment || user.agent || user.role);
  await saveDb(db);
  res.json(adminAccount ? publicAdminUser(db, user) : publicUser(user));
});

app.get('/api/model-dictionary', async (_req, res) => {
  res.json(await loadModelDictionary());
});

app.get('/api/model-photo-config', async (req, res) => {
  const model = await loadModelPhotoConfig(req.query.modelCode || '');
  if (req.query.modelCode && !model) return res.status(404).json({ message: '机型拍照配置不存在' });
  res.json(model || []);
});

app.get('/api/machine-component-bindings', requirePermission('MASTER_DATA'), async (_req, res) => {
  res.json(await loadMachineComponentBindings('', ''));
});

app.post('/api/materials', requirePermission('MASTER_DATA'), async (req, res) => {
  const db = await loadDb();
  const material = {
    materialCode: req.body.materialCode,
    name: req.body.name,
    type: req.body.type,
    spec: req.body.spec || '',
    trackSerial: req.body.trackSerial !== false,
    defaultWarrantyMonths: Number(req.body.defaultWarrantyMonths || 12),
    source: req.body.source || '本系统新增'
  };
  if (!material.materialCode || !material.name) {
    return res.status(400).json({ message: '物料编码和物料名称必填' });
  }
  if (db.materials.some((item) => item.materialCode === material.materialCode)) {
    return res.status(409).json({ message: '物料编码已存在' });
  }
  db.materials.push(material);
  log(db, '新增物料档案', actor(req), material.materialCode);
  await saveDb(db);
  res.status(201).json(material);
});

app.post('/api/material-instances', requirePermission('MASTER_DATA'), async (req, res) => {
  const db = await loadDb();
  const instance = {
    serialNo: req.body.serialNo,
    materialCode: req.body.materialCode,
    batchNo: req.body.batchNo || '',
    flowNo: req.body.flowNo || '',
    producedAt: req.body.producedAt || todayDate(),
    status: req.body.status || '备用',
    source: req.body.source || '本系统新增'
  };
  if (!instance.serialNo || !instance.materialCode) {
    return res.status(400).json({ message: '实例编号和物料编码必填' });
  }
  if (!db.materials.some((item) => item.materialCode === instance.materialCode)) {
    return res.status(400).json({ message: '物料编码不存在' });
  }
  if (db.materialInstances.some((item) => item.serialNo === instance.serialNo)) {
    return res.status(409).json({ message: '实例编号已存在' });
  }
  db.materialInstances.push(instance);
  log(db, '新增物料实例', actor(req), instance.serialNo);
  await saveDb(db);
  res.status(201).json(withMaterial(db, instance));
});

app.get('/api/machines/:machineNo/bindings', requirePermission('MASTER_DATA'), async (req, res) => {
  const db = await loadDb();
  const rows = db.bindings
    .filter((item) => item.machineNo === req.params.machineNo)
    .map((binding) => ({ ...binding, instance: withMaterial(db, db.materialInstances.find((item) => item.serialNo === binding.serialNo)) }));
  res.json(rows);
});

app.post('/api/machines/:machineNo/bindings', requirePermission('MASTER_DATA'), async (req, res) => {
  const db = await loadDb();
  const machine = db.machines.find((item) => item.machineNo === req.params.machineNo);
  const instance = db.materialInstances.find((item) => item.serialNo === req.body.serialNo);
  if (!machine || !instance) {
    return res.status(400).json({ message: '机床或物料实例不存在' });
  }
  db.bindings
    .filter((item) => item.serialNo === req.body.serialNo && item.active)
    .forEach((item) => {
      item.active = false;
      item.unboundAt = todayDate();
    });
  instance.status = '在机';
  const binding = {
    id: nextNo('BD', db.bindings, 'id'),
    machineNo: req.params.machineNo,
    serialNo: req.body.serialNo,
    position: req.body.position || '未填写',
    boundAt: req.body.boundAt || todayDate(),
    unboundAt: '',
    active: true,
    source: req.body.source || '人工新增',
    workOrderNo: req.body.workOrderNo || ''
  };
  db.bindings.push(binding);
  log(db, '新增绑定关系', actor(req), binding.id, `${binding.machineNo}/${binding.serialNo}`);
  await saveDb(db);
  res.status(201).json(binding);
});

app.post('/api/warranty/check', async (req, res) => {
  const db = await loadDb();
  res.json(publicWarrantyCheck(await checkWarranty(db, req.body.machineNo, req.body.serialNo, req.body)));
});

app.get('/api/repair-requests', requireRequestList, async (req, res) => {
  const db = await loadDb();
  if (req.auth.type === 'client') return res.json(db.repairRequests.filter((item) => item.accountId === req.auth.user.id).map((item) => customerVisibleRequest(item, db)));
  res.json(db.repairRequests);
});

app.get('/api/repair-requests/:requestNo', requireRequestAccess(), (req, res) => {
  res.json(customerVisibleRequest(req.repairRequest, req.db));
});

app.post('/api/repair-requests', requireClient, async (req, res) => {
  const db = await loadDb();
  const account = req.auth.user;
  const requestNo = nextNo('RQ', db.repairRequests, 'requestNo');
  const details = await Promise.all((req.body.details || []).map(async (detail, index) => {
      const check = await checkWarranty(db, req.body.machineNo, detail.serialNo, {
        modelName: req.body.modelName,
        materialName: detail.materialName,
        materialCode: detail.materialCode,
        photoPositionCode: detail.positionCode || ''
      });
    const serviceType = detail.serviceType || serviceTypeFromText(detail.faultPhenomenon) || '维修';
    const boardNo = detail.boardNo || detail.serialNo || '';
    const warrantyScope = detail.warrantyScope || warrantyScopeFromCheck(check, req.body.machineNo);
    return {
      id: `${requestNo}-${index + 1}`,
      serialNo: detail.serialNo,
      materialType: detail.materialType || check.instance?.material?.type || '',
      materialName: detail.materialName || check.instance?.material?.name || '',
      spec: detail.spec || check.instance?.material?.spec || '',
      boardNo,
      serviceType,
      faultPhenomenon: detail.faultPhenomenon || '',
      bindingStatus: check.matched ? '已绑定' : check.result,
      warrantyResult: check.result,
      warrantyScope,
      warrantySuggestion: check.suggestion,
      verification: verificationFromCheck(check)
    };
  }));
  if (!req.body.customerName || !req.body.machineNo || details.length === 0) {
    return res.status(400).json({ message: '客户、机床编号和送修明细必填' });
  }
  const sourceChannel = repairSourceChannel(req.body.sourceChannel);
  const repairRequest = {
    requestNo,
    accountId: account.id,
    sourceChannel,
    faqContext: normalizedFaqContext(req.body.faqContext, sourceChannel),
    agent: account.agent || req.body.agent || account.name,
    customerName: req.body.customerName,
    contact: account.contact || req.body.contact || '',
    phone: account.phone || req.body.phone || '',
    address: account.address || req.body.address || '',
    machineNo: req.body.machineNo,
    modelCode: req.body.modelCode || '',
    modelName: req.body.modelName || '',
    faultDescription: req.body.faultDescription || '',
    sendMethod: req.body.sendMethod || '寄回',
    outboundExpressCompany: req.body.outboundExpressCompany || '',
    outboundTrackingNo: req.body.outboundTrackingNo || '',
    attachments: await materializeAttachments(requestNo, req.body.attachments || []),
    supplementRequirements: [],
    details,
    status: '待审核',
    audit: null,
    workOrderNo: '',
    createdAt: timestamp()
  };
  db.repairRequests.unshift(repairRequest);
  log(db, '提交维修申请', actor(req), requestNo, `来源：${repairRequest.sourceChannel}`);
  await saveDb(db);
  res.status(201).json(customerVisibleRequest(repairRequest, db));
});

app.post('/api/repair-requests/:requestNo/recheck', requirePermission('REQUEST_REVIEW'), async (req, res) => {
  const db = await loadDb();
  const repairRequest = db.repairRequests.find((item) => item.requestNo === req.params.requestNo);
  if (!repairRequest) return res.status(404).json({ message: '维修申请不存在' });
  await recheckRepairRequest(db, repairRequest);
  log(db, '重新核验维修申请', actor(req), repairRequest.requestNo);
  await saveDb(db);
  res.json(customerVisibleRequest(repairRequest, db));
});

app.post('/api/repair-requests/:requestNo/supplement', requireRequestAccess('REQUEST_REVIEW'), async (req, res) => {
  const db = await loadDb();
  const repairRequest = db.repairRequests.find((item) => item.requestNo === req.params.requestNo);
  if (!repairRequest) return res.status(404).json({ message: '维修申请不存在' });
  if (repairRequest.status !== '待补充资料') return res.status(409).json({ message: '当前申请不处于待补充资料状态' });

  const required = repairRequest.supplementRequirements || [];
  const uploadedCategories = new Set([
    ...(repairRequest.attachments || []).map((item) => item.category),
    ...(req.body.attachments || []).map((item) => item.category)
  ]);
  const missing = required.filter((category) => !uploadedCategories.has(category));
  if (missing.length) return res.status(400).json({ message: '请按审核要求上传机床铭牌和零件编号照片' });

  const newAttachments = await materializeAttachments(repairRequest.requestNo, req.body.attachments || []);
  const combined = [...(repairRequest.attachments || []), ...newAttachments];
  repairRequest.attachments = combined;
  repairRequest.status = '待审核';
  await recheckRepairRequest(db, repairRequest);
  log(db, '补充维修申请资料', actor(req), repairRequest.requestNo, `${newAttachments.length} 张照片`);
  await saveDb(db);
  res.json(customerVisibleRequest(repairRequest, db));
});

app.post('/api/repair-requests/:requestNo/audit', requirePermission('REQUEST_REVIEW'), async (req, res) => {
  const db = await loadDb();
  const repairRequest = db.repairRequests.find((item) => item.requestNo === req.params.requestNo);
  if (!repairRequest) return res.status(404).json({ message: '维修申请不存在' });

  const result = req.body.result;
  await recheckRepairRequest(db, repairRequest);
  repairRequest.audit = {
    result,
    department: req.body.department || '',
    comment: req.body.comment || '',
    operator: actor(req),
    manualConfirmed: Boolean(req.body.manualConfirmed),
    reviewedAt: timestamp()
  };

  if (result === '通过') {
    const workOrderNo = nextNo('WO', db.workOrders, 'workOrderNo');
    const workOrder = {
      workOrderNo,
      requestNo: repairRequest.requestNo,
      department: repairRequest.audit.department || '电器维修',
      repairPerson: '',
      status: '待接单',
      detectionResult: '',
      repairPlan: '',
      repairResult: '',
      replaced: false,
      replacements: [],
      logistics: null,
      completedAt: '',
      archivedAt: '',
      createdAt: timestamp()
    };
    repairRequest.status = '已生成工单';
    repairRequest.supplementRequirements = [];
    repairRequest.workOrderNo = workOrderNo;
    db.workOrders.unshift(workOrder);
    log(db, '审核通过并生成工单', repairRequest.audit.operator, repairRequest.requestNo, workOrderNo);
    await saveDb(db);
    return res.json({ repairRequest, workOrder });
  }

  repairRequest.status = result === '驳回' ? '已驳回' : result === '补充资料' ? '待补充资料' : '待人工确认';
  repairRequest.supplementRequirements = result === '补充资料'
    ? (req.body.requirements?.length ? req.body.requirements : ['machine_nameplate', 'component_serial'])
    : [];
  log(db, `审核${result}`, repairRequest.audit.operator, repairRequest.requestNo, repairRequest.audit.comment);
  await saveDb(db);
  res.json({ repairRequest });
});

app.get('/api/work-orders', requirePermission('WORK_ORDER'), async (_req, res) => {
  const db = await loadDb();
  res.json(
    db.workOrders.map((order) => ({
      ...order,
      request: db.repairRequests.find((item) => item.requestNo === order.requestNo)
    }))
  );
});

app.post('/api/work-orders/:workOrderNo/accept', requirePermission('WORK_ORDER'), async (req, res) => {
  const db = await loadDb();
  const order = db.workOrders.find((item) => item.workOrderNo === req.params.workOrderNo);
  if (!order) return res.status(404).json({ message: '维修工单不存在' });
  order.status = '维修中';
  order.repairPerson = actor(req);
  const repairRequest = db.repairRequests.find((item) => item.requestNo === order.requestNo);
  if (repairRequest) repairRequest.status = '维修中';
  log(db, '维修接单', order.repairPerson, order.workOrderNo);
  await saveDb(db);
  res.json(order);
});

app.post('/api/work-orders/:workOrderNo/repair-result', requirePermission('WORK_ORDER'), async (req, res) => {
  const db = await loadDb();
  const order = db.workOrders.find((item) => item.workOrderNo === req.params.workOrderNo);
  if (!order) return res.status(404).json({ message: '维修工单不存在' });
  const request = db.repairRequests.find((item) => item.requestNo === order.requestNo);

  order.detectionResult = req.body.detectionResult || '';
  order.repairPlan = req.body.repairPlan || '';
  order.repairResult = req.body.repairResult || '已修复';
  order.replaced = Boolean(req.body.replaced);
  order.replacements = (req.body.replacements || []).map((item, index) => ({
    id: item.id || `${order.workOrderNo}-RP-${index + 1}`,
    oldSerialNo: item.oldSerialNo || '',
    newSerialNo: item.newSerialNo || '',
    position: item.position || '',
    reason: item.reason || '',
    componentChanges: item.componentChanges || [],
    operator: actor(req),
    replacedAt: timestamp()
  }));
  order.completedAt = timestamp();
  order.status = ['无法维修', '退回不处理'].includes(order.repairResult) ? '无法维修' : '待寄回';
  if (request) request.status = order.status;

  if (order.replaced && request) {
    order.replacements.forEach((replacement) => {
      const oldInstance = db.materialInstances.find((item) => item.serialNo === replacement.oldSerialNo);
      let newInstance = db.materialInstances.find((item) => item.serialNo === replacement.newSerialNo);
      const requestDetail = request.details.find((item) => item.serialNo === replacement.oldSerialNo || item.boardNo === replacement.oldSerialNo);
      const fallbackMaterial = db.materials.find((item) => item.name === requestDetail?.materialName || item.spec === requestDetail?.spec);
      if (!newInstance && replacement.newSerialNo) {
        newInstance = {
          serialNo: replacement.newSerialNo,
          materialCode: oldInstance?.materialCode || fallbackMaterial?.materialCode || 'MAT-MAIN-BOARD',
          batchNo: '',
          flowNo: replacement.newSerialNo,
          producedAt: todayDate(),
          status: '备用',
          source: '维修更换新增'
        };
        db.materialInstances.push(newInstance);
      }
      db.bindings
        .filter((item) => item.serialNo === replacement.oldSerialNo && item.machineNo === request.machineNo && item.active)
        .forEach((item) => {
          item.active = false;
          item.unboundAt = todayDate();
        });
      if (oldInstance) oldInstance.status = '已换下';
      if (newInstance && !String(request.machineNo || '').startsWith('非保-')) {
        newInstance.status = '在机';
        db.bindings.push({
          id: nextNo('BD', db.bindings, 'id'),
          machineNo: request.machineNo,
          serialNo: replacement.newSerialNo,
          position: replacement.position || '维修更换位',
          boundAt: todayDate(),
          unboundAt: '',
          active: true,
          source: '维修更换',
          workOrderNo: order.workOrderNo
        });
      }
    });
  }

  log(db, '登记维修结果', actor(req), order.workOrderNo, order.repairResult);
  await saveDb(db);
  res.json(order);
});

app.post('/api/work-orders/:workOrderNo/logistics', requirePermission('WORK_ORDER'), async (req, res) => {
  const db = await loadDb();
  const order = db.workOrders.find((item) => item.workOrderNo === req.params.workOrderNo);
  if (!order) return res.status(404).json({ message: '维修工单不存在' });
  order.logistics = {
    returnMethod: req.body.returnMethod || '快递',
    company: req.body.company || '',
    trackingNo: req.body.trackingNo || '',
    sentAt: req.body.sentAt || todayDate(),
    receiver: req.body.receiver || '',
    phone: req.body.phone || '',
    address: req.body.address || ''
  };
  order.status = '已寄回';
  const repairRequest = db.repairRequests.find((item) => item.requestNo === order.requestNo);
  if (repairRequest) repairRequest.status = '已寄回';
  log(db, '登记寄回物流', actor(req), order.workOrderNo, order.logistics.trackingNo);
  await saveDb(db);
  res.json(order);
});

app.post('/api/work-orders/:workOrderNo/archive', requirePermission('WORK_ORDER'), async (req, res) => {
  const db = await loadDb();
  const order = db.workOrders.find((item) => item.workOrderNo === req.params.workOrderNo);
  if (!order) return res.status(404).json({ message: '维修工单不存在' });
  order.status = '已完成';
  order.archivedAt = timestamp();
  const repairRequest = db.repairRequests.find((item) => item.requestNo === order.requestNo);
  if (repairRequest) repairRequest.status = '已完成';
  log(db, '维修归档', actor(req), order.workOrderNo);
  await saveDb(db);
  res.json(order);
});

app.get('/api/reports/overview', requirePermission('REPORT_LOG'), async (_req, res) => {
  const db = await loadDb();
  const requests = db.repairRequests;
  const orders = db.workOrders;
  const today = todayDate();
  const warrantyStats = requests.flatMap((item) => item.details).reduce((acc, item) => {
    acc[item.warrantyResult] = (acc[item.warrantyResult] || 0) + 1;
    return acc;
  }, {});
  const byAgent = requests.reduce((acc, item) => {
    const current = acc[item.agent] || { agent: item.agent, total: 0, completed: 0, abnormal: 0 };
    current.total += 1;
    if (item.status === '已完成') current.completed += 1;
    if (item.details.some((detail) => !['在保', '出保'].includes(detail.warrantyResult))) current.abnormal += 1;
    acc[item.agent] = current;
    return acc;
  }, {});
  const byMaterialType = requests.flatMap((item) => item.details).reduce((acc, item) => {
    const key = item.materialType || '未知';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const bySourceChannel = requests.reduce((acc, item) => {
    const key = repairSourceChannel(item.sourceChannel);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  res.json({
    status: {
      todayNew: requests.filter((item) => item.createdAt.startsWith(today)).length,
      pendingReview: requests.filter((item) => item.status === '待审核').length,
      repairing: orders.filter((item) => item.status === '维修中').length,
      pendingReturn: orders.filter((item) => item.status === '待寄回').length,
      completed: orders.filter((item) => item.status === '已完成').length
    },
    warrantyStats,
    byAgent: Object.values(byAgent),
    byMaterialType,
    bySourceChannel,
    recentLogs: db.operationLogs.slice(0, 8)
  });
});

app.get('/api/v8/sync-tasks', requirePermission('MASTER_DATA'), async (_req, res) => {
  const db = await loadDb();
  res.json(db.syncTasks);
});

app.post('/api/v8/sync-tasks', requirePermission('MASTER_DATA'), async (req, res) => {
  const db = await loadDb();
  const task = {
    id: nextNo('SYNC', db.syncTasks, 'id'),
    source: req.body.source || 'V8 导出文件',
    target: req.body.target || '基础资料',
    status: '成功',
    successCount: Number(req.body.successCount || 0),
    failCount: Number(req.body.failCount || 0),
    summary: req.body.summary || '已记录同步任务，正式导入字段映射待接入',
    createdAt: timestamp()
  };
  db.syncTasks.unshift(task);
  log(db, '创建 V8 同步任务', actor(req), task.id, task.summary);
  await saveDb(db);
  res.status(201).json(task);
});

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: '请求 JSON 格式无效' });
  }
  if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ message: err.message || '请求无效' });
  }
  console.error(err);
  return res.status(500).json({ message: '服务器内部错误' });
});

app.listen(port, host, () => {
  console.log(`Repair system API running at http://${host}:${port}`);
});
// 保持进程常驻，防止在某些运行环境下意外退出
process.stdin.resume();
