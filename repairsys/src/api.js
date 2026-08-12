const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const apiOrigin = baseUrl.replace(/\/api\/?$/, '');
const authScope = typeof __AUTH_SCOPE__ !== 'undefined'
  ? __AUTH_SCOPE__
  : typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') ? 'admin' : 'client';

export function apiAssetUrl(url) {
  if (!url || /^https?:\/\//i.test(url) || String(url).startsWith('data:')) return url || '';
  const assetUrl = `${apiOrigin}${String(url).startsWith('/') ? '' : '/'}${url}`;
  return String(url).startsWith('/uploads/') ? `${assetUrl}?authType=${encodeURIComponent(authScope)}` : assetUrl;
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Scope': authScope, ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.message || `请求失败：${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export const api = {
  health: () => request('/health'),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  adminAuthOptions: () => request('/admin/auth/options'),
  adminRegister: (payload) => request('/admin/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  adminLogin: (payload) => request('/admin/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  adminUsers: () => request('/admin/users'),
  createAdminUser: (payload) => request('/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateAdminUser: (id, payload) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  auditUser: (id, payload) => request(`/users/${id}/audit`, { method: 'POST', body: JSON.stringify(payload) }),
  roles: () => request('/roles'),
  createRole: (payload) => request('/roles', { method: 'POST', body: JSON.stringify(payload) }),
  saveRolePermissions: (roleId, payload) => request(`/roles/${encodeURIComponent(roleId)}/permissions`, { method: 'PUT', body: JSON.stringify(payload) }),
  masterData: () => request('/master-data'),
  modelDictionary: () => request('/model-dictionary'),
  modelPhotoConfig: (modelCode) => request(`/model-photo-config${modelCode ? `?modelCode=${encodeURIComponent(modelCode)}` : ''}`),
  faqAnswer: (question) => request('/faq/answer', { method: 'POST', body: JSON.stringify({ question }) }),
  redeemFaqHandoff: (token) => request('/faq-handoffs/redeem', { method: 'POST', body: JSON.stringify({ token }) }),
  me: (type = authScope) => request(`/auth/me?type=${encodeURIComponent(type)}`),
  meOptional: (type = authScope) => request(`/auth/me?type=${encodeURIComponent(type)}&optional=1`),
  logout: (type = authScope) => request('/auth/logout', { method: 'POST', body: JSON.stringify({ type }) }),
  logoutAll: () => request('/auth/logout-all', { method: 'POST', body: JSON.stringify({}) }),
  machineComponentBindings: () => request('/machine-component-bindings'),
  overview: () => request('/reports/overview'),
  requests: () => request('/repair-requests'),
  createRequest: (payload) => request('/repair-requests', { method: 'POST', body: JSON.stringify(payload) }),
  recheckRequest: (requestNo, payload = {}) => request(`/repair-requests/${requestNo}/recheck`, { method: 'POST', body: JSON.stringify(payload) }),
  supplementRequest: (requestNo, payload) => request(`/repair-requests/${requestNo}/supplement`, { method: 'POST', body: JSON.stringify(payload) }),
  auditRequest: (requestNo, payload) => request(`/repair-requests/${requestNo}/audit`, { method: 'POST', body: JSON.stringify(payload) }),
  workOrders: () => request('/work-orders'),
  acceptWorkOrder: (workOrderNo, payload) => request(`/work-orders/${workOrderNo}/accept`, { method: 'POST', body: JSON.stringify(payload) }),
  repairResult: (workOrderNo, payload) => request(`/work-orders/${workOrderNo}/repair-result`, { method: 'POST', body: JSON.stringify(payload) }),
  logistics: (workOrderNo, payload) => request(`/work-orders/${workOrderNo}/logistics`, { method: 'POST', body: JSON.stringify(payload) }),
  archive: (workOrderNo, payload) => request(`/work-orders/${workOrderNo}/archive`, { method: 'POST', body: JSON.stringify(payload) }),
  createMaterial: (payload) => request('/materials', { method: 'POST', body: JSON.stringify(payload) }),
  createInstance: (payload) => request('/material-instances', { method: 'POST', body: JSON.stringify(payload) }),
  createBinding: (machineNo, payload) => request(`/machines/${machineNo}/bindings`, { method: 'POST', body: JSON.stringify(payload) }),
  warrantyCheck: (payload) => request('/warranty/check', { method: 'POST', body: JSON.stringify(payload) }),
  resolveBoardQr: (token) => request(`/v1/boards/resolve/${encodeURIComponent(token)}`),
  boardQrCodes: (serialNo = '') => request(`/v1/admin/board-codes${serialNo ? `?serialNo=${encodeURIComponent(serialNo)}` : ''}`),
  issueBoardQr: (payload) => request('/v1/admin/board-codes', { method: 'POST', body: JSON.stringify(payload) }),
  revokeBoardQr: (id) => request(`/v1/admin/board-codes/${encodeURIComponent(id)}/revoke`, { method: 'POST', body: JSON.stringify({}) }),
  syncTasks: () => request('/v8/sync-tasks'),
  createSyncTask: (payload) => request('/v8/sync-tasks', { method: 'POST', body: JSON.stringify(payload) })
};
