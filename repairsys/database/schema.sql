CREATE DATABASE IF NOT EXISTS repair_system
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE repair_system;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(40) PRIMARY KEY,
  username VARCHAR(80) NULL,
  password VARCHAR(120) NULL,
  name VARCHAR(80) NOT NULL,
  role VARCHAR(40) NOT NULL,
  user_type VARCHAR(20) NOT NULL DEFAULT 'client',
  agent VARCHAR(120) NOT NULL DEFAULT '',
  contact VARCHAR(80) NOT NULL DEFAULT '',
  phone VARCHAR(40) NOT NULL DEFAULT '',
  address VARCHAR(240) NOT NULL DEFAULT '',
  permissions TEXT NULL,
  user_status VARCHAR(40) NOT NULL DEFAULT '已通过',
  review_comment TEXT NULL,
  reviewed_at DATETIME NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  session_version INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS roles (
  role_id VARCHAR(50) PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL DEFAULT '',
  role_type VARCHAR(20) NOT NULL DEFAULT 'admin',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id VARCHAR(50) NOT NULL,
  permission_code VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_role_permission (role_id, permission_code),
  INDEX idx_role_permissions_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS machines (
  machine_no VARCHAR(60) PRIMARY KEY,
  model VARCHAR(80) NOT NULL,
  customer VARCHAR(120) NOT NULL,
  agent VARCHAR(120) NOT NULL,
  factory_date DATE NULL,
  warranty_start DATE NULL,
  warranty_end DATE NULL,
  status VARCHAR(30) NOT NULL DEFAULT '正常',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_machines_agent (agent),
  INDEX idx_machines_customer (customer)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS materials (
  material_code VARCHAR(80) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(40) NOT NULL,
  spec VARCHAR(120) NOT NULL DEFAULT '',
  track_serial TINYINT(1) NOT NULL DEFAULT 1,
  default_warranty_months INT NOT NULL DEFAULT 12,
  source VARCHAR(40) NOT NULL DEFAULT '本系统新增',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_materials_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS material_instances (
  serial_no VARCHAR(100) PRIMARY KEY,
  material_code VARCHAR(80) NOT NULL,
  batch_no VARCHAR(80) NOT NULL DEFAULT '',
  flow_no VARCHAR(80) NOT NULL DEFAULT '',
  produced_at DATE NULL,
  status VARCHAR(30) NOT NULL DEFAULT '备用',
  source VARCHAR(40) NOT NULL DEFAULT '本系统新增',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_instances_material FOREIGN KEY (material_code) REFERENCES materials(material_code),
  INDEX idx_instances_material (material_code),
  INDEX idx_instances_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS machine_material_bindings (
  id VARCHAR(40) PRIMARY KEY,
  machine_no VARCHAR(60) NOT NULL,
  serial_no VARCHAR(100) NOT NULL,
  position VARCHAR(120) NOT NULL DEFAULT '',
  bound_at DATE NULL,
  unbound_at DATE NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  source VARCHAR(40) NOT NULL DEFAULT '人工新增',
  work_order_no VARCHAR(40) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bindings_machine FOREIGN KEY (machine_no) REFERENCES machines(machine_no),
  CONSTRAINT fk_bindings_instance FOREIGN KEY (serial_no) REFERENCES material_instances(serial_no),
  INDEX idx_bindings_machine (machine_no),
  INDEX idx_bindings_serial (serial_no),
  INDEX idx_bindings_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS repair_requests (
  request_no VARCHAR(40) PRIMARY KEY,
  account_id VARCHAR(40) NOT NULL DEFAULT '',
  source_channel VARCHAR(40) NOT NULL DEFAULT 'direct',
  agent VARCHAR(120) NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  contact VARCHAR(80) NOT NULL DEFAULT '',
  phone VARCHAR(40) NOT NULL DEFAULT '',
  address VARCHAR(240) NOT NULL DEFAULT '',
  machine_no VARCHAR(60) NOT NULL,
  requested_model_code VARCHAR(100) NOT NULL DEFAULT '',
  requested_model_name VARCHAR(120) NOT NULL DEFAULT '',
  fault_description TEXT NULL,
  send_method VARCHAR(40) NOT NULL DEFAULT '寄回',
  outbound_express_company VARCHAR(80) NOT NULL DEFAULT '',
  outbound_tracking_no VARCHAR(100) NOT NULL DEFAULT '',
  status VARCHAR(40) NOT NULL DEFAULT '待审核',
  work_order_no VARCHAR(40) NOT NULL DEFAULT '',
  audit_result VARCHAR(40) NULL,
  audit_department VARCHAR(80) NULL,
  audit_comment TEXT NULL,
  audit_operator VARCHAR(80) NULL,
  audit_manual_confirmed TINYINT(1) NOT NULL DEFAULT 0,
  supplement_requirements JSON NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_requests_status (status),
  INDEX idx_requests_account (account_id),
  INDEX idx_requests_source (source_channel),
  INDEX idx_requests_agent (agent),
  INDEX idx_requests_machine (machine_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS repair_request_items (
  id VARCHAR(60) PRIMARY KEY,
  request_no VARCHAR(40) NOT NULL,
  serial_no VARCHAR(100) NOT NULL,
  material_type VARCHAR(40) NOT NULL DEFAULT '',
  material_name VARCHAR(120) NOT NULL DEFAULT '',
  spec VARCHAR(120) NOT NULL DEFAULT '',
  board_no VARCHAR(100) NOT NULL DEFAULT '',
  service_type VARCHAR(40) NOT NULL DEFAULT '维修',
  fault_phenomenon TEXT NULL,
  binding_status VARCHAR(40) NOT NULL DEFAULT '',
  warranty_result VARCHAR(40) NOT NULL DEFAULT '',
  warranty_scope VARCHAR(40) NOT NULL DEFAULT '',
  warranty_suggestion VARCHAR(120) NOT NULL DEFAULT '',
  verification_detail JSON NULL,
  CONSTRAINT fk_request_items_request FOREIGN KEY (request_no) REFERENCES repair_requests(request_no) ON DELETE CASCADE,
  INDEX idx_request_items_request (request_no),
  INDEX idx_request_items_serial (serial_no),
  INDEX idx_request_items_warranty (warranty_result)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS file_attachments (
  id VARCHAR(40) PRIMARY KEY,
  biz_type VARCHAR(40) NOT NULL,
  biz_no VARCHAR(60) NOT NULL,
  file_name VARCHAR(160) NOT NULL,
  file_url VARCHAR(260) NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'other',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attachments_biz (biz_type, biz_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS work_orders (
  work_order_no VARCHAR(40) PRIMARY KEY,
  request_no VARCHAR(40) NOT NULL,
  department VARCHAR(80) NOT NULL,
  repair_person VARCHAR(80) NOT NULL DEFAULT '',
  status VARCHAR(40) NOT NULL DEFAULT '待接单',
  detection_result TEXT NULL,
  repair_plan TEXT NULL,
  repair_result VARCHAR(80) NOT NULL DEFAULT '',
  replaced TINYINT(1) NOT NULL DEFAULT 0,
  completed_at DATETIME NULL,
  archived_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_work_orders_request FOREIGN KEY (request_no) REFERENCES repair_requests(request_no),
  INDEX idx_work_orders_request (request_no),
  INDEX idx_work_orders_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS replacement_records (
  id VARCHAR(40) PRIMARY KEY,
  work_order_no VARCHAR(40) NOT NULL,
  machine_no VARCHAR(60) NOT NULL,
  old_serial_no VARCHAR(100) NOT NULL,
  new_serial_no VARCHAR(100) NOT NULL,
  position VARCHAR(120) NOT NULL DEFAULT '',
  reason VARCHAR(240) NOT NULL DEFAULT '',
  component_changes TEXT NULL,
  operator VARCHAR(80) NOT NULL DEFAULT '',
  replaced_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_replacements_order FOREIGN KEY (work_order_no) REFERENCES work_orders(work_order_no) ON DELETE CASCADE,
  INDEX idx_replacements_order (work_order_no),
  INDEX idx_replacements_old (old_serial_no),
  INDEX idx_replacements_new (new_serial_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS logistics_records (
  id VARCHAR(40) PRIMARY KEY,
  work_order_no VARCHAR(40) NOT NULL,
  return_method VARCHAR(40) NOT NULL DEFAULT '快递',
  company VARCHAR(80) NOT NULL DEFAULT '',
  tracking_no VARCHAR(100) NOT NULL DEFAULT '',
  sent_at DATE NULL,
  receiver VARCHAR(80) NOT NULL DEFAULT '',
  phone VARCHAR(40) NOT NULL DEFAULT '',
  address VARCHAR(240) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_logistics_order FOREIGN KEY (work_order_no) REFERENCES work_orders(work_order_no) ON DELETE CASCADE,
  UNIQUE KEY uk_logistics_order (work_order_no),
  INDEX idx_logistics_tracking (tracking_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS v8_sync_tasks (
  id VARCHAR(40) PRIMARY KEY,
  source VARCHAR(80) NOT NULL,
  target VARCHAR(120) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT '成功',
  success_count INT NOT NULL DEFAULT 0,
  fail_count INT NOT NULL DEFAULT 0,
  summary TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sync_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS operation_logs (
  id VARCHAR(40) PRIMARY KEY,
  action VARCHAR(80) NOT NULL,
  operator VARCHAR(80) NOT NULL DEFAULT '系统',
  target_no VARCHAR(80) NOT NULL DEFAULT '',
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logs_target (target_no),
  INDEX idx_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
