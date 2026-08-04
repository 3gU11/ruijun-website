USE repair_system;

INSERT INTO users (id, name, role) VALUES
('u-admin', '系统管理员', '系统管理员'),
('u-agent', '上海瑞景代理商', '代理商'),
('u-review', '工厂审核员', '工厂审核员'),
('u-repair', '电器维修员', '维修人员')
ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role);

INSERT INTO machines (machine_no, model, customer, agent, factory_date, warranty_start, warranty_end, status) VALUES
('RJ-MC-2025-001', 'VMC850', '苏州安成精密', '上海瑞景代理商', '2025-03-12', '2025-03-12', '2027-03-11', '正常'),
('RJ-MC-2024-009', 'VMC1060', '无锡佳禾制造', '上海瑞景代理商', '2024-09-18', '2024-09-18', '2026-09-17', '正常'),
('RJ-MC-2023-018', 'VMC1160', '宁波华远机械', '杭州锐工代理商', '2023-01-20', '2023-01-20', '2025-01-19', '正常')
ON DUPLICATE KEY UPDATE model = VALUES(model), customer = VALUES(customer), agent = VALUES(agent), warranty_end = VALUES(warranty_end), status = VALUES(status);

INSERT INTO materials (material_code, name, type, spec, track_serial, default_warranty_months, source) VALUES
('MAT-MAIN-BOARD', '主控板', '板卡', 'MCB-850-A', 1, 24, 'V8'),
('MAT-IO-BOARD', 'IO板', '板卡', 'IO-24IN-16OUT', 1, 24, 'V8'),
('MAT-DRIVER-X', 'X轴驱动器', '驱动器', 'DRV-X-2.2KW', 1, 18, 'V8'),
('MAT-SPINDLE-MOTOR', '主轴电机', '电机', 'SPM-7.5KW', 1, 18, 'V8'),
('MAT-SENSOR-Z', 'Z轴限位传感器', '传感器', 'SNS-Z-LIMIT', 1, 12, '本系统新增')
ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), spec = VALUES(spec), default_warranty_months = VALUES(default_warranty_months);

INSERT INTO material_instances (serial_no, material_code, batch_no, flow_no, produced_at, status, source) VALUES
('PCB-850-0001', 'MAT-MAIN-BOARD', 'B202503', '0001', '2025-03-01', '在机', 'V8'),
('IO-850-0002', 'MAT-IO-BOARD', 'B202503', '0002', '2025-03-01', '在机', 'V8'),
('DRV-X-0008', 'MAT-DRIVER-X', 'D202502', '0008', '2025-02-20', '在机', 'V8'),
('SPM-750-0066', 'MAT-SPINDLE-MOTOR', 'M202409', '0066', '2024-09-01', '在机', 'V8'),
('PCB-OLD-018', 'MAT-MAIN-BOARD', 'B202212', '0018', '2022-12-18', '在机', 'V8'),
('PCB-SPARE-009', 'MAT-MAIN-BOARD', 'B202604', '0009', '2026-04-10', '备用', '本系统新增'),
('SNS-Z-0201', 'MAT-SENSOR-Z', 'S202604', '0201', '2026-04-11', '备用', '本系统新增')
ON DUPLICATE KEY UPDATE material_code = VALUES(material_code), status = VALUES(status), source = VALUES(source);

INSERT INTO machine_material_bindings (id, machine_no, serial_no, position, bound_at, active, source, work_order_no) VALUES
('BD-0001', 'RJ-MC-2025-001', 'PCB-850-0001', '电柜主控位', '2025-03-12', 1, 'V8', ''),
('BD-0002', 'RJ-MC-2025-001', 'DRV-X-0008', 'X轴驱动位', '2025-03-12', 1, 'V8', ''),
('BD-0003', 'RJ-MC-2025-001', 'IO-850-0002', '电柜IO位', '2025-03-12', 1, 'V8', ''),
('BD-0004', 'RJ-MC-2024-009', 'SPM-750-0066', '主轴电机', '2024-09-18', 1, 'V8', ''),
('BD-0005', 'RJ-MC-2023-018', 'PCB-OLD-018', '电柜主控位', '2023-01-20', 1, 'V8', '')
ON DUPLICATE KEY UPDATE machine_no = VALUES(machine_no), serial_no = VALUES(serial_no), position = VALUES(position), active = VALUES(active);

INSERT INTO repair_requests
(request_no, agent, customer_name, contact, phone, address, machine_no, fault_description, send_method, outbound_express_company, outbound_tracking_no, status, created_at)
VALUES
('RQ-0001', '上海瑞景代理商', '苏州安成精密', '王工', '13800000000', '苏州市工业园区', 'RJ-MC-2025-001', '主控板通讯异常，设备偶发停机', '寄回', '顺丰', 'SF100200300', '已生成工单', NOW()),
('RQ-0002', '杭州锐工代理商', '宁波华远机械', '李工', '13900000000', '宁波市北仑区', 'RJ-MC-2023-018', '旧设备主控板无法启动', '寄回', '德邦', 'DB445566', '待审核', NOW())
ON DUPLICATE KEY UPDATE status = VALUES(status), fault_description = VALUES(fault_description);

INSERT INTO repair_request_items
(id, request_no, serial_no, material_type, material_name, spec, fault_phenomenon, binding_status, warranty_result, warranty_suggestion)
VALUES
('RQ-0001-1', 'RQ-0001', 'PCB-850-0001', '板卡', '主控板', 'MCB-850-A', '通讯异常', '已绑定', '在保', '可按保修处理'),
('RQ-0002-1', 'RQ-0002', 'PCB-OLD-018', '板卡', '主控板', 'MCB-850-A', '无法启动', '已绑定', '出保', '维修可收费')
ON DUPLICATE KEY UPDATE warranty_result = VALUES(warranty_result), warranty_suggestion = VALUES(warranty_suggestion);

INSERT INTO work_orders
(work_order_no, request_no, department, repair_person, status, detection_result, repair_plan, repair_result, replaced, created_at)
VALUES
('WO-0001', 'RQ-0001', '电器维修', '电器维修员', '维修中', '已接单，待检测', '', '', 0, NOW())
ON DUPLICATE KEY UPDATE status = VALUES(status), repair_person = VALUES(repair_person);

UPDATE repair_requests SET work_order_no = 'WO-0001', audit_result = '通过', audit_department = '电器维修', audit_comment = '编号匹配，进入维修', audit_operator = '工厂审核员', reviewed_at = NOW()
WHERE request_no = 'RQ-0001';

INSERT INTO v8_sync_tasks (id, source, target, status, success_count, fail_count, summary, created_at) VALUES
('SYNC-0001', 'V8 示例数据', '基础档案', '成功', 20, 0, '初始化机床、物料、物料实例和绑定关系', NOW())
ON DUPLICATE KEY UPDATE success_count = VALUES(success_count), summary = VALUES(summary);

INSERT INTO operation_logs (id, action, operator, target_no, note, created_at) VALUES
('LOG-0001', '初始化示例数据', '系统', 'repair_system', '已写入第一期基础业务数据', NOW())
ON DUPLICATE KEY UPDATE note = VALUES(note);
