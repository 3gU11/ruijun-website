import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, '../data/db.json');
const photoSnapshotPath = resolve(__dirname, '../data/v8-photo-config.snapshot.json');
const bindingSnapshotPath = resolve(__dirname, '../data/v8-machine-bindings.snapshot.json');
const useMysql = String(process.env.USE_MYSQL || '').toLowerCase() === 'true';

let pool;
let schemaReady = false;
let photoSnapshot;
let bindingSnapshot;

function mysqlPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'repair_system',
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
      charset: 'utf8mb4'
    });
  }
  return pool;
}

async function ensureColumn(db, table, column, definition) {
  const [rows] = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  if (!rows.length) {
    await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function ensureIndex(db, table, indexName, definition) {
  const [rows] = await db.query(
    `SELECT index_name
     FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [table, indexName]
  );
  if (!rows.length) {
    await db.query(`ALTER TABLE \`${table}\` ADD ${definition}`);
  }
}

async function ensureMysqlSchema() {
  if (schemaReady || !useMysql) return;
  const db = mysqlPool();
  await ensureColumn(db, 'users', 'username', 'VARCHAR(80) NULL');
  await ensureColumn(db, 'users', 'password', 'VARCHAR(120) NULL');
  await ensureColumn(db, 'users', 'user_type', "VARCHAR(20) NOT NULL DEFAULT 'client'");
  await ensureColumn(db, 'users', 'agent', "VARCHAR(120) NOT NULL DEFAULT ''");
  await ensureColumn(db, 'users', 'contact', "VARCHAR(80) NOT NULL DEFAULT ''");
  await ensureColumn(db, 'users', 'phone', "VARCHAR(40) NOT NULL DEFAULT ''");
  await ensureColumn(db, 'users', 'address', "VARCHAR(240) NOT NULL DEFAULT ''");
  await ensureColumn(db, 'users', 'permissions', 'TEXT NULL');
  await ensureColumn(db, 'users', 'user_status', "VARCHAR(40) NOT NULL DEFAULT '已通过'");
  await ensureColumn(db, 'users', 'review_comment', 'TEXT NULL');
  await ensureColumn(db, 'users', 'reviewed_at', 'DATETIME NULL');
  await ensureIndex(db, 'users', 'uk_users_username', 'UNIQUE KEY `uk_users_username` (`username`)');
  await ensureColumn(db, 'repair_requests', 'account_id', "VARCHAR(40) NOT NULL DEFAULT '' AFTER `request_no`");
  await ensureColumn(db, 'repair_requests', 'source_channel', "VARCHAR(40) NOT NULL DEFAULT 'direct' AFTER `account_id`");
  await ensureColumn(db, 'repair_requests', 'requested_model_code', "VARCHAR(100) NOT NULL DEFAULT ''");
  await ensureColumn(db, 'repair_requests', 'requested_model_name', "VARCHAR(120) NOT NULL DEFAULT ''");
  await ensureIndex(db, 'repair_requests', 'idx_requests_account', 'INDEX `idx_requests_account` (`account_id`)');
  await ensureIndex(db, 'repair_requests', 'idx_requests_source', 'INDEX `idx_requests_source` (`source_channel`)');
  await ensureColumn(db, 'repair_request_items', 'verification_detail', 'JSON NULL');
  await ensureColumn(db, 'file_attachments', 'category', "VARCHAR(40) NOT NULL DEFAULT 'other'");
  await ensureColumn(db, 'repair_requests', 'audit_manual_confirmed', 'TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumn(db, 'repair_requests', 'supplement_requirements', 'JSON NULL');
  await db.query(`
    CREATE TABLE IF NOT EXISTS client_accounts (
      id VARCHAR(40) PRIMARY KEY,
      username VARCHAR(80) NOT NULL,
      password VARCHAR(120) NOT NULL DEFAULT '',
      name VARCHAR(80) NOT NULL,
      agent VARCHAR(120) NOT NULL DEFAULT '',
      contact VARCHAR(80) NOT NULL DEFAULT '',
      phone VARCHAR(40) NOT NULL DEFAULT '',
      address VARCHAR(240) NOT NULL DEFAULT '',
      user_status VARCHAR(40) NOT NULL DEFAULT '待审核',
      review_comment TEXT NULL,
      reviewed_at DATETIME NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      session_version INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_client_accounts_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id VARCHAR(40) PRIMARY KEY,
      username VARCHAR(80) NOT NULL,
      password VARCHAR(120) NOT NULL DEFAULT '',
      name VARCHAR(80) NOT NULL,
      role VARCHAR(40) NOT NULL DEFAULT 'Reviewer',
      contact VARCHAR(80) NOT NULL DEFAULT '',
      phone VARCHAR(40) NOT NULL DEFAULT '',
      permissions TEXT NULL,
      user_status VARCHAR(40) NOT NULL DEFAULT '待审核',
      review_comment TEXT NULL,
      reviewed_at DATETIME NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      session_version INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_admin_users_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await ensureColumn(db, 'client_accounts', 'session_version', 'INT NOT NULL DEFAULT 0');
  await ensureColumn(db, 'admin_users', 'session_version', 'INT NOT NULL DEFAULT 0');
  await db.query(`
    CREATE TABLE IF NOT EXISTS roles (
      role_id VARCHAR(50) PRIMARY KEY,
      role_name VARCHAR(100) NOT NULL DEFAULT '',
      role_type VARCHAR(20) NOT NULL DEFAULT 'admin',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role_id VARCHAR(50) NOT NULL,
      permission_code VARCHAR(80) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_role_permission (role_id, permission_code),
      INDEX idx_role_permissions_role (role_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await migrateSplitAccounts(db);
  await seedDefaultAuth(db);
  schemaReady = true;
}

async function seedDefaultAuth(db) {
  for (const role of defaultRoles) {
    await db.execute(
      'INSERT INTO roles (role_id, role_name, role_type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), role_type = VALUES(role_type)',
      [role.roleId, role.roleName, role.roleType]
    );
    for (const permission of role.permissions) {
      await db.execute('INSERT IGNORE INTO role_permissions (role_id, permission_code) VALUES (?, ?)', [role.roleId, permission]);
    }
  }
  const [adminRows] = await db.query('SELECT id FROM admin_users WHERE username = ? LIMIT 1', ['admin']);
  if (!adminRows.length) {
    await db.execute(
      `INSERT INTO admin_users
       (id, username, password, name, role, permissions, user_status, enabled, created_at, reviewed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['u-admin-login', 'admin', 'scrypt$1$f6QpBMEZPYlGvSqZTQJAlg$zy2W2vlaBqIJJncSVvUm5pJjxCio_yU0buhscbrQ2As', '系统管理员', 'Admin', JSON.stringify(allPermissions()), '已通过', 1, now(), now()]
    );
  }
}

async function migrateSplitAccounts(db) {
  await db.query(`
    INSERT IGNORE INTO client_accounts
      (id, username, password, name, agent, contact, phone, address, user_status, review_comment, reviewed_at, enabled, created_at)
    SELECT
      id, username, COALESCE(password, ''), name,
      COALESCE(NULLIF(agent, ''), name), COALESCE(contact, ''), COALESCE(phone, ''), COALESCE(address, ''),
      COALESCE(user_status, IF(enabled = 1, '已通过', '待审核')),
      COALESCE(review_comment, ''), reviewed_at, enabled, created_at
    FROM users
    WHERE username IS NOT NULL
      AND username <> ''
      AND (user_type = 'client' OR role = '代理商')
      AND username <> 'admin'
  `);
  await db.query(`
    INSERT IGNORE INTO admin_users
      (id, username, password, name, role, contact, phone, permissions, user_status, review_comment, reviewed_at, enabled, created_at)
    SELECT
      id, username, COALESCE(password, ''), name,
      CASE WHEN role = '系统管理员' THEN 'Admin' WHEN role = '工厂审核员' THEN 'Reviewer' WHEN role = '维修人员' THEN 'Repair' ELSE role END,
      COALESCE(contact, ''), COALESCE(phone, ''), permissions,
      COALESCE(user_status, IF(enabled = 1, '已通过', '待审核')),
      COALESCE(review_comment, ''), reviewed_at, enabled, created_at
    FROM users
    WHERE username IS NOT NULL
      AND username <> ''
      AND (user_type = 'admin' OR (role <> '代理商' AND user_type <> 'client'))
  `);
  await db.query("DELETE FROM users WHERE username IS NOT NULL AND username <> ''");
}

const pad = (value) => String(value).padStart(2, '0');
const formatLocalDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatLocalDateTime = (date) =>
  `${formatLocalDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

const today = () => formatLocalDate(new Date());
const now = () => formatLocalDateTime(new Date());

export const permissionCatalog = [
  { code: 'REQUEST_REVIEW', label: '工厂审核', group: '维修业务', type: 'module' },
  { code: 'WORK_ORDER', label: '维修工单', group: '维修业务', type: 'module' },
  { code: 'CLIENT_ACCOUNT_AUDIT', label: '客户端注册审核', group: '账号管理', type: 'module' },
  { code: 'ADMIN_USER_MANAGE', label: '后台账号管理', group: '账号管理', type: 'module' },
  { code: 'ROLE_MANAGE', label: '角色管理', group: '账号管理', type: 'action' },
  { code: 'PERMISSION_MANAGE', label: '权限分配', group: '账号管理', type: 'action' },
  { code: 'MASTER_DATA', label: '基础资料', group: '基础资料', type: 'module' },
  { code: 'REPORT_LOG', label: '报表日志', group: '报表日志', type: 'module' }
];

const allPermissions = () => permissionCatalog.map((item) => item.code);
const defaultRoles = [
  { roleId: 'Admin', roleName: '系统管理员', roleType: 'admin', permissions: allPermissions() },
  { roleId: 'Reviewer', roleName: '工厂审核员', roleType: 'admin', permissions: ['REQUEST_REVIEW', 'CLIENT_ACCOUNT_AUDIT', 'REPORT_LOG'] },
  { roleId: 'Repair', roleName: '维修人员', roleType: 'admin', permissions: ['WORK_ORDER', 'MASTER_DATA'] },
  { roleId: 'Manager', roleName: '售后主管', roleType: 'admin', permissions: ['REQUEST_REVIEW', 'WORK_ORDER', 'CLIENT_ACCOUNT_AUDIT', 'MASTER_DATA', 'REPORT_LOG'] }
];

const seed = {
  users: [
    { id: 'u-admin', name: '系统管理员', role: '系统管理员' },
    { id: 'u-agent', name: '上海瑞景代理商', role: '代理商' },
    { id: 'u-review', name: '工厂审核员', role: '工厂审核员' },
    { id: 'u-repair', name: '电器维修员', role: '维修人员' }
  ],
  machines: [
    {
      machineNo: 'RJ-MC-2025-001',
      model: 'VMC850',
      customer: '苏州安成精密',
      agent: '上海瑞景代理商',
      factoryDate: '2025-03-12',
      warrantyStart: '2025-03-12',
      warrantyEnd: '2027-03-11',
      status: '正常'
    },
    {
      machineNo: 'RJ-MC-2024-009',
      model: 'VMC1060',
      customer: '无锡佳禾制造',
      agent: '上海瑞景代理商',
      factoryDate: '2024-09-18',
      warrantyStart: '2024-09-18',
      warrantyEnd: '2026-09-17',
      status: '正常'
    },
    {
      machineNo: 'RJ-MC-2023-018',
      model: 'VMC1160',
      customer: '宁波华远机械',
      agent: '杭州锐工代理商',
      factoryDate: '2023-01-20',
      warrantyStart: '2023-01-20',
      warrantyEnd: '2025-01-19',
      status: '正常'
    }
  ],
  materials: [
    {
      materialCode: 'MAT-MAIN-BOARD',
      name: '主控板',
      type: '板卡',
      spec: 'MCB-850-A',
      trackSerial: true,
      defaultWarrantyMonths: 24,
      source: 'V8'
    },
    {
      materialCode: 'MAT-IO-BOARD',
      name: 'IO板',
      type: '板卡',
      spec: 'IO-24IN-16OUT',
      trackSerial: true,
      defaultWarrantyMonths: 24,
      source: 'V8'
    },
    {
      materialCode: 'MAT-DRIVER-X',
      name: 'X轴驱动器',
      type: '驱动器',
      spec: 'DRV-X-2.2KW',
      trackSerial: true,
      defaultWarrantyMonths: 18,
      source: 'V8'
    },
    {
      materialCode: 'MAT-SPINDLE-MOTOR',
      name: '主轴电机',
      type: '电机',
      spec: 'SPM-7.5KW',
      trackSerial: true,
      defaultWarrantyMonths: 18,
      source: 'V8'
    },
    {
      materialCode: 'MAT-SENSOR-Z',
      name: 'Z轴限位传感器',
      type: '传感器',
      spec: 'SNS-Z-LIMIT',
      trackSerial: true,
      defaultWarrantyMonths: 12,
      source: '本系统新增'
    }
  ],
  materialInstances: [
    { serialNo: 'PCB-850-0001', materialCode: 'MAT-MAIN-BOARD', batchNo: 'B202503', flowNo: '0001', producedAt: '2025-03-01', status: '在机', source: 'V8' },
    { serialNo: 'IO-850-0002', materialCode: 'MAT-IO-BOARD', batchNo: 'B202503', flowNo: '0002', producedAt: '2025-03-01', status: '在机', source: 'V8' },
    { serialNo: 'DRV-X-0008', materialCode: 'MAT-DRIVER-X', batchNo: 'D202502', flowNo: '0008', producedAt: '2025-02-20', status: '在机', source: 'V8' },
    { serialNo: 'SPM-750-0066', materialCode: 'MAT-SPINDLE-MOTOR', batchNo: 'M202409', flowNo: '0066', producedAt: '2024-09-01', status: '在机', source: 'V8' },
    { serialNo: 'PCB-OLD-018', materialCode: 'MAT-MAIN-BOARD', batchNo: 'B202212', flowNo: '0018', producedAt: '2022-12-18', status: '在机', source: 'V8' },
    { serialNo: 'PCB-SPARE-009', materialCode: 'MAT-MAIN-BOARD', batchNo: 'B202604', flowNo: '0009', producedAt: '2026-04-10', status: '备用', source: '本系统新增' },
    { serialNo: 'SNS-Z-0201', materialCode: 'MAT-SENSOR-Z', batchNo: 'S202604', flowNo: '0201', producedAt: '2026-04-11', status: '备用', source: '本系统新增' }
  ],
  bindings: [
    { id: 'BD-0001', machineNo: 'RJ-MC-2025-001', serialNo: 'PCB-850-0001', position: '电柜主控位', boundAt: '2025-03-12', unboundAt: '', active: true, source: 'V8', workOrderNo: '' },
    { id: 'BD-0002', machineNo: 'RJ-MC-2025-001', serialNo: 'DRV-X-0008', position: 'X轴驱动位', boundAt: '2025-03-12', unboundAt: '', active: true, source: 'V8', workOrderNo: '' },
    { id: 'BD-0003', machineNo: 'RJ-MC-2025-001', serialNo: 'IO-850-0002', position: '电柜IO位', boundAt: '2025-03-12', unboundAt: '', active: true, source: 'V8', workOrderNo: '' },
    { id: 'BD-0004', machineNo: 'RJ-MC-2024-009', serialNo: 'SPM-750-0066', position: '主轴电机', boundAt: '2024-09-18', unboundAt: '', active: true, source: 'V8', workOrderNo: '' },
    { id: 'BD-0005', machineNo: 'RJ-MC-2023-018', serialNo: 'PCB-OLD-018', position: '电柜主控位', boundAt: '2023-01-20', unboundAt: '', active: true, source: 'V8', workOrderNo: '' }
  ],
  repairRequests: [],
  workOrders: [],
  roles: defaultRoles.map((role) => ({ roleId: role.roleId, roleName: role.roleName, roleType: role.roleType })),
  rolePermissions: defaultRoles.flatMap((role) => role.permissions.map((permission) => ({ roleId: role.roleId, permissionCode: permission }))),
  syncTasks: [
    { id: 'SYNC-0001', source: 'V8 示例数据', target: '基础档案', status: '成功', successCount: 20, failCount: 0, summary: '初始化机床、物料、物料实例和绑定关系', createdAt: now() }
  ],
  operationLogs: [
    { id: 'LOG-0001', action: '初始化示例数据', operator: '系统', targetNo: 'repair_system', note: '已写入第一期基础业务数据', createdAt: now() }
  ]
};

function readJsonDb() {
  if (!existsSync(dbPath)) {
    mkdirSync(dirname(dbPath), { recursive: true });
    writeFileSync(dbPath, JSON.stringify(seed, null, 2), 'utf8');
  }
  return JSON.parse(readFileSync(dbPath, 'utf8'));
}

function writeJsonDb(db) {
  writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
}

const bool = (value) => Boolean(Number(value));
const dateOrEmpty = (value) => value || '';
const nullIfEmpty = (value) => (value === '' || value === undefined ? null : value);
const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

function mapRequest(row, items, attachments) {
  return {
    requestNo: row.request_no,
    accountId: row.account_id || '',
    sourceChannel: row.source_channel || 'direct',
    agent: row.agent,
    customerName: row.customer_name,
    contact: row.contact,
    phone: row.phone,
    address: row.address,
    machineNo: row.machine_no,
    modelCode: row.requested_model_code || '',
    modelName: row.requested_model_name || '',
    faultDescription: row.fault_description || '',
    sendMethod: row.send_method,
    outboundExpressCompany: row.outbound_express_company,
    outboundTrackingNo: row.outbound_tracking_no,
    attachments: attachments
      .filter((item) => item.biz_type === 'repair_request' && item.biz_no === row.request_no)
      .map((item) => ({
        id: item.id,
        name: item.file_name,
        url: item.file_url,
        category: item.category || 'other'
      })),
    supplementRequirements: parseJsonArray(row.supplement_requirements),
    details: items
      .filter((item) => item.request_no === row.request_no)
      .map((item) => ({
        id: item.id,
        serialNo: item.serial_no,
        materialType: item.material_type,
        materialName: item.material_name,
        spec: item.spec,
        boardNo: item.board_no || item.serial_no,
        serviceType: item.service_type || '',
        faultPhenomenon: item.fault_phenomenon || '',
        bindingStatus: item.binding_status,
        warrantyResult: item.warranty_result,
        warrantyScope: item.warranty_scope || item.warranty_result,
        warrantySuggestion: item.warranty_suggestion,
        verification: item.verification_detail ? (typeof item.verification_detail === 'string' ? JSON.parse(item.verification_detail) : item.verification_detail) : null
      })),
    status: row.status,
    audit: row.audit_result
      ? {
          result: row.audit_result,
          department: row.audit_department || '',
          comment: row.audit_comment || '',
          operator: row.audit_operator || '',
          manualConfirmed: bool(row.audit_manual_confirmed),
          reviewedAt: row.reviewed_at || ''
        }
      : null,
    workOrderNo: row.work_order_no,
    createdAt: row.created_at
  };
}

function mapOrder(row, replacements, logistics) {
  const logistic = logistics.find((item) => item.work_order_no === row.work_order_no);
  return {
    workOrderNo: row.work_order_no,
    requestNo: row.request_no,
    department: row.department,
    repairPerson: row.repair_person,
    status: row.status,
    detectionResult: row.detection_result || '',
    repairPlan: row.repair_plan || '',
    repairResult: row.repair_result || '',
    replaced: bool(row.replaced),
    replacements: replacements
      .filter((item) => item.work_order_no === row.work_order_no)
      .map((item) => ({
        id: item.id,
        oldSerialNo: item.old_serial_no,
        newSerialNo: item.new_serial_no,
        position: item.position,
        reason: item.reason,
        componentChanges: parseJsonArray(item.component_changes),
        operator: item.operator,
        replacedAt: item.replaced_at
      })),
    logistics: logistic
      ? {
          returnMethod: logistic.return_method,
          company: logistic.company,
          trackingNo: logistic.tracking_no,
          sentAt: logistic.sent_at || '',
          receiver: logistic.receiver,
          phone: logistic.phone,
          address: logistic.address
        }
      : null,
    completedAt: row.completed_at || '',
    archivedAt: row.archived_at || '',
    createdAt: row.created_at
  };
}

async function loadMysqlDb() {
  await ensureMysqlSchema();
  const db = mysqlPool();
  const [
    [legacyUsers],
    [clientAccounts],
    [adminUsers],
    [machines],
    [materials],
    [instances],
    [bindings],
    [requests],
    [requestItems],
    [attachments],
    [orders],
    [replacements],
    [logistics],
    [roles],
    [rolePermissions],
    [syncTasks],
    [logs]
  ] = await Promise.all([
    db.query('SELECT * FROM users ORDER BY created_at, id'),
    db.query('SELECT * FROM client_accounts ORDER BY created_at, id'),
    db.query('SELECT * FROM admin_users ORDER BY created_at, id'),
    db.query('SELECT * FROM machines ORDER BY machine_no'),
    db.query('SELECT * FROM materials ORDER BY material_code'),
    db.query('SELECT * FROM material_instances ORDER BY serial_no'),
    db.query('SELECT * FROM machine_material_bindings ORDER BY id'),
    db.query('SELECT * FROM repair_requests ORDER BY created_at DESC, request_no DESC'),
    db.query('SELECT * FROM repair_request_items ORDER BY id'),
    db.query('SELECT * FROM file_attachments ORDER BY created_at, id'),
    db.query('SELECT * FROM work_orders ORDER BY created_at DESC, work_order_no DESC'),
    db.query('SELECT * FROM replacement_records ORDER BY replaced_at DESC, id DESC'),
    db.query('SELECT * FROM logistics_records ORDER BY created_at DESC'),
    db.query('SELECT * FROM roles ORDER BY role_id'),
    db.query('SELECT * FROM role_permissions ORDER BY role_id, permission_code'),
    db.query('SELECT * FROM v8_sync_tasks ORDER BY created_at DESC, id DESC'),
    db.query('SELECT * FROM operation_logs ORDER BY created_at DESC, id DESC')
  ]);

  return {
    clientAccounts: clientAccounts.map((row) => ({
      id: row.id,
      username: row.username || '',
      password: row.password || '',
      name: row.name,
      role: '代理商',
      userType: 'client',
      agent: row.agent || '',
      contact: row.contact || '',
      phone: row.phone || '',
      address: row.address || '',
      userStatus: row.user_status || (bool(row.enabled) ? '已通过' : '待审核'),
      reviewComment: row.review_comment || '',
      reviewedAt: row.reviewed_at || '',
      enabled: row.enabled === undefined ? true : bool(row.enabled),
      sessionVersion: Number(row.session_version || 0),
      createdAt: row.created_at || ''
    })),
    adminUsers: adminUsers.map((row) => ({
      id: row.id,
      username: row.username || '',
      password: row.password || '',
      name: row.name,
      role: row.role || 'Reviewer',
      userType: 'admin',
      agent: '',
      contact: row.contact || '',
      phone: row.phone || '',
      address: '',
      permissions: parseJsonArray(row.permissions),
      userStatus: row.user_status || (bool(row.enabled) ? '已通过' : '待审核'),
      reviewComment: row.review_comment || '',
      reviewedAt: row.reviewed_at || '',
      enabled: row.enabled === undefined ? true : bool(row.enabled),
      sessionVersion: Number(row.session_version || 0),
      createdAt: row.created_at || ''
    })),
    users: [
      ...clientAccounts.map((row) => ({
        id: row.id,
        username: row.username || '',
        name: row.name,
        role: '代理商',
        userType: 'client',
        agent: row.agent || '',
        contact: row.contact || '',
        phone: row.phone || '',
        address: row.address || '',
        userStatus: row.user_status || (bool(row.enabled) ? '已通过' : '待审核'),
        reviewComment: row.review_comment || '',
        reviewedAt: row.reviewed_at || '',
        enabled: row.enabled === undefined ? true : bool(row.enabled),
        createdAt: row.created_at || ''
      })),
      ...adminUsers.map((row) => ({
        id: row.id,
        username: row.username || '',
        name: row.name,
        role: row.role || 'Reviewer',
        userType: 'admin',
        contact: row.contact || '',
        phone: row.phone || '',
        permissions: parseJsonArray(row.permissions),
        userStatus: row.user_status || (bool(row.enabled) ? '已通过' : '待审核'),
        reviewComment: row.review_comment || '',
        reviewedAt: row.reviewed_at || '',
        enabled: row.enabled === undefined ? true : bool(row.enabled),
        createdAt: row.created_at || ''
      }))
    ],
    machines: machines.map((row) => ({
      machineNo: row.machine_no,
      model: row.model,
      customer: row.customer,
      agent: row.agent,
      factoryDate: dateOrEmpty(row.factory_date),
      warrantyStart: dateOrEmpty(row.warranty_start),
      warrantyEnd: dateOrEmpty(row.warranty_end),
      status: row.status
    })),
    materials: materials.map((row) => ({
      materialCode: row.material_code,
      name: row.name,
      type: row.type,
      spec: row.spec,
      trackSerial: bool(row.track_serial),
      defaultWarrantyMonths: Number(row.default_warranty_months),
      source: row.source
    })),
    materialInstances: instances.map((row) => ({
      serialNo: row.serial_no,
      materialCode: row.material_code,
      batchNo: row.batch_no,
      flowNo: row.flow_no,
      producedAt: dateOrEmpty(row.produced_at),
      status: row.status,
      source: row.source
    })),
    bindings: bindings.map((row) => ({
      id: row.id,
      machineNo: row.machine_no,
      serialNo: row.serial_no,
      position: row.position,
      boundAt: dateOrEmpty(row.bound_at),
      unboundAt: dateOrEmpty(row.unbound_at),
      active: bool(row.active),
      source: row.source,
      workOrderNo: row.work_order_no
    })),
    repairRequests: requests.map((row) => mapRequest(row, requestItems, attachments)),
    workOrders: orders.map((row) => mapOrder(row, replacements, logistics)),
    roles: roles.map((row) => ({
      roleId: row.role_id,
      roleName: row.role_name,
      roleType: row.role_type || 'admin',
      createdAt: row.created_at || ''
    })),
    rolePermissions: rolePermissions.map((row) => ({
      roleId: row.role_id,
      permissionCode: row.permission_code
    })),
    syncTasks: syncTasks.map((row) => ({
      id: row.id,
      source: row.source,
      target: row.target,
      status: row.status,
      successCount: Number(row.success_count),
      failCount: Number(row.fail_count),
      summary: row.summary || '',
      createdAt: row.created_at
    })),
    operationLogs: logs.map((row) => ({
      id: row.id,
      action: row.action,
      operator: row.operator,
      targetNo: row.target_no,
      note: row.note || '',
      createdAt: row.created_at
    }))
  };
}

async function executeMany(conn, sql, rows) {
  for (const row of rows) {
    await conn.execute(sql, row);
  }
}

async function saveMysqlDb(data) {
  await ensureMysqlSchema();
  const conn = await mysqlPool().getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('DELETE FROM file_attachments');
    await conn.query('DELETE FROM logistics_records');
    await conn.query('DELETE FROM replacement_records');
    await conn.query('DELETE FROM work_orders');
    await conn.query('DELETE FROM repair_request_items');
    await conn.query('DELETE FROM repair_requests');
    await conn.query('DELETE FROM machine_material_bindings');
    await conn.query('DELETE FROM material_instances');
    await conn.query('DELETE FROM materials');
    await conn.query('DELETE FROM machines');
    await conn.query('DELETE FROM client_accounts');
    await conn.query('DELETE FROM admin_users');
    await conn.query('DELETE FROM role_permissions');
    await conn.query('DELETE FROM roles');
    await conn.query('DELETE FROM v8_sync_tasks');
    await conn.query('DELETE FROM operation_logs');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    const clientAccounts = data.clientAccounts || (data.users || []).filter((item) => item.userType === 'client' || item.role === '代理商');
    const adminUsers = data.adminUsers || (data.users || []).filter((item) => item.userType === 'admin' || (item.username && item.role !== '代理商'));
    await executeMany(
      conn,
      'INSERT INTO client_accounts (id, username, password, name, agent, contact, phone, address, user_status, review_comment, reviewed_at, enabled, session_version, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      clientAccounts.map((item) => [
        item.id,
        item.username,
        item.password || '',
        item.name,
        item.agent || item.name || '',
        item.contact || '',
        item.phone || '',
        item.address || '',
        item.userStatus || (item.enabled === false ? '待审核' : '已通过'),
        item.reviewComment || '',
        nullIfEmpty(item.reviewedAt),
        item.enabled === false ? 0 : 1,
        Number.isSafeInteger(Number(item.sessionVersion)) && Number(item.sessionVersion) >= 0 ? Number(item.sessionVersion) : 0,
        item.createdAt || timestamp()
      ])
    );
    await executeMany(
      conn,
      'INSERT INTO admin_users (id, username, password, name, role, contact, phone, permissions, user_status, review_comment, reviewed_at, enabled, session_version, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      adminUsers.map((item) => [
        item.id,
        item.username,
        item.password || '',
        item.name,
        item.role || 'Reviewer',
        item.contact || '',
        item.phone || '',
        JSON.stringify(item.permissions || []),
        item.userStatus || (item.enabled === false ? '待审核' : '已通过'),
        item.reviewComment || '',
        nullIfEmpty(item.reviewedAt),
        item.enabled === false ? 0 : 1,
        Number.isSafeInteger(Number(item.sessionVersion)) && Number(item.sessionVersion) >= 0 ? Number(item.sessionVersion) : 0,
        item.createdAt || timestamp()
      ])
    );
    await executeMany(
      conn,
      'INSERT INTO roles (role_id, role_name, role_type, created_at) VALUES (?, ?, ?, ?)',
      (data.roles || defaultRoles).map((item) => [item.roleId, item.roleName, item.roleType || 'admin', item.createdAt || timestamp()])
    );
    await executeMany(
      conn,
      'INSERT INTO role_permissions (role_id, permission_code) VALUES (?, ?)',
      (data.rolePermissions || defaultRoles.flatMap((role) => role.permissions.map((permission) => ({ roleId: role.roleId, permissionCode: permission })))).map((item) => [
        item.roleId,
        item.permissionCode
      ])
    );
    await executeMany(
      conn,
      'INSERT INTO machines (machine_no, model, customer, agent, factory_date, warranty_start, warranty_end, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      data.machines.map((item) => [item.machineNo, item.model, item.customer, item.agent, nullIfEmpty(item.factoryDate), nullIfEmpty(item.warrantyStart), nullIfEmpty(item.warrantyEnd), item.status])
    );
    await executeMany(
      conn,
      'INSERT INTO materials (material_code, name, type, spec, track_serial, default_warranty_months, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
      data.materials.map((item) => [item.materialCode, item.name, item.type, item.spec || '', item.trackSerial ? 1 : 0, Number(item.defaultWarrantyMonths || 0), item.source || '本系统新增'])
    );
    await executeMany(
      conn,
      'INSERT INTO material_instances (serial_no, material_code, batch_no, flow_no, produced_at, status, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
      data.materialInstances.map((item) => [item.serialNo, item.materialCode, item.batchNo || '', item.flowNo || '', nullIfEmpty(item.producedAt), item.status || '备用', item.source || '本系统新增'])
    );
    await executeMany(
      conn,
      'INSERT INTO machine_material_bindings (id, machine_no, serial_no, position, bound_at, unbound_at, active, source, work_order_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      data.bindings.map((item) => [item.id, item.machineNo, item.serialNo, item.position || '', nullIfEmpty(item.boundAt), nullIfEmpty(item.unboundAt), item.active ? 1 : 0, item.source || '人工新增', item.workOrderNo || ''])
    );
    await executeMany(
      conn,
      `INSERT INTO repair_requests
       (request_no, account_id, source_channel, agent, customer_name, contact, phone, address, machine_no, requested_model_code, requested_model_name, fault_description, send_method, outbound_express_company, outbound_tracking_no, status, work_order_no, audit_result, audit_department, audit_comment, audit_operator, audit_manual_confirmed, supplement_requirements, reviewed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      data.repairRequests.map((item) => [
        item.requestNo,
        item.accountId || '',
        item.sourceChannel || 'direct',
        item.agent,
        item.customerName,
        item.contact || '',
        item.phone || '',
        item.address || '',
        item.machineNo,
        item.modelCode || '',
        item.modelName || '',
        item.faultDescription || '',
        item.sendMethod || '寄回',
        item.outboundExpressCompany || '',
        item.outboundTrackingNo || '',
        item.status,
        item.workOrderNo || '',
        item.audit?.result || null,
        item.audit?.department || null,
        item.audit?.comment || null,
        item.audit?.operator || null,
        item.audit?.manualConfirmed ? 1 : 0,
        item.supplementRequirements?.length ? JSON.stringify(item.supplementRequirements) : null,
        nullIfEmpty(item.audit?.reviewedAt),
        item.createdAt || timestamp()
      ])
    );
    await executeMany(
      conn,
      'INSERT INTO repair_request_items (id, request_no, serial_no, material_type, material_name, spec, board_no, service_type, fault_phenomenon, binding_status, warranty_result, warranty_scope, warranty_suggestion, verification_detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      data.repairRequests.flatMap((request) =>
        request.details.map((item) => [
          item.id,
          request.requestNo,
          item.serialNo,
          item.materialType || '',
          item.materialName || '',
          item.spec || '',
          item.boardNo || item.serialNo || '',
          item.serviceType || '维修',
          item.faultPhenomenon || '',
          item.bindingStatus || '',
          item.warrantyResult || '',
          item.warrantyScope || item.warrantyResult || '',
          item.warrantySuggestion || '',
          item.verification ? JSON.stringify(item.verification) : null
        ])
      )
    );
    await executeMany(
      conn,
      'INSERT INTO file_attachments (id, biz_type, biz_no, file_name, file_url, category) VALUES (?, ?, ?, ?, ?, ?)',
      data.repairRequests.flatMap((request) =>
        (request.attachments || []).map((item, index) => [
          item.id || `${request.requestNo}-ATT-${index + 1}`,
          'repair_request',
          request.requestNo,
          item.name || `附件-${index + 1}`,
          item.url || '',
          item.category || 'other'
        ])
      )
    );
    await executeMany(
      conn,
      'INSERT INTO work_orders (work_order_no, request_no, department, repair_person, status, detection_result, repair_plan, repair_result, replaced, completed_at, archived_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      data.workOrders.map((item) => [
        item.workOrderNo,
        item.requestNo,
        item.department,
        item.repairPerson || '',
        item.status,
        item.detectionResult || '',
        item.repairPlan || '',
        item.repairResult || '',
        item.replaced ? 1 : 0,
        nullIfEmpty(item.completedAt),
        nullIfEmpty(item.archivedAt),
        item.createdAt || timestamp()
      ])
    );
    await executeMany(
      conn,
      'INSERT INTO replacement_records (id, work_order_no, machine_no, old_serial_no, new_serial_no, position, reason, component_changes, operator, replaced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      data.workOrders.flatMap((order) => {
        const request = data.repairRequests.find((item) => item.requestNo === order.requestNo);
        return (order.replacements || []).map((item, index) => [
          item.id || `${order.workOrderNo}-RP-${index + 1}`,
          order.workOrderNo,
          request?.machineNo || '',
          item.oldSerialNo,
          item.newSerialNo,
          item.position || '',
          item.reason || '',
          JSON.stringify(item.componentChanges || []),
          item.operator || order.repairPerson || '',
          item.replacedAt || timestamp()
        ]);
      })
    );
    await executeMany(
      conn,
      'INSERT INTO logistics_records (id, work_order_no, return_method, company, tracking_no, sent_at, receiver, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      data.workOrders
        .filter((item) => item.logistics)
        .map((item) => [
          `${item.workOrderNo}-LG`,
          item.workOrderNo,
          item.logistics.returnMethod,
          item.logistics.company || '',
          item.logistics.trackingNo || '',
          nullIfEmpty(item.logistics.sentAt),
          item.logistics.receiver || '',
          item.logistics.phone || '',
          item.logistics.address || ''
        ])
    );
    await executeMany(
      conn,
      'INSERT INTO v8_sync_tasks (id, source, target, status, success_count, fail_count, summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      data.syncTasks.map((item) => [item.id, item.source, item.target, item.status, Number(item.successCount || 0), Number(item.failCount || 0), item.summary || '', item.createdAt || timestamp()])
    );
    await executeMany(
      conn,
      'INSERT INTO operation_logs (id, action, operator, target_no, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      data.operationLogs.map((item) => [item.id, item.action, item.operator || '系统', item.targetNo || '', item.note || '', item.createdAt || timestamp()])
    );

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function loadDb() {
  if (useMysql) return loadMysqlDb();
  return readJsonDb();
}

export async function saveDb(db) {
  if (useMysql) return saveMysqlDb(db);
  return writeJsonDb(db);
}

function readPhotoSnapshot() {
  if (photoSnapshot === undefined) {
    if (!existsSync(photoSnapshotPath)) {
      photoSnapshot = null;
      console.warn(`V8 photo snapshot not found; using repair-system master data: ${photoSnapshotPath}`);
    } else {
      photoSnapshot = JSON.parse(readFileSync(photoSnapshotPath, 'utf8'));
    }
  }
  return photoSnapshot;
}

function expandPhotoModel(model, snapshot = readPhotoSnapshot()) {
  const itemMap = new Map(snapshot.items.map((item) => [item.code, item]));
  const overrides = snapshot.templateOverrides?.[model.template] || {};
  const codes = snapshot.templates?.[model.template] || [];
  return {
    id: String(model.id),
    code: model.code,
    name: model.name,
    series: model.series,
    imageUrl: model.imageUrl || model.photoUrl || model.image || '',
    sortOrder: model.sortOrder,
    source: 'local:v8-photo-config.snapshot',
    photoItems: codes.map((code, index) => {
      const item = itemMap.get(code);
      return {
        code,
        name: item?.name || code,
        type: item?.category || '编号',
        spec: code,
        shootingRequirement: item?.shootingRequirement || '',
        required: overrides[code] ?? Boolean(item?.defaultRequired),
        ocrEnabled: Boolean(item?.defaultOcrEnabled),
        ocrProfile: item?.ocrProfile || '',
        sortOrder: index + 1
      };
    })
  };
}

function inferModelSeries(modelName) {
  const value = String(modelName || '').trim().toUpperCase();
  const prefix = value.match(/^([A-Z]{2,})(?=[\s_-]*\d)/)?.[1]
    || value.match(/^([A-Z]{2,})[\s_-]/)?.[1];
  return prefix ? `${prefix} 系列` : '其他机型';
}

export async function loadModelDictionary() {
  const snapshot = readPhotoSnapshot();
  if (snapshot) return snapshot.models.map((model) => expandPhotoModel(model, snapshot));

  const db = await loadDb();
  const instancesBySerial = new Map(db.materialInstances.map((item) => [item.serialNo, item]));
  const materialsByCode = new Map(db.materials.map((item) => [item.materialCode, item]));
  const machinesByNo = new Map(db.machines.map((item) => [item.machineNo, item]));
  const materialsByModel = new Map();

  for (const binding of db.bindings) {
    const machine = machinesByNo.get(binding.machineNo);
    const instance = instancesBySerial.get(binding.serialNo);
    const material = materialsByCode.get(instance?.materialCode);
    if (!machine?.model || !material) continue;
    const modelMaterials = materialsByModel.get(machine.model) || new Map();
    modelMaterials.set(material.materialCode, material);
    materialsByModel.set(machine.model, modelMaterials);
  }

  return Array.from(new Set(db.machines.map((item) => item.model).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, 'zh-CN'))
    .map((model, index) => {
      const modelMaterials = Array.from(materialsByModel.get(model)?.values() || []);
      const materials = modelMaterials.length ? modelMaterials : db.materials;
      return {
        id: model,
        code: model,
        name: model,
        series: inferModelSeries(model),
        imageUrl: '',
        sortOrder: index + 1,
        source: 'repair-system:master-data',
        photoItems: materials.map((material, materialIndex) => ({
          code: material.materialCode,
          name: material.name,
          type: material.type || '维修物料',
          spec: material.spec || material.materialCode,
          shootingRequirement: '',
          required: false,
          ocrEnabled: false,
          ocrProfile: '',
          sortOrder: materialIndex + 1
        }))
      };
    });
}

export async function loadModelPhotoConfig(modelCode = '') {
  const models = await loadModelDictionary();
  if (!modelCode) return models;
  return models.find((model) => model.code === String(modelCode).trim()) || null;
}

function readBindingSnapshot() {
  if (bindingSnapshot === undefined) {
    if (!existsSync(bindingSnapshotPath)) {
      bindingSnapshot = null;
      console.warn(`V8 binding snapshot not found; using repair-system master data: ${bindingSnapshotPath}`);
    } else {
      bindingSnapshot = JSON.parse(readFileSync(bindingSnapshotPath, 'utf8'));
    }
  }
  return bindingSnapshot;
}

export async function loadMachineComponentBindings(machineNo = '', serialNo = '') {
  const snapshot = readBindingSnapshot();
  const machineKey = String(machineNo || '').trim();
  const serialKey = String(serialNo || '').trim();
  let source = 'local:v8-machine-bindings.snapshot';
  let snapshotVersion = snapshot?.snapshotVersion || '';
  let rows;

  if (snapshot) {
    rows = snapshot.rows || [];
  } else {
    const db = await loadDb();
    const machinesByNo = new Map(db.machines.map((item) => [item.machineNo, item]));
    const instancesBySerial = new Map(db.materialInstances.map((item) => [item.serialNo, item]));
    const materialsByCode = new Map(db.materials.map((item) => [item.materialCode, item]));
    source = 'repair-system:master-data';
    snapshotVersion = 'database-current';
    rows = db.bindings.map((binding) => {
      const machine = machinesByNo.get(binding.machineNo) || {};
      const instance = instancesBySerial.get(binding.serialNo) || {};
      const material = materialsByCode.get(instance.materialCode) || {};
      return {
        id: binding.id,
        binding_key: binding.id,
        machine_no: binding.machineNo,
        machine_batch_no: '',
        model_name: machine.model || '',
        customer: machine.customer || '',
        agent: machine.agent || '',
        machine_status: machine.status || '',
        location_code: '',
        delivery_date: machine.factoryDate || machine.warrantyStart || '',
        outbound_at: '',
        material_code: material.materialCode || instance.materialCode || '',
        material_name: material.name || '',
        material_type: material.type || '',
        material_spec: material.spec || '',
        component_serial_no: binding.serialNo,
        instance_batch_no: instance.batchNo || '',
        instance_flow_no: instance.flowNo || '',
        position_code: binding.position || '',
        position_name: binding.position || '',
        bound_at: binding.boundAt || '',
        active: binding.active,
        source: binding.source || 'repair_system',
        source_task_id: '',
        source_file_id: '',
        source_ocr_result_id: '',
        file_name: '',
        recognized_value: '',
        manual_value: '',
        confidence: 0,
        check_status: '',
        reviewed_by: '',
        reviewed_at: '',
        created_at: '',
        updated_at: ''
      };
    });
  }

  const bindings = rows.filter((item) =>
    (!machineKey && !serialKey) || item.machine_no === machineKey || item.component_serial_no === serialKey
  );

  return {
    available: true,
    source,
    snapshotVersion,
    deliveryDateColumn: 'delivery_date',
    rows: bindings.map((row) => ({
      id: row.id,
      bindingKey: row.binding_key || '',
      machineNo: row.machine_no || '',
      machineBatchNo: row.machine_batch_no || '',
      modelName: row.model_name || '',
      customer: row.customer || '',
      agent: row.agent || '',
      machineStatus: row.machine_status || '',
      locationCode: row.location_code || '',
      deliveryDate: dateOrEmpty(row.delivery_date),
      outboundAt: dateOrEmpty(row.outbound_at),
      materialCode: row.material_code || '',
      materialName: row.material_name || '',
      materialType: row.material_type || '',
      materialSpec: row.material_spec || '',
      componentSerialNo: row.component_serial_no || '',
      serialNo: row.component_serial_no || '',
      instanceBatchNo: row.instance_batch_no || '',
      instanceFlowNo: row.instance_flow_no || '',
      positionCode: row.position_code || '',
      positionName: row.position_name || '',
      position: row.position_name || row.position_code || '',
      boundAt: dateOrEmpty(row.bound_at),
      active: Boolean(row.active),
      source: row.source || 'V8',
      sourceTaskId: row.source_task_id,
      sourceFileId: row.source_file_id,
      sourceOcrResultId: row.source_ocr_result_id,
      fileName: row.file_name || '',
      recognizedValue: row.recognized_value || '',
      manualValue: row.manual_value || '',
      confidence: Number(row.confidence || 0),
      checkStatus: row.check_status || '',
      reviewedBy: row.reviewed_by || '',
      reviewedAt: dateOrEmpty(row.reviewed_at),
      createdAt: dateOrEmpty(row.created_at),
      updatedAt: dateOrEmpty(row.updated_at)
    }))
  };
}

export function nextNo(prefix, rows, field) {
  const datePart = today().replaceAll('-', '');
  const currentPrefix = `${prefix}-${datePart}-`;
  const max = rows
    .map((row) => row[field])
    .filter(Boolean)
    .filter((value) => String(value).startsWith(currentPrefix))
    .map((value) => Number(String(value).split('-').at(-1)))
    .filter((value) => Number.isFinite(value))
    .reduce((acc, value) => Math.max(acc, value), 0);
  return `${currentPrefix}${String(max + 1).padStart(4, '0')}`;
}

export function todayDate() {
  return today();
}

export function timestamp() {
  return now();
}
