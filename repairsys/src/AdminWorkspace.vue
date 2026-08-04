<script setup>
import { computed, defineAsyncComponent, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus/es/components/message/index.mjs';
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs';
import 'element-plus/es/components/message/style/css';
import 'element-plus/es/components/message-box/style/css';
import { ArrowLeft, ArrowRight, Back, CircleCheck, Picture, Plus, Position, Refresh, Search } from '@element-plus/icons-vue';
import { api, apiAssetUrl } from './api';

const props = defineProps({
  initialAdmin: { type: Object, default: null }
});
const emit = defineEmits(['logout']);

const AdminMasterDataPanel = defineAsyncComponent(() => import('./admin/AdminMasterDataPanel.vue'));
const AdminReportsPanel = defineAsyncComponent(() => import('./admin/AdminReportsPanel.vue'));

const activeTab = ref('review');
const loading = ref(false);
const authLoading = ref(false);
const currentAdmin = ref(null);
const adminAuthMode = ref('login');
const detailView = ref('');
const detailCacheType = ref('');
const detailCacheRows = ref([]);
const overview = ref({ status: {}, warrantyStats: {}, byAgent: [], byMaterialType: {}, bySourceChannel: {}, recentLogs: [] });
const requests = ref([]);
const workOrders = ref([]);
const master = ref({ users: [], clientAccounts: [], adminUsers: [], machines: [], materials: [], materialInstances: [], bindings: [], logs: [] });
const syncTasks = ref([]);
const modelDictionary = ref([]);
const machineBindingSource = ref({ available: false, source: '', deliveryDateColumn: '', rows: [] });
const adminUsers = ref([]);
const roles = ref([]);
const rolePermissions = ref([]);
const permissionCatalog = ref([]);
const adminUserDialog = ref(false);
const permissionDialog = ref(false);
const selectedAdminUser = ref(null);
const selectedRoleId = ref('Admin');
const selectedRolePermissions = ref([]);

const adminLoginForm = reactive({ username: '', password: '' });
const adminRegisterForm = reactive({ username: '', password: '', name: '', role: 'Reviewer', contact: '', phone: '' });
const adminUserForm = reactive({ id: '', username: '', password: '', name: '', role: 'Reviewer', contact: '', phone: '', enabled: true, userStatus: '已通过', permissions: [] });

const auditDrawer = ref(false);
const selectedRequest = ref(null);
const auditForm = reactive({ result: '通过', department: '电器维修', comment: '编号匹配，进入维修部处理', operator: '工厂审核员' });

const resultDrawer = ref(false);
const logisticsDrawer = ref(false);
const selectedOrder = ref(null);
const resultForm = reactive({
  repairPerson: '电器维修员',
  detectionResult: '',
  repairPlan: '',
  repairResult: '已修复',
  replaced: false,
  repairReplaced: false,
  replacements: [{ oldSerialNo: '', newSerialNo: '', position: '电柜主控位', reason: '', componentChanges: [] }]
});
const issueDialog = ref(false);
const selectedIssueIndex = ref(-1);
const issueForm = reactive({ oldSerialNo: '', newSerialNo: '', position: '', reason: '', serviceType: '' });
const logisticsForm = reactive({
  returnMethod: '快递',
  company: '顺丰',
  trackingNo: '',
  sentAt: new Date().toISOString().slice(0, 10),
  receiver: '',
  phone: '',
  address: ''
});

const materialForm = reactive({ materialCode: 'MAT-NEW-', name: '', type: '板卡', spec: '', defaultWarrantyMonths: 12 });
const instanceForm = reactive({ serialNo: '', materialCode: 'MAT-MAIN-BOARD', batchNo: '', flowNo: '', status: '备用' });
const bindingForm = reactive({ machineNo: 'RJ-MC-2025-001', serialNo: 'PCB-SPARE-009', position: '电柜备用位', source: '人工新增' });
const syncForm = reactive({ source: 'V8 Excel 导入', target: '机床/物料/绑定关系', successCount: 0, failCount: 0, summary: '记录一次模拟同步任务' });
const requestFilters = reactive({ dateRange: [], keyword: '' });
const orderFilters = reactive({ dateRange: [], keyword: '' });
const accountFilters = reactive({ keyword: '' });
const adminAccountFilters = reactive({ keyword: '' });
const componentOptions = ['大芯片', '小芯片', '电容', '继电器', '接口座', '保险丝', '电源模块', '其他'];

const pendingRequests = computed(() => requests.value.filter((item) => item.status === '待审核'));
const activeOrders = computed(() => workOrders.value.filter((item) => !['已完成'].includes(item.status)));
const currentPermissions = computed(() => currentAdmin.value?.permissions || []);
const isAdmin = computed(() => currentAdmin.value?.username === 'admin' || currentAdmin.value?.role === 'Admin');
const clientAccounts = computed(() => master.value.clientAccounts || []);
const adminAccounts = computed(() => adminUsers.value);
const pendingAdminAccounts = computed(() => adminAccounts.value.filter((item) => item.userStatus === '待审核'));
const filteredClientAccounts = computed(() => {
  const keyword = accountFilters.keyword.trim().toLowerCase();
  if (!keyword) return clientAccounts.value;
  return clientAccounts.value.filter((item) =>
    [item.username, item.name, item.agent, item.contact, item.phone, item.address, item.userStatus, item.reviewComment]
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  );
});
const filteredAdminAccounts = computed(() => {
  const keyword = adminAccountFilters.keyword.trim().toLowerCase();
  if (!keyword) return adminAccounts.value;
  return adminAccounts.value.filter((item) =>
    [item.username, item.name, item.role, item.contact, item.phone, item.userStatus, permissionSummary(item.permissions)]
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  );
});
const permissionGroups = computed(() => {
  const groups = {};
  permissionCatalog.value.forEach((item) => {
    groups[item.group] = groups[item.group] || [];
    groups[item.group].push(item);
  });
  return Object.entries(groups).map(([name, items]) => ({ name, items }));
});
const filteredRequests = computed(() => {
  const keyword = requestFilters.keyword.trim().toLowerCase();
  const [startDate, endDate] = requestFilters.dateRange || [];
  return requests.value.filter((item) => {
    const createdDate = String(item.createdAt || '').slice(0, 10);
    const inDateRange = (!startDate || createdDate >= startDate) && (!endDate || createdDate <= endDate);
    if (!inDateRange) return false;
    if (!keyword) return true;
    const detailText = (item.details || [])
      .map((detail) => [detail.serialNo, detail.boardNo, detail.serviceType, detail.materialType, detail.materialName, detail.spec, detail.warrantyScope, detail.warrantyResult, detail.faultPhenomenon].join(' '))
      .join(' ');
    return [
      item.requestNo,
      item.agent,
      item.customerName,
      item.contact,
      item.phone,
      item.address,
      item.machineNo,
      sourceChannelLabel(item.sourceChannel),
      item.faultDescription,
      item.status,
      detailText
    ]
      .join(' ')
      .toLowerCase()
      .includes(keyword);
  });
});
const filteredWorkOrders = computed(() => {
  const keyword = orderFilters.keyword.trim().toLowerCase();
  const [startDate, endDate] = orderFilters.dateRange || [];
  return workOrders.value.filter((item) => {
    const createdDate = String(item.createdAt || '').slice(0, 10);
    const inDateRange = (!startDate || createdDate >= startDate) && (!endDate || createdDate <= endDate);
    if (!inDateRange) return false;
    if (!keyword) return true;
    const request = item.request || {};
    const replacementText = (item.replacements || [])
      .map((replacement) => [replacement.oldSerialNo, replacement.newSerialNo, replacement.position, replacement.reason, ...(replacement.componentChanges || [])].join(' '))
      .join(' ');
    return [
      item.workOrderNo,
      item.requestNo,
      item.department,
      item.repairPerson,
      item.status,
      item.detectionResult,
      item.repairPlan,
      item.repairResult,
      orderServiceSummary(item),
      item.logistics?.company,
      item.logistics?.trackingNo,
      request.customerName,
      request.machineNo,
      request.contact,
      request.phone,
      replacementText
    ]
      .join(' ')
      .toLowerCase()
      .includes(keyword);
  });
});
const detailRows = computed(() => detailCacheRows.value);
const detailIndex = computed(() => {
  const rows = detailRows.value;
  if (detailView.value === 'order') return rows.findIndex((item) => item.workOrderNo === selectedOrder.value?.workOrderNo);
  if (detailView.value === 'request') return rows.findIndex((item) => item.requestNo === selectedRequest.value?.requestNo);
  return -1;
});

function warrantyScopeTag(scope) {
  if (scope === '在保') return 'success';
  if (['不在保', '出保', '过保'].includes(scope)) return 'danger';
  if (['出库时间待补充', '待核验'].includes(scope)) return 'warning';
  return 'danger';
}

function warrantyScopes(row) {
  return Array.from(new Set((row.details || []).map((detail) => detail.warrantyResult || '待核验')));
}

function declaredWarrantyScopes(row) {
  return Array.from(new Set((row.details || []).map((detail) => detail.warrantyScope || '未申报')));
}

function verificationIssues(row) {
  return (row?.details || []).filter((detail) => detail.verification?.requiresManualReview);
}

function verificationNeedsRefresh(row) {
  if (!['待审核', '待补充资料'].includes(row?.status)) return false;
  const currentSource = machineBindingSource.value.source || 'local:v8-machine-bindings.snapshot';
  const currentVersion = String(machineBindingSource.value.snapshotVersion || '');
  return (row.details || []).some((detail) => {
    const verification = detail.verification;
    if (!verification) return true;
    if (verification.source === '申请人申报') return false;
    if (verification.source !== currentSource) return true;
    return Boolean(currentVersion) && verification.sourceVersion !== currentVersion;
  });
}

function verificationDetail(detail) {
  const verification = detail.verification || {};
  if (verification.reasonCode === 'BINDING_MISMATCH' && verification.actualMachineNos?.length) {
    return `档案中该零件绑定在：${verification.actualMachineNos.join('、')}`;
  }
  if (verification.binding) {
    return `${verification.binding.modelName || '未知机型'} / ${verification.binding.materialName || '未知物料'} / ${verification.binding.positionName || '未知位置'}`;
  }
  return detail.warrantySuggestion || '';
}

function serviceSummary(details = []) {
  return Array.from(new Set(details.map((detail) => detail.serviceType || '维修'))).join('、') || '维修';
}

function orderServiceSummary(order) {
  return serviceSummary(order.request?.details || []);
}

function orderActionLabel(order) {
  const summary = orderServiceSummary(order);
  if (summary.includes('直接替换')) return '替换登记';
  if (summary.includes('借用')) return '借用登记';
  return '维修登记';
}

function isIssueService(serviceType) {
  return ['借用', '直接替换'].includes(serviceType);
}

function hasIssueService(order) {
  return (order?.request?.details || []).some((detail) => isIssueService(detail.serviceType));
}

function hasRepairService(order) {
  return (order?.request?.details || []).some((detail) => detail.serviceType === '维修');
}

function isRepairReplacement(replacement) {
  return replacement.serviceType === '维修';
}

function replacementForDetail(detail) {
  return resultForm.replacements.find((item) => item.oldSerialNo === detail.boardNo || item.oldSerialNo === detail.serialNo);
}

function openIssueDialog(detail) {
  const index = resultForm.replacements.findIndex((item) => item.oldSerialNo === detail.boardNo || item.oldSerialNo === detail.serialNo);
  if (index < 0) return;
  selectedIssueIndex.value = index;
  Object.assign(issueForm, {
    oldSerialNo: resultForm.replacements[index].oldSerialNo,
    newSerialNo: resultForm.replacements[index].newSerialNo || '',
    position: resultForm.replacements[index].position || detail.materialName || '',
    reason: resultForm.replacements[index].reason || '',
    serviceType: detail.serviceType
  });
  issueDialog.value = true;
}

function saveIssueDialog() {
  if (!issueForm.newSerialNo) {
    ElMessage.warning('请填写寄出去的板号/零件编号');
    return;
  }
  const index = selectedIssueIndex.value;
  if (index >= 0) {
    Object.assign(resultForm.replacements[index], {
      oldSerialNo: issueForm.oldSerialNo,
      newSerialNo: issueForm.newSerialNo,
      position: issueForm.position,
      reason: issueForm.reason || issueForm.serviceType,
      componentChanges: []
    });
  }
  issueDialog.value = false;
}

function resetRequestFilters() {
  requestFilters.keyword = '';
  requestFilters.dateRange = [];
}

function resetOrderFilters() {
  orderFilters.keyword = '';
  orderFilters.dateRange = [];
}

function resetAccountFilters() {
  accountFilters.keyword = '';
}

function resetAdminAccountFilters() {
  adminAccountFilters.keyword = '';
}

function hasPermission(code) {
  return isAdmin.value || currentPermissions.value.includes(code);
}

function canSeeAny(...codes) {
  return codes.some((code) => hasPermission(code));
}

function firstAvailableTab() {
  if (hasPermission('REQUEST_REVIEW')) return 'review';
  if (hasPermission('CLIENT_ACCOUNT_AUDIT')) return 'accounts';
  if (hasPermission('WORK_ORDER')) return 'orders';
  if (hasPermission('ADMIN_USER_MANAGE')) return 'adminUsers';
  if (hasPermission('MASTER_DATA')) return 'master';
  if (hasPermission('REPORT_LOG')) return 'reports';
  return '';
}

function permissionForTab(tab) {
  const map = {
    review: 'REQUEST_REVIEW',
    accounts: 'CLIENT_ACCOUNT_AUDIT',
    adminUsers: 'ADMIN_USER_MANAGE',
    orders: 'WORK_ORDER',
    master: 'MASTER_DATA',
    reports: 'REPORT_LOG'
  };
  return map[tab] || '';
}

function permissionSummary(list = []) {
  if (!list.length) return '按角色模板';
  if (list.length === permissionCatalog.value.length) return '全部权限';
  return list.map((code) => permissionCatalog.value.find((item) => item.code === code)?.label || code).join('、');
}

function roleLabel(roleId) {
  const role = roles.value.find((item) => item.roleId === roleId);
  return role ? `${role.roleName || role.roleId} (${role.roleId})` : roleId;
}

function sourceChannelLabel(source) {
  return {
    direct: '直接访问',
    official_site: '官网',
    website_faq: '官网 FAQ',
    repair_portal_faq: '售后 FAQ'
  }[source] || '直接访问';
}

function permissionsForRole(roleId) {
  if (roleId === 'Admin') return permissionCatalog.value.map((item) => item.code);
  return rolePermissions.value.filter((item) => item.roleId === roleId).map((item) => item.permissionCode);
}

function loadAdminAuth() {
  currentAdmin.value = null;
}

function saveAdminAuth(user) {
  currentAdmin.value = user;
}

async function logoutAdmin() {
  try {
    await api.logout('admin');
  } catch {
    // Clear the local view even if the server session has already expired.
  }
  currentAdmin.value = null;
  requests.value = [];
  workOrders.value = [];
  adminUsers.value = [];
  emit('logout');
}

async function logoutAllAdmin() {
  try {
    await api.logoutAll();
    ElMessage.success('已退出所有设备');
  } catch (error) {
    ElMessage.error(error.message || '退出所有设备失败');
    return;
  }
  currentAdmin.value = null;
  requests.value = [];
  workOrders.value = [];
  adminUsers.value = [];
  emit('logout');
}

async function loadAuthOptions() {
  const data = await api.adminAuthOptions();
  roles.value = data.roles || [];
  rolePermissions.value = data.rolePermissions || [];
  permissionCatalog.value = data.permissionCatalog || [];
  selectedRoleId.value = roles.value[0]?.roleId || 'Admin';
  selectedRolePermissions.value = permissionsForRole(selectedRoleId.value);
}

async function submitAdminAuth() {
  authLoading.value = true;
  try {
    if (adminAuthMode.value === 'register') {
      await api.adminRegister(adminRegisterForm);
      ElMessage.success('后台注册申请已提交，请等待 admin 审核');
      adminAuthMode.value = 'login';
      adminRegisterForm.password = '';
      return;
    }
    const user = await api.adminLogin(adminLoginForm);
    saveAdminAuth(user);
    ElMessage.success(`登录成功：${user.name}`);
    await loadAll();
    activeTab.value = firstAvailableTab();
  } catch (error) {
    ElMessage.error(error.message || '登录失败');
  } finally {
    authLoading.value = false;
  }
}

function statusTag(status) {
  if (status === '已通过') return 'success';
  if (status === '待审核') return 'warning';
  if (status === '已驳回') return 'danger';
  if (['在保', '通过', '已修复', '已完成', '已寄回'].includes(status)) return 'success';
  if (['不在保', '出保', '过保'].includes(status)) return 'danger';
  if (['出库时间待补充', '待审核', '待接单', '待寄回', '维修中'].includes(status)) return 'warning';
  if (['未建档', '机床编号未找到', '机床和零件编号未找到', '零件编号未找到', '绑定不一致', '编号绑定不一致', '未绑定', '零件已解绑', '机型不一致', '物料信息不一致', '已驳回', '无法维修'].includes(status)) return 'danger';
  return 'info';
}

async function auditClientAccount(row, result) {
  let comment = '';
  if (result === '驳回') {
    try {
      const value = await ElMessageBox.prompt('请输入驳回原因', '驳回注册申请', {
        confirmButtonText: '驳回',
        cancelButtonText: '取消',
        inputPlaceholder: '例如：代理商信息不完整'
      });
      comment = value.value || '';
    } catch {
      return;
    }
  }
  await api.auditUser(row.id, { result, comment, operator: '后台管理' });
  ElMessage.success(result === '通过' ? '注册申请已通过' : '注册申请已驳回');
  await loadAll();
}

async function auditAdminAccount(row, result) {
  const payload = {
    result,
    role: row.role || 'Reviewer',
    permissions: row.permissions || permissionsForRole(row.role),
    operator: currentAdmin.value?.username || 'admin'
  };
  if (result === '驳回') {
    try {
      const value = await ElMessageBox.prompt('请输入驳回原因', '驳回后台注册申请', {
        confirmButtonText: '驳回',
        cancelButtonText: '取消'
      });
      payload.comment = value.value || '';
    } catch {
      return;
    }
  }
  await api.auditUser(row.id, payload);
  ElMessage.success(result === '通过' ? '后台账号已通过' : '后台账号已驳回');
  await loadAll();
}

function openCreateAdminUser() {
  Object.assign(adminUserForm, { id: '', username: '', password: '', name: '', role: roles.value[0]?.roleId || 'Reviewer', contact: '', phone: '', enabled: true, userStatus: '已通过', permissions: [] });
  adminUserDialog.value = true;
}

function openEditAdminUser(row) {
  selectedAdminUser.value = row;
  Object.assign(adminUserForm, {
    id: row.id,
    username: row.username,
    password: '',
    name: row.name,
    role: row.role,
    contact: row.contact || '',
    phone: row.phone || '',
    enabled: row.enabled !== false,
    userStatus: row.userStatus || '已通过',
    permissions: [...(row.permissions || [])]
  });
  adminUserDialog.value = true;
}

async function saveAdminUser() {
  if (!adminUserForm.username || !adminUserForm.name || (!adminUserForm.id && !adminUserForm.password)) {
    ElMessage.warning('账号、姓名和初始密码必填');
    return;
  }
  const payload = { ...adminUserForm, operator: currentAdmin.value?.username || 'admin' };
  if (!payload.password) delete payload.password;
  if (adminUserForm.id) {
    await api.updateAdminUser(adminUserForm.id, payload);
  } else {
    await api.createAdminUser(payload);
  }
  ElMessage.success('后台账号已保存');
  adminUserDialog.value = false;
  await loadAll();
}

function openPermissionDialog(row) {
  selectedAdminUser.value = row;
  Object.assign(adminUserForm, {
    id: row.id,
    username: row.username,
    password: '',
    name: row.name,
    role: row.role,
    contact: row.contact || '',
    phone: row.phone || '',
    enabled: row.enabled !== false,
    userStatus: row.userStatus || '已通过',
    permissions: [...(row.permissions?.length ? row.permissions : permissionsForRole(row.role))]
  });
  permissionDialog.value = true;
}

async function saveUserPermissions() {
  await api.updateAdminUser(adminUserForm.id, {
    role: adminUserForm.role,
    permissions: adminUserForm.permissions,
    operator: currentAdmin.value?.username || 'admin'
  });
  ElMessage.success('用户权限已保存');
  permissionDialog.value = false;
  await loadAll();
}

function selectRole(roleId) {
  selectedRoleId.value = roleId;
  selectedRolePermissions.value = permissionsForRole(roleId);
}

async function saveSelectedRolePermissions() {
  await api.saveRolePermissions(selectedRoleId.value, {
    permissions: selectedRolePermissions.value,
    operator: currentAdmin.value?.username || 'admin'
  });
  ElMessage.success('角色权限已保存');
  await loadAll();
  selectedRolePermissions.value = permissionsForRole(selectedRoleId.value);
}

async function loadAll() {
  if (!currentAdmin.value) return;
  loading.value = true;
  try {
    const [overviewData, requestData, orderData, masterData, syncData, models, bindingSource, adminUserData, roleData] = await Promise.all([
      hasPermission('REPORT_LOG') ? api.overview() : Promise.resolve({ status: {}, warrantyStats: {}, byAgent: [], byMaterialType: {}, bySourceChannel: {}, recentLogs: [] }),
      hasPermission('REQUEST_REVIEW') ? api.requests() : Promise.resolve([]),
      hasPermission('WORK_ORDER') ? api.workOrders() : Promise.resolve([]),
      api.masterData(),
      hasPermission('MASTER_DATA') ? api.syncTasks() : Promise.resolve([]),
      api.modelDictionary(),
      hasPermission('MASTER_DATA') ? api.machineComponentBindings() : Promise.resolve({ available: false, source: '', rows: [] }),
      hasPermission('ADMIN_USER_MANAGE') ? api.adminUsers() : Promise.resolve([]),
      isAdmin.value ? api.roles() : Promise.resolve({ roles: roles.value, rolePermissions: rolePermissions.value, permissionCatalog: permissionCatalog.value })
    ]);
    overview.value = overviewData;
    requests.value = requestData;
    workOrders.value = orderData;
    master.value = masterData;
    syncTasks.value = syncData;
    modelDictionary.value = models;
    machineBindingSource.value = bindingSource;
    adminUsers.value = adminUserData || [];
    roles.value = roleData.roles || masterData.roles || [];
    rolePermissions.value = roleData.rolePermissions || masterData.rolePermissions || [];
    permissionCatalog.value = roleData.permissionCatalog || masterData.permissionCatalog || [];
  } finally {
    loading.value = false;
  }
}

function cacheDetailRows(type) {
  detailCacheType.value = type;
  detailCacheRows.value = type === 'order' ? [...filteredWorkOrders.value] : [...filteredRequests.value];
}

async function openAudit(row, keepCache = false) {
  if (!keepCache || detailCacheType.value !== 'request') cacheDetailRows('request');
  let current = row;
  if (verificationNeedsRefresh(row)) {
    try {
      current = await api.recheckRequest(row.requestNo, { operator: currentAdmin.value?.name || '工厂审核员' });
      const requestIndex = requests.value.findIndex((item) => item.requestNo === current.requestNo);
      if (requestIndex >= 0) requests.value[requestIndex] = current;
      const cacheIndex = detailCacheRows.value.findIndex((item) => item.requestNo === current.requestNo);
      if (cacheIndex >= 0) detailCacheRows.value[cacheIndex] = current;
    } catch (error) {
      ElMessage.error(error.message || '重新核验编号失败');
    }
  }
  selectedRequest.value = current;
  detailView.value = 'request';
  activeTab.value = 'review';
  auditDrawer.value = false;
}

function closeDetail() {
  detailView.value = '';
}

function goAdjacentDetail(offset) {
  const rows = detailRows.value;
  const nextIndex = detailIndex.value + offset;
  if (nextIndex < 0 || nextIndex >= rows.length) return;
  if (detailView.value === 'order') openResult(rows[nextIndex], true);
  if (detailView.value === 'request') openAudit(rows[nextIndex], true);
}

async function submitAudit(result) {
  if (!selectedRequest.value) return;
  auditForm.result = result;
  if (result === '驳回' && !auditForm.comment) {
    ElMessage.warning('驳回时需要填写审核意见');
    return;
  }
  const payload = { ...auditForm };
  if (result === '补充资料') {
    payload.requirements = ['machine_nameplate', 'component_serial'];
    payload.comment = payload.comment || '编号或绑定资料异常，请补充机床铭牌和零件编号照片后重新提交';
  }
  await api.auditRequest(selectedRequest.value.requestNo, payload);
  ElMessage.success(result === '通过' ? '已生成维修工单' : '审核结果已保存');
  auditDrawer.value = false;
  detailView.value = '';
  await loadAll();
  activeTab.value = result === '通过' ? 'orders' : 'review';
}

async function acceptOrder(order) {
  await api.acceptWorkOrder(order.workOrderNo, { repairPerson: resultForm.repairPerson });
  ElMessage.success('已接单');
  await loadAll();
}

function openResult(order, keepCache = false) {
  if (!keepCache || detailCacheType.value !== 'order') cacheDetailRows('order');
  selectedOrder.value = order;
  resultForm.repairPerson = order.repairPerson || '电器维修员';
  resultForm.detectionResult = order.detectionResult || '';
  resultForm.repairPlan = order.repairPlan || '';
  resultForm.repairResult = order.repairResult || (orderServiceSummary(order).includes('直接替换') ? '已替换' : '已修复');
  const details = order.request?.details || [];
  const existingReplacements = new Map((order.replacements || []).map((item) => [item.oldSerialNo, item]));
  resultForm.replacements = details.map((detail) => {
    const existing = existingReplacements.get(detail.boardNo) || existingReplacements.get(detail.serialNo) || {};
    return {
      oldSerialNo: existing.oldSerialNo || detail.boardNo || detail.serialNo || '',
      newSerialNo: existing.newSerialNo || '',
      position: existing.position || detail.materialName || '维修更换位',
      reason: existing.reason || detail.faultPhenomenon || '',
      serviceType: detail.serviceType || '维修',
      componentChanges: existing.componentChanges || []
    };
  });
  (order.replacements || []).forEach((item) => {
    if (!resultForm.replacements.some((replacement) => replacement.oldSerialNo === item.oldSerialNo)) {
      resultForm.replacements.push({
        oldSerialNo: item.oldSerialNo || '',
        newSerialNo: item.newSerialNo || '',
        position: item.position || '维修更换位',
        reason: item.reason || '',
        serviceType: item.serviceType || '维修',
        componentChanges: item.componentChanges || []
      });
    }
  });
  if (!resultForm.replacements.length) {
    resultForm.replacements = [{ oldSerialNo: '', newSerialNo: '', position: '维修更换位', reason: '', serviceType: '维修', componentChanges: [] }];
  }
  resultForm.repairReplaced = resultForm.replacements.some((item) => item.serviceType === '维修' && (item.newSerialNo || item.componentChanges?.length));
  resultForm.replaced = hasIssueService(order) || resultForm.repairReplaced || Boolean(order.replaced);
  detailView.value = 'order';
  activeTab.value = 'orders';
  resultDrawer.value = false;
}

async function submitRepairResult() {
  if (!selectedOrder.value) return;
  const missingIssueSerial = resultForm.replacements.some((item) => isIssueService(item.serviceType) && !item.newSerialNo);
  if (missingIssueSerial) {
    ElMessage.warning('借用/直接替换需要在明细里填写寄出去的板号或零件编号');
    return;
  }
  const hasWarrantyRepairReplacement = resultForm.repairReplaced && (selectedOrder.value.request?.details || []).some((detail) => detail.serviceType === '维修' && detail.warrantyResult === '在保');
  const missingRepairSerial = resultForm.replacements.some((item) => item.serviceType === '维修' && item.oldSerialNo && !item.newSerialNo);
  if (hasWarrantyRepairReplacement && missingRepairSerial) {
    ElMessage.warning('保内维修更换零件时必须填写新的板号或零件编号，系统会据此更新基础资料');
    return;
  }
  const replacements = resultForm.replacements.filter((item) => {
    if (isIssueService(item.serviceType)) return Boolean(item.newSerialNo);
    return resultForm.repairReplaced && Boolean(item.oldSerialNo) && (Boolean(item.newSerialNo) || Boolean(item.reason) || Boolean(item.componentChanges?.length));
  });
  await api.repairResult(selectedOrder.value.workOrderNo, {
    repairPerson: resultForm.repairPerson,
    detectionResult: resultForm.detectionResult,
    repairPlan: resultForm.repairPlan,
    repairResult: resultForm.repairResult,
    replaced: replacements.length > 0,
    replacements
  });
  ElMessage.success('维修结果已登记');
  resultDrawer.value = false;
  await loadAll();
}

function openLogistics(order) {
  selectedOrder.value = order;
  logisticsForm.receiver = order.request?.contact || '';
  logisticsForm.phone = order.request?.phone || '';
  logisticsForm.address = order.request?.address || '';
  logisticsDrawer.value = true;
}

async function submitLogistics() {
  if (!selectedOrder.value) return;
  await api.logistics(selectedOrder.value.workOrderNo, logisticsForm);
  ElMessage.success('寄回物流已登记');
  logisticsDrawer.value = false;
  await loadAll();
}

async function archiveOrder(order) {
  await ElMessageBox.confirm(`确认归档工单 ${order.workOrderNo}？`, '归档确认', { type: 'warning' });
  await api.archive(order.workOrderNo, { operator: '系统管理员' });
  ElMessage.success('工单已归档');
  await loadAll();
}

async function createMaterial() {
  await api.createMaterial(materialForm);
  ElMessage.success('物料档案已新增');
  materialForm.materialCode = 'MAT-NEW-';
  materialForm.name = '';
  materialForm.spec = '';
  await loadAll();
}

async function createInstance() {
  await api.createInstance(instanceForm);
  ElMessage.success('物料实例已新增');
  instanceForm.serialNo = '';
  instanceForm.batchNo = '';
  instanceForm.flowNo = '';
  await loadAll();
}

async function createBinding() {
  await api.createBinding(bindingForm.machineNo, bindingForm);
  ElMessage.success('绑定关系已新增');
  await loadAll();
}

async function createSyncTask() {
  await api.createSyncTask(syncForm);
  ElMessage.success('同步任务已记录');
  await loadAll();
}

onMounted(async () => {
  loadAdminAuth();
  await loadAuthOptions();
  try {
    const user = props.initialAdmin || await api.me('admin');
    saveAdminAuth(user);
    await loadAll();
    if (!activeTab.value || !hasPermission(permissionForTab(activeTab.value))) {
      activeTab.value = firstAvailableTab();
    }
  } catch {
    currentAdmin.value = null;
  }
});
</script>

<template>
  <div class="app-shell" v-loading="loading">
    <section v-if="!currentAdmin" class="admin-auth-page">
      <div class="auth-copy">
        <h2>维修后台登录</h2>
        <p>后台账号由 admin 审核，审核通过后按身份和权限进入对应功能。</p>
      </div>
      <div class="auth-card">
        <el-radio-group v-model="adminAuthMode" class="auth-mode">
          <el-radio-button label="login">登录</el-radio-button>
          <el-radio-button label="register">注册申请</el-radio-button>
        </el-radio-group>
        <el-form label-position="top">
          <template v-if="adminAuthMode === 'login'">
            <el-form-item label="账号"><el-input v-model="adminLoginForm.username" /></el-form-item>
            <el-form-item label="密码"><el-input v-model="adminLoginForm.password" type="password" show-password @keyup.enter="submitAdminAuth" /></el-form-item>
          </template>
          <template v-else>
            <el-form-item label="账号"><el-input v-model="adminRegisterForm.username" /></el-form-item>
            <el-form-item label="密码"><el-input v-model="adminRegisterForm.password" type="password" show-password /></el-form-item>
            <el-form-item label="姓名"><el-input v-model="adminRegisterForm.name" /></el-form-item>
            <el-form-item label="申请身份">
              <el-select v-model="adminRegisterForm.role" style="width: 100%">
                <el-option v-for="role in roles" :key="role.roleId" :label="roleLabel(role.roleId)" :value="role.roleId" />
              </el-select>
            </el-form-item>
            <div class="form-row compact">
              <el-form-item label="电话"><el-input v-model="adminRegisterForm.phone" /></el-form-item>
              <el-form-item label="备注/岗位"><el-input v-model="adminRegisterForm.contact" /></el-form-item>
            </div>
          </template>
          <el-button type="primary" size="large" :loading="authLoading" @click="submitAdminAuth">{{ adminAuthMode === 'login' ? '登录后台' : '提交注册申请' }}</el-button>
        </el-form>
      </div>
    </section>

    <header v-if="currentAdmin" class="topbar admin-topbar">
      <div class="brand">
        <h1>维修后台管理</h1>
        <span>{{ currentAdmin.name }} / {{ roleLabel(currentAdmin.role) }}</span>
      </div>
      <div class="top-actions">
        <a class="plain-link dark" href="/client.html">客户端申请入口</a>
        <a class="plain-link dark" href="/">入口页</a>
        <el-button text @click="logoutAllAdmin">退出所有设备</el-button>
        <el-button @click="logoutAdmin">退出</el-button>
        <el-button :icon="Refresh" @click="loadAll">刷新</el-button>
      </div>
    </header>

    <main v-if="currentAdmin" class="content">
      <section class="kpi-grid">
        <div class="kpi"><div class="kpi-label">今日新增申请</div><div class="kpi-value">{{ overview.status.todayNew || 0 }}</div></div>
        <div class="kpi"><div class="kpi-label">待审核</div><div class="kpi-value">{{ overview.status.pendingReview || 0 }}</div></div>
        <div class="kpi"><div class="kpi-label">维修中</div><div class="kpi-value">{{ overview.status.repairing || 0 }}</div></div>
        <div class="kpi"><div class="kpi-label">待寄回</div><div class="kpi-value">{{ overview.status.pendingReturn || 0 }}</div></div>
        <div class="kpi"><div class="kpi-label">已完成</div><div class="kpi-value">{{ overview.status.completed || 0 }}</div></div>
      </section>

      <section class="status-flow nav-flow">
        <div class="flow-step"><strong>1 客户申请</strong>客户端提交</div>
        <div class="flow-step"><strong>2 工厂审核</strong>判断是否受理</div>
        <div class="flow-step"><strong>3 生成工单</strong>分配维修部门</div>
        <div class="flow-step"><strong>4 维修处理</strong>检测和结果登记</div>
        <div class="flow-step"><strong>5 寄回物流</strong>填写物流单号</div>
        <div class="flow-step"><strong>6 归档报表</strong>追溯和统计</div>
      </section>

      <section v-if="detailView === 'request' && selectedRequest" class="detail-page">
        <div class="detail-page-head">
          <div>
            <el-button class="detail-back-button" :icon="Back" @click="closeDetail">返回列表</el-button>
            <h2>{{ selectedRequest.requestNo }} · {{ selectedRequest.customerName }}</h2>
            <p>当前第 {{ detailIndex + 1 }} / {{ detailRows.length }} 单，基于外面列表当前检索结果翻页</p>
          </div>
          <div class="detail-page-actions">
            <el-button class="detail-nav-button" :icon="ArrowLeft" @click="goAdjacentDetail(-1)" :disabled="detailIndex <= 0">上一单</el-button>
            <el-button class="detail-nav-button" @click="goAdjacentDetail(1)" :disabled="detailIndex < 0 || detailIndex >= detailRows.length - 1">下一单<el-icon class="el-icon--right"><ArrowRight /></el-icon></el-button>
          </div>
        </div>
        <div class="detail-page-body">
          <div class="panel">
            <div class="section-title"><h2>申请信息</h2></div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="机床编号">{{ selectedRequest.machineNo }}</el-descriptions-item>
              <el-descriptions-item label="申请来源">{{ sourceChannelLabel(selectedRequest.sourceChannel) }}</el-descriptions-item>
              <el-descriptions-item label="服务方式">{{ serviceSummary(selectedRequest.details) }}</el-descriptions-item>
              <el-descriptions-item label="申请人申报">
                <el-space wrap><el-tag v-for="scope in declaredWarrantyScopes(selectedRequest)" :key="scope" :type="warrantyScopeTag(scope)">{{ scope }}</el-tag></el-space>
              </el-descriptions-item>
              <el-descriptions-item label="系统核验">
                <el-space wrap><el-tag v-for="scope in warrantyScopes(selectedRequest)" :key="scope" :type="statusTag(scope)">{{ scope }}</el-tag></el-space>
              </el-descriptions-item>
              <el-descriptions-item label="状态"><el-tag :type="statusTag(selectedRequest.status)">{{ selectedRequest.status }}</el-tag></el-descriptions-item>
              <el-descriptions-item label="故障描述" :span="2">{{ selectedRequest.faultDescription }}</el-descriptions-item>
            </el-descriptions>
          </div>
          <div class="panel">
            <div class="section-title"><h2>申请明细</h2></div>
            <el-table :data="selectedRequest.details">
              <el-table-column prop="serviceType" label="服务" width="90" />
              <el-table-column prop="boardNo" label="板号" min-width="130" />
              <el-table-column prop="materialName" label="物料" />
              <el-table-column prop="faultPhenomenon" label="故障/诉求" min-width="180" />
              <el-table-column label="申报保修"><template #default="{ row }"><el-tag :type="warrantyScopeTag(row.warrantyScope)">{{ row.warrantyScope }}</el-tag></template></el-table-column>
              <el-table-column label="系统判断"><template #default="{ row }"><el-tag :type="statusTag(row.warrantyResult)">{{ row.warrantyResult }}</el-tag></template></el-table-column>
            </el-table>
            <div v-if="verificationIssues(selectedRequest).length" class="verification-alerts">
              <el-alert
                v-for="detail in verificationIssues(selectedRequest)"
                :key="detail.id"
                type="error"
                show-icon
                :closable="false"
                :title="`${detail.boardNo || detail.serialNo}：${detail.warrantyResult}`"
                :description="verificationDetail(detail)"
              />
            </div>
          </div>
          <div v-if="selectedRequest.attachments?.length" class="panel">
            <div class="section-title"><h2>编号核对照片</h2></div>
            <div class="verification-photo-list">
              <div v-for="photo in selectedRequest.attachments" :key="photo.id || photo.url" class="verification-photo">
                <el-image :src="apiAssetUrl(photo.url)" :preview-src-list="selectedRequest.attachments.map((item) => apiAssetUrl(item.url))" fit="cover" preview-teleported />
                <span>{{ photo.category === 'machine_nameplate' ? '机床铭牌' : photo.category === 'component_serial' ? '零件编号' : photo.name }}</span>
              </div>
            </div>
          </div>
          <div v-if="selectedRequest.status === '待审核'" class="panel">
            <div class="section-title"><h2>审核处理</h2></div>
            <el-form label-position="top">
              <el-form-item label="维修部门"><el-select v-model="auditForm.department"><el-option label="电器维修" value="电器维修" /><el-option label="机械维修" value="机械维修" /><el-option label="研发处理" value="研发处理" /></el-select></el-form-item>
              <el-form-item label="审核意见"><el-input v-model="auditForm.comment" type="textarea" :rows="4" /></el-form-item>
            </el-form>
            <div class="inline-actions audit-actions"><el-button type="warning" :icon="Picture" @click="submitAudit('补充资料')">要求补充照片</el-button><el-button type="danger" @click="submitAudit('驳回')">驳回</el-button><el-button type="primary" @click="submitAudit('通过')">通过并生成工单</el-button></div>
          </div>
        </div>
      </section>

      <section v-if="detailView === 'order' && selectedOrder" class="detail-page">
        <div class="detail-page-head">
          <div>
            <el-button class="detail-back-button" :icon="Back" @click="closeDetail">返回列表</el-button>
            <h2>{{ selectedOrder.workOrderNo }} · {{ selectedOrder.request?.customerName }}</h2>
            <p>当前第 {{ detailIndex + 1 }} / {{ detailRows.length }} 单，基于外面列表当前检索结果翻页</p>
          </div>
          <div class="detail-page-actions">
            <el-button class="detail-nav-button" :icon="ArrowLeft" @click="goAdjacentDetail(-1)" :disabled="detailIndex <= 0">上一单</el-button>
            <el-button class="detail-nav-button" @click="goAdjacentDetail(1)" :disabled="detailIndex < 0 || detailIndex >= detailRows.length - 1">下一单<el-icon class="el-icon--right"><ArrowRight /></el-icon></el-button>
          </div>
        </div>
        <el-form class="detail-page-body" label-position="top">
          <div class="panel">
            <div class="section-title"><h2>工单信息</h2></div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="来源申请">{{ selectedOrder.requestNo }}</el-descriptions-item>
              <el-descriptions-item label="服务方式">{{ orderServiceSummary(selectedOrder) }}</el-descriptions-item>
              <el-descriptions-item label="保修概览">
                <el-space wrap><el-tag v-for="scope in warrantyScopes(selectedOrder.request || {})" :key="scope" :type="statusTag(scope)">{{ scope }}</el-tag></el-space>
              </el-descriptions-item>
              <el-descriptions-item label="联系电话">{{ selectedOrder.request?.phone }}</el-descriptions-item>
              <el-descriptions-item label="机床编号">{{ selectedOrder.request?.machineNo }}</el-descriptions-item>
              <el-descriptions-item label="状态"><el-tag :type="statusTag(selectedOrder.status)">{{ selectedOrder.status }}</el-tag></el-descriptions-item>
            </el-descriptions>
          </div>
          <div class="panel">
            <div class="section-title"><h2>客户申请明细</h2></div>
            <el-table :data="selectedOrder.request?.details || []">
              <el-table-column prop="serviceType" label="服务" width="90" />
              <el-table-column prop="boardNo" label="原板号" min-width="130" />
              <el-table-column prop="materialName" label="物料" min-width="120" />
              <el-table-column prop="faultPhenomenon" label="故障/诉求" min-width="180" />
              <el-table-column label="系统保修"><template #default="{ row }"><el-tag :type="statusTag(row.warrantyResult)">{{ row.warrantyResult }}</el-tag></template></el-table-column>
              <el-table-column label="寄出板号" min-width="170">
                <template #default="{ row }">
                  <template v-if="isIssueService(row.serviceType)">
                    <el-button size="small" @click="openIssueDialog(row)">{{ replacementForDetail(row)?.newSerialNo || '填写寄出板号' }}</el-button>
                  </template>
                  <span v-else class="muted">维修处理</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div class="panel">
            <div class="section-title"><h2>处理登记</h2></div>
            <el-form-item label="维修人员"><el-input v-model="resultForm.repairPerson" /></el-form-item>
            <el-form-item label="检测结果"><el-input v-model="resultForm.detectionResult" type="textarea" :rows="3" /></el-form-item>
            <el-form-item label="维修方案"><el-input v-model="resultForm.repairPlan" type="textarea" :rows="3" /></el-form-item>
            <el-form-item label="处理结果"><el-select v-model="resultForm.repairResult"><el-option label="已修复" value="已修复" /><el-option label="已替换" value="已替换" /><el-option label="已借用" value="已借用" /><el-option label="无法维修" value="无法维修" /><el-option label="检测无故障" value="检测无故障" /><el-option label="转研发处理" value="转研发处理" /></el-select></el-form-item>
            <el-form-item v-if="hasRepairService(selectedOrder)" label="维修中是否更换零件"><el-switch v-model="resultForm.repairReplaced" /></el-form-item>
            <div v-if="hasRepairService(selectedOrder) && resultForm.repairReplaced" class="replacement-list">
              <div v-for="(replacement, index) in resultForm.replacements.filter(isRepairReplacement)" :key="index" class="replacement-card">
                <div class="form-row">
                  <el-input v-model="replacement.oldSerialNo" placeholder="旧板号/旧件编号" />
                  <el-input v-model="replacement.newSerialNo" placeholder="新板号/新件编号（保内换板必填）" />
                  <el-input v-model="replacement.position" placeholder="安装位置/物料名称" />
                  <el-input v-model="replacement.reason" placeholder="更换原因" />
                </div>
                <el-checkbox-group v-model="replacement.componentChanges" class="component-checks">
                  <el-checkbox v-for="option in componentOptions" :key="option" :label="option" />
                </el-checkbox-group>
              </div>
            </div>
            <div class="inline-actions" style="margin-top: 14px"><el-button type="primary" :icon="CircleCheck" @click="submitRepairResult">保存维修结果</el-button></div>
          </div>
        </el-form>
      </section>

      <section v-show="!detailView" class="workspace">
        <el-tabs v-model="activeTab">
          <el-tab-pane v-if="hasPermission('REQUEST_REVIEW')" label="工厂审核" name="review">
            <div class="tab-body">
              <div class="section-title"><div><h2>维修申请列表</h2><p>审核时可查看系统给出的保修和绑定提示</p></div></div>
              <div class="table-toolbar">
                <el-input v-model="requestFilters.keyword" :prefix-icon="Search" clearable placeholder="搜索单号、客户、机床、物料、状态" />
                <div class="toolbar-right">
                  <el-date-picker
                    v-model="requestFilters.dateRange"
                    type="daterange"
                    value-format="YYYY-MM-DD"
                    range-separator="至"
                    start-placeholder="开始"
                    end-placeholder="结束"
                  />
                  <el-button @click="resetRequestFilters">重置检索</el-button>
                </div>
              </div>
              <el-table :data="filteredRequests" row-key="requestNo" @row-dblclick="openAudit">
                <el-table-column prop="requestNo" label="申请单" width="160" />
                <el-table-column prop="agent" label="代理商" min-width="150" />
                <el-table-column prop="customerName" label="客户" min-width="140" />
                <el-table-column prop="machineNo" label="机床编号" min-width="150" />
                <el-table-column label="来源" width="100"><template #default="{ row }">{{ sourceChannelLabel(row.sourceChannel) }}</template></el-table-column>
                <el-table-column label="服务方式" width="130"><template #default="{ row }">{{ serviceSummary(row.details) }}</template></el-table-column>
                <el-table-column label="系统核验" min-width="190"><template #default="{ row }"><el-space wrap><el-tag v-for="scope in warrantyScopes(row)" :key="scope" :type="statusTag(scope)">{{ scope }}</el-tag></el-space></template></el-table-column>
                <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="statusTag(row.status)">{{ row.status }}</el-tag></template></el-table-column>
                <el-table-column label="操作" width="100" fixed="right"><template #default="{ row }"><el-button size="small" type="primary" @click="openAudit(row)">{{ row.status === '待审核' ? '审核' : '详情' }}</el-button></template></el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <el-tab-pane v-if="hasPermission('CLIENT_ACCOUNT_AUDIT')" :label="`客户端注册审核${clientAccounts.filter((item) => item.userStatus === '待审核').length ? ' (' + clientAccounts.filter((item) => item.userStatus === '待审核').length + ')' : ''}`" name="accounts">
            <div class="tab-body">
              <div class="section-title"><div><h2>客户端注册申请</h2><p>代理商账号在这里审核，通过后才能登录客户端提交维修申请</p></div></div>
              <div class="table-toolbar">
                <el-input v-model="accountFilters.keyword" :prefix-icon="Search" clearable placeholder="搜索账号、代理商、联系人、电话、地址、状态" />
                <div class="toolbar-right">
                  <el-button @click="resetAccountFilters">重置检索</el-button>
                </div>
              </div>
              <el-table :data="filteredClientAccounts" row-key="id">
                <el-table-column prop="username" label="账号" width="140" />
                <el-table-column prop="agent" label="代理商" min-width="160" />
                <el-table-column prop="name" label="账号名称" min-width="140" />
                <el-table-column prop="contact" label="联系人" width="110" />
                <el-table-column prop="phone" label="电话" width="130" />
                <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip />
                <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="statusTag(row.userStatus)">{{ row.userStatus || '已通过' }}</el-tag></template></el-table-column>
                <el-table-column prop="reviewComment" label="审核意见" min-width="160" show-overflow-tooltip />
                <el-table-column prop="createdAt" label="注册时间" width="170" />
                <el-table-column label="操作" width="170" fixed="right">
                  <template #default="{ row }">
                    <el-button size="small" type="primary" :disabled="row.userStatus === '已通过'" @click="auditClientAccount(row, '通过')">通过</el-button>
                    <el-button size="small" type="danger" :disabled="row.userStatus === '已驳回'" @click="auditClientAccount(row, '驳回')">驳回</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <el-tab-pane v-if="hasPermission('ADMIN_USER_MANAGE')" :label="`后台账号权限${pendingAdminAccounts.length ? ' (' + pendingAdminAccounts.length + ')' : ''}`" name="adminUsers">
            <div class="tab-body">
              <div class="section-title">
                <div><h2>后台账号与权限</h2><p>admin 可审核后台账号、分配身份和功能权限</p></div>
                <el-button v-if="hasPermission('ADMIN_USER_MANAGE')" type="primary" :icon="Plus" @click="openCreateAdminUser">新增后台账号</el-button>
              </div>
              <div class="table-toolbar">
                <el-input v-model="adminAccountFilters.keyword" :prefix-icon="Search" clearable placeholder="搜索账号、姓名、身份、权限、状态" />
                <div class="toolbar-right"><el-button @click="resetAdminAccountFilters">重置检索</el-button></div>
              </div>
              <el-table :data="filteredAdminAccounts" row-key="id">
                <el-table-column prop="username" label="账号" width="130" />
                <el-table-column prop="name" label="姓名" width="130" />
                <el-table-column label="身份" min-width="150"><template #default="{ row }">{{ roleLabel(row.role) }}</template></el-table-column>
                <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="statusTag(row.userStatus)">{{ row.userStatus }}</el-tag></template></el-table-column>
                <el-table-column label="启用" width="80"><template #default="{ row }"><el-tag :type="row.enabled === false ? 'info' : 'success'">{{ row.enabled === false ? '停用' : '启用' }}</el-tag></template></el-table-column>
                <el-table-column label="权限" min-width="260" show-overflow-tooltip><template #default="{ row }">{{ permissionSummary(row.permissions) }}</template></el-table-column>
                <el-table-column prop="createdAt" label="注册时间" width="170" />
                <el-table-column label="操作" width="260" fixed="right">
                  <template #default="{ row }">
                    <el-button size="small" type="success" :disabled="row.userStatus === '已通过'" @click="auditAdminAccount(row, '通过')">通过</el-button>
                    <el-button size="small" type="danger" :disabled="row.username === 'admin' || row.userStatus === '已驳回'" @click="auditAdminAccount(row, '驳回')">驳回</el-button>
                    <el-button size="small" @click="openEditAdminUser(row)">编辑</el-button>
                    <el-button size="small" type="primary" @click="openPermissionDialog(row)">权限</el-button>
                  </template>
                </el-table-column>
              </el-table>

              <div v-if="hasPermission('PERMISSION_MANAGE')" class="panel" style="margin-top: 14px">
                <div class="section-title">
                  <div><h2>角色权限模板</h2><p>修改角色模板后，新分配该身份的账号会按模板带出权限</p></div>
                  <div class="inline-actions">
                    <el-select v-model="selectedRoleId" style="width: 220px" @change="selectRole">
                      <el-option v-for="role in roles" :key="role.roleId" :label="roleLabel(role.roleId)" :value="role.roleId" />
                    </el-select>
                    <el-button type="primary" @click="saveSelectedRolePermissions">保存角色权限</el-button>
                  </div>
                </div>
                <div v-for="group in permissionGroups" :key="group.name" class="permission-group">
                  <h3>{{ group.name }}</h3>
                  <el-checkbox-group v-model="selectedRolePermissions">
                    <el-checkbox v-for="item in group.items" :key="item.code" :label="item.code">{{ item.label }}</el-checkbox>
                  </el-checkbox-group>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane v-if="hasPermission('WORK_ORDER')" label="维修工单" name="orders">
            <div class="tab-body">
              <div class="section-title"><div><h2>维修工单</h2><p>由审核通过自动生成</p></div></div>
              <div class="table-toolbar">
                <el-input v-model="orderFilters.keyword" :prefix-icon="Search" clearable placeholder="搜索工单、来源申请、客户、人员、物流、状态" />
                <div class="toolbar-right">
                  <el-date-picker
                    v-model="orderFilters.dateRange"
                    type="daterange"
                    value-format="YYYY-MM-DD"
                    range-separator="至"
                    start-placeholder="开始"
                    end-placeholder="结束"
                  />
                  <el-button @click="resetOrderFilters">重置检索</el-button>
                </div>
              </div>
              <el-table :data="filteredWorkOrders" row-key="workOrderNo" @row-dblclick="openResult">
                <el-table-column prop="workOrderNo" label="工单" width="160" />
                <el-table-column prop="requestNo" label="来源申请" width="160" />
                <el-table-column prop="request.customerName" label="客户" min-width="140" />
                <el-table-column label="服务方式" width="130"><template #default="{ row }">{{ orderServiceSummary(row) }}</template></el-table-column>
                <el-table-column prop="department" label="维修部门" width="120" />
                <el-table-column prop="repairPerson" label="维修人员" width="120" />
                <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="statusTag(row.status)">{{ row.status }}</el-tag></template></el-table-column>
                <el-table-column prop="repairResult" label="维修结果" min-width="120" />
                <el-table-column label="物流" min-width="150"><template #default="{ row }">{{ row.logistics?.trackingNo || '未登记' }}</template></el-table-column>
                <el-table-column label="操作" width="280" fixed="right">
                  <template #default="{ row }">
                    <el-button size="small" @click="acceptOrder(row)" :disabled="row.status !== '待接单'">接单</el-button>
                    <el-button size="small" type="primary" @click="openResult(row)">{{ orderActionLabel(row) }}</el-button>
                    <el-button size="small" @click="openLogistics(row)" :disabled="row.status !== '待寄回'">物流</el-button>
                    <el-button size="small" type="success" @click="archiveOrder(row)" :disabled="row.status !== '已寄回'">归档</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <el-tab-pane v-if="hasPermission('MASTER_DATA')" label="基础资料" name="master">
            <AdminMasterDataPanel
              v-if="activeTab === 'master'"
              :master="master"
              :model-dictionary="modelDictionary"
              :machine-binding-source="machineBindingSource"
              :material-form="materialForm"
              :instance-form="instanceForm"
              :binding-form="bindingForm"
              :sync-form="syncForm"
              :sync-tasks="syncTasks"
              @create-material="createMaterial"
              @create-instance="createInstance"
              @create-binding="createBinding"
              @create-sync-task="createSyncTask"
            />
          </el-tab-pane>

          <el-tab-pane v-if="hasPermission('REPORT_LOG')" label="报表日志" name="reports">
            <AdminReportsPanel
              v-if="activeTab === 'reports'"
              :overview="overview"
              :status-tag="statusTag"
              :source-channel-label="sourceChannelLabel"
            />
          </el-tab-pane>
        </el-tabs>
      </section>
    </main>

    <el-drawer v-model="auditDrawer" size="760px" :title="selectedRequest?.status === '待审核' ? '工厂审核' : '维修申请详情'">
      <div v-if="selectedRequest">
        <div class="drawer-block">
          <h3>{{ selectedRequest.requestNo }} · {{ selectedRequest.customerName }}</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="机床编号">{{ selectedRequest.machineNo }}</el-descriptions-item>
            <el-descriptions-item label="申请来源">{{ sourceChannelLabel(selectedRequest.sourceChannel) }}</el-descriptions-item>
            <el-descriptions-item label="服务方式">{{ serviceSummary(selectedRequest.details) }}</el-descriptions-item>
            <el-descriptions-item label="申请人申报">
              <el-space wrap><el-tag v-for="scope in declaredWarrantyScopes(selectedRequest)" :key="scope" :type="warrantyScopeTag(scope)">{{ scope }}</el-tag></el-space>
            </el-descriptions-item>
            <el-descriptions-item label="系统核验">
              <el-space wrap><el-tag v-for="scope in warrantyScopes(selectedRequest)" :key="scope" :type="statusTag(scope)">{{ scope }}</el-tag></el-space>
            </el-descriptions-item>
            <el-descriptions-item label="故障描述">{{ selectedRequest.faultDescription }}</el-descriptions-item>
          </el-descriptions>
        </div>
        <div class="drawer-block">
          <h3>申请明细</h3>
          <el-table :data="selectedRequest.details">
            <el-table-column prop="serviceType" label="服务" width="90" />
            <el-table-column prop="boardNo" label="板号" min-width="130" />
            <el-table-column prop="materialName" label="物料" />
            <el-table-column prop="faultPhenomenon" label="故障/诉求" min-width="160" />
            <el-table-column label="申报保修"><template #default="{ row }"><el-tag :type="warrantyScopeTag(row.warrantyScope)">{{ row.warrantyScope }}</el-tag></template></el-table-column>
            <el-table-column label="系统判断"><template #default="{ row }"><el-tag :type="statusTag(row.warrantyResult)">{{ row.warrantyResult }}</el-tag></template></el-table-column>
          </el-table>
        </div>
        <el-form v-if="selectedRequest.status === '待审核'" label-position="top">
          <el-form-item label="维修部门"><el-select v-model="auditForm.department"><el-option label="电器维修" value="电器维修" /><el-option label="机械维修" value="机械维修" /><el-option label="研发处理" value="研发处理" /></el-select></el-form-item>
          <el-form-item label="审核意见"><el-input v-model="auditForm.comment" type="textarea" :rows="4" /></el-form-item>
        </el-form>
        <div v-if="selectedRequest.status === '待审核'" class="inline-actions audit-actions"><el-button type="warning" :icon="Picture" @click="submitAudit('补充资料')">要求补充照片</el-button><el-button type="danger" @click="submitAudit('驳回')">驳回</el-button><el-button type="primary" @click="submitAudit('通过')">通过并生成工单</el-button></div>
      </div>
    </el-drawer>

    <el-drawer v-model="resultDrawer" size="860px" :title="selectedOrder ? `${orderActionLabel(selectedOrder)} · ${selectedOrder.workOrderNo}` : '维修结果登记'">
      <el-form v-if="selectedOrder" label-position="top">
        <div class="drawer-block">
          <h3>{{ selectedOrder.request?.customerName }} · {{ selectedOrder.request?.machineNo }}</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="来源申请">{{ selectedOrder.requestNo }}</el-descriptions-item>
            <el-descriptions-item label="服务方式">{{ orderServiceSummary(selectedOrder) }}</el-descriptions-item>
            <el-descriptions-item label="保修概览">
              <el-space wrap><el-tag v-for="scope in warrantyScopes(selectedOrder.request || {})" :key="scope" :type="statusTag(scope)">{{ scope }}</el-tag></el-space>
            </el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ selectedOrder.request?.phone }}</el-descriptions-item>
          </el-descriptions>
        </div>
        <div class="drawer-block">
          <h3>客户申请明细</h3>
          <el-table :data="selectedOrder.request?.details || []">
            <el-table-column prop="serviceType" label="服务" width="90" />
            <el-table-column prop="boardNo" label="原板号" min-width="130" />
            <el-table-column prop="materialName" label="物料" min-width="120" />
            <el-table-column prop="faultPhenomenon" label="故障/诉求" min-width="180" />
            <el-table-column label="系统保修"><template #default="{ row }"><el-tag :type="statusTag(row.warrantyResult)">{{ row.warrantyResult }}</el-tag></template></el-table-column>
            <el-table-column label="寄出板号" min-width="170">
              <template #default="{ row }">
                <template v-if="isIssueService(row.serviceType)">
                  <el-button size="small" @click="openIssueDialog(row)">{{ replacementForDetail(row)?.newSerialNo || '填写寄出板号' }}</el-button>
                </template>
                <span v-else class="muted">维修处理</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-form-item label="维修人员"><el-input v-model="resultForm.repairPerson" /></el-form-item>
        <el-form-item label="检测结果"><el-input v-model="resultForm.detectionResult" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="维修方案"><el-input v-model="resultForm.repairPlan" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="处理结果"><el-select v-model="resultForm.repairResult"><el-option label="已修复" value="已修复" /><el-option label="已替换" value="已替换" /><el-option label="已借用" value="已借用" /><el-option label="无法维修" value="无法维修" /><el-option label="检测无故障" value="检测无故障" /><el-option label="转研发处理" value="转研发处理" /></el-select></el-form-item>
        <el-form-item v-if="hasRepairService(selectedOrder)" label="维修中是否更换零件"><el-switch v-model="resultForm.repairReplaced" /></el-form-item>
        <div v-if="hasRepairService(selectedOrder) && resultForm.repairReplaced" class="replacement-list">
          <div v-for="(replacement, index) in resultForm.replacements.filter(isRepairReplacement)" :key="index" class="replacement-card">
            <div class="form-row">
              <el-input v-model="replacement.oldSerialNo" placeholder="旧板号/旧件编号" />
              <el-input v-model="replacement.newSerialNo" placeholder="新板号/新件编号（保内换板必填）" />
              <el-input v-model="replacement.position" placeholder="安装位置/物料名称" />
              <el-input v-model="replacement.reason" placeholder="更换原因" />
            </div>
            <el-checkbox-group v-model="replacement.componentChanges" class="component-checks">
              <el-checkbox v-for="option in componentOptions" :key="option" :label="option" />
            </el-checkbox-group>
          </div>
        </div>
        <div class="inline-actions" style="margin-top: 14px"><el-button type="primary" :icon="CircleCheck" @click="submitRepairResult">保存维修结果</el-button></div>
      </el-form>
    </el-drawer>

    <el-dialog v-model="issueDialog" width="520px" title="填写寄出板号">
      <el-form label-position="top">
        <el-form-item label="服务方式"><el-input v-model="issueForm.serviceType" disabled /></el-form-item>
        <el-form-item label="申请原板号/物料"><el-input v-model="issueForm.oldSerialNo" disabled /></el-form-item>
        <el-form-item label="寄出去的板号/零件编号"><el-input v-model="issueForm.newSerialNo" placeholder="请填写实际借出或替换发出的板号" /></el-form-item>
        <el-form-item label="物料/位置"><el-input v-model="issueForm.position" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="issueForm.reason" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="issueDialog = false">取消</el-button>
        <el-button type="primary" @click="saveIssueDialog">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="logisticsDrawer" size="520px" title="寄回物流登记">
      <el-form v-if="selectedOrder" label-position="top">
        <div class="form-row">
          <el-select v-model="logisticsForm.returnMethod"><el-option label="快递" value="快递" /><el-option label="随车带回" value="随车带回" /><el-option label="自提" value="自提" /></el-select>
          <el-input v-model="logisticsForm.company" placeholder="快递公司" />
          <el-input v-model="logisticsForm.trackingNo" placeholder="快递单号" />
          <el-date-picker v-model="logisticsForm.sentAt" value-format="YYYY-MM-DD" style="width: 100%" />
          <el-input v-model="logisticsForm.receiver" placeholder="收件人" />
          <el-input v-model="logisticsForm.phone" placeholder="电话" />
        </div>
        <el-form-item label="收件地址" style="margin-top: 12px"><el-input v-model="logisticsForm.address" /></el-form-item>
        <div class="inline-actions"><el-button type="primary" :icon="Position" @click="submitLogistics">保存物流</el-button></div>
      </el-form>
    </el-drawer>

    <el-dialog v-model="adminUserDialog" width="680px" :title="adminUserForm.id ? '编辑后台账号' : '新增后台账号'">
      <el-form label-position="top">
        <div class="form-row">
          <el-form-item label="账号"><el-input v-model="adminUserForm.username" :disabled="Boolean(adminUserForm.id)" /></el-form-item>
          <el-form-item label="密码"><el-input v-model="adminUserForm.password" type="password" show-password :placeholder="adminUserForm.id ? '不填则不修改' : '初始密码'" /></el-form-item>
          <el-form-item label="姓名"><el-input v-model="adminUserForm.name" /></el-form-item>
          <el-form-item label="身份">
            <el-select v-model="adminUserForm.role" style="width: 100%">
              <el-option v-for="role in roles" :key="role.roleId" :label="roleLabel(role.roleId)" :value="role.roleId" />
            </el-select>
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="电话"><el-input v-model="adminUserForm.phone" /></el-form-item>
          <el-form-item label="岗位/备注"><el-input v-model="adminUserForm.contact" /></el-form-item>
          <el-form-item label="状态">
            <el-select v-model="adminUserForm.userStatus" :disabled="adminUserForm.username === 'admin'">
              <el-option label="已通过" value="已通过" />
              <el-option label="待审核" value="待审核" />
              <el-option label="已驳回" value="已驳回" />
            </el-select>
          </el-form-item>
          <el-form-item label="启用"><el-switch v-model="adminUserForm.enabled" :disabled="adminUserForm.username === 'admin'" /></el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="adminUserDialog = false">取消</el-button>
        <el-button type="primary" @click="saveAdminUser">保存账号</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="permissionDialog" width="860px" title="分配个人权限">
      <el-form label-position="top">
        <div class="form-row">
          <el-form-item label="账号"><el-input v-model="adminUserForm.username" disabled /></el-form-item>
          <el-form-item label="身份">
            <el-select v-model="adminUserForm.role" style="width: 100%" @change="adminUserForm.permissions = permissionsForRole(adminUserForm.role)">
              <el-option v-for="role in roles" :key="role.roleId" :label="roleLabel(role.roleId)" :value="role.roleId" />
            </el-select>
          </el-form-item>
        </div>
        <div class="inline-actions" style="margin-bottom: 12px">
          <el-button @click="adminUserForm.permissions = permissionCatalog.map((item) => item.code)">全选</el-button>
          <el-button @click="adminUserForm.permissions = permissionsForRole(adminUserForm.role)">按身份模板</el-button>
          <el-button @click="adminUserForm.permissions = []">清空</el-button>
        </div>
        <div v-for="group in permissionGroups" :key="group.name" class="permission-group">
          <h3>{{ group.name }}</h3>
          <el-checkbox-group v-model="adminUserForm.permissions">
            <el-checkbox v-for="item in group.items" :key="item.code" :label="item.code">{{ item.label }}</el-checkbox>
          </el-checkbox-group>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="permissionDialog = false">取消</el-button>
        <el-button type="primary" @click="saveUserPermissions">保存权限</el-button>
      </template>
    </el-dialog>
  </div>
</template>
