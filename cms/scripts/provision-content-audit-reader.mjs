const ROLE_NAME = '内容审核只读账号';

function urlFor(baseUrl, path) {
  return new URL(path.replace(/^\//, ''), `${baseUrl.replace(/\/$/, '')}/`);
}

export function createDirectusContentAuditReaderProvisioner({ baseUrl, adminToken, serviceToken, serviceEmail = 'content-audit-reader@ruijun.com', fetchImpl = fetch }) {
  if (!baseUrl || !adminToken || !serviceToken || !serviceEmail) throw new TypeError('baseUrl, adminToken, serviceToken, and serviceEmail are required');
  const headers = Object.freeze({ Accept: 'application/json', Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' });
  async function request(path, options = {}) {
    const response = await fetchImpl(urlFor(baseUrl, path), { ...options, headers: { ...headers, ...options.headers } });
    const body = await response.json();
    if (!response.ok) throw new Error(`Directus request ${options.method || 'GET'} ${path} failed: ${response.status}`);
    return body?.data;
  }
  return {
    async provision() {
      const roles = await request('/roles?limit=-1&fields=id,name');
      const role = Array.isArray(roles) ? roles.find((item) => item.name === ROLE_NAME) : null;
      if (!role?.id) throw new Error('内容审核只读账号不可用；请先应用 CMS 数据结构后再创建服务账号');
      const usersUrl = new URL(urlFor(baseUrl, '/users'));
      usersUrl.searchParams.set('filter[email][_eq]', serviceEmail);
      usersUrl.searchParams.set('limit', '1');
      usersUrl.searchParams.set('fields', 'id,email');
      const usersResponse = await fetchImpl(usersUrl, { method: 'GET', headers });
      if (!usersResponse.ok) throw new Error(`Directus request GET /users failed: ${usersResponse.status}`);
      const existing = (await usersResponse.json())?.data?.[0];
      const payload = { role: role.id, status: 'active', token: serviceToken };
      if (existing?.id) {
        await request(`/users/${encodeURIComponent(existing.id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
        return { created: false, updated: true, userId: existing.id };
      }
      const created = await request('/users', { method: 'POST', body: JSON.stringify({ email: serviceEmail, ...payload }) });
      if (!created?.id) throw new Error('Directus 未返回内容审核只读账号的用户编号');
      return { created: true, updated: false, userId: created.id };
    }
  };
}

if (import.meta.main) {
  const result = await createDirectusContentAuditReaderProvisioner({
    baseUrl: process.env.CMS_BASE_URL, adminToken: process.env.CMS_ADMIN_TOKEN, serviceToken: process.env.CMS_CONTENT_AUDIT_TOKEN,
    serviceEmail: process.env.CMS_CONTENT_AUDIT_EMAIL || 'content-audit-reader@ruijun.com'
  }).provision();
  console.log(JSON.stringify(result));
}
